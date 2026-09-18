namespace GinsaASPNETBlazorWebApp.Content;

public sealed class SiteContent
{
    public string TituloPagina { get; set; } = "";
    public string CalendlyUrl { get; set; } = "";
    public NavegacionTextos Navegacion { get; set; } = new();
    public HeroTextos Hero { get; set; } = new();
    public HolaTextos Hola { get; set; } = new();
    public ServiciosTextos Servicios { get; set; } = new();
    public ProcesoTextos Proceso { get; set; } = new();
    public MarcasTextos Marcas { get; set; } = new();
    public ResenasTextos Resenas { get; set; } = new();
    public NumerosTextos Numeros { get; set; } = new();
    public CreemosTextos Creemos { get; set; } = new();
    public FooterTextos Footer { get; set; } = new();
    public PortafolioTextos Portafolio { get; set; } = new();
    public ContactoTextos Contacto { get; set; } = new();
}

public sealed class NavegacionTextos
{
    public string QuienesSomos { get; set; } = "";
    public string Servicios { get; set; } = "";
    public string Proceso { get; set; } = "";
    public string Portafolio { get; set; } = "";
    public string Contactanos { get; set; } = "";
}

public sealed class HeroTextos
{
    public string TituloLinea1 { get; set; } = "";
    public string TituloLinea2 { get; set; } = "";
    public string Subtitulo { get; set; } = "";
    public string BotonCalendly { get; set; } = "";
    public string BotonColombia { get; set; } = "";
    public string BotonVenezuela { get; set; } = "";
}

public sealed class HolaTextos
{
    public string Titulo { get; set; } = "";
    public List<string> Parrafos { get; set; } = [];
    public string Boton { get; set; } = "";
}

public sealed class ServiciosTextos
{
    public string TituloAntes { get; set; } = "";
    public string TituloResaltado { get; set; } = "";
    public List<string> SocialMedia { get; set; } = [];
    public List<string> Marketing { get; set; } = [];
    public List<string> Diseno { get; set; } = [];
    public string BotonPortafolio { get; set; } = "";
}

public sealed class ProcesoTextos
{
    public string TituloResaltado { get; set; } = "";
    public string TituloDespues { get; set; } = "";
    public List<PasoTextos> Pasos { get; set; } = [];
}

public sealed class PasoTextos
{
    public string Numero { get; set; } = "";
    public string Titulo { get; set; } = "";
    public string Texto { get; set; } = "";
}

public sealed class MarcasTextos
{
    public string TituloAntes { get; set; } = "";
    public string TituloResaltado { get; set; } = "";
    public string TituloDespues { get; set; } = "";
    public string TypewriterPrefijo { get; set; } = "";
    public List<string> TypewriterPalabras { get; set; } = [];
}

public sealed class ResenasTextos
{
    public string Titulo { get; set; } = "";
    public string Intro { get; set; } = "";
    public string Boton { get; set; } = "";
}

public sealed class NumerosTextos
{
    public string Titulo { get; set; } = "";
    public string Nota { get; set; } = "";
    public List<KpiTextos> Items { get; set; } = [];
}

public sealed class KpiTextos
{
    public string Valor { get; set; } = "";
    public string Destacado { get; set; } = "";
    public string Detalle { get; set; } = "";
}

public sealed class CreemosTextos
{
    public string Texto { get; set; } = "";
    public string BotonColombia { get; set; } = "";
    public string BotonVenezuela { get; set; } = "";
}

public sealed class FooterTextos
{
    public string TituloCorreo { get; set; } = "";
    public string TituloInstagram { get; set; } = "";
    public string TituloVenezuela { get; set; } = "";
    public string TituloColombia { get; set; } = "";
    public string Copyright { get; set; } = "";
}

public sealed class PortafolioTextos
{
    public string Titulo { get; set; } = "";
    public string Volver { get; set; } = "";
    public string Cargando { get; set; } = "";
    public string Pista { get; set; } = "";
    public string Error { get; set; } = "";
    public string DriveFileId { get; set; } = "";
    public string MarketingTitulo { get; set; } = "";
    public string MarketingCopy { get; set; } = "";
    public string SocialTitulo { get; set; } = "";
    public string SocialCopy { get; set; } = "";
    public string ReelsTitulo { get; set; } = "";
    public string ReelsCopy { get; set; } = "";
    public string DisenoTitulo { get; set; } = "";
    public string DisenoCopy { get; set; } = "";
    public string DisenoKicker { get; set; } = "";
    public string IdentidadNombre { get; set; } = "";
    public string PopNombre { get; set; } = "";
    public string PackagingNombre { get; set; } = "";
    public string GigantografiaNombre { get; set; } = "";
}

public sealed class ContactoTextos
{
    public string Email { get; set; } = "";
    public string InstagramUrl { get; set; } = "";
    public string Instagram { get; set; } = "";
    public string WhatsAppColombia { get; set; } = "";
    public string WhatsAppVenezuela { get; set; } = "";
    public string TelefonoColombia { get; set; } = "";
    public string TelefonoVenezuela { get; set; } = "";
}
