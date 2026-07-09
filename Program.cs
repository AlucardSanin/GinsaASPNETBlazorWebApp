using GinsaASPNETBlazorWebApp.Components;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorComponents();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();

app.UseAntiforgery();

// Fallback for hosts that don't resolve MapStaticAssets endpoints cleanly (IIS folder publish).
app.UseStaticFiles();
app.MapStaticAssets();
app.MapRazorComponents<App>();

app.Run();
