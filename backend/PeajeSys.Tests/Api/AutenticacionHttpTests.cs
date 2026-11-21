using System.Net;
using System.Net.Http.Headers;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Security;
using PeajeSys.Tests.Auth;
using Xunit;

namespace PeajeSys.Tests.Api;

/// <summary>Pruebas de caracterizacion HTTP de autenticacion y autorizacion (sin BD).</summary>
public class AutenticacionHttpTests : IClassFixture<PeajeSysApiFactory>
{
    private const string OtraClave = "OtraClaveDistintaDePruebas-NoEsUnSecretoReal-9876543210";
    private readonly HttpClient _cliente;

    public AutenticacionHttpTests(PeajeSysApiFactory fabrica)
    {
        _cliente = fabrica.CreateClient();
    }

    private static string GenerarToken(string rol, string clave = JwtPruebas.Clave, TimeProvider? reloj = null)
    {
        var servicio = new JwtTokenService(clave, JwtPruebas.Issuer, JwtPruebas.Audience,
            JwtPruebas.ExpirationHours, reloj);
        return servicio.GenerateToken(new Operador
        {
            IdOperador = 1,
            CodigoEmpleado = "EMP-001",
            Nombres = "Prueba",
            Apellidos = "Http",
            Rol = rol,
            Estado = EstadosOperador.Activo
        });
    }

    private Task<HttpResponseMessage> Enviar(HttpMethod metodo, string url, string? token)
    {
        var peticion = new HttpRequestMessage(metodo, url);
        if (token != null)
        {
            peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        if (metodo == HttpMethod.Post)
        {
            peticion.Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");
        }
        return _cliente.SendAsync(peticion);
    }

    // Causa del no-200: TestHost 8.0.x sobre runtime 10 no implementa PipeWriter.UnflushedBytes
    // y /health falla al escribir JSON (500). Con Kestrel real o runtime 8 devuelve 200.
    [Fact]
    public async Task Health_SinToken_NoEsRechazadaPorAutenticacion()
    {
        var r = await Enviar(HttpMethod.Get, "/health", null);
        Assert.NotEqual(HttpStatusCode.Unauthorized, r.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, r.StatusCode);
    }

    [Fact]
    public async Task Operadores_SinToken_Devuelve401()
    {
        var r = await Enviar(HttpMethod.Get, "/api/operadores", null);
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task Operadores_TokenBasura_Devuelve401()
    {
        var r = await Enviar(HttpMethod.Get, "/api/operadores", "basura");
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task Operadores_RecaudadorValido_Devuelve403()
    {
        var r = await Enviar(HttpMethod.Get, "/api/operadores", GenerarToken(Roles.Recaudador));
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
    }

    [Fact]
    public async Task CrearOperador_SupervisorValido_Devuelve403()
    {
        var r = await Enviar(HttpMethod.Post, "/api/operadores", GenerarToken(Roles.Supervisor));
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
    }

    [Fact]
    public async Task Operadores_TokenFirmadoConOtraClave_Devuelve401()
    {
        var r = await Enviar(HttpMethod.Get, "/api/operadores", GenerarToken(Roles.Administrador, OtraClave));
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task Operadores_TokenCaducado_Devuelve401()
    {
        var reloj = new RelojFalso(DateTimeOffset.UtcNow.AddDays(-2));
        var r = await Enviar(HttpMethod.Get, "/api/operadores", GenerarToken(Roles.Administrador, reloj: reloj));
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }
}
