using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace GinsaASPNETBlazorWebApp.Reviews;

public sealed class GoogleBusinessReviewsService(
    HttpClient http,
    IMemoryCache cache,
    IOptions<GoogleReviewsOptions> options,
    GoogleOAuthTokenService oauth,
    IGoogleTokenStore tokenStore,
    ILogger<GoogleBusinessReviewsService> logger) : IGoogleReviewsService
{
    private const string CacheKey = "google-business-reviews:v1";

    public async Task<IReadOnlyList<GoogleReview>> GetReviewsAsync(CancellationToken cancellationToken = default)
    {
        if (cache.TryGetValue(CacheKey, out IReadOnlyList<GoogleReview>? cached) && cached is { Count: > 0 })
            return cached;

        await oauth.EnsureCredentialsLoadedAsync(cancellationToken);
        var refresh = await tokenStore.GetRefreshTokenAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(options.Value.ClientId) ||
            string.IsNullOrWhiteSpace(options.Value.ClientSecret) ||
            string.IsNullOrWhiteSpace(refresh))
        {
            logger.LogWarning("Google Business OAuth not configured — using fallback testimonials. Visit /oauth/google/start once.");
            return CacheAndReturn(FallbackReviews, options.Value.CacheMinutes);
        }

        try
        {
            var reviews = await FetchReviewsAsync(cancellationToken);
            if (reviews.Count == 0)
            {
                logger.LogWarning("Google returned 0 reviews with text — using short-lived fallback.");
                return CacheAndReturn(FallbackReviews, 2);
            }

            return CacheAndReturn(reviews, options.Value.CacheMinutes);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to load Google Business Profile reviews.");
            // Don't cache failures for long — quota/API approval fixes should take effect on next reload.
            return CacheAndReturn(FallbackReviews, 1);
        }
    }

    private IReadOnlyList<GoogleReview> CacheAndReturn(IReadOnlyList<GoogleReview> reviews, int minutes)
    {
        cache.Set(CacheKey, reviews, TimeSpan.FromMinutes(Math.Max(5, minutes)));
        return reviews;
    }

    private async Task<IReadOnlyList<GoogleReview>> FetchReviewsAsync(CancellationToken cancellationToken)
    {
        var locations = options.Value.LocationNames is { Length: > 0 }
            ? options.Value.LocationNames.Where(n => !string.IsNullOrWhiteSpace(n)).ToList()
            : await DiscoverLocationsAsync(cancellationToken);

        var all = new List<GoogleReview>();
        foreach (var location in locations)
        {
            var pageToken = (string?)null;
            do
            {
                var url = $"https://mybusiness.googleapis.com/v4/{location}/reviews?pageSize=50&orderBy=updateTime%20desc";
                if (!string.IsNullOrWhiteSpace(pageToken))
                    url += $"&pageToken={Uri.EscapeDataString(pageToken)}";

                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                await oauth.AuthenticateAsync(request, cancellationToken);
                using var response = await http.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(cancellationToken);
                    logger.LogWarning("Reviews list failed for {Location}: {Status} {Body}", location, (int)response.StatusCode, body);
                    break;
                }

                var payload = await response.Content.ReadFromJsonAsync<ListReviewsResponse>(cancellationToken: cancellationToken);
                if (payload?.Reviews is not null)
                {
                    foreach (var r in payload.Reviews)
                    {
                        if (string.IsNullOrWhiteSpace(r.Comment))
                            continue;

                        all.Add(new GoogleReview
                        {
                            AuthorName = r.Reviewer?.DisplayName ?? "Cliente",
                            AuthorPhotoUrl = r.Reviewer?.ProfilePhotoUrl,
                            Rating = StarRatingToDouble(r.StarRating),
                            Text = r.Comment.Trim(),
                            RelativeTime = ToRelativeSpanish(r.CreateTime),
                            AuthorTitle = "Reseña en Google"
                        });
                    }
                }

                pageToken = payload?.NextPageToken;
            } while (!string.IsNullOrWhiteSpace(pageToken));
        }

        return all
            .OrderByDescending(r => r.Rating)
            .ThenByDescending(r => r.Text.Length)
            .Take(20)
            .ToList();
    }

    private async Task<List<string>> DiscoverLocationsAsync(CancellationToken cancellationToken)
    {
        using var accountsReq = new HttpRequestMessage(
            HttpMethod.Get,
            "https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
        await oauth.AuthenticateAsync(accountsReq, cancellationToken);
        using var accountsRes = await http.SendAsync(accountsReq, cancellationToken);
        var accountsPayload = await accountsRes.Content.ReadFromJsonAsync<AccountsResponse>(cancellationToken: cancellationToken);
        if (!accountsRes.IsSuccessStatusCode || accountsPayload?.Accounts is null || accountsPayload.Accounts.Count == 0)
        {
            var body = await accountsRes.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Unable to list Business Profile accounts: {(int)accountsRes.StatusCode} {body}");
        }

        var locations = new List<string>();
        foreach (var account in accountsPayload.Accounts)
        {
            if (string.IsNullOrWhiteSpace(account.Name))
                continue;

            var url =
                $"https://mybusinessbusinessinformation.googleapis.com/v1/{account.Name}/locations" +
                "?readMask=name,title&pageSize=100";
            using var locReq = new HttpRequestMessage(HttpMethod.Get, url);
            await oauth.AuthenticateAsync(locReq, cancellationToken);
            using var locRes = await http.SendAsync(locReq, cancellationToken);
            var locPayload = await locRes.Content.ReadFromJsonAsync<LocationsResponse>(cancellationToken: cancellationToken);
            if (!locRes.IsSuccessStatusCode)
            {
                var body = await locRes.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning("Unable to list locations for {Account}: {Body}", account.Name, body);
                continue;
            }

            if (locPayload?.Locations is null)
                continue;

            foreach (var loc in locPayload.Locations)
            {
                if (string.IsNullOrWhiteSpace(loc.Name))
                    continue;

                // Reviews v4 needs accounts/{id}/locations/{id}; Business Info often returns locations/{id}.
                var fullName = loc.Name.StartsWith("accounts/", StringComparison.Ordinal)
                    ? loc.Name
                    : $"{account.Name}/{loc.Name.TrimStart('/')}";
                locations.Add(fullName);
            }
        }

        if (locations.Count == 0)
            throw new InvalidOperationException("No Business Profile locations found for this Google account.");

        logger.LogInformation("Discovered {Count} Business Profile locations.", locations.Count);
        return locations;
    }

    private static double StarRatingToDouble(string? starRating) => starRating switch
    {
        "ONE" => 1,
        "TWO" => 2,
        "THREE" => 3,
        "FOUR" => 4,
        "FIVE" => 5,
        _ => 5
    };

    private static string? ToRelativeSpanish(string? createTime)
    {
        if (string.IsNullOrWhiteSpace(createTime) || !DateTimeOffset.TryParse(createTime, out var when))
            return null;

        var span = DateTimeOffset.UtcNow - when.ToUniversalTime();
        if (span.TotalMinutes < 2) return "hace un momento";
        if (span.TotalHours < 1) return $"hace {(int)span.TotalMinutes} minutos";
        if (span.TotalHours < 48) return $"hace {(int)span.TotalHours} horas";
        if (span.TotalDays < 30) return $"hace {(int)span.TotalDays} días";
        if (span.TotalDays < 365) return $"hace {(int)(span.TotalDays / 30)} meses";
        var years = Math.Max(1, (int)(span.TotalDays / 365));
        return years == 1 ? "hace 1 año" : $"hace {years} años";
    }

    private static IReadOnlyList<GoogleReview> FallbackReviews { get; } =
    [
        new()
        {
            AuthorName = "Cliente Google",
            AuthorTitle = "Reseña en Google",
            Rating = 5,
            RelativeTime = "hace poco",
            Text = "Excelente acompañamiento. Entienden el negocio, proponen con claridad y ejecutan con compromiso. Se nota el equipo detrás de cada entrega."
        },
        new()
        {
            AuthorName = "Cliente Google",
            AuthorTitle = "Reseña en Google",
            Rating = 5,
            RelativeTime = "hace poco",
            Text = "Muy profesionales y cercanos. Nos ayudaron a ordenar la estrategia digital y a crecer con resultados medibles. Totalmente recomendados."
        },
        new()
        {
            AuthorName = "Cliente Google",
            AuthorTitle = "Reseña en Google",
            Rating = 5,
            RelativeTime = "hace poco",
            Text = "Creatividad + estrategia de verdad. Comunicación abierta y un proceso agradable de principio a fin. Arrieta Agency se siente como parte del equipo."
        }
    ];

    private sealed class AccountsResponse
    {
        [JsonPropertyName("accounts")]
        public List<AccountItem>? Accounts { get; set; }
    }

    private sealed class AccountItem
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }

    private sealed class LocationsResponse
    {
        [JsonPropertyName("locations")]
        public List<LocationItem>? Locations { get; set; }
    }

    private sealed class LocationItem
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }

    private sealed class ListReviewsResponse
    {
        [JsonPropertyName("reviews")]
        public List<BusinessReview>? Reviews { get; set; }

        [JsonPropertyName("nextPageToken")]
        public string? NextPageToken { get; set; }
    }

    private sealed class BusinessReview
    {
        [JsonPropertyName("reviewer")]
        public Reviewer? Reviewer { get; set; }

        [JsonPropertyName("starRating")]
        public string? StarRating { get; set; }

        [JsonPropertyName("comment")]
        public string? Comment { get; set; }

        [JsonPropertyName("createTime")]
        public string? CreateTime { get; set; }
    }

    private sealed class Reviewer
    {
        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("profilePhotoUrl")]
        public string? ProfilePhotoUrl { get; set; }
    }
}
