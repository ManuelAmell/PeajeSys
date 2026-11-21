using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Security;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Auth;

public class AuthServiceSemillaTests
{
    private const string ClaveDemo = "Turno123*";

    private static AuthService CrearServicio(bool semillaHabilitada, bool conEmp001, out PeajeSysDbContext db)
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        db = new PeajeSysDbContext(options);

        if (conEmp001)
        {
            db.Operadores.Add(new Operador
            {
                NumeroDocumento = "1000000001",
                Nombres = "Empleado",
                Apellidos = "Uno",
                CodigoEmpleado = "EMP-001",
                Rol = "RECAUDADOR",
                Estado = "ACTIVO"
            });
            db.SaveChanges();
        }

        var hasher = new PasswordHasher(4, ClaveDemo, usuariosSemillaHabilitados: semillaHabilitada);
        var jwt = new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);
        return new AuthService(db, hasher, jwt);
    }

    private static LoginRequestDto Peticion(string codigo) =>
        new() { CodigoEmpleado = codigo, Password = ClaveDemo };

    [Fact]
    public async Task Login_SemillaHabilitada_Adm001SinFila_EntraComoAdministrador()
    {
        var servicio = CrearServicio(true, false, out var db);
        using var _ = db;

        var respuesta = await servicio.LoginAsync(Peticion("ADM-001"));

        Assert.Equal("ADMINISTRADOR", respuesta.Usuario.Rol);
        Assert.False(string.IsNullOrEmpty(respuesta.Token));
    }

    [Fact]
    public async Task Login_SemillaHabilitada_Emp001ConFila_EntraConClaveDemo()
    {
        var servicio = CrearServicio(true, true, out var db);
        using var _ = db;

        var respuesta = await servicio.LoginAsync(Peticion("EMP-001"));

        Assert.False(string.IsNullOrEmpty(respuesta.Token));
    }

    [Fact]
    public async Task Login_SemillaDeshabilitada_Adm001SinFila_LanzaEmpleadoNoEncontrado()
    {
        var servicio = CrearServicio(false, false, out var db);
        using var _ = db;

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => servicio.LoginAsync(Peticion("ADM-001")));

        Assert.Equal("EMPLEADO_NO_ENCONTRADO", ex.Codigo);
    }

    [Fact]
    public async Task Login_SemillaDeshabilitada_Emp001ConFila_LanzaCredencialesInvalidas()
    {
        var servicio = CrearServicio(false, true, out var db);
        using var _ = db;

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => servicio.LoginAsync(Peticion("EMP-001")));

        Assert.Equal("CREDENCIALES_INVALIDAS", ex.Codigo);
    }
}
