using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Data;
using PeajeSys.Tests.Cobro;
using Xunit;

namespace PeajeSys.Tests.Supervisor;

public class TelepeajeMonitoreoTests
{
    private static PeajeSysDbContext NuevoDbMemoria() =>
        new(new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static PeajeSysDbContext NuevoDbPostgres() =>
        new(new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseNpgsql(ConcurrenciaPostgres.Cadena)
            .Options);

    [Fact]
    public async Task ListarCuentasMonitoreoAsync_FiltroSinCoincidenciasEnVista_DevuelveListaVaciaYNoCaeARespaldo()
    {
        // En una base donde la vista no tiene registros para la consulta pero la tabla cuenta_telepeaje si tiene,
        // el servicio debe retornar lista vacia (la vista es la unica fuente de verdad) y NO caer al respaldo.
        using var db = NuevoDbMemoria();
        db.CategoriasVehiculo.Add(new CategoriaVehiculo { IdCategoria = 1, Codigo = "CAT_I", Descripcion = "Categoria I" });
        db.Vehiculos.Add(new Vehiculo { Placa = "ABC999", IdCategoria = 1 });
        db.CuentasTelepeaje.Add(new CuentaTelepeaje
        {
            IdCuenta = 999,
            PlacaVehiculo = "ABC999",
            TagRfidSerial = "TAG-TEST-999",
            SaldoDisponible = 5000m,
            EstadoCuenta = "ACTIVA"
        });
        await db.SaveChangesAsync();

        var service = new TelepeajeMonitoreoService(
            db,
            NullLogger<TelepeajeMonitoreoService>.Instance,
            new Cobro.AjustesAtomicosEnMemoria(db));

        // Act: La vista EstadoCuentasTelepeaje no tiene filas.
        var resultado = await service.ListarCuentasMonitoreoAsync(null, null, "ABC999");

        // Assert: Debe retornar vacio (0 filas). En codigo con bug, cae al respaldo y devuelve 1 fila.
        Assert.Empty(resultado);
    }

    [FactPostgres]
    public async Task ListarCuentasMonitoreoAsync_FiltroSinTilde_NormalizaYRetornaCuentasConTildeDeLaVista()
    {
        // La vista SQL define 'SALDO CRÍTICO' (con tilde). Si el usuario o frontend busca "SALDO CRITICO" (sin tilde),
        // debe normalizarse y retornar las cuentas con la clasificacion oficial de la vista ("SALDO CRÍTICO").
        // En el codigo con bug, la vista no coincide, cae al respaldo y devuelve "SALDO CRITICO" sin tilde.
        using var db = NuevoDbPostgres();
        var service = new TelepeajeMonitoreoService(
            db,
            NullLogger<TelepeajeMonitoreoService>.Instance,
            new AjustesAtomicosNpgsql(db));

        var criticas = (await service.ListarCuentasMonitoreoAsync("SALDO CRITICO", null, "QWE321")).ToList();

        Assert.Single(criticas);
        Assert.Equal("SALDO CRÍTICO", criticas[0].CondicionSaldo);
    }

    [FactPostgres]
    public async Task ListarCuentasMonitoreoAsync_ClasificacionSaldo_CoincideConVistaSql_ConTilde()
    {
        using var db = NuevoDbPostgres();
        var service = new TelepeajeMonitoreoService(
            db,
            NullLogger<TelepeajeMonitoreoService>.Instance,
            new AjustesAtomicosNpgsql(db));

        // Cuenta QWE321 tiene saldo 8000.00 (< 20000): la vista SQL define 'SALDO CRÍTICO' (con tilde)
        var cuentas = (await service.ListarCuentasMonitoreoAsync(null, null, "QWE321")).ToList();

        Assert.Single(cuentas);
        Assert.Equal("SALDO CRÍTICO", cuentas[0].CondicionSaldo);

        // Filtrar por 'SALDO CRÍTICO' debe retornar al menos dicha cuenta
        var criticas = (await service.ListarCuentasMonitoreoAsync("SALDO CRÍTICO", null, null)).ToList();
        Assert.Contains(criticas, c => c.PlacaVehiculo == "QWE321");
    }

    [FactPostgres]
    public async Task ListarCuentasMonitoreoAsync_CoincideExactamenteConConsultaSqlDirecta()
    {
        using var db = NuevoDbPostgres();
        var service = new TelepeajeMonitoreoService(
            db,
            NullLogger<TelepeajeMonitoreoService>.Instance,
            new AjustesAtomicosNpgsql(db));

        // Obtener del servicio
        var resultadoServicio = (await service.ListarCuentasMonitoreoAsync(null, null, null))
            .OrderBy(c => c.IdCuenta)
            .ToList();

        // Obtener directamente con psql / NpgsqlCommand de la vista
        var directosDeVista = new List<(long IdCuenta, string Placa, string Condicion)>();
        using (var conn = new NpgsqlConnection(ConcurrenciaPostgres.Cadena))
        {
            await conn.OpenAsync();
            using var cmd = new NpgsqlCommand(
                "SELECT id_cuenta, placa_vehiculo, condicion_saldo FROM vw_estado_cuentas_telepeaje ORDER BY id_cuenta",
                conn);
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                directosDeVista.Add((reader.GetInt64(0), reader.GetString(1), reader.GetString(2)));
            }
        }

        Assert.Equal(directosDeVista.Count, resultadoServicio.Count);
        for (int i = 0; i < directosDeVista.Count; i++)
        {
            Assert.Equal(directosDeVista[i].IdCuenta, resultadoServicio[i].IdCuenta);
            Assert.Equal(directosDeVista[i].Placa, resultadoServicio[i].PlacaVehiculo);
            Assert.Equal(directosDeVista[i].Condicion, resultadoServicio[i].CondicionSaldo);
        }
    }

    [FactPostgres]
    public async Task ListarCuentasMonitoreoAsync_FiltroSinResultados_DevuelveListaVacia()
    {
        using var db = NuevoDbPostgres();
        var service = new TelepeajeMonitoreoService(
            db,
            NullLogger<TelepeajeMonitoreoService>.Instance,
            new AjustesAtomicosNpgsql(db));

        var resultado = await service.ListarCuentasMonitoreoAsync(null, null, "PLACA_INEXISTENTE_XYZ");

        Assert.Empty(resultado);
    }
}
