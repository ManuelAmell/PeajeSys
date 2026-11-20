using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using PeajeSys.Core.Enums;
using Xunit;

namespace PeajeSys.Tests.Admin;

public class AdminAuthorizationTests
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
    [InlineData(Roles.Supervisor, false)]
    [InlineData("INVITADO", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void PoliticaAdmin_DeniegaAccesoARecaudadoresYSupervisores(string? rol, bool permitidoEsperado)
    {
        // Arrange
        var policy = new AuthorizationPolicyBuilder()
            .RequireRole(Roles.Administrador)
            .Build();

        // Act
        bool resultado = EvaluarPolitica(policy, rol);

        // Assert
        Assert.Equal(permitidoEsperado, resultado);
    }

    [Fact]
    public void PoliticaAdmin_PermiteAccesoExclusivoAAdministrador()
    {
        // Arrange
        var policy = new AuthorizationPolicyBuilder()
            .RequireRole(Roles.Administrador)
            .Build();

        // Act
        bool resultado = EvaluarPolitica(policy, Roles.Administrador);

        // Assert
        Assert.True(resultado);
    }
}
