using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace GinsaASPNETBlazorWebApp.Reviews;

public sealed class GoogleOAuthTokenService(
    HttpClient http,
    IOptions<GoogleReviewsOptions> options,
    IGoogleTokenStore tokenStore,
    IWebHostEnvironment env,
    ILogger<GoogleOAuthTokenService> logger)
{
    public const string Scope = "https://www.googleapis.com/auth/business.manage";

    public async Task EnsureCredentialsLoadedAsync(CancellationToken cancellationToken = default)
    {
        var opts = options.Value;
        if (!string.IsNullOrWhiteSpace(opts.ClientId) && !string.IsNullOrWhiteSpace(opts.ClientSecret))
            return;

        var path = opts.CredentialsPath;
        if (string.IsNullOrWhiteSpace(path))
            return;

        if (!Path.IsPathRooted(path))
            path = Path.Combine(env.ContentRootPath, path);

        if (!File.Exists(path))
            return;

        await using var stream = File.OpenRead(path);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        if (!doc.RootElement.TryGetProperty("web", out var web))
            return;

        if (string.IsNullOrWhiteSpace(opts.ClientId) && web.TryGetProperty("client_id", out var cid))
            opts.ClientId = cid.GetString() ?? "";
        if (string.IsNullOrWhiteSpace(opts.ClientSecret) && web.TryGetProperty("client_secret", out var cs))
            opts.ClientSecret = cs.GetString() ?? "";
    }

    public string ResolveRedirectUri(HttpRequest request)
    {
        var host = request.Host.Host;
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
        {
            return string.IsNullOrWhiteSpace(options.Value.RedirectUri)
                ? $"{request.Scheme}://{request.Host}/oauth/callback"
                : options.Value.RedirectUri;
        }

        var scheme = request.Scheme;
        if (request.Headers.TryGetValue("X-Forwarded-Proto", out var proto) &&
            !string.IsNullOrWhiteSpace(proto))
        {
            scheme = proto.ToString().Split(',')[0].Trim();
        }

        if (host.Contains("arrietagency.com", StringComparison.OrdinalIgnoreCase))
            scheme = "https";

        return $"{scheme}://{request.Host.ToString().TrimEnd('/')}/oauth/callback";
    }

    public string BuildAuthorizationUrl(string state, string? redirectUri = null)
    {
        var opts = options.Value;
        var query = new Dictionary<string, string>
        {
            ["client_id"] = opts.ClientId,
            ["redirect_uri"] = string.IsNullOrWhiteSpace(redirectUri) ? opts.RedirectUri : redirectUri,
            ["response_type"] = "code",
            ["scope"] = Scope,
            ["access_type"] = "offline",
            ["prompt"] = "consent",
            ["include_granted_scopes"] = "true",
            ["state"] = state
        };

        return "https://accounts.google.com/o/oauth2/v2/auth?" +
               string.Join("&", query.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
    }

    public async Task<string> ExchangeCodeAsync(string code, string? redirectUri = null, CancellationToken cancellationToken = default)
    {
        await EnsureCredentialsLoadedAsync(cancellationToken);
        var opts = options.Value;

        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = opts.ClientId,
            ["client_secret"] = opts.ClientSecret,
            ["redirect_uri"] = string.IsNullOrWhiteSpace(redirectUri) ? opts.RedirectUri : redirectUri,
            ["grant_type"] = "authorization_code"
        });

        using var response = await http.PostAsync("https://oauth2.googleapis.com/token", content, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: cancellationToken);
        if (!response.IsSuccessStatusCode || payload is null)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Token exchange failed ({(int)response.StatusCode}): {body}");
        }

        if (string.IsNullOrWhiteSpace(payload.RefreshToken))
            throw new InvalidOperationException("Google did not return a refresh_token. Revoke prior access and retry with prompt=consent.");

        await tokenStore.SaveRefreshTokenAsync(payload.RefreshToken, cancellationToken);
        if (!string.IsNullOrWhiteSpace(payload.AccessToken))
        {
            var expires = DateTimeOffset.UtcNow.AddSeconds(payload.ExpiresIn > 0 ? payload.ExpiresIn : 3500);
            await tokenStore.SaveAccessTokenAsync(payload.AccessToken, expires, cancellationToken);
        }

        logger.LogInformation("Google OAuth refresh token saved.");
        return payload.RefreshToken;
    }

    public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken = default)
    {
        await EnsureCredentialsLoadedAsync(cancellationToken);

        var cached = await tokenStore.GetAccessTokenAsync(cancellationToken);
        if (cached is not null)
            return cached.Value.AccessToken;

        var refresh = await tokenStore.GetRefreshTokenAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(refresh))
            throw new InvalidOperationException("Missing Google refresh token. Visit /oauth/google/start once as the Business Profile admin.");

        var opts = options.Value;
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = opts.ClientId,
            ["client_secret"] = opts.ClientSecret,
            ["refresh_token"] = refresh,
            ["grant_type"] = "refresh_token"
        });

        using var response = await http.PostAsync("https://oauth2.googleapis.com/token", content, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: cancellationToken);
        if (!response.IsSuccessStatusCode || payload is null || string.IsNullOrWhiteSpace(payload.AccessToken))
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Refresh token failed ({(int)response.StatusCode}): {body}");
        }

        var expires = DateTimeOffset.UtcNow.AddSeconds(payload.ExpiresIn > 0 ? payload.ExpiresIn : 3500);
        await tokenStore.SaveAccessTokenAsync(payload.AccessToken, expires, cancellationToken);
        return payload.AccessToken;
    }

    public async Task AuthenticateAsync(HttpRequestMessage request, CancellationToken cancellationToken = default)
    {
        var token = await GetAccessTokenAsync(cancellationToken);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private sealed class TokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("token_type")]
        public string? TokenType { get; set; }
    }
}
