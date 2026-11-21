using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Security;

// Handler de autenticacion custom para integracion nativa con claims y middleware
public class CustomBearerAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
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
}
