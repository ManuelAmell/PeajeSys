using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace PeajeSys.Tests.Api;

/// <summary>Asigna a un controlador un usuario autenticado (sub, codigo y rol) para pruebas directas.</summary>
internal static class ControladorConUsuario
{
    public static T ConUsuario<T>(this T controlador, int id, string rol, string codigo = "TEST-001") where T : ControllerBase
    {
        var usuario = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("sub", id.ToString()),
            new Claim("codigo", codigo),
            new Claim(ClaimTypes.Role, rol)
        }, "TestAuth"));
        controlador.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = usuario } };
        return controlador;
    }
}
