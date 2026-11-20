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
[Route("api/operadores")]
public class OperadoresController : ControllerBase
{
    private readonly IOperadorAdminService _operadorService;

    public OperadoresController(IOperadorAdminService operadorService)
    {
        _operadorService = operadorService;
    }

    [HttpGet]
    [Authorize(Policy = PoliticasAuth.PoliticaSupervisor)]
    [ProducesResponseType(typeof(IEnumerable<OperadorAdminDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<OperadorAdminDto>>> ListarOperadores(
        [FromQuery] string? rol,
        [FromQuery] string? estado,
        [FromQuery] string? q)
    {
        var operadores = await _operadorService.ListarOperadoresAsync(rol, estado, q);
        return Ok(operadores);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = PoliticasAuth.PoliticaSupervisor)]
    [ProducesResponseType(typeof(OperadorAdminDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperadorAdminDto>> ObtenerOperadorPorId([FromRoute] int id)
    {
        var operador = await _operadorService.ObtenerOperadorPorIdAsync(id);
        return Ok(operador);
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAuth.PoliticaAdmin)]
    [ProducesResponseType(typeof(OperadorAdminDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<OperadorAdminDto>> CrearOperador([FromBody] CrearOperadorRequestDto request)
    {
        var creado = await _operadorService.CrearOperadorAsync(request);
        return StatusCode(StatusCodes.Status201Created, creado);
    }

    [HttpPatch("{id:int}/estado")]
    [HttpPatch("{id:int}")]
    [Authorize(Policy = PoliticasAuth.PoliticaAdmin)]
    [ProducesResponseType(typeof(OperadorAdminDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<OperadorAdminDto>> ActualizarEstado(
        [FromRoute] int id,
        [FromBody] ActualizarEstadoRequestDto request)
    {
        var actualizado = await _operadorService.ActualizarEstadoAsync(id, request.Estado);
        return Ok(actualizado);
    }
}
