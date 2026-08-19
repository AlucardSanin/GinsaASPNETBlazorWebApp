namespace GinsaASPNETBlazorWebApp.Reviews;

public sealed class GoogleReviewsOptions
{
    public const string SectionName = "GoogleReviews";

    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";

    /// <summary>Must match an authorized redirect URI in Google Cloud Console.</summary>
    public string RedirectUri { get; set; } = "http://localhost:44369/oauth/callback";

    /// <summary>Optional path to the downloaded client_secret JSON (gitignored).</summary>
    public string CredentialsPath { get; set; } = "secrets/google-oauth.json";

    /// <summary>Filled once after OAuth consent (or set via user-secrets).</summary>
    public string RefreshToken { get; set; } = "";

    /// <summary>
    /// Optional. Full location resource names, e.g. accounts/123/locations/456.
    /// If empty, the service discovers all locations under the account.
    /// </summary>
    public string[] LocationNames { get; set; } = [];

    public int CacheMinutes { get; set; } = 360;
}

public sealed class GoogleReview
{
    public string AuthorName { get; init; } = "";
    public string? AuthorPhotoUrl { get; init; }
    public string? RelativeTime { get; init; }
    public string Text { get; init; } = "";
    public double Rating { get; init; }
    public string? AuthorTitle { get; init; }
}

public interface IGoogleReviewsService
{
    Task<IReadOnlyList<GoogleReview>> GetReviewsAsync(CancellationToken cancellationToken = default);
}

public interface IGoogleTokenStore
{
    Task<string?> GetRefreshTokenAsync(CancellationToken cancellationToken = default);
    Task SaveRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task<(string AccessToken, DateTimeOffset ExpiresAt)?> GetAccessTokenAsync(CancellationToken cancellationToken = default);
    Task SaveAccessTokenAsync(string accessToken, DateTimeOffset expiresAt, CancellationToken cancellationToken = default);
}
