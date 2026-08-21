using GinsaASPNETBlazorWebApp.Components;
using GinsaASPNETBlazorWebApp.Content;
using GinsaASPNETBlazorWebApp.Reviews;
using Microsoft.Extensions.Caching.Memory;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("textos.json", optional: false, reloadOnChange: true);

builder.Services.AddRazorComponents();
builder.Services.AddMemoryCache();
builder.Services.Configure<SiteContent>(builder.Configuration);
builder.Services.AddSingleton<PortfolioPdfService>();
builder.Services.AddHttpClient(PortfolioPdfService.HttpClientName, client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.UserAgent.ParseAdd(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
});
builder.Services.Configure<GoogleReviewsOptions>(
    builder.Configuration.GetSection(GoogleReviewsOptions.SectionName));
builder.Services.AddSingleton<IGoogleTokenStore, FileGoogleTokenStore>();
builder.Services.AddHttpClient<GoogleOAuthTokenService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
});
builder.Services.AddHttpClient<IGoogleReviewsService, GoogleBusinessReviewsService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();

app.UseAntiforgery();

app.UseStaticFiles();
app.MapStaticAssets();
app.MapRazorComponents<App>();

app.MapGet("/api/portfolio", async (HttpContext http, PortfolioPdfService pdf, CancellationToken cancellationToken) =>
{
    var bytes = await pdf.GetPdfAsync(cancellationToken);
    if (bytes is null)
        return Results.NotFound();

    http.Response.Headers.CacheControl = "private, max-age=300";
    return Results.File(bytes, "application/pdf", enableRangeProcessing: true);
}).DisableAntiforgery();

// One-time Google Business Profile OAuth (admin account).
app.MapGet("/oauth/google/start", async (GoogleOAuthTokenService oauth, IMemoryCache cache) =>
{
    await oauth.EnsureCredentialsLoadedAsync();
    var state = Guid.NewGuid().ToString("N");
    cache.Set($"gmb-oauth:{state}", true, TimeSpan.FromMinutes(15));
    return Results.Redirect(oauth.BuildAuthorizationUrl(state));
});

app.MapGet("/oauth/callback", async (
    string? code,
    string? state,
    string? error,
    GoogleOAuthTokenService oauth,
    IMemoryCache cache) =>
{
    if (!string.IsNullOrWhiteSpace(error))
        return Results.Content($"OAuth error: {error}", "text/plain");

    if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
        return Results.BadRequest("Missing code/state.");

    if (!cache.TryGetValue($"gmb-oauth:{state}", out bool _))
        return Results.BadRequest("Invalid or expired OAuth state. Start again at /oauth/google/start");

    cache.Remove($"gmb-oauth:{state}");

    try
    {
        await oauth.ExchangeCodeAsync(code);
        cache.Remove("google-business-reviews:v1");
        return Results.Content(
            """
            Autorización OK. El refresh_token quedó guardado en secrets/google-tokens.json (no se sube a git).
            Ya puedes cerrar esta pestaña y recargar el sitio: las reseñas se pedirán a Google Business Profile.
            """,
            "text/plain; charset=utf-8");
    }
    catch (Exception ex)
    {
        return Results.Content($"No se pudo completar OAuth: {ex.Message}", "text/plain; charset=utf-8");
    }
});

// Diagnostics: why reviews are still placeholders (no secrets in response).
app.MapGet("/oauth/google/status", async (
    GoogleOAuthTokenService oauth,
    IGoogleTokenStore tokenStore,
    IMemoryCache cache,
    IHttpClientFactory httpFactory) =>
{
    var http = httpFactory.CreateClient();
    await oauth.EnsureCredentialsLoadedAsync();
    var refresh = await tokenStore.GetRefreshTokenAsync();
    var hasRefresh = !string.IsNullOrWhiteSpace(refresh);
    string accountsStatus;
    string? accountsDetail = null;

    if (!hasRefresh)
    {
        accountsStatus = "missing_refresh_token";
        accountsDetail = "Visita /oauth/google/start con la cuenta admin del Business Profile.";
    }
    else
    {
        try
        {
            using var req = new HttpRequestMessage(
                HttpMethod.Get,
                "https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
            await oauth.AuthenticateAsync(req);
            using var res = await http.SendAsync(req);
            var body = await res.Content.ReadAsStringAsync();
            accountsStatus = $"{(int)res.StatusCode}";
            if (body.Contains("quota_limit_value\":\"0\"", StringComparison.Ordinal) ||
                body.Contains("RATE_LIMIT_EXCEEDED", StringComparison.Ordinal))
            {
                accountsStatus = "quota_zero_needs_gbp_api_access";
                accountsDetail =
                    "OAuth OK, pero el proyecto de Google Cloud tiene cuota 0 en Business Profile APIs. " +
                    "Hay que solicitar acceso: https://developers.google.com/my-business/content/prereqs " +
                    "(formulario Application for Basic API Access). Hasta que la cuota pase de 0 a ~300, " +
                    "Google responde 429 y el sitio muestra placeholders.";
            }
            else if (!res.IsSuccessStatusCode)
            {
                accountsDetail = body.Length > 500 ? body[..500] : body;
            }
            else
            {
                accountsStatus = "ok";
                accountsDetail = "Accounts API responde bien. Recarga el home; si aún hay placeholders, reinicia la app.";
                cache.Remove("google-business-reviews:v1");
            }
        }
        catch (Exception ex)
        {
            accountsStatus = "error";
            accountsDetail = ex.Message;
        }
    }

    return Results.Json(new
    {
        hasRefreshToken = hasRefresh,
        accountsStatus,
        detail = accountsDetail,
        nextSteps = new[]
        {
            "1) En Google Cloud del proyecto interfaz-de-resenas, habilita: My Business Account Management, Business Information y Google My Business API.",
            "2) Si la cuota sigue en 0, envía Application for Basic API Access (prereqs de Google).",
            "3) Cuando la cuota sea ~300 QPM, reinicia la app y recarga el sitio."
        }
    });
});

app.Run();
