using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Controllers;

[ApiController]
public class RecaudoController : ControllerBase
{
    private readonly ICobroService _cobroService;
    private readonly IReporteRecaudoService _reporteRecaudoService;

    public RecaudoController(ICobroService cobroService, IReporteRecaudoService reporteRecaudoService)
    {
        _cobroService = cobroService;
        _reporteRecaudoService = reporteRecaudoService;
    }

    [HttpPost("api/recaudo/cobro")]
    [HttpPost("api/transacciones")]
    [Authorize(Policy = PoliticasAuth.PoliticaRecaudador)]
    [ProducesResponseType(typeof(CobroResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CobroResponseDto>> ProcesarCobro([FromBody] CobroRequestDto request)
    {
        var response = await _cobroService.ProcesarCobroAsync(request, ActorOperacionClaims.Desde(User));
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpGet("api/recaudo/diario")]
    [HttpGet("api/recaudo")]
    [Authorize(Policy = PoliticasAuth.PoliticaSupervisor)]
    [ProducesResponseType(typeof(RecaudoDiarioDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RecaudoDiarioDto>> ObtenerRecaudoDiario(
        [FromQuery] int? id_estacion,
        [FromQuery] int? estacion,
        [FromQuery] string? fecha)
    {
        int? estacionFiltro = id_estacion ?? estacion;
        var resultado = await _reporteRecaudoService.ObtenerRecaudoDiarioAsync(estacionFiltro, fecha);
        return Ok(resultado);
    }
}
