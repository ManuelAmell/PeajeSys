using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Security;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Auth;

/// <summary>
/// El login valida SOLO contra la tabla operador: no hay usuarios ni contrasenas fijos en el codigo.
/// </summary>
public class AuthServiceLoginTests
{
    private const string Clave = "ClaveDePrueba2026*";
    private static readonly PasswordHasher Hasher = new(4);

    private static AuthService CrearServicio(out PeajeSysDbContext db, params Operador[] operadores)
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        db = new PeajeSysDbContext(options);
        db.Operadores.AddRange(operadores);
        db.SaveChanges();

        var jwt = new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);
        return new AuthService(db, Hasher, jwt);
    }

    private static Operador Crear(string codigo, string rol, string? hash, string estado = "ACTIVO") => new()
    {
        NumeroDocumento = "9" + codigo.GetHashCode().ToString("X").PadLeft(9, '0'),
        Nombres = "Nombre",
        Apellidos = "Apellido",
        CodigoEmpleado = codigo,
        Rol = rol,
        Estado = estado,
        PasswordHash = hash
    };

    private static LoginRequestDto Peticion(string codigo, string clave = Clave) =>
        new() { CodigoEmpleado = codigo, Password = clave };

    [Fact]
    public async Task Login_OperadorConHashValido_EntraConToken()
    {
        var servicio = CrearServicio(out var db, Crear("REC-001", "RECAUDADOR", Hasher.HashPassword(Clave)));
        using var _ = db;

        var respuesta = await servicio.LoginAsync(Peticion("REC-001"));

        Assert.False(string.IsNullOrEmpty(respuesta.Token));
        Assert.Equal("RECAUDADOR", respuesta.Usuario.Rol);
        Assert.Equal("/operador", respuesta.Usuario.Destino);
    }

    [Fact]
    public async Task Login_ContrasenaIncorrecta_LanzaCredencialesInvalidas()
    {
        var servicio = CrearServicio(out var db, Crear("REC-001", "RECAUDADOR", Hasher.HashPassword(Clave)));
        using var _ = db;

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => servicio.LoginAsync(Peticion("REC-001", "otra")));

        Assert.Equal("CREDENCIALES_INVALIDAS", ex.Codigo);
    }

    [Fact]
    public async Task Login_OperadorSinHash_LanzaElMismoErrorQueUnaClaveIncorrecta()
    {
        var servicio = CrearServicio(out var db,
            Crear("EMP-001", "RECAUDADOR", null),
            Crear("REC-001", "RECAUDADOR", Hasher.HashPassword(Clave)));
        using var _ = db;

        var sinHash = await Assert.ThrowsAsync<UnauthorizedException>(() => servicio.LoginAsync(Peticion("EMP-001")));
        var claveMala = await Assert.ThrowsAsync<UnauthorizedException>(() => servicio.LoginAsync(Peticion("REC-001", "otra")));

        Assert.Equal("CREDENCIALES_INVALIDAS", sinHash.Codigo);
        Assert.Equal(claveMala.Codigo, sinHash.Codigo);
        Assert.Equal(claveMala.Message, sinHash.Message);
    }

    [Fact]
    public async Task Login_Adm001InexistenteEnLaTabla_LanzaCredencialesInvalidas()
    {
        var servicio = CrearServicio(out var db);
        using var _ = db;

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => servicio.LoginAsync(Peticion("ADM-001")));

        Assert.Equal("CREDENCIALES_INVALIDAS", ex.Codigo);
    }

    [Fact]
    public async Task Login_InexistenteSinHashYClaveMala_DanElMismoCodigoYMensaje()
    {
        var servicio = CrearServicio(out var db,
            Crear("EMP-001", "RECAUDADOR", null),
            Crear("REC-001", "RECAUDADOR", Hasher.HashPassword(Clave)));
        using var _ = db;

        var inexistente = await Assert.ThrowsAsync<UnauthorizedException>(() => servicio.LoginAsync(Peticion("NOEXISTE-1")));
        var sinHash = await Assert.ThrowsAsync<UnauthorizedException>(() => servicio.LoginAsync(Peticion("EMP-001")));
        var claveMala = await Assert.ThrowsAsync<UnauthorizedException>(() => servicio.LoginAsync(Peticion("REC-001", "otra")));

        Assert.Equal("CREDENCIALES_INVALIDAS", inexistente.Codigo);
        Assert.Equal(claveMala.Codigo, inexistente.Codigo);
        Assert.Equal(claveMala.Codigo, sinHash.Codigo);
        Assert.Equal(claveMala.Message, inexistente.Message);
        Assert.Equal(claveMala.Message, sinHash.Message);
    }

    [Fact]
    public async Task Login_InactivoConClaveMala_Da401NoRevelaQueEstaInactivo()
    {
        var servicio = CrearServicio(out var db, Crear("REC-009", "RECAUDADOR", Hasher.HashPassword(Clave), "INACTIVO"));
        using var _ = db;

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => servicio.LoginAsync(Peticion("REC-009", "otra")));

        Assert.Equal("CREDENCIALES_INVALIDAS", ex.Codigo);
    }

    [Fact]
    public async Task Login_InexistenteGastaUnVerifyPasswordContraElHashDeRelleno()
    {
        var hasher = new ContadorHasher();
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        using var db = new PeajeSysDbContext(options);
        var jwt = new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);
        var servicio = new AuthService(db, hasher, jwt);

        await Assert.ThrowsAsync<UnauthorizedException>(() => servicio.LoginAsync(Peticion("NOEXISTE-1")));

        Assert.Equal(1, hasher.Verificaciones);
        Assert.StartsWith("$2", hasher.UltimoHash);
        Assert.Contains("$12$", hasher.UltimoHash);
    }

    private sealed class ContadorHasher : PeajeSys.Core.Interfaces.IPasswordHasher
    {
        public int Verificaciones { get; private set; }
        public string? UltimoHash { get; private set; }
        public string HashPassword(string password) => throw new NotSupportedException();
        public bool VerifyPassword(string password, string hash)
        {
            Verificaciones++;
            UltimoHash = hash;
            return false;
        }
    }

    [Fact]
    public async Task Login_AdministradorDeLaTabla_EntraConRolYDestinoDeAdmin()
    {
        var servicio = CrearServicio(out var db, Crear("ADM-001", "ADMINISTRADOR", Hasher.HashPassword(Clave)));
        using var _ = db;

        var respuesta = await servicio.LoginAsync(Peticion("ADM-001"));

        Assert.Equal("ADMINISTRADOR", respuesta.Usuario.Rol);
        Assert.Equal("/admin", respuesta.Usuario.Destino);
    }

    [Fact]
    public async Task Login_OperadorInactivo_LanzaUsuarioInactivo()
    {
        var servicio = CrearServicio(out var db, Crear("REC-009", "RECAUDADOR", Hasher.HashPassword(Clave), "INACTIVO"));
        using var _ = db;

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => servicio.LoginAsync(Peticion("REC-009")));

        Assert.Equal("USUARIO_INACTIVO", ex.Codigo);
    }

    [Fact]
    public async Task ObtenerSesion_Adm001InexistenteEnLaTabla_LanzaEmpleadoNoEncontrado()
    {
        var servicio = CrearServicio(out var db);
        using var _ = db;

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => servicio.ObtenerSesionAsync("ADM-001"));

        Assert.Equal("EMPLEADO_NO_ENCONTRADO", ex.Codigo);
    }
}
