using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Security;

// Handler de autenticacion custom para integracion nativa con claims y middleware
public class CustomBearerAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private static readonly JsonSerializerOptions OpcionesJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>Clave de HttpContext.Items con el codigo de error que debe escribir el challenge.</summary>
    internal const string ClaveCodigoError = "peajesys.auth.codigo";

    private readonly IJwtTokenService _jwtTokenService;
    private readonly IVerificadorSesionOperador _sesiones;

    public CustomBearerAuthenticationHandler(
        Microsoft.Extensions.Options.IOptionsMonitor<AuthenticationSchemeOptions> options,
        Microsoft.Extensions.Logging.ILoggerFactory logger,
        System.Text.Encodings.Web.UrlEncoder encoder,
        IJwtTokenService jwtTokenService,
        IVerificadorSesionOperador sesiones)
        : base(options, logger, encoder)
    {
        _jwtTokenService = jwtTokenService;
        _sesiones = sesiones;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string authHeader = Request.Headers["Authorization"].ToString();
        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        string token = authHeader.Substring("Bearer ".Length).Trim();
        var principal = _jwtTokenService.ValidateToken(token);
        if (principal == null)
        {
            return AuthenticateResult.Fail("Token JWT invalido o expirado.");
        }

        // El token solo prueba quien es: estado y rol se leen de la BD en cada peticion (con cache corta).
        var vigente = await _sesiones.VerificarAsync(principal);
        if (vigente == null)
        {
            Context.Items[ClaveCodigoError] = "SESION_REVOCADA";
            return AuthenticateResult.Fail("Operador inexistente o inactivo.");
        }

        return AuthenticateResult.Success(new AuthenticationTicket(vigente, Scheme.Name));
    }

    protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        Response.ContentType = "application/json; charset=utf-8";

        bool revocada = Context.Items.TryGetValue(ClaveCodigoError, out var codigoItem)
            && codigoItem is "SESION_REVOCADA";
        var envelope = new ErrorEnvelope
        {
            Error = new ErrorDetails
            {
                Codigo = revocada ? "SESION_REVOCADA" : "NO_AUTENTICADO",
                Mensaje = revocada
                    ? "La sesion ya no es valida: el operador fue desactivado o no existe."
                    : "No se proporciono un token de autenticacion valido o la sesion ha expirado."
            }
        };

        await Response.WriteAsync(JsonSerializer.Serialize(envelope, OpcionesJson));
    }

    protected override async Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status403Forbidden;
        Response.ContentType = "application/json; charset=utf-8";

        var envelope = new ErrorEnvelope
        {
            Error = new ErrorDetails
            {
                Codigo = "SIN_PERMISO",
                Mensaje = "No tiene permisos suficientes para acceder a este recurso."
            }
        };

        await Response.WriteAsync(JsonSerializer.Serialize(envelope, OpcionesJson));
    }
}
