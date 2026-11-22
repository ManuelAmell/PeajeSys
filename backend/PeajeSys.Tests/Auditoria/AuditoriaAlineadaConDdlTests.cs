using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Auditoria;

/// <summary>
/// AUDITORIA_TRANSACCION es la auditoria de transacciones de peaje (id_transaccion NOT NULL con FK). El mapeo EF,
/// el DTO de respuesta y los servicios deben coincidir con el DDL versionado, que es la fuente de verdad.
/// </summary>
public class AuditoriaAlineadaConDdlTests
{
    private const string Ddl = "database/02_SQL/01_DDL_PeajeSys.sql";

    private static string RutaRepo(string relativa)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "database", "00_Master_PeajeSys.sql")))
                return Path.Combine(dir.FullName, relativa);
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("No se encontro la raiz del repo subiendo desde " + AppContext.BaseDirectory);
    }

    private static List<string> ColumnasDelDdl()
    {
        var sql = File.ReadAllText(RutaRepo(Ddl));
        var bloque = Regex.Match(sql, @"CREATE TABLE AUDITORIA_TRANSACCION \((?<cuerpo>.*?)\n\);", RegexOptions.Singleline);
        Assert.True(bloque.Success, "No se encontro CREATE TABLE AUDITORIA_TRANSACCION en el DDL.");
        return bloque.Groups["cuerpo"].Value
            .Split('\n')
            .Select(l => l.Trim())
            .Where(l => Regex.IsMatch(l, @"^[a-z_]+\s+[A-Z]+") && !l.StartsWith("CONSTRAINT"))
            .Select(l => l.Split(' ')[0])
            .ToList();
    }

    private static PeajeSysDbContext NuevoContexto()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new PeajeSysDbContext(options);
    }

    [Fact]
    public void ModeloEf_MapeaExactamenteLasColumnasDelDdl()
    {
        using var db = NuevoContexto();
        var tipo = db.Model.FindEntityType(typeof(AuditoriaTransaccion))!;
        var tabla = StoreObjectIdentifier.Table(tipo.GetTableName()!, tipo.GetSchema());

        Assert.Equal("auditoria_transaccion", tipo.GetTableName());
        var columnasEf = tipo.GetProperties().Select(p => p.GetColumnName(tabla)!).OrderBy(c => c).ToList();
        var columnasDdl = ColumnasDelDdl().OrderBy(c => c).ToList();

        Assert.Equal(6, columnasDdl.Count);
        Assert.Equal(columnasDdl, columnasEf);
    }

    [Fact]
    public void ModeloEf_IdTransaccionEsObligatorio()
    {
        using var db = NuevoContexto();
        var tipo = db.Model.FindEntityType(typeof(AuditoriaTransaccion))!;

        Assert.False(tipo.FindProperty(nameof(AuditoriaTransaccion.IdTransaccion))!.IsNullable);
    }

    [Fact]
    public async Task Servicio_DevuelveLosNombresJsonDelEsquemaDelFrontend()
    {
        using var db = NuevoContexto();
        db.TransaccionesPeaje.Add(new TransaccionPeaje { IdTransaccion = 7, PlacaDetectada = "ABC123", MetodoPago = "EFECTIVO", NumeroTicket = "T-7" });
        db.AuditoriasTransaccion.Add(new AuditoriaTransaccion
        {
            IdTransaccion = 7,
            TipoOperacion = "VOID",
            UsuarioSistema = "SUP-001",
            FechaHoraEvento = new DateTime(2026, 11, 20, 10, 0, 0, DateTimeKind.Utc),
            Motivo = "Cobro duplicado"
        });
        await db.SaveChangesAsync();

        var items = await new AuditoriaService(db).ListarAuditoriaAsync(null, null, null, null);
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(items.Single()));
        var raiz = json.RootElement;

        foreach (var campo in new[] { "id_auditoria", "id_transaccion", "tipo_operacion", "usuario_sistema", "fecha_hora_evento", "motivo" })
            Assert.True(raiz.TryGetProperty(campo, out _), $"Falta el campo '{campo}' en la respuesta.");
        Assert.Equal("SUP-001", raiz.GetProperty("usuario_sistema").GetString());
        Assert.Equal("Cobro duplicado", raiz.GetProperty("motivo").GetString());
        Assert.Equal(7, raiz.GetProperty("id_transaccion").GetInt64());
        Assert.Equal("ABC123", raiz.GetProperty("placa_detectada").GetString());
        Assert.Equal("EFECTIVO", raiz.GetProperty("metodo_pago").GetString());
        foreach (var viejo in new[] { "usuario_responsable", "fecha_hora", "datos_anteriores", "datos_nuevos", "motivo_anulacion" })
            Assert.False(raiz.TryGetProperty(viejo, out _), $"Sobra el campo '{viejo}'.");
    }

    [Fact]
    public async Task CrearTarifa_NoInsertaEnAuditoriaTransaccion()
    {
        using var db = NuevoContexto();
        var service = new TarifaService(db, NullLogger<TarifaService>.Instance);

        await service.CrearTarifaConVigenciaAsync(
            new CrearTarifaRequestDto { IdEstacion = 1, IdCategoria = 1, Monto = 12000m }, "ADM-001");

        Assert.Empty(db.AuditoriasTransaccion);
        Assert.Single(db.Tarifas);
    }

    [Fact]
    public async Task RecargarSaldo_NoInsertaEnAuditoriaTransaccion()
    {
        using var db = NuevoContexto();
        db.CuentasTelepeaje.Add(new CuentaTelepeaje { PlacaVehiculo = "ABC123", TagRfidSerial = "TAG1", SaldoDisponible = 1000m });
        await db.SaveChangesAsync();
        var service = new TelepeajeMonitoreoService(db, NullLogger<TelepeajeMonitoreoService>.Instance, new Cobro.AjustesAtomicosEnMemoria(db));

        var respuesta = await service.RecargarCuentaAsync(new RecargaTagRequestDto { Placa = "ABC123", Monto = 5000m }, "SUP-001");

        Assert.Empty(db.AuditoriasTransaccion);
        Assert.Equal(6000m, respuesta.SaldoNuevo);
    }

    private sealed class LoggerCapturador<T> : ILogger<T>
    {
        public List<string> Mensajes { get; } = new();
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (logLevel == LogLevel.Information) Mensajes.Add(formatter(state, exception));
        }
    }

    [Fact]
    public async Task CrearTarifa_RegistraLogInformationConUsuarioEntidadYValores()
    {
        using var db = NuevoContexto();
        var logger = new LoggerCapturador<TarifaService>();

        await new TarifaService(db, logger).CrearTarifaConVigenciaAsync(
            new CrearTarifaRequestDto { IdEstacion = 1, IdCategoria = 2, Monto = 12000m }, "ADM-001");

        var mensaje = Assert.Single(logger.Mensajes);
        Assert.Contains("ADM-001", mensaje);
        Assert.Contains("TARIFA", mensaje);
        Assert.Contains("12000", mensaje);
    }

    [Fact]
    public async Task RecargarSaldo_RegistraLogInformationConUsuarioEntidadYValores()
    {
        using var db = NuevoContexto();
        db.CuentasTelepeaje.Add(new CuentaTelepeaje { PlacaVehiculo = "ABC123", TagRfidSerial = "TAG1", SaldoDisponible = 1000m });
        await db.SaveChangesAsync();
        var logger = new LoggerCapturador<TelepeajeMonitoreoService>();

        await new TelepeajeMonitoreoService(db, logger, new Cobro.AjustesAtomicosEnMemoria(db)).RecargarCuentaAsync(new RecargaTagRequestDto { Placa = "ABC123", Monto = 5000m }, "SUP-001");

        var mensaje = Assert.Single(logger.Mensajes);
        Assert.Contains("SUP-001", mensaje);
        Assert.Contains("CUENTA_TELEPEAJE", mensaje);
        Assert.Contains("ABC123", mensaje);
        Assert.Contains("6000", mensaje);
    }
}
