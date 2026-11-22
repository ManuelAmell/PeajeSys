using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PeajeSys.Api.Services;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Supervisor;

public class CuentaTelepeajePorPlacaServiceTests
{
    private static PeajeSysDbContext NuevoContexto() =>
        new(new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task ObtenerCuentaPorPlacaAsync_PlacaConCuenta_RetornaCuentaDetalle()
    {
        // Arrange
        using var db = NuevoContexto();
        db.CuentasTelepeaje.Add(new CuentaTelepeaje
        {
            IdCuenta = 10,
            PlacaVehiculo = "KJN456",
            TagRfidSerial = "TAG-COL-9900112235",
            SaldoDisponible = 75000m,
            EstadoCuenta = "ACTIVA"
        });
        await db.SaveChangesAsync();

        var servicio = new TelepeajeMonitoreoService(db, NullLogger<TelepeajeMonitoreoService>.Instance, new Cobro.AjustesAtomicosEnMemoria(db));

        // Act
        var resultado = await servicio.ObtenerCuentaPorPlacaAsync("KJN456");

        // Assert
        Assert.NotNull(resultado);
        Assert.Equal(10, resultado.IdCuenta);
        Assert.Equal("KJN456", resultado.PlacaVehiculo);
        Assert.Equal("TAG-COL-9900112235", resultado.TagRfidSerial);
        Assert.Equal(75000m, resultado.SaldoDisponible);
        Assert.Equal("ACTIVA", resultado.EstadoCuenta);
    }

    [Fact]
    public async Task ObtenerCuentaPorPlacaAsync_PlacaSinCuenta_LanzaNotFoundException()
    {
        // Arrange
        using var db = NuevoContexto();
        var servicio = new TelepeajeMonitoreoService(db, NullLogger<TelepeajeMonitoreoService>.Instance, new Cobro.AjustesAtomicosEnMemoria(db));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => servicio.ObtenerCuentaPorPlacaAsync("ZZZ999"));
        Assert.Equal(404, ex.StatusCode);
        Assert.Equal("CUENTA_NO_ENCONTRADA", ex.Codigo);
    }

    [Fact]
    public async Task ObtenerCuentaPorPlacaAsync_PlacaConMinusculasYEspacios_NormalizaYEncuentraCuenta()
    {
        // Arrange
        using var db = NuevoContexto();
        db.CuentasTelepeaje.Add(new CuentaTelepeaje
        {
            IdCuenta = 20,
            PlacaVehiculo = "KJN456",
            TagRfidSerial = "TAG-COL-9900112235",
            SaldoDisponible = 80000m,
            EstadoCuenta = "ACTIVA"
        });
        await db.SaveChangesAsync();

        var servicio = new TelepeajeMonitoreoService(db, NullLogger<TelepeajeMonitoreoService>.Instance, new Cobro.AjustesAtomicosEnMemoria(db));

        // Act
        var resultado = await servicio.ObtenerCuentaPorPlacaAsync("  kjn 456  ");

        // Assert
        Assert.NotNull(resultado);
        Assert.Equal("KJN456", resultado.PlacaVehiculo);
        Assert.Equal(80000m, resultado.SaldoDisponible);
    }
}
