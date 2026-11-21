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

    private readonly IJwtTokenService _jwtTokenService;

    public CustomBearerAuthenticationHandler(
        Microsoft.Extensions.Options.IOptionsMonitor<AuthenticationSchemeOptions> options,
        Microsoft.Extensions.Logging.ILoggerFactory logger,
        System.Text.Encodings.Web.UrlEncoder encoder,
        IJwtTokenService jwtTokenService)
        : base(options, logger, encoder)
    {
        _jwtTokenService = jwtTokenService;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string authHeader = Request.Headers["Authorization"].ToString();
        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        string token = authHeader.Substring("Bearer ".Length).Trim();
        var principal = _jwtTokenService.ValidateToken(token);
        if (principal == null)
        {
            return Task.FromResult(AuthenticateResult.Fail("Token JWT invalido o expirado."));
        }

        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

    protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        Response.ContentType = "application/json; charset=utf-8";

        var envelope = new ErrorEnvelope
        {
            Error = new ErrorDetails
            {
                Codigo = "NO_AUTENTICADO",
                Mensaje = "No se proporciono un token de autenticacion valido o la sesion ha expirado."
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
