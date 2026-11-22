using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Cobro;

/// <summary>Correcciones del code-review sobre el cobro: EF InMemory con fakes (sin SQL crudo ni triggers).</summary>
public class CobroCorreccionesTests
{
    private static readonly ActorOperacion Dueno = new(1, "REC-001", "RECAUDADOR");
    private static readonly ActorOperacion Ajeno = new(2, "REC-002", "RECAUDADOR");
    private static readonly ActorOperacion Supervisor = new(3, "SUP-001", "SUPERVISOR");

    private sealed class ContadorSaves : SaveChangesInterceptor
    {
        public int Llamadas;
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData e, InterceptionResult<int> r, System.Threading.CancellationToken ct = default)
        {
            Llamadas++;
            return base.SavingChangesAsync(e, r, ct);
        }
    }

    private static async Task<(PeajeSysDbContext Db, ContadorSaves Saves)> CrearAsync()
    {
        var saves = new ContadorSaves();
        var db = new PeajeSysDbContext(new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(saves)
            .Options);
        var hoy = DateTime.UtcNow.Date;
        db.EstacionesPeaje.AddRange(
            new EstacionPeaje { IdEstacion = 1, Nombre = "E1", CodigoEstacion = "E1", Estado = "ACTIVA" },
            new EstacionPeaje { IdEstacion = 2, Nombre = "E2", CodigoEstacion = "E2", Estado = "ACTIVA" });
        db.Casetas.Add(new Caseta { IdCaseta = 1, IdEstacion = 1, NumeroCarril = 1, TipoCarril = "MIXTO", Estado = "OPERATIVA" });
        db.Turnos.Add(new Turno { IdTurno = 1, IdCaseta = 1, IdOperador = 1, Fecha = hoy, FondoInicialCaja = 1000m, TotalRecaudadoEfectivo = 10000m, Estado = "ABIERTO" });
        db.Tarifas.AddRange(
            new Tarifa { IdTarifa = 1, IdEstacion = 1, IdCategoria = 1, Monto = 8000m, ResolucionLegal = "R", FechaInicioVigencia = hoy.AddDays(-10), Activa = true },
            new Tarifa { IdTarifa = 2, IdEstacion = 1, IdCategoria = 2, Monto = 9000m, ResolucionLegal = "R", FechaInicioVigencia = hoy.AddDays(-10), Activa = true },
            new Tarifa { IdTarifa = 3, IdEstacion = 2, IdCategoria = 1, Monto = 7000m, ResolucionLegal = "R", FechaInicioVigencia = hoy.AddDays(-10), Activa = true },
            new Tarifa { IdTarifa = 4, IdEstacion = 1, IdCategoria = 1, Monto = 6000m, ResolucionLegal = "R", FechaInicioVigencia = hoy.AddDays(-10), Activa = false },
            new Tarifa { IdTarifa = 5, IdEstacion = 1, IdCategoria = 1, Monto = 5000m, ResolucionLegal = "R", FechaInicioVigencia = hoy.AddDays(-30), FechaFinVigencia = hoy.AddDays(-5), Activa = true },
            new Tarifa { IdTarifa = 6, IdEstacion = 1, IdCategoria = 1, Monto = 4000m, ResolucionLegal = "R", FechaInicioVigencia = hoy.AddDays(5), Activa = true });
        db.CuentasTelepeaje.Add(new CuentaTelepeaje { IdCuenta = 1, PlacaVehiculo = "ABC123", TagRfidSerial = "TAG-1", SaldoDisponible = 50000m, EstadoCuenta = "ACTIVA" });
        await db.SaveChangesAsync();
        saves.Llamadas = 0;
        return (db, saves);
    }

    private static CobroService Servicio(PeajeSysDbContext db, IGeneradorNumeroTicket? gen = null) =>
        new(db, gen ?? new GeneradorTicketFalso(), new AjustesAtomicosEnMemoria(db));

    private static CobroRequestDto Req(string metodo = "EFECTIVO", int? tarifa = null, int categoria = 1) => new()
    {
        IdTurno = 1, IdCategoria = categoria, IdTarifa = tarifa, MetodoPago = metodo,
        PlacaDetectada = "ABC123", EfectivoRecibido = 20000m
    };

    [Fact]
    public async Task Recaudador_Ajeno_Recibe403_TurnoAjeno_Y_No_Se_Registra_Nada()
    {
        var (db, _) = await CrearAsync();
        using var _d = db;

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => Servicio(db).ProcesarCobroAsync(Req(), Ajeno));

        Assert.Equal("TURNO_AJENO", ex.Codigo);
        Assert.Empty(db.TransaccionesPeaje);
    }

    [Fact]
    public async Task Supervisor_Tampoco_Cobra_En_El_Turno_De_Otro()
    {
        var (db, _) = await CrearAsync();
        using var _d = db;

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => Servicio(db).ProcesarCobroAsync(Req(), Supervisor));

        Assert.Equal("TURNO_AJENO", ex.Codigo);
    }

    [Fact]
    public async Task Dueno_Del_Turno_Cobra_Normalmente()
    {
        var (db, _) = await CrearAsync();
        using var _d = db;

        var r = await Servicio(db).ProcesarCobroAsync(Req(), Dueno);

        Assert.Equal(8000m, r.MontoTarifa);
    }

    [Theory]
    [InlineData(2, "otra categoria")]
    [InlineData(3, "otra estacion")]
    [InlineData(4, "inactiva")]
    [InlineData(5, "vencida")]
    [InlineData(6, "aun no vigente")]
    [InlineData(999, "inexistente")]
    public async Task IdTarifa_No_Aplicable_Responde_422_TarifaNoAplicable(int idTarifa, string motivo)
    {
        var (db, _) = await CrearAsync();
        using var _d = db;

        var ex = await Assert.ThrowsAsync<AppException>(() => Servicio(db).ProcesarCobroAsync(Req(tarifa: idTarifa), Dueno));

        Assert.True(ex.StatusCode == 422 && ex.Codigo == "TARIFA_NO_APLICABLE", motivo);
        Assert.Empty(db.TransaccionesPeaje);
    }

    [Fact]
    public async Task IdTarifa_Aplicable_Se_Usa()
    {
        var (db, _) = await CrearAsync();
        using var _d = db;

        var r = await Servicio(db).ProcesarCobroAsync(Req(tarifa: 1), Dueno);

        Assert.Equal(8000m, r.MontoTarifa);
    }

    [Fact]
    public async Task Telepeaje_Crea_Transaccion_Y_Detalle_En_Un_Solo_SaveChanges()
    {
        var (db, saves) = await CrearAsync();
        using var _d = db;

        var r = await Servicio(db).ProcesarCobroAsync(Req("TELEPEAJE"), Dueno);

        Assert.Equal(1, saves.Llamadas);
        var detalle = Assert.Single(db.DetallesPagoTelepeaje);
        Assert.Equal(r.IdTransaccion, detalle.IdTransaccion);
        Assert.Equal(50000m, detalle.SaldoAnterior);
        Assert.Equal(42000m, detalle.SaldoPosterior);
        Assert.Equal(42000m, r.SaldoPosterior);
    }

    [Fact]
    public async Task Telepeaje_Con_Saldo_Insuficiente_Responde_422_Y_No_Deja_Rastro()
    {
        var (db, _) = await CrearAsync();
        using var _d = db;
        db.CuentasTelepeaje.Single().SaldoDisponible = 7000m;
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<AppException>(() => Servicio(db).ProcesarCobroAsync(Req("TELEPEAJE"), Dueno));

        Assert.Equal("SALDO_INSUFICIENTE", ex.Codigo);
        Assert.Equal(422, ex.StatusCode);
        Assert.Empty(db.TransaccionesPeaje);
        Assert.Equal(7000m, db.CuentasTelepeaje.Single().SaldoDisponible);
    }

    [Fact]
    public async Task Efectivo_La_Aplicacion_No_Escribe_TotalRecaudadoEfectivo()
    {
        var (db, _) = await CrearAsync();
        using var _d = db;

        await Servicio(db).ProcesarCobroAsync(Req(), Dueno);

        // El acumulado lo suma el trigger de BD; con InMemory (sin trigger) el valor no debe cambiar.
        Assert.Equal(10000m, db.Turnos.Single().TotalRecaudadoEfectivo);
    }

    [Fact]
    public async Task Si_La_Secuencia_Falla_La_Excepcion_Sube_Sin_Respaldo_En_Memoria()
    {
        var (db, _) = await CrearAsync();
        using var _d = db;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Servicio(db, new GeneradorTicketQueFalla()).ProcesarCobroAsync(Req(), Dueno));

        Assert.Empty(db.TransaccionesPeaje);
    }

    [Fact]
    public async Task Anular_Telepeaje_Sin_Detalle_Responde_409_Sin_Registrar_Void()
    {
        var (db, _) = await CrearAsync();
        using var _d = db;
        db.TransaccionesPeaje.Add(new TransaccionPeaje
        {
            IdTransaccion = 50, IdTurno = 1, IdTarifa = 1, IdCategoria = 1, PlacaDetectada = "ABC123",
            MontoTarifa = 8000m, MetodoPago = "TELEPEAJE", NumeroTicket = "T-50", EstadoPaso = "APROBADO"
        });
        await db.SaveChangesAsync();
        var svc = new TransaccionService(db, new AjustesAtomicosEnMemoria(db));

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            svc.AnularAsync(50, new AnularTransaccionRequestDto { Motivo = "error" }, Dueno));

        Assert.Equal("DETALLE_TELEPEAJE_AUSENTE", ex.Codigo);
        Assert.Empty(db.AuditoriasTransaccion);
    }
}
