using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Cobro;

public class CobroExentoTests
{
    private static PeajeSysDbContext NuevoContexto() =>
        new(new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static async Task<(PeajeSysDbContext Db, Turno Turno, Tarifa Tarifa, CuentaTelepeaje Cuenta)> InicializarDatosPruebaAsync(PeajeSysDbContext db)
    {
        var estacion = new EstacionPeaje
        {
            IdEstacion = 1,
            Nombre = "Estacion Principal",
            CodigoEstacion = "EST-01",
            UbicacionGeografica = "KM 10",
            SentidoVia = "NORTE-SUR",
            Estado = "ACTIVA"
        };
        db.EstacionesPeaje.Add(estacion);

        var caseta = new Caseta
        {
            IdCaseta = 1,
            IdEstacion = 1,
            NumeroCarril = 1,
            TipoCarril = "MIXTO",
            Estado = "OPERATIVA"
        };
        db.Casetas.Add(caseta);

        var turno = new Turno
        {
            IdTurno = 1,
            IdCaseta = 1,
            IdOperador = 1,
            Fecha = DateTime.UtcNow.Date,
            Diurno = true,
            FondoInicialCaja = 200000m,
            TotalRecaudadoEfectivo = 10000m,
            Estado = "ABIERTO"
        };
        db.Turnos.Add(turno);

        var tarifa = new Tarifa
        {
            IdTarifa = 1,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 15000m,
            ResolucionLegal = "RES-2026-01",
            FechaInicioVigencia = DateTime.UtcNow.Date.AddDays(-10),
            FechaFinVigencia = null,
            Activa = true
        };
        db.Tarifas.Add(tarifa);

        var vehiculo = new Vehiculo
        {
            Placa = "ABC123",
            IdCategoria = 1,
            Marca = "Chevrolet",
            Modelo = "Spark",
            Color = "Blanco"
        };
        db.Vehiculos.Add(vehiculo);

        var cuenta = new CuentaTelepeaje
        {
            IdCuenta = 1,
            PlacaVehiculo = "ABC123",
            TagRfidSerial = "TAG-COL-0001",
            SaldoDisponible = 50000m,
            EstadoCuenta = "ACTIVA"
        };
        db.CuentasTelepeaje.Add(cuenta);

        await db.SaveChangesAsync();
        return (db, turno, tarifa, cuenta);
    }

    [Fact]
    public async Task ProcesarCobroAsync_MetodoPagoExento_SeGuardaConMontoCeroEstadoExentoYNoTocaSaldoNiRecaudoEfectivo()
    {
        // Arrange
        using var db = NuevoContexto();
        var (_, turno, tarifa, cuenta) = await InicializarDatosPruebaAsync(db);
        var servicio = new CobroService(db);

        var request = new CobroRequestDto
        {
            IdTurno = turno.IdTurno,
            IdCategoria = tarifa.IdCategoria,
            IdTarifa = tarifa.IdTarifa,
            MetodoPago = "EXENTO",
            PlacaDetectada = "ABC123"
        };

        // Act
        var response = await servicio.ProcesarCobroAsync(request);

        // Assert - Respuesta del servicio
        Assert.NotNull(response);
        Assert.Equal(0m, response.MontoTarifa);
        Assert.Equal("EXENTO", response.MetodoPago);
        Assert.Equal("EXENTO", response.EstadoPaso);
        Assert.Null(response.EfectivoRecibido);
        Assert.Null(response.Cambio);
        Assert.Null(response.SaldoPosterior);
        Assert.Null(response.DetalleTelepeaje);

        Assert.NotNull(response.Transaccion);
        Assert.Equal(0m, response.Transaccion.MontoTarifa);
        Assert.Equal("EXENTO", response.Transaccion.MetodoPago);
        Assert.Equal("EXENTO", response.Transaccion.EstadoPaso);

        // Assert - Persistencia en base de datos
        var transaccionDb = await db.TransaccionesPeaje.FirstOrDefaultAsync(t => t.IdTransaccion == response.IdTransaccion);
        Assert.NotNull(transaccionDb);
        Assert.Equal(0m, transaccionDb.MontoTarifa);
        Assert.Equal("EXENTO", transaccionDb.MetodoPago);
        Assert.Equal("EXENTO", transaccionDb.EstadoPaso);

        // Assert - El saldo de la cuenta de telepeaje no fue debitado
        var cuentaDb = await db.CuentasTelepeaje.FindAsync(cuenta.IdCuenta);
        Assert.NotNull(cuentaDb);
        Assert.Equal(50000m, cuentaDb.SaldoDisponible);

        // Assert - El acumulador de efectivo en turno no se altera
        var turnoDb = await db.Turnos.FindAsync(turno.IdTurno);
        Assert.NotNull(turnoDb);
        Assert.Equal(10000m, turnoDb.TotalRecaudadoEfectivo);
    }

    [Fact]
    public async Task ProcesarCobroAsync_MetodoPagoDesconocido_LanzaAppException422MetodoPagoInvalido()
    {
        // Arrange
        using var db = NuevoContexto();
        var (_, turno, tarifa, _) = await InicializarDatosPruebaAsync(db);
        var servicio = new CobroService(db);

        var request = new CobroRequestDto
        {
            IdTurno = turno.IdTurno,
            IdCategoria = tarifa.IdCategoria,
            IdTarifa = tarifa.IdTarifa,
            MetodoPago = "CRIPTOMONEDA",
            PlacaDetectada = "ABC123"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AppException>(() => servicio.ProcesarCobroAsync(request));
        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("METODO_PAGO_INVALIDO", ex.Codigo);
    }

    [Fact]
    public async Task ProcesarCobroAsync_MetodoPagoEfectivo_SigueFuncionandoIgual()
    {
        // Arrange
        using var db = NuevoContexto();
        var (_, turno, tarifa, _) = await InicializarDatosPruebaAsync(db);
        var servicio = new CobroService(db);

        var request = new CobroRequestDto
        {
            IdTurno = turno.IdTurno,
            IdCategoria = tarifa.IdCategoria,
            IdTarifa = tarifa.IdTarifa,
            MetodoPago = "EFECTIVO",
            PlacaDetectada = "ABC123",
            Recibido = 20000m
        };

        // Act
        var response = await servicio.ProcesarCobroAsync(request);

        // Assert
        Assert.NotNull(response);
        Assert.Equal(15000m, response.MontoTarifa);
        Assert.Equal("EFECTIVO", response.MetodoPago);
        Assert.Equal("APROBADO", response.EstadoPaso);
        Assert.Equal(20000m, response.EfectivoRecibido);
        Assert.Equal(5000m, response.Cambio);
        Assert.Null(response.SaldoPosterior);

        var turnoDb = await db.Turnos.FindAsync(turno.IdTurno);
        Assert.NotNull(turnoDb);
        Assert.Equal(25000m, turnoDb.TotalRecaudadoEfectivo);
    }

    [Fact]
    public async Task ProcesarCobroAsync_MetodoPagoTelepeaje_SigueFuncionandoIgual()
    {
        // Arrange
        using var db = NuevoContexto();
        var (_, turno, tarifa, cuenta) = await InicializarDatosPruebaAsync(db);
        var servicio = new CobroService(db);

        var request = new CobroRequestDto
        {
            IdTurno = turno.IdTurno,
            IdCategoria = tarifa.IdCategoria,
            IdTarifa = tarifa.IdTarifa,
            MetodoPago = "TELEPEAJE",
            PlacaDetectada = "ABC123"
        };

        // Act
        var response = await servicio.ProcesarCobroAsync(request);

        // Assert
        Assert.NotNull(response);
        Assert.Equal(15000m, response.MontoTarifa);
        Assert.Equal("TELEPEAJE", response.MetodoPago);
        Assert.Equal("APROBADO", response.EstadoPaso);
        Assert.Equal(35000m, response.SaldoPosterior);
        Assert.NotNull(response.DetalleTelepeaje);

        var cuentaDb = await db.CuentasTelepeaje.FindAsync(cuenta.IdCuenta);
        Assert.NotNull(cuentaDb);
        Assert.Equal(35000m, cuentaDb.SaldoDisponible);

        var turnoDb = await db.Turnos.FindAsync(turno.IdTurno);
        Assert.NotNull(turnoDb);
        Assert.Equal(10000m, turnoDb.TotalRecaudadoEfectivo);
    }
}
