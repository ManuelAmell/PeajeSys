using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Api.Controllers;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.Auth;

public class AuthControllerTests
{
    private class FakeAuthService : IAuthService
    {
        public Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
        {
            string codigo = request.ObtenerCodigo();
            string password = request.ObtenerPassword();

            if (string.IsNullOrWhiteSpace(codigo))
                throw new AppException("CODIGO_REQUERIDO", "El codigo de empleado es requerido.", 400);

            if (string.IsNullOrWhiteSpace(password))
                throw new AppException("CLAVE_REQUERIDA", "La contrasena es requerida.", 400);

            if (codigo == "EMP-009")
                throw new ForbiddenException("USUARIO_INACTIVO", "El operador se encuentra inactivo.");

            if (codigo == "EMP-999")
                throw new NotFoundException("EMPLEADO_NO_ENCONTRADO", "Empleado no registrado en el sistema.");

            if (password != "ClaveDePrueba2026*")
                throw new UnauthorizedException("CREDENCIALES_INVALIDAS", "Codigo de empleado o contrasena incorrectos.");

            var response = new LoginResponseDto
            {
                Token = "fake-jwt-token-valido-hs256",
                Usuario = new UsuarioDto
                {
                    IdOperador = 1,
                    Id = "1",
                    CodigoEmpleado = codigo,
                    Codigo = codigo,
                    Nombre = "Carlos Alberto",
                    Apellido = "Gomez Perez",
                    NombreCompleto = "Carlos Alberto Gomez Perez",
                    Rol = codigo == "ADM-001" ? Roles.Administrador : Roles.Recaudador,
                    RolTxt = codigo == "ADM-001" ? "Administrador" : "Recaudador",
                    Estado = EstadosOperador.Activo,
                    Destino = codigo == "ADM-001" ? "/admin" : "/operador",
                    DestinoTxt = codigo == "ADM-001" ? "Ir al panel de administracion" : "Ir a la terminal de cobro"
                }
            };

            return Task.FromResult(response);
        }

        public Task<UsuarioDto> ObtenerSesionAsync(string identificadorOperador)
        {
            if (string.IsNullOrWhiteSpace(identificadorOperador))
                throw new UnauthorizedException("NO_AUTENTICADO", "Sesion invalida.");

            return Task.FromResult(new UsuarioDto
            {
                IdOperador = 2,
                Id = "2",
                CodigoEmpleado = "EMP-002",
                Codigo = "EMP-002",
                Nombre = "Maria Fernanda",
                Apellido = "Lopez Martinez",
                NombreCompleto = "Maria Fernanda Lopez Martinez",
                Rol = Roles.Recaudador,
                RolTxt = "Recaudador",
                Estado = EstadosOperador.Activo
            });
        }

        public Task LogoutAsync(string identificadorOperador)
        {
            return Task.CompletedTask;
        }
    }

    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _controller = new AuthController(new FakeAuthService());
    }

    [Fact]
    public async Task Login_CredencialesValidas_Retorna200ConTokenYUsuario()
    {
        // Arrange
        var request = new LoginRequestDto
        {
            CodigoEmpleado = "EMP-001",
            Password = "ClaveDePrueba2026*"
        };

        // Act
        var result = await _controller.Login(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<LoginResponseDto>(okResult.Value);
        Assert.Equal("fake-jwt-token-valido-hs256", response.Token);
        Assert.Equal("EMP-001", response.Usuario.CodigoEmpleado);
        Assert.Equal(Roles.Recaudador, response.Usuario.Rol);
    }

    [Fact]
    public async Task Login_UsuarioInactivo_LanzaForbiddenExceptionConCodigoUsuarioInactivo()
    {
        // Arrange
        var request = new LoginRequestDto
        {
            CodigoEmpleado = "EMP-009",
            Password = "ClaveDePrueba2026*"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _controller.Login(request));
        Assert.Equal(403, ex.StatusCode);
        Assert.Equal("USUARIO_INACTIVO", ex.Codigo);
    }

    [Fact]
    public async Task Login_ContrasenaInvalida_LanzaUnauthorizedExceptionConCodigoCredencialesInvalidas()
    {
        // Arrange
        var request = new LoginRequestDto
        {
            CodigoEmpleado = "EMP-001",
            Password = "PasswordIncorrecto"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _controller.Login(request));
        Assert.Equal(401, ex.StatusCode);
        Assert.Equal("CREDENCIALES_INVALIDAS", ex.Codigo);
    }

    [Fact]
    public async Task Login_UsuarioAdministradorSemilla_RetornaRolAdministrador()
    {
        // Arrange
        var request = new LoginRequestDto
        {
            Codigo = "ADM-001",
            Clave = "ClaveDePrueba2026*"
        };

        // Act
        var result = await _controller.Login(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<LoginResponseDto>(okResult.Value);
        Assert.Equal(Roles.Administrador, response.Usuario.Rol);
        Assert.Equal("/admin", response.Usuario.Destino);
    }

    [Fact]
    public async Task ObtenerSesion_UsuarioAutenticado_Retorna200ConPerfil()
    {
        // Arrange
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "2"),
            new Claim("codigo", "EMP-002")
        };
        var identity = new ClaimsIdentity(claims, "Bearer");
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        // Act
        var result = await _controller.ObtenerSesion();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var usuario = Assert.IsType<UsuarioDto>(okResult.Value);
        Assert.Equal("EMP-002", usuario.CodigoEmpleado);
    }

    [Fact]
    public async Task Logout_UsuarioAutenticado_RetornaOkConMensaje()
    {
        // Arrange
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, "1") };
        var identity = new ClaimsIdentity(claims, "Bearer");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };

        // Act
        var result = await _controller.Logout();

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }
}
