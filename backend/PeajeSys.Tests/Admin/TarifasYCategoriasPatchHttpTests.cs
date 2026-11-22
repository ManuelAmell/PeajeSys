using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Security;
using PeajeSys.Tests.Api;
using PeajeSys.Tests.Auth;
using Xunit;

namespace PeajeSys.Tests.Admin;

public class TarifasYCategoriasPatchHttpTests : IClassFixture<PeajeSysApiFactory>
{
    private readonly HttpClient _cliente;

    public TarifasYCategoriasPatchHttpTests(PeajeSysApiFactory fabrica)
    {
        _cliente = fabrica.CreateClient();
    }

    private static string GenerarToken(string rol)
    {
        var servicio = new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);
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

    private Task<HttpResponseMessage> EnviarPatch(string url, string? token, string jsonBody = "{}")
    {
        var peticion = new HttpRequestMessage(HttpMethod.Patch, url);
        if (token != null)
        {
            peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        peticion.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
        return _cliente.SendAsync(peticion);
    }

    [Fact]
    public async Task Supervisor_PatchTarifa_Recibe403ConSobreSinPermiso()
    {
        var respuesta = await EnviarPatch("/api/tarifas/1", GenerarToken(Roles.Supervisor));

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
        var json = await respuesta.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var error = doc.RootElement.GetProperty("error");
        Assert.Equal("SIN_PERMISO", error.GetProperty("codigo").GetString());
    }

    [Fact]
    public async Task Supervisor_PatchCategoria_Recibe403ConSobreSinPermiso()
    {
        var respuesta = await EnviarPatch("/api/categorias/1", GenerarToken(Roles.Supervisor));

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
        var json = await respuesta.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var error = doc.RootElement.GetProperty("error");
        Assert.Equal("SIN_PERMISO", error.GetProperty("codigo").GetString());
    }

    [Fact]
    public async Task SinToken_PatchTarifa_Recibe401ConSobreNoAutenticado()
    {
        var respuesta = await EnviarPatch("/api/tarifas/1", null);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
        var json = await respuesta.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var error = doc.RootElement.GetProperty("error");
        Assert.Equal("NO_AUTENTICADO", error.GetProperty("codigo").GetString());
    }

    [Fact]
    public async Task SinToken_PatchCategoria_Recibe401ConSobreNoAutenticado()
    {
        var respuesta = await EnviarPatch("/api/categorias/1", null);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
        var json = await respuesta.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var error = doc.RootElement.GetProperty("error");
        Assert.Equal("NO_AUTENTICADO", error.GetProperty("codigo").GetString());
    }

    [Fact]
    public async Task Recaudador_PatchTarifa_Recibe403ConSobreSinPermiso()
    {
        var respuesta = await EnviarPatch("/api/tarifas/1", GenerarToken(Roles.Recaudador));

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Recaudador_PatchCategoria_Recibe403ConSobreSinPermiso()
    {
        var respuesta = await EnviarPatch("/api/categorias/1", GenerarToken(Roles.Recaudador));

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }
}
