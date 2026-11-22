using Microsoft.Extensions.Configuration;
using PeajeSys.Core.Security;
using Xunit;

namespace PeajeSys.Tests.Api;

/// <summary>
/// Comprueba la configuracion versionada de la API sin user-secrets ni variables de entorno:
/// en Development la API debe poder arrancar sin pasos previos y en cualquier otro entorno
/// la clave JWT debe seguir siendo obligatoria.
/// </summary>
public class ConfiguracionDesarrolloTests
{
    // Se leen los archivos del repo (subiendo hasta la carpeta PeajeSys.Api) y no las copias
    // de bin/, para validar exactamente lo que el equipo versiona.
    private static string CarpetaApi()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidata = Path.Combine(dir.FullName, "PeajeSys.Api");
            if (File.Exists(Path.Combine(candidata, "appsettings.json")))
                return candidata;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("No se encontro la carpeta PeajeSys.Api subiendo desde " + AppContext.BaseDirectory);
    }

    private static IConfiguration Construir(bool incluirDevelopment)
    {
        var api = CarpetaApi();
        var builder = new ConfigurationBuilder()
            .AddJsonFile(Path.Combine(api, "appsettings.json"), optional: false);
        if (incluirDevelopment)
            builder.AddJsonFile(Path.Combine(api, "appsettings.Development.json"), optional: false);
        return builder.Build();
    }

    [Fact]
    public void Development_SinSecretosNiVariables_JwtSettingsEsValido()
    {
        var settings = Construir(incluirDevelopment: true).GetSection(JwtSettings.Seccion).Get<JwtSettings>();

        Assert.NotNull(settings);
        Assert.Empty(settings!.Validar());
    }

    [Fact]
    public void AppsettingsBase_NoTraeClaveJwt()
    {
        var clave = Construir(incluirDevelopment: false)[$"{JwtSettings.Seccion}:SecretKey"];

        Assert.True(string.IsNullOrEmpty(clave));
    }
}
