using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Controllers;

[ApiController]
[Route("api/estaciones")]
public class EstacionesController : ControllerBase
{
    private readonly IEstacionCasetaService _servicio;

    public EstacionesController(IEstacionCasetaService servicio)
    {
        _servicio = servicio;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<EstacionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<EstacionDto>>> ListarEstaciones()
    {
        var estaciones = await _servicio.ListarEstacionesAsync();
        return Ok(estaciones);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(EstacionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EstacionDto>> ObtenerEstacionPorId([FromRoute] int id)
    {
        var estacion = await _servicio.ObtenerEstacionPorIdAsync(id);
        return Ok(estacion);
    }
}
