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
[Authorize]
public class TelepeajeController : ControllerBase
{
    private readonly ITelepeajeMonitoreoService _telepeajeService;

    public TelepeajeController(ITelepeajeMonitoreoService telepeajeService)
    {
        _telepeajeService = telepeajeService;
    }

    [HttpGet("api/telepeaje/cuentas")]
    [HttpGet("api/cuentas-telepeaje")]
    [Authorize(Policy = PoliticasAuth.PoliticaSupervisor)]
    [ProducesResponseType(typeof(IEnumerable<MonitoreoCuentaTelepeajeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MonitoreoCuentaTelepeajeDto>>> ListarCuentas(
        [FromQuery] string? condicion_saldo,
        [FromQuery] string? estado,
        [FromQuery] string? q)
    {
        var cuentas = await _telepeajeService.ListarCuentasMonitoreoAsync(condicion_saldo, estado, q);
        return Ok(cuentas);
    }

    [HttpPost("api/telepeaje/recargar")]
    [Authorize(Policy = PoliticasAuth.PoliticaSupervisor)]
    [ProducesResponseType(typeof(RecargaTagResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RecargaTagResponseDto>> RecargarCuenta([FromBody] RecargaTagRequestDto request)
    {
        string usuario = User?.FindFirstValue("codigo") 
                         ?? User?.FindFirstValue(ClaimTypes.Name) 
                         ?? "SUPERVISOR";

        var response = await _telepeajeService.RecargarCuentaAsync(request, usuario);
        return Ok(response);
    }

    [HttpGet("api/cuentas-telepeaje/por-placa/{placa}")]
    [HttpGet("api/telepeaje/cuentas/por-placa/{placa}")]
    [Authorize(Policy = PoliticasAuth.PoliticaRecaudador)]
    [ProducesResponseType(typeof(CuentaTelepeajeDetalleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CuentaTelepeajeDetalleDto>> ObtenerCuentaPorPlaca([FromRoute] string placa)
    {
        var cuenta = await _telepeajeService.ObtenerCuentaPorPlacaAsync(placa);
        return Ok(cuenta);
    }
}
