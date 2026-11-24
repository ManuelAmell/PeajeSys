using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.Entities;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Supervisor;

/// <summary>El recaudo diario trae el desglose por caseta/carril, sin anuladas y con los mismos filtros.</summary>
public class RecaudoCarrilesTests
{
    private static long _sig = 5000;

    private static PeajeSysDbContext Crear()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        var db = new PeajeSysDbContext(options);
        db.EstacionesPeaje.AddRange(
            new EstacionPeaje { IdEstacion = 1, Nombre = "Estacion Gambote", CodigoEstacion = "GAM" },
            new EstacionPeaje { IdEstacion = 2, Nombre = "Estacion Turbaco", CodigoEstacion = "TUR" });
        db.Casetas.AddRange(
            new Caseta { IdCaseta = 1, IdEstacion = 1, NumeroCarril = 1, TipoCarril = "MANUAL" },
            new Caseta { IdCaseta = 2, IdEstacion = 1, NumeroCarril = 2, TipoCarril = "MIXTO" },
            new Caseta { IdCaseta = 3, IdEstacion = 2, NumeroCarril = 1, TipoCarril = "MANUAL" });
        db.Operadores.Add(new Operador { IdOperador = 1, NumeroDocumento = "1", Nombres = "A", Apellidos = "R", CodigoEmpleado = "REC-001" });
        db.Turnos.AddRange(
            new Turno { IdTurno = 1, IdCaseta = 1, IdOperador = 1, Estado = "ABIERTO" },
            new Turno { IdTurno = 2, IdCaseta = 2, IdOperador = 1, Estado = "CERRADO" },
            new Turno { IdTurno = 3, IdCaseta = 3, IdOperador = 1, Estado = "CERRADO" });
        db.SaveChanges();
        return db;
    }

    private static void Tx(PeajeSysDbContext db, long turno, string metodo, decimal monto, DateTime fechaUtc, bool anulada = false)
    {
        long id = ++_sig;
        db.TransaccionesPeaje.Add(new TransaccionPeaje
        {
            IdTransaccion = id, IdTurno = turno, IdTarifa = 1, IdCategoria = 1, MontoTarifa = monto,
            MetodoPago = metodo, NumeroTicket = $"T-{id}", FechaHora = fechaUtc, EstadoPaso = "APROBADO"
        });
        if (anulada)
        {
            db.AuditoriasTransaccion.Add(new AuditoriaTransaccion { IdTransaccion = id, TipoOperacion = "VOID", UsuarioSistema = "REC-001", Motivo = "x" });
        }
        db.SaveChanges();
    }

    // 2026-03-02 15:00 UTC = 10:00 Bogota (dia 02). 2026-03-03 02:00 UTC = 21:00 Bogota del dia 02.
    private static readonly DateTime Dia2 = new(2026, 3, 2, 15, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime Dia2Noche = new(2026, 3, 3, 2, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime Dia3 = new(2026, 3, 3, 15, 0, 0, DateTimeKind.Utc);

    private static PeajeSysDbContext Sembrado()
    {
        var db = Crear();
        Tx(db, 1, "EFECTIVO", 10000, Dia2);
        Tx(db, 1, "TELEPEAJE", 8000, Dia2Noche);
        Tx(db, 1, "EFECTIVO", 4000, Dia2, anulada: true);
        Tx(db, 2, "TELEPEAJE", 7000, Dia2);
        Tx(db, 2, "EFECTIVO", 5000, Dia3);
        Tx(db, 3, "EFECTIVO", 9000, Dia2);
        Tx(db, 3, "EFECTIVO", 3000, Dia2, anulada: true);
        return db;
    }

    private static (int Caseta, int Carril, string Tipo, long Veh, decimal Ef, decimal Tag, decimal Total) F(dynamic c) =>
        ((int)c.IdCaseta, (int)c.NumeroCarril, (string)c.TipoCarril, (long)c.Veh, (decimal)c.Ef, (decimal)c.Tag, (decimal)c.Total);

    [Fact]
    public async Task SinFiltros_DesglosaPorCasetaExcluyendoAnuladas()
    {
        var r = await new ReporteRecaudoService(Sembrado()).ObtenerRecaudoDiarioAsync(null, null);

        Assert.Equal(new[]
        {
            (1, 1, "MANUAL", 2L, 10000m, 8000m, 18000m),
            (2, 2, "MIXTO", 2L, 5000m, 7000m, 12000m),
            (3, 1, "MANUAL", 1L, 9000m, 0m, 9000m)
        }, r.Carriles.Select(c => F(c)).ToArray());
    }

    [Fact]
    public async Task ConFecha_UsaElDiaCivilDeBogota()
    {
        // El dia civil 02 incluye la transaccion de las 21:00 Bogota (02:00 UTC del 03).
        var r = await new ReporteRecaudoService(Sembrado()).ObtenerRecaudoDiarioAsync(null, "2026-03-02");

        Assert.Equal(new[]
        {
            (1, 1, "MANUAL", 2L, 10000m, 8000m, 18000m),
            (2, 2, "MIXTO", 1L, 0m, 7000m, 7000m),
            (3, 1, "MANUAL", 1L, 9000m, 0m, 9000m)
        }, r.Carriles.Select(c => F(c)).ToArray());
    }

    [Fact]
    public async Task ConEstacion_SoloCasetasDeLaEstacion()
    {
        var r = await new ReporteRecaudoService(Sembrado()).ObtenerRecaudoDiarioAsync(2, null);

        Assert.Equal(new[] { (3, 1, "MANUAL", 1L, 9000m, 0m, 9000m) }, r.Carriles.Select(c => F(c)).ToArray());
    }

    [Fact]
    public async Task CarrilesSumanLosTotalesDelRecaudo()
    {
        var r = await new ReporteRecaudoService(Sembrado()).ObtenerRecaudoDiarioAsync(null, null);

        Assert.Equal(r.TotalVehiculos, r.Carriles.Sum(c => c.Veh));
        Assert.Equal(r.TotalGeneral, r.Carriles.Sum(c => c.Total));
    }

    [Fact]
    public async Task SinTransacciones_CarrilesVacio()
    {
        var r = await new ReporteRecaudoService(Crear()).ObtenerRecaudoDiarioAsync(null, "2026-03-02");

        Assert.Empty(r.Carriles);
    }
}
