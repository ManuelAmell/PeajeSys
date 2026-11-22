using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.Entities;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Supervisor;

/// <summary>
/// Una transaccion anulada (VOID en AUDITORIA_TRANSACCION; la fila sigue en APROBADO) no cuenta en el arqueo
/// ni en el recaudo diario. EF InMemory no tiene la vista vw_resumen_diario_estacion: se compara con datos sembrados.
/// </summary>
public class TotalesSinAnuladasTests
{
    private static long _sig = 1000;

    private static PeajeSysDbContext Crear()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new PeajeSysDbContext(options);
        db.EstacionesPeaje.AddRange(
            new EstacionPeaje { IdEstacion = 1, Nombre = "Estacion Gambote", CodigoEstacion = "GAM" },
            new EstacionPeaje { IdEstacion = 2, Nombre = "Estacion Turbaco", CodigoEstacion = "TUR" });
        db.Casetas.AddRange(
            new Caseta { IdCaseta = 1, IdEstacion = 1, NumeroCarril = 1 },
            new Caseta { IdCaseta = 2, IdEstacion = 2, NumeroCarril = 1 });
        db.Operadores.AddRange(
            new Operador { IdOperador = 1, NumeroDocumento = "1", Nombres = "Alex", Apellidos = "R", CodigoEmpleado = "REC-001" },
            new Operador { IdOperador = 2, NumeroDocumento = "2", Nombres = "Camilo", Apellidos = "R", CodigoEmpleado = "REC-002" });
        db.Turnos.AddRange(
            new Turno { IdTurno = 1, IdCaseta = 1, IdOperador = 1, TotalRecaudadoEfectivo = 20000, Estado = "ABIERTO" },
            new Turno { IdTurno = 2, IdCaseta = 2, IdOperador = 2, TotalRecaudadoEfectivo = 7000, Estado = "ABIERTO" });
        db.SaveChanges();
        return db;
    }

    private static long Tx(PeajeSysDbContext db, long turno, string metodo, decimal monto, DateTime fechaUtc, bool anulada = false)
    {
        long id = ++_sig;
        db.TransaccionesPeaje.Add(new TransaccionPeaje
        {
            IdTransaccion = id, IdTurno = turno, IdTarifa = 1, IdCategoria = 1, MontoTarifa = monto,
            MetodoPago = metodo, NumeroTicket = $"T-{id}", FechaHora = fechaUtc, EstadoPaso = "APROBADO"
        });
        if (anulada)
        {
            db.AuditoriasTransaccion.Add(new AuditoriaTransaccion { IdTransaccion = id, TipoOperacion = "VOID", UsuarioSistema = "REC-001", Motivo = "duplicado" });
        }
        db.SaveChanges();
        return id;
    }

    // 2026-03-02 15:00 UTC = 10:00 Bogota (dia 02). 2026-03-03 02:00 UTC = 21:00 Bogota del dia 02.
    private static readonly DateTime Dia2 = new(2026, 3, 2, 15, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime Dia2Noche = new(2026, 3, 3, 2, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime Dia3 = new(2026, 3, 3, 15, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task Arqueo_TransaccionEnEfectivoAnulada_NoCuentaEnVehiculosNiEnEfectivo()
    {
        var db = Crear();
        Tx(db, 1, "EFECTIVO", 10000, Dia2);
        Tx(db, 1, "EFECTIVO", 10000, Dia2, anulada: true);
        // El servicio de anulacion ya dejo el efectivo del turno en 10000.
        db.Turnos.Single(t => t.IdTurno == 1).TotalRecaudadoEfectivo = 10000;
        db.SaveChanges();

        var arqueo = await new ArqueoService(db).CalcularArqueoAsync(1, 10000);

        Assert.Equal(1, arqueo.TotalVehiculos);
        Assert.Equal(10000m, arqueo.EfectivoSistema);
        Assert.Equal("CUADRADO", arqueo.EstadoArqueo);
    }

    [Fact]
    public async Task CierreArqueo_SumaDeEfectivoNoIncluyeAnuladas()
    {
        var db = Crear();
        Tx(db, 1, "EFECTIVO", 10000, Dia2);
        Tx(db, 1, "EFECTIVO", 4000, Dia2, anulada: true);

        var r = await new SpCerrarArqueoTurnoService(db).CerrarArqueoTurnoAsync(1, 10000);

        Assert.Equal(10000m, r.TotalSistema);
    }

    private static void SembrarMixto(PeajeSysDbContext db, bool conAnuladas)
    {
        Tx(db, 1, "EFECTIVO", 10000, Dia2);
        Tx(db, 1, "TELEPEAJE", 8000, Dia2);
        Tx(db, 1, "EFECTIVO", 5000, Dia2Noche);   // dia civil 02
        Tx(db, 1, "EFECTIVO", 10000, Dia3);
        Tx(db, 2, "TELEPEAJE", 7000, Dia3);
        if (conAnuladas)
        {
            Tx(db, 1, "EFECTIVO", 10000, Dia2, anulada: true);
            Tx(db, 2, "TELEPEAJE", 7000, Dia3, anulada: true);
        }
    }

    [Fact]
    public async Task RecaudoDiario_SinFecha_CoincideConElCalculoPorEstacionYDiaCivil_SinAnuladas()
    {
        var db = Crear();
        SembrarMixto(db, conAnuladas: false);
        var sin = await new ReporteRecaudoService(db).ObtenerRecaudoDiarioAsync(null, null);

        var db2 = Crear();
        SembrarMixto(db2, conAnuladas: true);
        var con = await new ReporteRecaudoService(db2).ObtenerRecaudoDiarioAsync(null, null);

        Assert.Equal(5, sin.TotalVehiculos);
        Assert.Equal(25000m, sin.TotalEfectivo);
        Assert.Equal(15000m, sin.TotalTelepeaje);
        Assert.Equal(40000m, sin.TotalGeneral);
        Assert.Equal("Estacion Gambote", sin.Estacion);
        var filas = sin.Dias.Select(d => (d.Fecha, d.Veh, d.Ef, d.Tag, d.Total)).ToList();
        Assert.Equal(new[]
        {
            ("2026-03-02", 3L, 15000m, 8000m, 23000m),
            ("2026-03-03", 1L, 10000m, 0m, 10000m),
            ("2026-03-03", 1L, 0m, 7000m, 7000m)
        }, filas);
        // Con anuladas sembradas el resultado es identico.
        Assert.Equal(filas, con.Dias.Select(d => (d.Fecha, d.Veh, d.Ef, d.Tag, d.Total)).ToList());
        Assert.Equal(sin.TotalVehiculos, con.TotalVehiculos);
        Assert.Equal(sin.TotalGeneral, con.TotalGeneral);
    }

    [Fact]
    public async Task RecaudoDiario_ConFecha_ExcluyeAnuladas()
    {
        var db = Crear();
        SembrarMixto(db, conAnuladas: true);

        var r = await new ReporteRecaudoService(db).ObtenerRecaudoDiarioAsync(null, "2026-03-02");

        Assert.Equal(3, r.TotalVehiculos);
        Assert.Equal(15000m, r.TotalEfectivo);
        Assert.Equal(8000m, r.TotalTelepeaje);
        Assert.Equal(23000m, r.TotalGeneral);
    }

    [Fact]
    public async Task RecaudoDiario_SinFechaYSinTransacciones_DevuelveUnDiaVacio()
    {
        var db = Crear();
        var r = await new ReporteRecaudoService(db).ObtenerRecaudoDiarioAsync(null, null);
        Assert.Equal(0, r.TotalVehiculos);
        Assert.Single(r.Dias);
    }
}
