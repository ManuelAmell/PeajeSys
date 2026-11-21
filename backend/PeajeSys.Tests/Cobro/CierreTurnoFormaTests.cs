using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Cobro;

/// <summary>
/// El cierre de turno debe devolver la misma forma que GET /api/turnos/{id}: el frontend valida ambas
/// respuestas con un unico esquema de turno.
/// </summary>
public class CierreTurnoFormaTests
{
    private static readonly ActorOperacion Actor = new(1, "REC-001", "RECAUDADOR");

    // Mismas opciones que Program.cs (AddJsonOptions).
    private static readonly JsonSerializerOptions OpcionesApi = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static HashSet<string> Claves(object valor) =>
        JsonDocument.Parse(JsonSerializer.Serialize(valor, valor.GetType(), OpcionesApi))
            .RootElement.EnumerateObject().Select(p => p.Name).ToHashSet();

    [Fact]
    public async Task Cierre_DevuelveLasMismasPropiedadesQueElGetDeUnTurnoCerrado()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var db = new PeajeSysDbContext(options);
        var servicio = new TurnoService(db);

        var abierto = await servicio.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = 1, IdOperador = 1, FondoInicialCaja = 5000, Diurno = true }, Actor);
        var cierre = await servicio.CerrarTurnoAsync(abierto.IdTurno, new CerrarTurnoRequestDto { TotalDeclaradoCierre = 60500 }, Actor);
        var get = await servicio.ObtenerTurnoAsync(abierto.IdTurno, Actor);

        var clavesCierre = Claves(cierre);
        Assert.Contains("diurno", clavesCierre);
        Assert.Equal(Claves(get).OrderBy(c => c), clavesCierre.OrderBy(c => c));
    }
}
