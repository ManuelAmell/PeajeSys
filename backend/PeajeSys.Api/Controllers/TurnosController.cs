using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Controllers;

[ApiController]
[Route("api/turnos")]
[Authorize(Policy = PoliticasAuth.PoliticaRecaudador)]
public class TurnosController : ControllerBase
{
    private readonly ITurnoService _turnoService;
    private readonly IArqueoService _arqueoService;

    public TurnosController(ITurnoService turnoService, IArqueoService arqueoService)
    {
        _turnoService = turnoService;
        _arqueoService = arqueoService;
    }

    [HttpPost("abrir")]
    [ProducesResponseType(typeof(AbrirTurnoResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AbrirTurnoResponseDto>> AbrirTurno([FromBody] AbrirTurnoRequestDto request)
    {
        var response = await _turnoService.AbrirTurnoAsync(request, ActorOperacionClaims.Desde(User));
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpPost("{id:long}/cerrar")]
    [HttpPost("{id:long}/cierre")]
    [ProducesResponseType(typeof(TurnoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TurnoDto>> CerrarTurno([FromRoute] long id, [FromBody] CerrarTurnoRequestDto request)
    {
        var response = await _turnoService.CerrarTurnoAsync(id, request, ActorOperacionClaims.Desde(User));
        return Ok(response);
    }

    // El listado queda visible para todos los roles: la pantalla Abrir turno del recaudador necesita ver los
    // turnos ABIERTOS de las demas casetas para marcarlas como ocupadas.
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TurnoDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<TurnoDto>>> ListarTurnos(
        [FromQuery] int? caseta = null,
        [FromQuery] int? id_caseta = null,
        [FromQuery] string? operador = null,
        [FromQuery] string? id_operador = null,
        [FromQuery] string? estado = null,
        [FromQuery] string? fecha = null,
        [FromQuery] int? estacion = null,
        [FromQuery] int? id_estacion = null)
    {
        int? casetaFiltro = id_caseta ?? caseta;
        string? operadorFiltro = !string.IsNullOrWhiteSpace(id_operador) ? id_operador : operador;
        int? estacionFiltro = id_estacion ?? estacion;

        var turnos = await _turnoService.ListarTurnosAsync(casetaFiltro, operadorFiltro, estado, fecha, estacionFiltro);
        return Ok(turnos);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(TurnoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TurnoDto>> ObtenerTurnoPorId([FromRoute] long id)
    {
        var turno = await _turnoService.ObtenerTurnoAsync(id, ActorOperacionClaims.Desde(User));
        return Ok(turno);
    }

    [HttpGet("{id:long}/arqueo")]
    [Authorize(Policy = PoliticasAuth.PoliticaSupervisor)]
    [ProducesResponseType(typeof(ArqueoTurnoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ArqueoTurnoDto>> ObtenerArqueo(
        [FromRoute] long id,
        [FromQuery] decimal? efectivo_reportado,
        [FromQuery] decimal? reportado)
    {
        decimal montoReportado = efectivo_reportado ?? reportado ?? 0;
        var resultado = await _arqueoService.CalcularArqueoAsync(id, montoReportado);
        return Ok(resultado);
    }
}
