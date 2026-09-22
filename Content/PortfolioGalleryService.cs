using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace GinsaASPNETBlazorWebApp.Content;

public sealed class PortfolioItem
{
    public string Src { get; init; } = "";
    public string Label { get; init; } = "";
}

public sealed class ReelItem
{
    public string Kind { get; init; } = "video";
    public string Src { get; init; } = "";
    public string Label { get; init; } = "";
    public string? Poster { get; init; }
    public string? ExternalUrl { get; init; }
    public string? EmbedSrc { get; init; }
}

public sealed class PortfolioGallery
{
    public PortfolioItem? Cover { get; init; }
    public IReadOnlyList<PortfolioItem> Marketing { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Social { get; init; } = [];
    public IReadOnlyList<ReelItem> Reels { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Identidad { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Pop { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Packaging { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Gigantografia { get; init; } = [];
}

public sealed class PortfolioGalleryService
{
    private static readonly string[] ImageExt = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"];
    private static readonly string[] VideoExt = [".mp4", ".webm"];
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };
    private readonly IWebHostEnvironment _env;

    public PortfolioGalleryService(IWebHostEnvironment env) => _env = env;

    public PortfolioGallery Load()
    {
        var root = Path.Combine(_env.WebRootPath, "portafolio");
        if (!Directory.Exists(root))
            return new PortfolioGallery();

        return new PortfolioGallery
        {
            Cover = LoadFolder(root, "portada").FirstOrDefault(),
            Marketing = LoadFolder(root, "Marketing Digital"),
            Social = LoadFolder(root, "Social Media"),
            Reels = LoadReels(root),
            Identidad = LoadFolder(root, "Identidad Visual"),
            Pop = LoadFolder(root, "Material POP"),
            Packaging = LoadFolder(root, "Packaging"),
            Gigantografia = LoadFolder(root, "Gigantografia"),
        };
    }

    private static IReadOnlyList<PortfolioItem> LoadFolder(string root, string folder)
    {
        var dir = Path.Combine(root, folder);
        if (!Directory.Exists(dir))
            return [];

        return Directory.EnumerateFiles(dir)
            .Where(f => ImageExt.Contains(Path.GetExtension(f), StringComparer.OrdinalIgnoreCase))
            .OrderBy(f => f, StringComparer.OrdinalIgnoreCase)
            .Select(f =>
            {
                var name = Path.GetFileName(f);
                return new PortfolioItem
                {
                    Src = $"/portafolio/{Uri.EscapeDataString(folder)}/{Uri.EscapeDataString(name)}",
                    Label = LabelFromFile(name),
                };
            })
            .ToList();
    }

    private static IReadOnlyList<ReelItem> LoadReels(string root)
    {
        var dir = Path.Combine(root, "Reels");
        if (!Directory.Exists(dir))
            return [];

        var usedFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var items = new List<ReelItem>();

        var manifestPath = Path.Combine(dir, "reels.json");
        if (File.Exists(manifestPath))
        {
            try
            {
                using var stream = File.OpenRead(manifestPath);
                var manifest = JsonSerializer.Deserialize<ReelsManifest>(stream, JsonOptions);
                foreach (var entry in manifest?.Items ?? [])
                    if (TryMapManifestItem(dir, entry, usedFiles, out var reel))
                        items.Add(reel);
            }
            catch (JsonException)
            {
                // Keep folder videos even if the JSON is malformed.
            }
        }

        usedFiles.Add("reels.json");

        foreach (var file in Directory.EnumerateFiles(dir)
                     .OrderBy(f => f, StringComparer.OrdinalIgnoreCase))
        {
            var name = Path.GetFileName(file);
            if (usedFiles.Contains(name))
                continue;

            var ext = Path.GetExtension(name);
            if (VideoExt.Contains(ext, StringComparer.OrdinalIgnoreCase))
            {
                items.Add(new ReelItem
                {
                    Kind = "video",
                    Src = ReelFileUrl(name),
                    Label = LabelFromFile(name),
                });
            }
            else if (ImageExt.Contains(ext, StringComparer.OrdinalIgnoreCase))
            {
                items.Add(new ReelItem
                {
                    Kind = "image",
                    Src = ReelFileUrl(name),
                    Label = LabelFromFile(name),
                });
            }
        }

        return items;
    }

    private static bool TryMapManifestItem(string dir, ReelsManifestItem entry, HashSet<string> usedFiles, out ReelItem reel)
    {
        reel = new ReelItem();
        var title = string.IsNullOrWhiteSpace(entry.Titulo) ? null : entry.Titulo.Trim();
        var poster = ResolveOptionalFile(dir, entry.Portada, usedFiles);

        if (!string.IsNullOrWhiteSpace(entry.Archivo))
        {
            var file = Path.GetFileName(entry.Archivo.Trim());
            if (!File.Exists(Path.Combine(dir, file)))
                return false;

            usedFiles.Add(file);
            var ext = Path.GetExtension(file);
            reel = new ReelItem
            {
                Kind = VideoExt.Contains(ext, StringComparer.OrdinalIgnoreCase) ? "video" : "image",
                Src = ReelFileUrl(file),
                Label = title ?? LabelFromFile(file),
                Poster = poster,
            };
            return true;
        }

        if (string.IsNullOrWhiteSpace(entry.Url) || !TryParseSocialUrl(entry.Url, out var kind, out var url, out var embedSrc))
            return false;

        reel = new ReelItem
        {
            Kind = kind,
            Src = url,
            Label = title ?? (kind == "tiktok" ? "Reel de TikTok" : "Reel de Instagram"),
            Poster = poster,
            ExternalUrl = url,
            EmbedSrc = embedSrc,
        };
        return true;
    }

    private static string? ResolveOptionalFile(string dir, string? name, HashSet<string> usedFiles)
    {
        if (string.IsNullOrWhiteSpace(name))
            return null;

        var file = Path.GetFileName(name.Trim());
        if (!File.Exists(Path.Combine(dir, file)))
            return null;

        usedFiles.Add(file);
        return ReelFileUrl(file);
    }

    private static string ReelFileUrl(string fileName) =>
        $"/portafolio/{Uri.EscapeDataString("Reels")}/{Uri.EscapeDataString(fileName)}";

    private static bool TryParseSocialUrl(string raw, out string kind, out string url, out string embedSrc)
    {
        kind = "";
        url = raw.Trim();
        embedSrc = "";
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return false;

        var host = uri.Host.Replace("www.", "", StringComparison.OrdinalIgnoreCase);
        if (host.Contains("instagram.com", StringComparison.OrdinalIgnoreCase))
        {
            var match = Regex.Match(uri.AbsolutePath, @"/(reel|reels|p|tv)/([^/]+)", RegexOptions.IgnoreCase);
            if (!match.Success)
                return false;

            kind = "instagram";
            var type = match.Groups[1].Value.Equals("reels", StringComparison.OrdinalIgnoreCase)
                ? "reel"
                : match.Groups[1].Value.ToLowerInvariant();
            embedSrc = $"https://www.instagram.com/{type}/{Uri.EscapeDataString(match.Groups[2].Value)}/embed/";
            return true;
        }

        if (host.Contains("tiktok.com", StringComparison.OrdinalIgnoreCase))
        {
            var match = Regex.Match(uri.AbsolutePath, @"/(?:video|photo)/(\d+)", RegexOptions.IgnoreCase);
            if (!match.Success)
                match = Regex.Match(uri.AbsolutePath, @"/player/v1/(\d+)", RegexOptions.IgnoreCase);
            if (!match.Success)
                return false;

            kind = "tiktok";
            embedSrc = $"https://www.tiktok.com/player/v1/{match.Groups[1].Value}?music_info=0&description=0&autoplay=0&loop=1";
            return true;
        }

        return false;
    }

    private sealed class ReelsManifest
    {
        [JsonPropertyName("items")]
        public List<ReelsManifestItem> Items { get; set; } = [];
    }

    private sealed class ReelsManifestItem
    {
        public string? Titulo { get; set; }
        public string? Url { get; set; }
        public string? Archivo { get; set; }
        public string? Portada { get; set; }
    }

    private static string LabelFromFile(string fileName)
    {
        var stem = Path.GetFileNameWithoutExtension(fileName).Replace('_', ' ').Replace('-', ' ').Trim();
        if (stem.Length == 0) return "Proyecto";
        return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(stem.ToLowerInvariant());
    }
}
