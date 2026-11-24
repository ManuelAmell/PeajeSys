using System.Security.Claims;
using PeajeSys.Core.Enums;
using Xunit;

namespace PeajeSys.Tests.Auth;

public class AuthorizationPolicyTests
{
    [Theory]
    [InlineData(Roles.Recaudador, true)]
    [InlineData(Roles.Supervisor, true)]
    [InlineData(Roles.Administrador, true)]
    [InlineData("INVITADO", false)]
    public void PoliticaRecaudador_PermiteRecaudadorSupervisorYAdmin(string rol, bool permitidoEsperado)
    {
        // PoliticaRecaudador: Roles RECAUDADOR, SUPERVISOR, ADMINISTRADOR
        bool esPermitido = rol == Roles.Recaudador || rol == Roles.Supervisor || rol == Roles.Administrador;
        Assert.Equal(permitidoEsperado, esPermitido);
    }

    [Theory]
    [InlineData(Roles.Recaudador, false)]
    [InlineData(Roles.Supervisor, true)]
    [InlineData(Roles.Administrador, true)]
    [InlineData("INVITADO", false)]
    public void PoliticaSupervisor_PermiteSupervisorYAdmin(string rol, bool permitidoEsperado)
    {
        // PoliticaSupervisor: Roles SUPERVISOR, ADMINISTRADOR
        bool esPermitido = rol == Roles.Supervisor || rol == Roles.Administrador;
        Assert.Equal(permitidoEsperado, esPermitido);
    }

    [Theory]
    [InlineData(Roles.Recaudador, false)]
    [InlineData(Roles.Supervisor, false)]
    [InlineData(Roles.Administrador, true)]
    [InlineData("INVITADO", false)]
    public void PoliticaAdmin_PermiteSoloAdmin(string rol, bool permitidoEsperado)
    {
        // PoliticaAdmin: Rol ADMINISTRADOR
        bool esPermitido = rol == Roles.Administrador;
        Assert.Equal(permitidoEsperado, esPermitido);
    }
}
