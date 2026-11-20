using System.Collections.Generic;
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
    private readonly IArqueoService? _arqueoService;

    public TurnosController(ITurnoService turnoService)
        : this(turnoService, null)
    {
    }

    public TurnosController(ITurnoService turnoService, IArqueoService? arqueoService)
    {
        _turnoService = turnoService;
        _arqueoService = arqueoService;
    }

    [HttpPost("abrir")]
    [ProducesResponseType(typeof(AbrirTurnoResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AbrirTurnoResponseDto>> AbrirTurno([FromBody] AbrirTurnoRequestDto request)
    {
        var response = await _turnoService.AbrirTurnoAsync(request);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpPost("{id:long}/cerrar")]
    [HttpPost("{id:long}/cierre")]
    [ProducesResponseType(typeof(CerrarTurnoResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CerrarTurnoResponseDto>> CerrarTurno([FromRoute] long id, [FromBody] CerrarTurnoRequestDto request)
    {
        var response = await _turnoService.CerrarTurnoAsync(id, request);
        return Ok(response);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TurnoDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<TurnoDto>>> ListarTurnos(
        [FromQuery] int? caseta,
        [FromQuery] int? id_caseta,
        [FromQuery] int? operador,
        [FromQuery] int? id_operador,
        [FromQuery] string? estado)
    {
        int? casetaFiltro = id_caseta ?? caseta;
        int? operadorFiltro = id_operador ?? operador;

        var turnos = await _turnoService.ListarTurnosAsync(casetaFiltro, operadorFiltro, estado);
        return Ok(turnos);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(TurnoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TurnoDto>> ObtenerTurnoPorId([FromRoute] long id)
    {
        var turno = await _turnoService.ObtenerTurnoAsync(id);
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
        if (_arqueoService == null)
            throw new InvalidOperationException("IArqueoService no configurado.");

        decimal montoReportado = efectivo_reportado ?? reportado ?? 0;
        var resultado = await _arqueoService.CalcularArqueoAsync(id, montoReportado);
        return Ok(resultado);
    }
}
