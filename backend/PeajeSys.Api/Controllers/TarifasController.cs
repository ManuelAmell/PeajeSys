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
[Route("api/tarifas")]
public class TarifasController : ControllerBase
{
    private readonly ITarifaService _tarifaService;

    public TarifasController(ITarifaService tarifaService)
    {
        _tarifaService = tarifaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TarifaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<TarifaDto>>> ListarTarifas(
        [FromQuery] int? estacion,
        [FromQuery] int? id_estacion,
        [FromQuery] int? categoria,
        [FromQuery] int? id_categoria,
        [FromQuery] bool? vigente)
    {
        int? estacionFiltro = id_estacion ?? estacion;
        int? categoriaFiltro = id_categoria ?? categoria;

        var tarifas = await _tarifaService.ListarTarifasAsync(estacionFiltro, categoriaFiltro, vigente);
        return Ok(tarifas);
    }

    [HttpGet("vigente")]
    [ProducesResponseType(typeof(TarifaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TarifaDto>> ObtenerTarifaVigente(
        [FromQuery] int? estacion,
        [FromQuery] int? id_estacion,
        [FromQuery] int? categoria,
        [FromQuery] int? id_categoria)
    {
        int estacionId = id_estacion ?? estacion ?? 0;
        int categoriaId = id_categoria ?? categoria ?? 0;

        var tarifa = await _tarifaService.ObtenerTarifaVigenteAsync(estacionId, categoriaId);
        return Ok(tarifa);
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAuth.PoliticaAdmin)]
    [ProducesResponseType(typeof(TarifaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TarifaDto>> CrearTarifa([FromBody] CrearTarifaRequestDto request)
    {
        string usuario = User?.FindFirstValue("codigo") 
                         ?? User?.FindFirstValue(ClaimTypes.Name) 
                         ?? "ADMINISTRADOR";

        var nueva = await _tarifaService.CrearTarifaConVigenciaAsync(request, usuario);
        return StatusCode(StatusCodes.Status201Created, nueva);
    }

    [HttpPatch("{id:int}")]
    [Authorize(Policy = PoliticasAuth.PoliticaAdmin)]
    [ProducesResponseType(typeof(TarifaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TarifaDto>> ActualizarTarifa(
        [FromRoute] int id,
        [FromBody] ActualizarTarifaRequestDto request)
    {
        string usuario = User?.FindFirstValue("codigo") 
                         ?? User?.FindFirstValue(ClaimTypes.Name) 
                         ?? "ADMINISTRADOR";

        var actualizada = await _tarifaService.ActualizarTarifaAsync(id, request, usuario);
        return Ok(actualizada);
    }
}
