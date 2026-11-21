using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Security;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Admin;

/// <summary>Servicio real de operadores sobre EF InMemory: contrasena obligatoria, hash guardado y nunca expuesto.</summary>
public class OperadorAdminServiceTests
{
    private static readonly PasswordHasher Hasher = new(4);

    private static OperadorAdminService Crear(out PeajeSysDbContext db)
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        db = new PeajeSysDbContext(options);
        return new OperadorAdminService(db, Hasher);
    }

    private static CrearOperadorRequestDto Peticion(string? password) => new()
    {
        NumeroDocumento = "2000000001",
        Nombres = "Nuevo",
        Apellidos = "Operador",
        CodigoEmpleado = "REC-900",
        Rol = "RECAUDADOR",
        Password = password
    };

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Crear_SinContrasena_LanzaErrorDeValidacionYNoGuarda(string? password)
    {
        var servicio = Crear(out var db);
        using var _ = db;

        var ex = await Assert.ThrowsAsync<AppException>(() => servicio.CrearOperadorAsync(Peticion(password)));

        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("ERROR_VALIDACION", ex.Codigo);
        Assert.Empty(db.Operadores);
    }

    [Fact]
    public async Task Crear_ConContrasena_GuardaUnHashVerificable()
    {
        var servicio = Crear(out var db);
        using var _ = db;

        await servicio.CrearOperadorAsync(Peticion("ClaveNueva2026*"));

        var guardado = Assert.Single(db.Operadores);
        Assert.NotNull(guardado.PasswordHash);
        Assert.NotEqual("ClaveNueva2026*", guardado.PasswordHash);
        Assert.True(Hasher.VerifyPassword("ClaveNueva2026*", guardado.PasswordHash!));
    }

    [Fact]
    public async Task CrearYListar_LaRespuestaNoExponeLaContrasenaNiElHash()
    {
        var servicio = Crear(out var db);
        using var _ = db;

        var creado = await servicio.CrearOperadorAsync(Peticion("ClaveNueva2026*"));
        var lista = await servicio.ListarOperadoresAsync(null, null, null);
        var detalle = await servicio.ObtenerOperadorPorIdAsync(creado.IdOperador);

        foreach (var respuesta in new object[] { creado, lista, detalle })
        {
            string json = JsonSerializer.Serialize(respuesta).ToLowerInvariant();
            Assert.DoesNotContain("password", json);
            Assert.DoesNotContain("clave", json);
            Assert.DoesNotContain("hash", json);
            Assert.DoesNotContain("$2", json);
        }
    }
}
