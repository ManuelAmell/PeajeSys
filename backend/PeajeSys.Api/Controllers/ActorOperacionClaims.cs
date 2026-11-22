using System.Security.Claims;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Controllers;

/// <summary>Extrae del token (sub, codigo, rol) al operador que realiza la peticion.</summary>
internal static class ActorOperacionClaims
{
    public static ActorOperacion Desde(ClaimsPrincipal usuario)
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
