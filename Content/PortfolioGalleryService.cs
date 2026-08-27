using System.Globalization;

namespace GinsaASPNETBlazorWebApp.Content;

public sealed class PortfolioItem
{
    public string Src { get; init; } = "";
    public string Label { get; init; } = "";
}

public sealed class PortfolioGallery
{
    public PortfolioItem? Cover { get; init; }
    public IReadOnlyList<PortfolioItem> Marketing { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Social { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Reels { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Identidad { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Pop { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Packaging { get; init; } = [];
    public IReadOnlyList<PortfolioItem> Gigantografia { get; init; } = [];
}

public sealed class PortfolioGalleryService
{
    private static readonly string[] ImageExt = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"];
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
            Reels = LoadFolder(root, "Reels"),
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

    private static string LabelFromFile(string fileName)
    {
        var stem = Path.GetFileNameWithoutExtension(fileName).Replace('_', ' ').Replace('-', ' ').Trim();
        if (stem.Length == 0) return "Proyecto";
        return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(stem.ToLowerInvariant());
    }
}
