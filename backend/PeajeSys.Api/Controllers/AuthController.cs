using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        var respuesta = await _authService.LoginAsync(request);
        return Ok(respuesta);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        string? identificador = User.FindFirstValue(ClaimTypes.NameIdentifier) 
            ?? User.FindFirstValue("codigo");

        await _authService.LogoutAsync(identificador ?? string.Empty);
        return Ok(new { mensaje = "Sesion cerrada correctamente" });
    }

    [Authorize]
    [HttpGet("sesion")]
    public async Task<ActionResult<UsuarioDto>> ObtenerSesion()
    {
        string? identificador = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("codigo");

        if (string.IsNullOrEmpty(identificador))
        {
            return Unauthorized(new ErrorEnvelope
            {
                Error = new ErrorDetails
                {
                    Codigo = "NO_AUTENTICADO",
                    Mensaje = "No se encontro contexto de identidad valido en el token."
                }
            });
        }

        var usuario = await _authService.ObtenerSesionAsync(identificador);
        return Ok(usuario);
    }
}
