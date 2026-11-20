using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using PeajeSys.Core.Enums;
using Xunit;

namespace PeajeSys.Tests.Supervisor;

public class SupervisorAuthorizationTests
{
    private static bool EvaluarPolitica(AuthorizationPolicy policy, string? rol)
    {
        var claims = string.IsNullOrWhiteSpace(rol)
            ? Array.Empty<Claim>()
            : new[] { new Claim(ClaimTypes.Role, rol) };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        foreach (var req in policy.Requirements)
        {
            if (req is Microsoft.AspNetCore.Authorization.Infrastructure.RolesAuthorizationRequirement rolesReq)
            {
                if (!rolesReq.AllowedRoles.Any(r => principal.IsInRole(r)))
                    return false;
            }
        }

        return true;
    }

    [Theory]
    [InlineData(Roles.Recaudador, false)]
    [InlineData("INVITADO", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void PoliticaSupervisor_DeniegaAccesoARecaudadoresYUsuariosNoAutorizados(string? rol, bool permitidoEsperado)
    {
        // Arrange
        var policy = new AuthorizationPolicyBuilder()
            .RequireRole(Roles.Supervisor, Roles.Administrador)
            .Build();

        // Act
        bool resultado = EvaluarPolitica(policy, rol);

        // Assert
        Assert.Equal(permitidoEsperado, resultado);
    }

    [Theory]
    [InlineData(Roles.Supervisor, true)]
    [InlineData(Roles.Administrador, true)]
    public void PoliticaSupervisor_PermiteAccesoExclusivoASupervisorYAdmin(string rol, bool permitidoEsperado)
    {
        // Arrange
        var policy = new AuthorizationPolicyBuilder()
            .RequireRole(Roles.Supervisor, Roles.Administrador)
            .Build();

        // Act
        bool resultado = EvaluarPolitica(policy, rol);

        // Assert
        Assert.Equal(permitidoEsperado, resultado);
    }
}
