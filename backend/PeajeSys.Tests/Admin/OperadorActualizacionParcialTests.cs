using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Security;
using PeajeSys.Data;
using PeajeSys.Tests.Auth;
using PeajeSys.Tests.Turnos;
using Xunit;

namespace PeajeSys.Tests.Admin;

/// <summary>PATCH /api/operadores/{id}: actualizacion parcial (solo los campos presentes).</summary>
public class OperadorActualizacionParcialTests : IClassFixture<PeajeSysApiMemoriaFactory>
{
    private readonly PeajeSysApiMemoriaFactory _fabrica;
    private readonly HttpClient _cliente;

    public OperadorActualizacionParcialTests(PeajeSysApiMemoriaFactory fabrica)
    {
        _fabrica = fabrica;
        _cliente = fabrica.CreateClient();
    }

    private static string TokenAdmin()
    {
        var s = new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);
        return s.GenerateToken(new Operador { IdOperador = 900, CodigoEmpleado = "ADM-T", Nombres = "A", Apellidos = "B", Rol = "ADMINISTRADOR", Estado = EstadosOperador.Activo });
    }

    private int Sembrar(string codigo, string documento)
    {
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<PeajeSysDbContext>();
        var op = new Operador
        {
            NumeroDocumento = documento, Nombres = "Original", Apellidos = "Apellido", CodigoEmpleado = codigo,
            Rol = "RECAUDADOR", Estado = "ACTIVO", PasswordHash = "hash-viejo"
        };
        db.Operadores.Add(op);
        db.SaveChanges();
        return op.IdOperador;
    }

    private Operador Leer(int id)
    {
        using var alcance = _fabrica.Services.CreateScope();
        return alcance.ServiceProvider.GetRequiredService<PeajeSysDbContext>().Operadores.Single(o => o.IdOperador == id);
    }

    private Task<HttpResponseMessage> Patch(int id, string json)
    {
        var req = new HttpRequestMessage(HttpMethod.Patch, $"/api/operadores/{id}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", TokenAdmin());
        req.Content = new StringContent(json, Encoding.UTF8, "application/json");
        return _cliente.SendAsync(req);
    }

    [Fact]
    public async Task EdicionParcialSoloNombres_SinEstado_Da200YConservaElResto()
    {
        int id = Sembrar("PAR-001", "7000001");

        var r = await Patch(id, "{\"nombres\":\"X\"}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var op = Leer(id);
        Assert.Equal("X", op.Nombres);
        Assert.Equal("Apellido", op.Apellidos);
        Assert.Equal("ACTIVO", op.Estado);
        Assert.Equal("RECAUDADOR", op.Rol);
        Assert.Equal("hash-viejo", op.PasswordHash);
    }

    [Fact]
    public async Task EstadoInvalido_Da422EstadoInvalido()
    {
        int id = Sembrar("PAR-002", "7000002");

        var r = await Patch(id, "{\"estado\":\"XYZ\"}");

        Assert.Equal((HttpStatusCode)422, r.StatusCode);
        Assert.Contains("ESTADO_INVALIDO", await r.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task EstadoValido_SeAplica()
    {
        int id = Sembrar("PAR-003", "7000003");

        var r = await Patch(id, "{\"estado\":\"INACTIVO\"}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("INACTIVO", Leer(id).Estado);
    }

    [Fact]
    public async Task DocumentoYCodigoDuplicados_Dan409OperadorDuplicado()
    {
        int id = Sembrar("PAR-004", "7000004");
        Sembrar("PAR-005", "7000005");

        var rDoc = await Patch(id, "{\"numero_documento\":\"7000005\"}");
        var rCod = await Patch(id, "{\"codigo_empleado\":\"par-005\"}");

        Assert.Equal(HttpStatusCode.Conflict, rDoc.StatusCode);
        Assert.Contains("OPERADOR_DUPLICADO", await rDoc.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Conflict, rCod.StatusCode);
        Assert.Contains("OPERADOR_DUPLICADO", await rCod.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task EditarCodigoYDocumentoPropios_NoEsDuplicado()
    {
        int id = Sembrar("PAR-006", "7000006");

        var r = await Patch(id, "{\"numero_documento\":\"7000006\",\"codigo_empleado\":\"PAR-006\",\"apellidos\":\"Nuevo\"}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("Nuevo", Leer(id).Apellidos);
    }

    [Fact]
    public async Task ConPassword_SeGuardaElHashYNoSeDevuelve()
    {
        int id = Sembrar("PAR-007", "7000007");

        var r = await Patch(id, "{\"password\":\"Nueva2026*\"}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        string cuerpo = (await r.Content.ReadAsStringAsync()).ToLowerInvariant();
        Assert.DoesNotContain("password", cuerpo);
        Assert.DoesNotContain("hash", cuerpo);
        Assert.DoesNotContain("$2", cuerpo);
        var hash = Leer(id).PasswordHash!;
        Assert.NotEqual("Nueva2026*", hash);
        Assert.True(new PasswordHasher(4).VerifyPassword("Nueva2026*", hash));
    }

    [Fact]
    public async Task RolInvalido_Da422()
    {
        int id = Sembrar("PAR-008", "7000008");

        var r = await Patch(id, "{\"rol\":\"REY\"}");

        Assert.Equal((HttpStatusCode)422, r.StatusCode);
    }

    [Fact]
    public async Task OperadorInexistente_Da404()
    {
        var r = await Patch(999999, "{\"nombres\":\"X\"}");

        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
    }
}
