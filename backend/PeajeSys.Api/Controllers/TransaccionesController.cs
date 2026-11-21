using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Controllers;

[ApiController]
[Authorize(Policy = PoliticasAuth.PoliticaRecaudador)]
public class TransaccionesController : ControllerBase
{
    private readonly ITransaccionService _transaccionService;

    public TransaccionesController(ITransaccionService transaccionService)
    {
        _transaccionService = transaccionService;
    }

    [HttpPost("api/transacciones/{id:long}/anulacion")]
    [ProducesResponseType(typeof(AnulacionTransaccionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AnulacionTransaccionResponseDto>> Anular([FromRoute] long id, [FromBody] AnularTransaccionRequestDto request)
    {
        var respuesta = await _transaccionService.AnularAsync(id, request, ObtenerActor(User));
        return Ok(respuesta);
    }

    [HttpGet("api/turnos/{id:long}/transacciones")]
    [ProducesResponseType(typeof(System.Collections.Generic.IReadOnlyList<TransaccionDetalleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<System.Collections.Generic.IReadOnlyList<TransaccionDetalleDto>>> ListarPorTurno([FromRoute] long id)
    {
        var lista = await _transaccionService.ListarPorTurnoAsync(id, ObtenerActor(User));
        return Ok(lista);
    }

    private static ActorOperacion ObtenerActor(ClaimsPrincipal usuario)
    {
        string? sub = usuario.FindFirstValue(ClaimTypes.NameIdentifier) ?? usuario.FindFirstValue("sub");
        if (!int.TryParse(sub, out int idOperador))
        {
            throw new UnauthorizedException("TOKEN_INVALIDO", "El token no identifica a un operador.");
        }
        string codigo = usuario.FindFirstValue("codigo") ?? usuario.FindFirstValue("codigo_empleado") ?? string.Empty;
        string rol = usuario.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        return new ActorOperacion(idOperador, codigo, rol);
    }
}
