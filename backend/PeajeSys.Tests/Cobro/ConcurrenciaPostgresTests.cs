using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Cobro;

/// <summary>[Fact] que se salta sola si no hay PostgreSQL (peajesys_db o la cadena de PEAJESYS_PG_CONN).</summary>
public sealed class FactPostgresAttribute : FactAttribute
{
    public FactPostgresAttribute()
    {
        if (!ConcurrenciaPostgres.Disponible)
        {
            Skip = "PostgreSQL no disponible (defina PEAJESYS_PG_CONN o levante peajesys_db en 127.0.0.1:5432).";
        }
    }
}

internal static class ConcurrenciaPostgres
{
    public static readonly string Cadena =
        Environment.GetEnvironmentVariable("PEAJESYS_PG_CONN")
        ?? "Host=127.0.0.1;Port=5432;Database=peajesys_db;Username=postgres;Password=postgres;Timeout=2;Maximum Pool Size=40";

    public static readonly bool Disponible = Probar();

    private static bool Probar()
    {
        try
        {
            using var c = new NpgsqlConnection(Cadena);
            c.Open();
            using var cmd = new NpgsqlCommand("SELECT count(*) FROM turno", c);
            cmd.ExecuteScalar();
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }
}

/// <summary>
/// Concurrencia real contra PostgreSQL con los servicios de produccion (Npgsql + estrategia de reintentos).
/// Cada prueba crea sus propios datos (estacion, caseta, tarifa de 8000, turno, vehiculo, cuenta) y los borra al final.
/// </summary>
public class ConcurrenciaPostgresTests
{
    private const decimal Monto = 8000m;

    private sealed class Datos : IDisposable
    {
        public string Sufijo = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        public int IdEstacion, IdTarifa;
        public long IdTurno, IdCuenta;
        public string Placa => "Z" + Sufijo;

        public static Datos Crear(decimal saldo)
        {
            var d = new Datos();
            d.IdEstacion = Escalar<int>($"INSERT INTO estacion_peaje(nombre,codigo_estacion,ubicacion_geografica,sentido_via) VALUES ('Prueba {d.Sufijo}','ZT{d.Sufijo}','KM 0','N-S') RETURNING id_estacion");
            int idCaseta = Escalar<int>($"INSERT INTO caseta(id_estacion,numero_carril,tipo_carril) VALUES ({d.IdEstacion},1,'MIXTO') RETURNING id_caseta");
            d.IdTarifa = Escalar<int>($"INSERT INTO tarifa(id_estacion,id_categoria,monto,resolucion_legal,fecha_inicio_vigencia) VALUES ({d.IdEstacion},1,{Monto},'ZT','2020-01-01') RETURNING id_tarifa");
            int idOperador = Escalar<int>("SELECT id_operador FROM operador WHERE rol='RECAUDADOR' ORDER BY id_operador LIMIT 1");
            d.IdTurno = Escalar<long>($"INSERT INTO turno(id_caseta,id_operador,fondo_inicial_caja,total_recaudado_efectivo,estado) VALUES ({idCaseta},{idOperador},0,0,'ABIERTO') RETURNING id_turno");
            Ejecutar($"INSERT INTO vehiculo(placa,id_categoria) VALUES ('{d.Placa}',1)");
            d.IdCuenta = Escalar<long>($"INSERT INTO cuenta_telepeaje(placa_vehiculo,tag_rfid_serial,saldo_disponible) VALUES ('{d.Placa}','TAG-{d.Sufijo}',{saldo}) RETURNING id_cuenta");
            d.Actor = new ActorOperacion(idOperador, "REC-TEST", "RECAUDADOR");
            return d;
        }

        public ActorOperacion Actor = null!;

        public decimal Saldo() => Escalar<decimal>($"SELECT saldo_disponible FROM cuenta_telepeaje WHERE id_cuenta={IdCuenta}");
        public decimal TotalTurno() => Escalar<decimal>($"SELECT total_recaudado_efectivo FROM turno WHERE id_turno={IdTurno}");
        public void FijarSaldo(decimal s) => Ejecutar($"UPDATE cuenta_telepeaje SET saldo_disponible={s} WHERE id_cuenta={IdCuenta}");

        public CobroRequestDto Cobro(string metodo) => new()
        {
            IdTurno = IdTurno, IdCategoria = 1, MetodoPago = metodo, PlacaDetectada = Placa, EfectivoRecibido = Monto
        };

        public void Dispose()
        {
            Ejecutar($"DELETE FROM detalle_pago_telepeaje WHERE id_cuenta={IdCuenta}");
            Ejecutar($"DELETE FROM transaccion_peaje WHERE id_turno={IdTurno}");
            Ejecutar($"DELETE FROM turno WHERE id_turno={IdTurno}");
            Ejecutar($"DELETE FROM cuenta_telepeaje WHERE id_cuenta={IdCuenta}");
            Ejecutar($"DELETE FROM vehiculo WHERE placa='{Placa}'");
            Ejecutar($"DELETE FROM tarifa WHERE id_estacion={IdEstacion}");
            Ejecutar($"DELETE FROM caseta WHERE id_estacion={IdEstacion}");
            Ejecutar($"DELETE FROM estacion_peaje WHERE id_estacion={IdEstacion}");
        }
    }

