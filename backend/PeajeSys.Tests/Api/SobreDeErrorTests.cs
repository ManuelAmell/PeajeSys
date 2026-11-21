using System.IO;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PeajeSys.Api.Middlewares;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Security;
using PeajeSys.Data;
using PeajeSys.Tests.Auth;
using Xunit;

namespace PeajeSys.Tests.Api;

public class SobreDeErrorTests : IClassFixture<PeajeSysApiFactory>
{
    private readonly HttpClient _clienteHttp;

    public SobreDeErrorTests(PeajeSysApiFactory fabrica)
    {
        _clienteHttp = fabrica.CreateClient();
    }

    private static string GenerarToken(string rol)
    {
        var servicio = new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);
        return servicio.GenerateToken(new Operador
        {
            IdOperador = 1,
            CodigoEmpleado = "ADM-001",
            Nombres = "Admin",
            Apellidos = "Pruebas",
            Rol = rol,
            Estado = EstadosOperador.Activo
        });
    }

    [Fact]
    public async Task Middleware_ErrorDeDominioSinCampos_NoSerializaClaveCampos()
    {
        var context = new DefaultHttpContext();
        var stream = new MemoryStream();
        context.Response.Body = stream;

        var middleware = new GlobalExceptionMiddleware(
            _ => throw new DomainException("CONFLICTO_ESTADO", "Mensaje de regla de negocio"),
            NullLogger<GlobalExceptionMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        stream.Position = 0;
        using var reader = new StreamReader(stream, Encoding.UTF8);
        string responseJson = await reader.ReadToEndAsync();

        Assert.Contains("\"codigo\":\"CONFLICTO_ESTADO\"", responseJson);
        Assert.DoesNotContain("\"campos\"", responseJson);
    }

    [Fact]
    public async Task Http_SinToken_Devuelve401ConSobreNoAutenticado()
    {
        var respuesta = await _clienteHttp.GetAsync("/api/operadores");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
        var json = await respuesta.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var error = doc.RootElement.GetProperty("error");
        Assert.Equal("NO_AUTENTICADO", error.GetProperty("codigo").GetString());
        Assert.False(string.IsNullOrWhiteSpace(error.GetProperty("mensaje").GetString()));
    }

    [Fact]
    public async Task Http_RecaudadorEnRutaSupervisor_Devuelve403ConSobreSinPermiso()
    {
        var peticion = new HttpRequestMessage(HttpMethod.Get, "/api/recaudo");
        peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", GenerarToken(Roles.Recaudador));

        var respuesta = await _clienteHttp.SendAsync(peticion);

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
        var json = await respuesta.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var error = doc.RootElement.GetProperty("error");
        Assert.Equal("SIN_PERMISO", error.GetProperty("codigo").GetString());
        Assert.False(string.IsNullOrWhiteSpace(error.GetProperty("mensaje").GetString()));
    }

    [Fact]
    public async Task Http_CuerpoInvalidoEnRuta_Devuelve400ConSobreErrorValidacionYCampos()
    {
        var peticion = new HttpRequestMessage(HttpMethod.Post, "/api/tarifas");
        peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", GenerarToken(Roles.Administrador));
        // Enviar un JSON que falle model binding / validacion (id_estacion invalido o campos mal formados)
        peticion.Content = new StringContent("""{"id_estacion":"no_es_numero"}""", Encoding.UTF8, "application/json");

        var respuesta = await _clienteHttp.SendAsync(peticion);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var json = await respuesta.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("error", out var error), $"Respuesta recibida: {json}");
        Assert.Equal("ERROR_VALIDACION", error.GetProperty("codigo").GetString());
        Assert.True(error.TryGetProperty("campos", out var campos));
        Assert.True(campos.EnumerateObject().Any());
    }

    [Fact]
    public void TarifaConfiguration_ResolucionLegal_AlineadaConDdlA100Caracteres()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(System.Guid.NewGuid().ToString())
            .Options;
        using var db = new PeajeSysDbContext(options);

        var tipo = db.Model.FindEntityType(typeof(Tarifa));
        Assert.NotNull(tipo);
        var prop = tipo.FindProperty("ResolucionLegal");
        Assert.NotNull(prop);
        Assert.Equal(100, prop.GetMaxLength());
    }
}
