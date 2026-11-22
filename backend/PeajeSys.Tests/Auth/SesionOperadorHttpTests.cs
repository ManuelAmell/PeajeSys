using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Security;
using PeajeSys.Data;
using PeajeSys.Tests.Api;
using Xunit;

namespace PeajeSys.Tests.Auth;

/// <summary>
/// Fabrica con EF InMemory donde el handler consulta la tabla operador de verdad: los operadores
/// existen en la BD y el token solo vale mientras sigan activos y con el rol que dice el token.
/// </summary>
public sealed class PeajeSysApiSesionRealFactory : PeajeSysApiFactory
{
    private readonly string _nombreBd = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services =>
        {
            var existentes = services.Where(d => d.ServiceType == typeof(DbContextOptions<PeajeSysDbContext>)).ToList();
            foreach (var d in existentes) services.Remove(d);
            services.AddDbContext<PeajeSysDbContext>(o => o.UseInMemoryDatabase(_nombreBd));
        });
    }
}

/// <summary>Hallazgo 8: desactivar o cambiar el rol de un operador surte efecto en sus tokens vigentes.</summary>
public class SesionOperadorHttpTests : IClassFixture<PeajeSysApiSesionRealFactory>
{
    private static int _contador = 100;
    private readonly PeajeSysApiSesionRealFactory _fabrica;
    private readonly HttpClient _cliente;

    public SesionOperadorHttpTests(PeajeSysApiSesionRealFactory fabrica)
    {
        _fabrica = fabrica;
        _cliente = fabrica.CreateClient();
    }

    private Operador Sembrar(string rol, string estado = "ACTIVO")
    {
        int n = System.Threading.Interlocked.Increment(ref _contador);
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<PeajeSysDbContext>();
        var op = new Operador
        {
            NumeroDocumento = $"80{n}", Nombres = "Sesion", Apellidos = "Real", CodigoEmpleado = $"SES-{n}",
            Rol = rol, Estado = estado, PasswordHash = "hash"
        };
        db.Operadores.Add(op);
        db.SaveChanges();
        return op;
    }

    private static string Token(Operador op)
    {
        var s = new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);
        return s.GenerateToken(op);
    }

    private Task<HttpResponseMessage> Enviar(HttpMethod metodo, string url, string token, string? json = null)
    {
        var peticion = new HttpRequestMessage(metodo, url);
        peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (json != null) peticion.Content = new StringContent(json, Encoding.UTF8, "application/json");
        return _cliente.SendAsync(peticion);
    }

    private const string RutaRecaudador = "/api/cuentas-telepeaje/por-placa/KJN456";
    private const string RutaSupervisor = "/api/operadores";

    [Fact]
    public async Task TokenValido_OperadorActivo_Pasa()
    {
        var op = Sembrar("RECAUDADOR");

        var r = await Enviar(HttpMethod.Get, RutaRecaudador, Token(op));

        Assert.NotEqual(HttpStatusCode.Unauthorized, r.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, r.StatusCode);
    }

    [Fact]
    public async Task TokenValido_OperadorInexistente_Devuelve401()
    {
        var fantasma = new Operador { IdOperador = 987654, CodigoEmpleado = "FAN-1", Nombres = "F", Apellidos = "T", Rol = "ADMINISTRADOR" };

        var r = await Enviar(HttpMethod.Get, RutaSupervisor, Token(fantasma));

        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task OperadorDesactivadoDespues_ElMismoTokenDevuelve401ConElSobreEstandar()
    {
        var admin = Sembrar("ADMINISTRADOR");
        var op = Sembrar("RECAUDADOR");
        var token = Token(op);
        var antes = await Enviar(HttpMethod.Get, RutaRecaudador, token);
        Assert.NotEqual(HttpStatusCode.Unauthorized, antes.StatusCode);

        var desactivar = await Enviar(HttpMethod.Patch, $"/api/operadores/{op.IdOperador}", Token(admin), "{\"estado\":\"INACTIVO\"}");
        Assert.Equal(HttpStatusCode.OK, desactivar.StatusCode);

        var despues = await Enviar(HttpMethod.Get, RutaRecaudador, token);
        Assert.Equal(HttpStatusCode.Unauthorized, despues.StatusCode);
        using var doc = JsonDocument.Parse(await despues.Content.ReadAsStringAsync());
        Assert.Equal("SESION_REVOCADA", doc.RootElement.GetProperty("error").GetProperty("codigo").GetString());
    }

    [Fact]
    public async Task OperadorInactivoDesdeElInicio_Devuelve401()
    {
        var op = Sembrar("RECAUDADOR", "INACTIVO");

        var r = await Enviar(HttpMethod.Get, RutaRecaudador, Token(op));

        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task RecaudadorAscendidoASupervisor_ElMismoTokenAccedeARutaDeSupervisor()
    {
        var admin = Sembrar("ADMINISTRADOR");
        var op = Sembrar("RECAUDADOR");
        var token = Token(op);
        var antes = await Enviar(HttpMethod.Get, RutaSupervisor, token);
        Assert.Equal(HttpStatusCode.Forbidden, antes.StatusCode);

        var cambio = await Enviar(HttpMethod.Patch, $"/api/operadores/{op.IdOperador}", Token(admin), "{\"rol\":\"SUPERVISOR\"}");
        Assert.Equal(HttpStatusCode.OK, cambio.StatusCode);

        var despues = await Enviar(HttpMethod.Get, RutaSupervisor, token);
        Assert.Equal(HttpStatusCode.OK, despues.StatusCode);
    }

    [Fact]
    public async Task AdministradorDegradadoARecaudador_ElMismoTokenRecibe403EnRutaDeAdmin()
    {
        var actor = Sembrar("ADMINISTRADOR");
        var degradado = Sembrar("ADMINISTRADOR");
        var token = Token(degradado);
        var antes = await Enviar(HttpMethod.Patch, $"/api/operadores/{actor.IdOperador}", token, "{\"nombres\":\"Igual\"}");
        Assert.Equal(HttpStatusCode.OK, antes.StatusCode);

        var cambio = await Enviar(HttpMethod.Patch, $"/api/operadores/{degradado.IdOperador}", Token(actor), "{\"rol\":\"RECAUDADOR\"}");
        Assert.Equal(HttpStatusCode.OK, cambio.StatusCode);

        var despues = await Enviar(HttpMethod.Patch, $"/api/operadores/{actor.IdOperador}", token, "{\"nombres\":\"Igual\"}");
        Assert.Equal(HttpStatusCode.Forbidden, despues.StatusCode);
    }
}
