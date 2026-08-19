using System.Text.Json;
using Microsoft.Extensions.Options;

namespace GinsaASPNETBlazorWebApp.Reviews;

public sealed class FileGoogleTokenStore(IOptions<GoogleReviewsOptions> options, IWebHostEnvironment env) : IGoogleTokenStore
{
    private readonly string _path = Path.GetFullPath(Path.Combine(env.ContentRootPath, "secrets", "google-tokens.json"));

    public async Task<string?> GetRefreshTokenAsync(CancellationToken cancellationToken = default)
    {
        var fromConfig = options.Value.RefreshToken;
        if (!string.IsNullOrWhiteSpace(fromConfig))
            return fromConfig.Trim();

        var data = await ReadAsync(cancellationToken);
        return string.IsNullOrWhiteSpace(data?.RefreshToken) ? null : data.RefreshToken;
    }

    public async Task SaveRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var data = await ReadAsync(cancellationToken) ?? new TokenFile();
        data.RefreshToken = refreshToken;
        await WriteAsync(data, cancellationToken);
    }

    public async Task<(string AccessToken, DateTimeOffset ExpiresAt)?> GetAccessTokenAsync(CancellationToken cancellationToken = default)
    {
        var data = await ReadAsync(cancellationToken);
        if (data is null || string.IsNullOrWhiteSpace(data.AccessToken) || data.ExpiresAt is null)
            return null;
        if (data.ExpiresAt <= DateTimeOffset.UtcNow.AddMinutes(1))
            return null;
        return (data.AccessToken, data.ExpiresAt.Value);
    }

    public async Task SaveAccessTokenAsync(string accessToken, DateTimeOffset expiresAt, CancellationToken cancellationToken = default)
    {
        var data = await ReadAsync(cancellationToken) ?? new TokenFile();
        data.AccessToken = accessToken;
        data.ExpiresAt = expiresAt;
        await WriteAsync(data, cancellationToken);
    }

    private async Task<TokenFile?> ReadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_path))
            return null;
        await using var stream = File.OpenRead(_path);
        return await JsonSerializer.DeserializeAsync<TokenFile>(stream, cancellationToken: cancellationToken);
    }

    private async Task WriteAsync(TokenFile data, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        await using var stream = File.Create(_path);
        await JsonSerializer.SerializeAsync(stream, data, new JsonSerializerOptions { WriteIndented = true }, cancellationToken);
    }

    private sealed class TokenFile
    {
        public string? RefreshToken { get; set; }
        public string? AccessToken { get; set; }
        public DateTimeOffset? ExpiresAt { get; set; }
    }
}
