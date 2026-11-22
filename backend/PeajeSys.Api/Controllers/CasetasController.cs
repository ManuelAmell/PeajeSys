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
[Route("api/casetas")]
public class CasetasController : ControllerBase
{
    private readonly IEstacionCasetaService _servicio;

    public CasetasController(IEstacionCasetaService servicio)
    {
        _servicio = servicio;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CasetaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<CasetaDto>>> ListarCasetas(
        [FromQuery] int? estacion,
        [FromQuery] int? id_estacion)
    {
        int? estacionFiltro = id_estacion ?? estacion;
        var casetas = await _servicio.ListarCasetasAsync(estacionFiltro);
        return Ok(casetas);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CasetaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CasetaDto>> ObtenerCasetaPorId([FromRoute] int id)
    {
        var caseta = await _servicio.ObtenerCasetaPorIdAsync(id);
        return Ok(caseta);
    }

    [HttpPatch("{id:int}/estado")]
    [HttpPatch("{id:int}")]
    [Authorize(Policy = PoliticasAuth.PoliticaAdmin)]
    [ProducesResponseType(typeof(CasetaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CasetaDto>> ActualizarEstado(
        [FromRoute] int id,
        [FromBody] ActualizarEstadoRequestDto request)
    {
        var actualizada = await _servicio.ActualizarEstadoCasetaAsync(id, request.Estado);
        return Ok(actualizada);
    }
}
