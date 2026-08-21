using System.Net;
using GinsaASPNETBlazorWebApp.Content;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace GinsaASPNETBlazorWebApp.Content;

public sealed class PortfolioPdfService
{
    public const string HttpClientName = "google-drive";
    private const string CacheKey = "portfolio-pdf";

    private readonly IHttpClientFactory _httpFactory;
    private readonly IMemoryCache _cache;
    private readonly IOptionsMonitor<SiteContent> _content;
    private readonly ILogger<PortfolioPdfService> _log;

    public PortfolioPdfService(
        IHttpClientFactory httpFactory,
        IMemoryCache cache,
        IOptionsMonitor<SiteContent> content,
        ILogger<PortfolioPdfService> log)
    {
        _httpFactory = httpFactory;
        _cache = cache;
        _content = content;
        _log = log;
        _content.OnChange(_ => Invalidate());
    }

    public async Task<byte[]?> GetPdfAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(CacheKey, out byte[]? cached) && cached is { Length: > 0 })
            return cached;

        var fileId = _content.CurrentValue.Portafolio.DriveFileId?.Trim();
        if (string.IsNullOrWhiteSpace(fileId))
        {
            _log.LogWarning("Portafolio.DriveFileId está vacío en textos.json.");
            return null;
        }

        var bytes = await DownloadFromDriveAsync(fileId, cancellationToken);
        if (bytes is null || !IsPdf(bytes))
        {
            _log.LogWarning("Google Drive no devolvió un PDF válido para {FileId}. ¿Está compartido como 'Cualquier persona con el enlace'?", fileId);
            return null;
        }

        _cache.Set(CacheKey, bytes, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
        });
        return bytes;
    }

    public void Invalidate() => _cache.Remove(CacheKey);

    private async Task<byte[]?> DownloadFromDriveAsync(string fileId, CancellationToken cancellationToken)
    {
        var client = _httpFactory.CreateClient(HttpClientName);
        var urls = new[]
        {
            $"https://drive.usercontent.google.com/download?id={fileId}&export=download&confirm=t",
            $"https://drive.google.com/uc?export=download&id={fileId}&confirm=t"
        };

        foreach (var url in urls)
        {
            using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (!response.IsSuccessStatusCode)
                continue;

            var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (IsPdf(bytes))
                return bytes;

            var confirm = TryReadConfirmToken(bytes);
            if (string.IsNullOrEmpty(confirm))
                continue;

            var confirmed = $"https://drive.usercontent.google.com/download?id={fileId}&export=download&confirm={WebUtility.UrlEncode(confirm)}";
            using var second = await client.GetAsync(confirmed, cancellationToken);
            if (!second.IsSuccessStatusCode)
                continue;
            var confirmedBytes = await second.Content.ReadAsByteArrayAsync(cancellationToken);
            if (IsPdf(confirmedBytes))
                return confirmedBytes;
        }

        return null;
    }

    private static bool IsPdf(byte[] bytes) =>
        bytes.Length > 5 && bytes[0] == (byte)'%' && bytes[1] == (byte)'P' && bytes[2] == (byte)'D' && bytes[3] == (byte)'F';

    private static string? TryReadConfirmToken(byte[] bytes)
    {
        var html = System.Text.Encoding.UTF8.GetString(bytes);
        const string marker = "confirm=";
        var i = html.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (i < 0) return null;
        i += marker.Length;
        var end = i;
        while (end < html.Length && char.IsLetterOrDigit(html[end]))
            end++;
        return end > i ? html[i..end] : null;
    }
}