    private static T Escalar<T>(string sql)
    {
        using var c = new NpgsqlConnection(ConcurrenciaPostgres.Cadena);
        c.Open();
        using var cmd = new NpgsqlCommand(sql, c);
        return (T)Convert.ChangeType(cmd.ExecuteScalar()!, typeof(T));
    }

    private static void Ejecutar(string sql)
    {
        using var c = new NpgsqlConnection(ConcurrenciaPostgres.Cadena);
        c.Open();
        using var cmd = new NpgsqlCommand(sql, c);
        cmd.ExecuteNonQuery();
    }

    private static PeajeSysDbContext NuevoDb() => new(new DbContextOptionsBuilder<PeajeSysDbContext>()
        .UseNpgsql(ConcurrenciaPostgres.Cadena, o => o.EnableRetryOnFailure(3, TimeSpan.FromSeconds(1), null))
        .Options);

    private static async Task<(bool Ok, string? Codigo)[]> EnParalelo(int n, Func<int, Task> accion)
    {
        var puerta = new TaskCompletionSource();
        var tareas = Enumerable.Range(0, n).Select(i => Task.Run(async () =>
        {
            await puerta.Task;
            try { await accion(i); return (true, (string?)null); }
            catch (AppException ex) { return (false, ex.Codigo); }
        })).ToArray();
        puerta.SetResult();
        return await Task.WhenAll(tareas);
    }

    private static async Task Cobrar(Datos d, string metodo)
    {
        using var db = NuevoDb();
        var svc = new CobroService(db, new GeneradorNumeroTicketNpgsql(db), new AjustesAtomicosNpgsql(db));
        await svc.ProcesarCobroAsync(d.Cobro(metodo), d.Actor);
    }

    [FactPostgres]
    public async Task Dos_Cobros_Telepeaje_Simultaneos_De_8000_Con_Saldo_10000_Pasa_Exactamente_Uno()
    {
        for (int ronda = 0; ronda < 5; ronda++)
        {
            using var d = Datos.Crear(10000m);

            var r = await EnParalelo(2, _ => Cobrar(d, "TELEPEAJE"));

            Assert.Equal(1, r.Count(x => x.Ok));
            Assert.Equal(new[] { "SALDO_INSUFICIENTE" }, r.Where(x => !x.Ok).Select(x => x.Codigo).ToArray());
            Assert.Equal(2000m, d.Saldo());
            Assert.Equal(1, Escalar<int>($"SELECT count(*) FROM detalle_pago_telepeaje WHERE id_cuenta={d.IdCuenta}"));
        }
    }

    [FactPostgres]
    public async Task Diez_Cobros_Efectivo_Simultaneos_Suman_Exactamente_10_Por_Monto()
    {
        using var d = Datos.Crear(0m);

        var r = await EnParalelo(10, _ => Cobrar(d, "EFECTIVO"));

        Assert.All(r, x => Assert.True(x.Ok, x.Codigo));
        Assert.Equal(10 * Monto, d.TotalTurno());
        Assert.Equal(10, Escalar<int>($"SELECT count(DISTINCT numero_ticket) FROM transaccion_peaje WHERE id_turno={d.IdTurno}"));
    }

    [FactPostgres]
    public async Task Recarga_Concurrente_Con_Debito_No_Pierde_Ninguno_De_Los_Dos()
    {
        for (int ronda = 0; ronda < 5; ronda++)
        {
            using var d = Datos.Crear(10000m);

            var r = await EnParalelo(2, async i =>
            {
                if (i == 0) { await Cobrar(d, "TELEPEAJE"); return; }
                using var db = NuevoDb();
                var svc = new TelepeajeMonitoreoService(db, NullLogger<TelepeajeMonitoreoService>.Instance, new AjustesAtomicosNpgsql(db));
                await svc.RecargarCuentaAsync(new RecargaTagRequestDto { Placa = d.Placa, Monto = 5000m }, "SUP-TEST");
            });

            Assert.All(r, x => Assert.True(x.Ok, x.Codigo));
            Assert.Equal(10000m - Monto + 5000m, d.Saldo());
        }
    }

    [FactPostgres]
    public async Task Cobro_Telepeaje_Y_Anulacion_Devuelven_El_Saldo_Exacto()
    {
        using var d = Datos.Crear(10000m);
        long idTx;
        using (var db = NuevoDb())
        {
            var svc = new CobroService(db, new GeneradorNumeroTicketNpgsql(db), new AjustesAtomicosNpgsql(db));
            idTx = (await svc.ProcesarCobroAsync(d.Cobro("TELEPEAJE"), d.Actor)).IdTransaccion;
        }
        Assert.Equal(2000m, d.Saldo());

        using (var db = NuevoDb())
        {
            await new TransaccionService(db, new AjustesAtomicosNpgsql(db))
                .AnularAsync(idTx, new AnularTransaccionRequestDto { Motivo = "prueba" }, d.Actor);
        }

        Assert.Equal(10000m, d.Saldo());
        // AUDITORIA_TRANSACCION es inmutable (trigger): se deja el VOID de prueba hasta recargar la BD.
        Ejecutar($"ALTER TABLE auditoria_transaccion DISABLE TRIGGER trg_auditoria_inmutable; DELETE FROM auditoria_transaccion WHERE id_transaccion={idTx}; ALTER TABLE auditoria_transaccion ENABLE TRIGGER trg_auditoria_inmutable;");
    }
}
