using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Cobro;

/// <summary>
/// Contrato de fechas y cuerpo de tarifas con el frontend: las columnas DATE salen como YYYY-MM-DD,
/// el recaudo filtra por dia civil de la aplicacion (America/Bogota) y la tarifa acepta monto_tarifa.
/// </summary>
public class FechasYTarifasTests
{
    private static readonly JsonSerializerOptions OpcionesApi = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static PeajeSysDbContext NuevoContexto() =>
        new(new DbContextOptionsBuilder<PeajeSysDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static TarifaService NuevoServicioTarifas(PeajeSysDbContext db) =>
        new(db, NullLogger<TarifaService>.Instance);

    [Fact]
    public async Task Tarifa_FechasDeVigenciaSalenComoYyyyMmDd()
    {
        using var db = NuevoContexto();
        db.EstacionesPeaje.Add(new EstacionPeaje { IdEstacion = 1, Nombre = "E1" });
        db.CategoriasVehiculo.Add(new CategoriaVehiculo { IdCategoria = 1, Codigo = "I" });
        db.Tarifas.Add(new Tarifa
        {
            IdEstacion = 1, IdCategoria = 1, Monto = 9500, ResolucionLegal = "R",
            FechaInicioVigencia = new DateTime(2026, 1, 1), FechaFinVigencia = new DateTime(2026, 6, 30), Activa = true
        });
        await db.SaveChangesAsync();

        var dto = (await NuevoServicioTarifas(db).ListarTarifasAsync(null, null, null)).Single();
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(dto, OpcionesApi));

        Assert.Equal("2026-01-01", json.RootElement.GetProperty("fecha_inicio_vigencia").GetString());
        Assert.Equal("2026-06-30", json.RootElement.GetProperty("fecha_fin_vigencia").GetString());
    }

    [Fact]
    public async Task CrearTarifa_AceptaMontoTarifaYMontoComoAlias()
    {
        using var db = NuevoContexto();
        var servicio = NuevoServicioTarifas(db);

        var conMontoTarifa = JsonSerializer.Deserialize<CrearTarifaRequestDto>(
            """{"id_estacion":1,"id_categoria":1,"monto_tarifa":48000,"fecha_inicio_vigencia":"2026-12-01"}""", OpcionesApi)!;
        var conMonto = JsonSerializer.Deserialize<CrearTarifaRequestDto>(
            """{"id_estacion":1,"id_categoria":2,"monto":52000,"fecha_inicio_vigencia":"2026-12-01"}""", OpcionesApi)!;

        Assert.Equal(48000m, (await servicio.CrearTarifaConVigenciaAsync(conMontoTarifa, "ADM-001")).Monto);
        Assert.Equal(52000m, (await servicio.CrearTarifaConVigenciaAsync(conMonto, "ADM-001")).Monto);
    }

    [Fact]
    public async Task CrearTarifa_RespetaFechaFinVigenciaDelCuerpo()
    {
        using var db = NuevoContexto();
        var req = JsonSerializer.Deserialize<CrearTarifaRequestDto>(
            """{"id_estacion":1,"id_categoria":1,"monto_tarifa":48000,"fecha_inicio_vigencia":"2026-12-01","fecha_fin_vigencia":"2026-12-31"}""", OpcionesApi)!;

        var dto = await NuevoServicioTarifas(db).CrearTarifaConVigenciaAsync(req, "ADM-001");

        using var json = JsonDocument.Parse(JsonSerializer.Serialize(dto, OpcionesApi));
        Assert.Equal("2026-12-01", json.RootElement.GetProperty("fecha_inicio_vigencia").GetString());
        Assert.Equal("2026-12-31", json.RootElement.GetProperty("fecha_fin_vigencia").GetString());
    }

    [Fact]
    public async Task Recaudo_FiltraPorDiaCivilDeBogotaNoPorDiaUtc()
    {
        using var db = NuevoContexto();
        db.EstacionesPeaje.Add(new EstacionPeaje { IdEstacion = 1, Nombre = "E1" });
        db.Casetas.Add(new Caseta { IdCaseta = 1, IdEstacion = 1 });
        db.Turnos.Add(new Turno { IdTurno = 1, IdCaseta = 1, IdOperador = 1 });
        // Dia civil 2026-11-21 en Bogota (UTC-5) = [2026-11-21T05:00Z, 2026-11-22T05:00Z)
        db.TransaccionesPeaje.AddRange(
            Tx(1, new DateTime(2026, 11, 21, 4, 59, 0, DateTimeKind.Utc), 1000),   // 20-nov 23:59 Bogota: fuera
            Tx(2, new DateTime(2026, 11, 21, 5, 0, 0, DateTimeKind.Utc), 2000),    // 00:00 Bogota: dentro
            Tx(3, new DateTime(2026, 11, 22, 3, 0, 0, DateTimeKind.Utc), 4000),    // 21-nov 22:00 Bogota: dentro
            Tx(4, new DateTime(2026, 11, 22, 5, 0, 0, DateTimeKind.Utc), 8000));   // 22-nov 00:00 Bogota: fuera
        await db.SaveChangesAsync();

        var r = await new ReporteRecaudoService(db).ObtenerRecaudoDiarioAsync(1, "2026-11-21");

        Assert.Equal(2, r.TotalVehiculos);
        Assert.Equal(6000m, r.TotalGeneral);
        Assert.Equal("2026-11-21", r.Fecha);
    }

    [Fact]
    public void ZonaHoraria_RangoUtcDelDiaEsBogotaMenos5()
    {
        var (inicio, fin) = ZonaHorariaApp.RangoUtcDelDia(new DateOnly(2026, 11, 21));

        Assert.Equal(new DateTime(2026, 11, 21, 5, 0, 0, DateTimeKind.Utc), inicio);
        Assert.Equal(new DateTime(2026, 11, 22, 5, 0, 0, DateTimeKind.Utc), fin);
        Assert.Equal(DateTimeKind.Utc, inicio.Kind);
        Assert.Equal(DateTimeKind.Utc, fin.Kind);
    }

    private static TransaccionPeaje Tx(long id, DateTime fechaUtc, decimal monto) => new()
    {
        IdTransaccion = id, IdTurno = 1, IdTarifa = 1, IdCategoria = 1, MontoTarifa = monto,
        MetodoPago = "EFECTIVO", NumeroTicket = "T" + id, FechaHora = fechaUtc
    };
}
