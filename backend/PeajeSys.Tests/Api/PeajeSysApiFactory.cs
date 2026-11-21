using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using PeajeSys.Tests.Auth;

namespace PeajeSys.Tests.Api;

/// <summary>
/// Servidor de pruebas en entorno "Testing": no carga user-secrets del equipo y la
/// configuracion JWT sale solo de JwtPruebas. No toca la base de datos.
/// </summary>
public class PeajeSysApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("JwtSettings:SecretKey", JwtPruebas.Clave);
        builder.UseSetting("JwtSettings:Issuer", JwtPruebas.Issuer);
        builder.UseSetting("JwtSettings:Audience", JwtPruebas.Audience);
        builder.UseSetting("JwtSettings:ExpirationHours", JwtPruebas.ExpirationHours.ToString());
    }
}
