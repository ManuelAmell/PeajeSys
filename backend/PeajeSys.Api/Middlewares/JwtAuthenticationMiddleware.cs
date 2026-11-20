using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Middlewares;

public class JwtAuthenticationMiddleware
{
    private readonly RequestDelegate _next;

    public JwtAuthenticationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IJwtTokenService jwtTokenService)
    {
        var authHeader = context.Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", System.StringComparison.OrdinalIgnoreCase))
        {
            string token = authHeader.Substring("Bearer ".Length).Trim();
            var principal = jwtTokenService.ValidateToken(token);
            if (principal != null)
            {
                context.User = principal;
            }
        }

        await _next(context);
    }
}
