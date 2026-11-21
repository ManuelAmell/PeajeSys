using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Admin;

public class TarifaActualizarServiceTests
{
    private static (TarifaService servicio, PeajeSysDbContext db) CrearContexto()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new PeajeSysDbContext(options);

        var estacion = new EstacionPeaje
        {
            IdEstacion = 1,
            Nombre = "Peaje Central",
            CodigoEstacion = "EST-01",
            UbicacionGeografica = "Km 10",
            SentidoVia = "BOG-MED",
            Estado = "ACTIVO"
        };
        var categoria = new CategoriaVehiculo
        {
            IdCategoria = 1,
            Codigo = "CAT_I",
            Descripcion = "Automoviles",
            NumeroEjesMin = 2,
            NumeroEjesMax = 2,
            Activo = true
        };
        var tarifaActiva = new Tarifa
        {
            IdTarifa = 1,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 10000m,
            ResolucionLegal = "Res. 001/2026",
            FechaInicioVigencia = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            FechaFinVigencia = null,
            Activa = true
        };
        var tarifaInactiva = new Tarifa
        {
            IdTarifa = 2,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 9000m,
            ResolucionLegal = "Res. 000/2025",
            FechaInicioVigencia = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            FechaFinVigencia = new DateTime(2025, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            Activa = false
        };

        db.EstacionesPeaje.Add(estacion);
        db.CategoriasVehiculo.Add(categoria);
        db.Tarifas.AddRange(tarifaActiva, tarifaInactiva);
        db.SaveChanges();

        var servicio = new TarifaService(db, NullLogger<TarifaService>.Instance);
        return (servicio, db);
    }

    [Fact]
    public async Task ActualizarTarifa_CasoValido_ActualizaCamposYRetornaDto()
    {
        var (servicio, db) = CrearContexto();
        using var _ = db;

        var request = new ActualizarTarifaRequestDto
        {
            Monto = 12500m,
            ResolucionLegal = "Res. 050/2026",
            Activa = false
        };

        var resultado = await servicio.ActualizarTarifaAsync(1, request, "ADM-001");

        Assert.Equal(12500m, resultado.Monto);
        Assert.Equal("Res. 050/2026", resultado.ResolucionLegal);
        Assert.False(resultado.Activa);

        var guardada = await db.Tarifas.FindAsync(1);
        Assert.NotNull(guardada);
        Assert.Equal(12500m, guardada.Monto);
        Assert.Equal("Res. 050/2026", guardada.ResolucionLegal);
        Assert.False(guardada.Activa);
    }

    [Fact]
    public async Task ActualizarTarifa_IdInexistente_LanzaNotFoundException404()
    {
        var (servicio, db) = CrearContexto();
        using var _ = db;

        var request = new ActualizarTarifaRequestDto { Monto = 15000m };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            servicio.ActualizarTarifaAsync(999, request, "ADM-001"));

        Assert.Equal(404, ex.StatusCode);
        Assert.Equal("TARIFA_NO_ENCONTRADA", ex.Codigo);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    public async Task ActualizarTarifa_MontoInvalido_LanzaAppException422(decimal montoInvalido)
    {
        var (servicio, db) = CrearContexto();
        using var _ = db;

        var request = new ActualizarTarifaRequestDto { Monto = montoInvalido };

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            servicio.ActualizarTarifaAsync(1, request, "ADM-001"));

        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("ERROR_VALIDACION", ex.Codigo);
    }

    [Fact]
    public async Task ActualizarTarifa_FechasInvalidas_LanzaAppException422()
    {
        var (servicio, db) = CrearContexto();
        using var _ = db;

        var request = new ActualizarTarifaRequestDto
        {
            FechaInicioVigencia = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            FechaFinVigencia = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        };

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            servicio.ActualizarTarifaAsync(1, request, "ADM-001"));

        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("ERROR_VALIDACION", ex.Codigo);
    }

    [Fact]
    public async Task ActualizarTarifa_ActivarCuandoExisteOtraTarifaActiva_LanzaConflictException409()
    {
        var (servicio, db) = CrearContexto();
        using var _ = db;

        // Tarifa 1 esta activa. Intentar activar Tarifa 2 (misma estacion y categoria) debe violar restriccion
        var request = new ActualizarTarifaRequestDto { Activa = true };

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            servicio.ActualizarTarifaAsync(2, request, "ADM-001"));

        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("TARIFA_ACTIVA_DUPLICADA", ex.Codigo);
    }
}
