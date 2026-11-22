using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;
using PeajeSys.Tests.Cobro;
using Xunit;

namespace PeajeSys.Tests.Turnos;

public class ConcurrenciaTurnosPostgresTests
{
    private sealed class ContextoPrueba : IDisposable
    {
        public string Sufijo = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        public int IdEstacion;
        public int IdCaseta1;
        public int IdCaseta2;
        public int IdOperador1;
        public int IdOperador2;
        public ActorOperacion Actor1 = null!;
        public ActorOperacion Actor2 = null!;

        public static ContextoPrueba Crear()
        {
            var ctx = new ContextoPrueba();
            ctx.IdEstacion = Escalar<int>($"INSERT INTO estacion_peaje(nombre,codigo_estacion,ubicacion_geografica,sentido_via) VALUES ('PruebaTurno {ctx.Sufijo}','ZT{ctx.Sufijo}','KM 0','N-S') RETURNING id_estacion");
            ctx.IdCaseta1 = Escalar<int>($"INSERT INTO caseta(id_estacion,numero_carril,tipo_carril,estado) VALUES ({ctx.IdEstacion},1,'MIXTO','OPERATIVA') RETURNING id_caseta");
            ctx.IdCaseta2 = Escalar<int>($"INSERT INTO caseta(id_estacion,numero_carril,tipo_carril,estado) VALUES ({ctx.IdEstacion},2,'MIXTO','OPERATIVA') RETURNING id_caseta");

            ctx.IdOperador1 = Escalar<int>($"INSERT INTO operador(numero_documento,nombres,apellidos,codigo_empleado,rol,estado) VALUES ('DOC1{ctx.Sufijo}','Op1','Test','OP1{ctx.Sufijo}','RECAUDADOR','ACTIVO') RETURNING id_operador");
            ctx.IdOperador2 = Escalar<int>($"INSERT INTO operador(numero_documento,nombres,apellidos,codigo_empleado,rol,estado) VALUES ('DOC2{ctx.Sufijo}','Op2','Test','OP2{ctx.Sufijo}','RECAUDADOR','ACTIVO') RETURNING id_operador");

            ctx.Actor1 = new ActorOperacion(ctx.IdOperador1, $"OP1{ctx.Sufijo}", "RECAUDADOR");
            ctx.Actor2 = new ActorOperacion(ctx.IdOperador2, $"OP2{ctx.Sufijo}", "RECAUDADOR");
            return ctx;
        }

        public void Dispose()
        {
            Ejecutar($"DELETE FROM turno WHERE id_caseta IN ({IdCaseta1},{IdCaseta2}) OR id_operador IN ({IdOperador1},{IdOperador2})");
            Ejecutar($"DELETE FROM caseta WHERE id_estacion={IdEstacion}");
            Ejecutar($"DELETE FROM estacion_peaje WHERE id_estacion={IdEstacion}");
            Ejecutar($"DELETE FROM operador WHERE id_operador IN ({IdOperador1},{IdOperador2})");
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

    [FactPostgres]
    public async Task DosAperturasSimultaneas_MismaCaseta_ExactamenteUna201YOtra409CasetaOcupada()
    {
        using var ctx = ContextoPrueba.Crear();

        var puerta = new TaskCompletionSource();
        var tarea1 = Task.Run(async () =>
        {
            await puerta.Task;
            try
            {
                using var db = NuevoDb();
                var svc = new TurnoService(db);
                var r = await svc.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = ctx.IdCaseta1, FondoInicialCaja = 50000m }, ctx.Actor1);
                return (Ok: true, Codigo: (string?)null);
            }
            catch (ConflictException ex) { return (Ok: false, Codigo: ex.Codigo); }
            catch (AppException ex) { return (Ok: false, Codigo: ex.Codigo); }
        });

        var tarea2 = Task.Run(async () =>
        {
            await puerta.Task;
            try
            {
                using var db = NuevoDb();
                var svc = new TurnoService(db);
                var r = await svc.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = ctx.IdCaseta1, FondoInicialCaja = 50000m }, ctx.Actor2);
                return (Ok: true, Codigo: (string?)null);
            }
            catch (ConflictException ex) { return (Ok: false, Codigo: ex.Codigo); }
            catch (AppException ex) { return (Ok: false, Codigo: ex.Codigo); }
        });

        puerta.SetResult();
        var resultados = await Task.WhenAll(tarea1, tarea2);

        Assert.Equal(1, resultados.Count(r => r.Ok));
        Assert.Equal(1, resultados.Count(r => !r.Ok && r.Codigo == "CASETA_OCUPADA"));
    }

    [FactPostgres]
    public async Task DosAperturasSimultaneas_MismoOperador_ExactamenteUna201YOtra409OperadorConTurnoActivo()
    {
        using var ctx = ContextoPrueba.Crear();

        var puerta = new TaskCompletionSource();
        var tarea1 = Task.Run(async () =>
        {
            await puerta.Task;
            try
            {
                using var db = NuevoDb();
                var svc = new TurnoService(db);
                var r = await svc.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = ctx.IdCaseta1, FondoInicialCaja = 50000m }, ctx.Actor1);
                return (Ok: true, Codigo: (string?)null);
            }
            catch (ConflictException ex) { return (Ok: false, Codigo: ex.Codigo); }
            catch (AppException ex) { return (Ok: false, Codigo: ex.Codigo); }
        });

        var tarea2 = Task.Run(async () =>
        {
            await puerta.Task;
            try
            {
                using var db = NuevoDb();
                var svc = new TurnoService(db);
                var r = await svc.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = ctx.IdCaseta2, FondoInicialCaja = 50000m }, ctx.Actor1);
                return (Ok: true, Codigo: (string?)null);
            }
            catch (ConflictException ex) { return (Ok: false, Codigo: ex.Codigo); }
            catch (AppException ex) { return (Ok: false, Codigo: ex.Codigo); }
        });

        puerta.SetResult();
        var resultados = await Task.WhenAll(tarea1, tarea2);

        Assert.Equal(1, resultados.Count(r => r.Ok));
        Assert.Equal(1, resultados.Count(r => !r.Ok && r.Codigo == "OPERADOR_CON_TURNO_ACTIVO"));
    }
}
