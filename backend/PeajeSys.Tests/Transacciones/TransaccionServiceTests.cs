using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Transacciones;

/// <summary>Servicio real de transacciones sobre EF InMemory: listado y anulacion (VOID en auditoria).</summary>
public class TransaccionServiceTests
{
    private static readonly ActorOperacion Rec1 = new(1, "REC-001", Roles.Recaudador);
    private static readonly ActorOperacion Rec2 = new(2, "REC-002", Roles.Recaudador);
    private static readonly ActorOperacion Sup = new(3, "SUP-001", Roles.Supervisor);

    private const long TurnoAbierto = 10;
    private const long TurnoCerrado = 11;
    private const long TxEfectivo = 100;
    private const long TxTelepeaje = 101;
    private const long TxExento = 102;
    private const long TxEnCerrado = 103;

    private static (TransaccionService servicio, PeajeSysDbContext db) Crear()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new PeajeSysDbContext(options);
        var t0 = new DateTime(2026, 3, 1, 8, 0, 0, DateTimeKind.Utc);

        db.Turnos.AddRange(
            new Turno { IdTurno = TurnoAbierto, IdCaseta = 1, IdOperador = 1, FondoInicialCaja = 1000, TotalRecaudadoEfectivo = 25000, Estado = "ABIERTO" },
            new Turno { IdTurno = TurnoCerrado, IdCaseta = 2, IdOperador = 2, FondoInicialCaja = 1000, TotalRecaudadoEfectivo = 9000, Estado = "CERRADO" });
        db.CuentasTelepeaje.Add(new CuentaTelepeaje { IdCuenta = 5, PlacaVehiculo = "KJN456", TagRfidSerial = "TAG-5", SaldoDisponible = 40000, EstadoCuenta = "ACTIVA" });
        // Se insertan desordenadas a proposito para comprobar el orden por fecha_hora.
        db.TransaccionesPeaje.AddRange(
            new TransaccionPeaje { IdTransaccion = TxTelepeaje, IdTurno = TurnoAbierto, IdTarifa = 1, IdCategoria = 1, PlacaDetectada = "KJN456", MontoTarifa = 10000, MetodoPago = "TELEPEAJE", NumeroTicket = "T-101", FechaHora = t0.AddMinutes(2), EstadoPaso = "APROBADO" },
            new TransaccionPeaje { IdTransaccion = TxEfectivo, IdTurno = TurnoAbierto, IdTarifa = 1, IdCategoria = 1, PlacaDetectada = "ABC123", MontoTarifa = 10500, MetodoPago = "EFECTIVO", NumeroTicket = "T-100", FechaHora = t0.AddMinutes(1), EstadoPaso = "APROBADO" },
            new TransaccionPeaje { IdTransaccion = TxExento, IdTurno = TurnoAbierto, IdTarifa = 1, IdCategoria = 1, PlacaDetectada = "OFI001", MontoTarifa = 0, MetodoPago = "EXENTO", NumeroTicket = "T-102", FechaHora = t0.AddMinutes(3), EstadoPaso = "EXENTO" },
            new TransaccionPeaje { IdTransaccion = TxEnCerrado, IdTurno = TurnoCerrado, IdTarifa = 1, IdCategoria = 1, PlacaDetectada = "ZZZ999", MontoTarifa = 9000, MetodoPago = "EFECTIVO", NumeroTicket = "T-103", FechaHora = t0, EstadoPaso = "APROBADO" });
        db.DetallesPagoTelepeaje.Add(new DetallePagoTelepeaje { IdDetalleTelepeaje = 1, IdTransaccion = TxTelepeaje, IdCuenta = 5, SaldoAnterior = 50000, SaldoPosterior = 40000, AntenaLectoraId = "ANTENA-01" });
        db.SaveChanges();
        return (new TransaccionService(db), db);
    }

    private static AnularTransaccionRequestDto Motivo(string m = "Cobro duplicado") => new() { Motivo = m };

    [Fact]
    public async Task Anular_Efectivo_RestaDelTotalDelTurnoYRegistraVoid()
    {
        var (svc, db) = Crear();

        var r = await svc.AnularAsync(TxEfectivo, Motivo(), Rec1);

        Assert.Equal(14500m, db.Turnos.Single(t => t.IdTurno == TurnoAbierto).TotalRecaudadoEfectivo);
        var aud = db.AuditoriasTransaccion.Single();
        Assert.Equal("VOID", aud.TipoOperacion);
        Assert.Equal(TxEfectivo, aud.IdTransaccion);
        Assert.Equal("REC-001", aud.UsuarioSistema);
        Assert.Equal("Cobro duplicado", aud.Motivo);
        Assert.Equal(TxEfectivo, r.Transaccion.IdTransaccion);
        Assert.Equal(aud.IdAuditoria, r.Auditoria.IdAuditoria);
        Assert.Equal("VOID", r.Auditoria.TipoOperacion);
    }

    [Fact]
    public async Task Anular_NoModificaLaFilaDeLaTransaccion()
    {
        var (svc, db) = Crear();

        await svc.AnularAsync(TxEfectivo, Motivo(), Rec1);

        var tx = db.TransaccionesPeaje.Single(t => t.IdTransaccion == TxEfectivo);
        Assert.Equal("APROBADO", tx.EstadoPaso);
        Assert.Equal(10500m, tx.MontoTarifa);
    }

    [Fact]
    public async Task Anular_Telepeaje_DevuelveElSaldoALaCuentaYNoTocaElEfectivo()
    {
        var (svc, db) = Crear();

        await svc.AnularAsync(TxTelepeaje, Motivo(), Rec1);

        Assert.Equal(50000m, db.CuentasTelepeaje.Single().SaldoDisponible);
        Assert.Equal(25000m, db.Turnos.Single(t => t.IdTurno == TurnoAbierto).TotalRecaudadoEfectivo);
    }

    [Fact]
    public async Task Anular_Exento_NoMueveDinero()
    {
        var (svc, db) = Crear();

        await svc.AnularAsync(TxExento, Motivo(), Rec1);

        Assert.Equal(25000m, db.Turnos.Single(t => t.IdTurno == TurnoAbierto).TotalRecaudadoEfectivo);
        Assert.Equal(40000m, db.CuentasTelepeaje.Single().SaldoDisponible);
        Assert.Equal("VOID", db.AuditoriasTransaccion.Single().TipoOperacion);
    }

    [Fact]
    public async Task Anular_DosVeces_Lanza409TransaccionYaAnulada_YNoDuplicaElDinero()
    {
        var (svc, db) = Crear();
        await svc.AnularAsync(TxEfectivo, Motivo(), Rec1);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => svc.AnularAsync(TxEfectivo, Motivo(), Rec1));

        Assert.Equal("TRANSACCION_YA_ANULADA", ex.Codigo);
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal(14500m, db.Turnos.Single(t => t.IdTurno == TurnoAbierto).TotalRecaudadoEfectivo);
        Assert.Single(db.AuditoriasTransaccion);
    }

    [Fact]
    public async Task Anular_TurnoCerrado_Lanza409TurnoCerrado()
    {
        var (svc, db) = Crear();

        var ex = await Assert.ThrowsAsync<ConflictException>(() => svc.AnularAsync(TxEnCerrado, Motivo(), Sup));

        Assert.Equal("TURNO_CERRADO", ex.Codigo);
        Assert.Empty(db.AuditoriasTransaccion);
        Assert.Equal(9000m, db.Turnos.Single(t => t.IdTurno == TurnoCerrado).TotalRecaudadoEfectivo);
    }

    [Fact]
    public async Task Anular_IdInexistente_Lanza404TransaccionNoEncontrada()
    {
        var (svc, _) = Crear();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => svc.AnularAsync(9999, Motivo(), Sup));

        Assert.Equal("TRANSACCION_NO_ENCONTRADA", ex.Codigo);
    }

    [Fact]
    public async Task Anular_RecaudadorAjeno_Lanza403_YNoCambiaNada()
    {
        var (svc, db) = Crear();

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => svc.AnularAsync(TxEfectivo, Motivo(), Rec2));

        Assert.Equal(403, ex.StatusCode);
        Assert.Empty(db.AuditoriasTransaccion);
        Assert.Equal(25000m, db.Turnos.Single(t => t.IdTurno == TurnoAbierto).TotalRecaudadoEfectivo);
    }

    [Fact]
    public async Task Anular_SupervisorPuedeAnularTransaccionDeOtroOperador()
    {
        var (svc, db) = Crear();

        await svc.AnularAsync(TxEfectivo, Motivo(), Sup);

        Assert.Equal("SUP-001", db.AuditoriasTransaccion.Single().UsuarioSistema);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Anular_MotivoVacio_Lanza422MotivoRequerido(string? motivo)
    {
        var (svc, db) = Crear();

        var ex = await Assert.ThrowsAsync<DomainException>(() => svc.AnularAsync(TxEfectivo, new AnularTransaccionRequestDto { Motivo = motivo }, Rec1));

        Assert.Equal("MOTIVO_REQUERIDO", ex.Codigo);
        Assert.Equal(422, ex.StatusCode);
        Assert.Empty(db.AuditoriasTransaccion);
    }

    [Fact]
    public async Task Anular_MotivoDeMasDe255_Lanza422MotivoDemasiadoLargo_Y255EsValido()
    {
        var (svc, db) = Crear();

        var ex = await Assert.ThrowsAsync<DomainException>(() => svc.AnularAsync(TxEfectivo, Motivo(new string('m', 256)), Rec1));
        Assert.Equal("MOTIVO_DEMASIADO_LARGO", ex.Codigo);
        Assert.Empty(db.AuditoriasTransaccion);

        await svc.AnularAsync(TxEfectivo, Motivo(new string('m', 255)), Rec1);
        Assert.Equal(255, db.AuditoriasTransaccion.Single().Motivo!.Length);
    }

    [Fact]
    public async Task Listar_DevuelveLasDelTurnoOrdenadasPorFechaHora()
    {
        var (svc, _) = Crear();

        var lista = await svc.ListarPorTurnoAsync(TurnoAbierto, Rec1);

        Assert.Equal(new long[] { TxEfectivo, TxTelepeaje, TxExento }, lista.Select(t => t.IdTransaccion).ToArray());
        Assert.Equal("EFECTIVO", lista[0].MetodoPago);
        Assert.Equal("T-100", lista[0].NumeroTicket);
    }

    [Fact]
    public async Task Listar_TurnoInexistente_Lanza404TurnoNoEncontrado()
    {
        var (svc, _) = Crear();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => svc.ListarPorTurnoAsync(999, Sup));

        Assert.Equal("TURNO_NO_ENCONTRADO", ex.Codigo);
    }

    [Fact]
    public async Task Listar_RecaudadorAjeno_Lanza403_YSupervisorPuede()
    {
        var (svc, _) = Crear();

        await Assert.ThrowsAsync<ForbiddenException>(() => svc.ListarPorTurnoAsync(TurnoAbierto, Rec2));
        Assert.Equal(3, (await svc.ListarPorTurnoAsync(TurnoAbierto, Sup)).Count);
    }

    [Fact]
    public async Task Listar_NoMarcaAnuladas_PorqueElEsquemaDelFrontendNoTieneEseCampo()
    {
        var (svc, _) = Crear();
        await svc.AnularAsync(TxEfectivo, Motivo(), Rec1);

        var lista = await svc.ListarPorTurnoAsync(TurnoAbierto, Rec1);

        Assert.Equal(3, lista.Count);
        Assert.Equal("APROBADO", lista[0].EstadoPaso);
    }
}
