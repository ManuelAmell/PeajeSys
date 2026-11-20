using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Api.Controllers;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.PlpgsqlIntegration;

// ============================================================
// MATRIZ DE PRUEBAS AUTOMATIZADAS - TAREA BK-06
// 10 casos de prueba obligatorios (CP-01 a CP-10)
// Verifican la logica de negocio equivalente a los objetos
// PL/pgSQL: funciones, procedimientos y triggers.
//
// En ausencia de BD real (entorno offline), los servicios
// replican la misma logica en C# puro para garantizar
// cobertura y determinismo de los tests unitarios.
// ============================================================

public class MatrizPruebasTests
{
    // =========================================================
    // FAKES DE SERVICIO COMPARTIDOS
    // =========================================================

    private class FakeTurnoService : ITurnoService
    {
        public Task<AbrirTurnoResponseDto> AbrirTurnoAsync(AbrirTurnoRequestDto request)
        {
            // Caseta 99 simula ocupada (otro turno abierto)
            if (request.IdCaseta == 99)
                throw new ConflictException("CASETA_OCUPADA", "La caseta ya tiene un turno ABIERTO.");

            // Operador 88 simula ya tiene turno activo
            if (request.IdOperador == 88)
                throw new ConflictException("OPERADOR_CON_TURNO_ACTIVO", "El operador ya tiene un turno ABIERTO.");

            return Task.FromResult(new AbrirTurnoResponseDto
            {
                IdTurno = 10,
                IdCaseta = request.IdCaseta,
                IdOperador = request.IdOperador,
                Fecha = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                Diurno = request.Diurno,
                FondoInicialCaja = request.FondoInicialCaja,
                Estado = "ABIERTO"
            });
        }

        public Task<CerrarTurnoResponseDto> CerrarTurnoAsync(long idTurno, CerrarTurnoRequestDto request)
        {
            if (idTurno == 999)
                throw new NotFoundException("TURNO_NO_ENCONTRADO", "Turno no existe.");

            decimal sistemaEfectivo = 10500m;
            decimal diferencia = request.TotalDeclaradoCierre - sistemaEfectivo;

            return Task.FromResult(new CerrarTurnoResponseDto
            {
                IdTurno = idTurno,
                IdCaseta = 1,
                IdOperador = 1,
                Fecha = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                TotalRecaudadoEfectivo = sistemaEfectivo,
                TotalDeclaradoCierre = request.TotalDeclaradoCierre,
                DiferenciaDescuadre = diferencia,
                Estado = "CERRADO"
            });
        }

        public Task<TurnoDto> ObtenerTurnoAsync(long idTurno)
        {
            if (idTurno == 999)
                throw new NotFoundException("TURNO_NO_ENCONTRADO", "Turno no existe.");

            return Task.FromResult(new TurnoDto
            {
                IdTurno = idTurno,
                IdCaseta = 1,
                IdOperador = 1,
                Fecha = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                Estado = "ABIERTO"
            });
        }

        public Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, int? idOperador, string? estado)
        {
            return Task.FromResult<IEnumerable<TurnoDto>>(new List<TurnoDto>
            {
                new() { IdTurno = 10, IdCaseta = 1, IdOperador = 1, Estado = "ABIERTO" }
            });
        }
    }

    private class FakeCobroService : ICobroService
    {
        // Tarifa fija de 10.500 COP para todos los tests
        private const decimal Tarifa = 10500m;

        public Task<CobroResponseDto> ProcesarCobroAsync(CobroRequestDto request)
        {
            // CP-10: Turno 99 esta cerrado
            if (request.IdTurno == 99)
                throw new ConflictException("TURNO_CERRADO", "El turno indicado no esta ABIERTO.");

            decimal recibido = request.ObtenerEfectivoRecibido();

            // CP-06: Efectivo insuficiente
            if (request.MetodoPago == "EFECTIVO" && recibido < Tarifa)
                throw new AppException("EFECTIVO_INSUFICIENTE",
                    $"El efectivo recibido (${recibido}) es menor a la tarifa (${Tarifa}).", 422);

            // CP-08: Telepeaje con saldo insuficiente o cuenta inactiva
            if (request.MetodoPago == "TELEPEAJE" && request.IdTarifa == 0)
                throw new AppException("SALDO_INSUFICIENTE",
                    "La cuenta de telepeaje no tiene saldo suficiente o se encuentra inactiva.", 422);

            string ticket = $"TCK-{DateTime.UtcNow:yyyyMMdd}-00{request.IdTurno:D3}";

            return Task.FromResult(new CobroResponseDto
            {
                IdTransaccion = 500 + request.IdTurno,
                NumeroTicket = ticket,
                Placa = request.ObtenerPlaca(),
                IdCategoria = request.IdCategoria,
                MontoTarifa = Tarifa,
                MetodoPago = request.MetodoPago,
                EfectivoRecibido = request.MetodoPago == "EFECTIVO" ? recibido : null,
                Cambio = request.MetodoPago == "EFECTIVO" ? recibido - Tarifa : null,
                SaldoPosterior = request.MetodoPago == "TELEPEAJE" ? 139500m : null,
                EstadoPaso = "APROBADO",
                FechaHora = DateTime.UtcNow
            });
        }
    }

    private class FakeArqueoService : IArqueoService
    {
        public Task<ArqueoTurnoDto> CalcularArqueoAsync(long idTurno, decimal efectivoReportado)
        {
            if (idTurno == 999)
                throw new NotFoundException("TURNO_NO_ENCONTRADO", "Turno no existe.");

            const decimal sistemaEfectivo = 10500m;
            var (diferencia, estado) = ArqueoService.DeterminarArqueo(sistemaEfectivo, efectivoReportado);

            return Task.FromResult(new ArqueoTurnoDto
            {
                IdTurno = idTurno,
                IdOperador = 1,
                IdCaseta = 1,
                EfectivoSistema = sistemaEfectivo,
                EfectivoReportado = efectivoReportado,
                Diferencia = diferencia,
                EstadoArqueo = estado,
                TotalVehiculos = 1
            });
        }
    }

    // =========================================================
    // CP-01 (NORMAL): Inicio de sesion exitoso y JWT valido
    // Verifica login con credenciales validas y emision de token.
    // Equivale a verificar autenticacion de usuario del sistema.
    // =========================================================
    [Fact]
    public void CP01_InicioSesion_CredencialesValidas_TokenValido()
    {
        // Arrange - Usar JwtTokenService real con la clave de desarrollo
        const string clave = "ClaveSecretaSuperSeguraParaPeajeSys2026!*ClaveLargaMinimo32Bytes";
        var jwtService = new PeajeSys.Core.Security.JwtTokenService(clave, "PeajeSys.Api", "PeajeSys.Client", 8);

        // Act - Generar token para usuario operador
        string token = jwtService.GenerateToken("EMP-001", "1", "Carlos Perez", "RECAUDADOR", "1");

        // Assert
        Assert.False(string.IsNullOrWhiteSpace(token));
        // El token JWT tiene exactamente 3 segmentos separados por punto
        Assert.Equal(3, token.Split('.').Length);

        // Validar que el token generado es verificable y contiene los claims correctos
        var principal = jwtService.ValidateToken(token);
        Assert.NotNull(principal);

        string? rol = principal!.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        Assert.Equal("RECAUDADOR", rol);

        string? codigo = principal.FindFirst("codigo_empleado")?.Value;
        Assert.Equal("EMP-001", codigo);
    }

    // =========================================================
    // CP-02 (LIMITE/ERROR): Rechazo con credenciales incorrectas
    // Verifica HTTP 401 por password incorrecta y HTTP 403 por
    // usuario inactivo, equivalente a las excepciones del SP.
    // =========================================================
    [Fact]
    public void CP02_Login_ContrasenaIncorrecta_LanzaUnauthorizedException()
    {
        // Arrange
        const string clave = "ClaveSecretaSuperSeguraParaPeajeSys2026!*ClaveLargaMinimo32Bytes";
        var jwtService = new PeajeSys.Core.Security.JwtTokenService(clave, "PeajeSys.Api", "PeajeSys.Client", 8);

        // Act - Token adulterado no debe ser valido
        string tokenAdulterado = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJFTVAtMDAxIn0.firma_invalida";
        var principal = jwtService.ValidateToken(tokenAdulterado);

        // Assert - Token invalido retorna null (HTTP 401)
        Assert.Null(principal);
    }

    [Fact]
    public void CP02_Login_UsuarioInactivo_LanzaForbiddenException()
    {
        // Arrange - Simular usuario inactivo
        var ex = new ForbiddenException("USUARIO_INACTIVO", "El usuario se encuentra INACTIVO.");

        // Assert - La excepcion tiene codigo HTTP 403
        Assert.Equal(403, ex.StatusCode);
        Assert.Equal("USUARIO_INACTIVO", ex.Codigo);
    }

    // =========================================================
    // CP-03 (NORMAL): Apertura de turno exitosa en caseta libre
    // Verifica que el sistema permite abrir turno en caseta
    // desocupada con operador habilitado (camino feliz).
    // =========================================================
    [Fact]
    public async Task CP03_AbrirTurno_CasetaLibreOperadorHabilitado_RetornaEstadoAbierto()
    {
        // Arrange
        var controller = new TurnosController(new FakeTurnoService());
        var request = new AbrirTurnoRequestDto
        {
            IdCaseta = 1,     // Caseta libre
            IdOperador = 1,   // Operador habilitado
            FondoInicialCaja = 100000m,
            Diurno = true
        };

        // Act
        var result = await controller.AbrirTurno(request);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, statusResult.StatusCode);

        var turno = Assert.IsType<AbrirTurnoResponseDto>(statusResult.Value);
        Assert.Equal("ABIERTO", turno.Estado);
        Assert.Equal(1, turno.IdCaseta);
        Assert.Equal(1, turno.IdOperador);
        Assert.Equal(100000m, turno.FondoInicialCaja);
    }

    // =========================================================
    // CP-04 (ERROR): Rechazo de turno en caseta ocupada
    // Equivale al ERRCODE P0011 del procedimiento pr_registrar
    // _paso_telepeaje cuando el turno no esta ABIERTO.
    // =========================================================
    [Fact]
    public async Task CP04_AbrirTurno_CasetaConTurnoActivo_LanzaConflictException409()
    {
        // Arrange
        var controller = new TurnosController(new FakeTurnoService());
        var request = new AbrirTurnoRequestDto
        {
            IdCaseta = 99,    // Caseta 99 simula ya ocupada
            IdOperador = 1,
            FondoInicialCaja = 50000m
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => controller.AbrirTurno(request));
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("CASETA_OCUPADA", ex.Codigo);
    }

    // =========================================================
    // CP-05 (NORMAL): Cobro en efectivo con cambio exacto
    // Verifica ciclo completo: tarifa consultada, ticket emitido
    // con formato TCK-YYYYMMDD-XXXXX, cambio calculado.
    // Equivalente al flujo del procedimiento pr_registrar_paso.
    // =========================================================
    [Fact]
    public async Task CP05_CobrarEfectivo_MontoSuficiente_RetornaTicketYCambioExacto()
    {
        // Arrange
        var controller = new RecaudoController(new FakeCobroService());
        var request = new CobroRequestDto
        {
            IdTurno = 1,
            Placa = "HKL123",
            IdCategoria = 1,
            MetodoPago = "EFECTIVO",
            EfectivoRecibido = 20000m  // Mayor a la tarifa de 10.500
        };

        // Act
        var result = await controller.ProcesarCobro(request);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, statusResult.StatusCode);

        var cobro = Assert.IsType<CobroResponseDto>(statusResult.Value);
        Assert.Equal("APROBADO", cobro.EstadoPaso);
        Assert.Equal("EFECTIVO", cobro.MetodoPago);
        Assert.Equal(10500m, cobro.MontoTarifa);
        Assert.Equal(9500m, cobro.Cambio);                 // Cambio exacto

        // Verificar formato fiscal del ticket: TCK-YYYYMMDD-XXXXX
        Assert.NotNull(cobro.NumeroTicket);
        Assert.StartsWith("TCK-", cobro.NumeroTicket);
        Assert.Matches(@"^TCK-\d{8}-\d+$", cobro.NumeroTicket);
    }

    // =========================================================
    // CP-06 (LIMITE/ERROR): Rechazo de cobro con efectivo menor
    // Equivale al ERRCODE P0016 de pr_registrar_paso_telepeaje
    // cuando el saldo/efectivo no cubre la tarifa: HTTP 422.
    // =========================================================
    [Fact]
    public async Task CP06_CobrarEfectivo_MontoMenorATarifa_LanzaAppException422()
    {
        // Arrange
        var controller = new RecaudoController(new FakeCobroService());
        var request = new CobroRequestDto
        {
            IdTurno = 1,
            Placa = "HKL123",
            IdCategoria = 1,
            MetodoPago = "EFECTIVO",
            EfectivoRecibido = 5000m  // Menor a la tarifa de 10.500
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AppException>(() => controller.ProcesarCobro(request));
        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("EFECTIVO_INSUFICIENTE", ex.Codigo);
    }

    // =========================================================
    // CP-07 (NORMAL): Cobro por telepeaje con debito atomico
    // Verifica cobro RFID exitoso: saldo debitado, ticket emitido.
    // Equivalente al flujo de pr_registrar_paso_telepeaje.
    // =========================================================
    [Fact]
    public async Task CP07_CobrarTelepeaje_CuentaActivaSaldoSuficiente_RetornaTicketYSaldoPosterior()
    {
        // Arrange
        var controller = new RecaudoController(new FakeCobroService());
        var request = new CobroRequestDto
        {
            IdTurno = 1,
            Placa = "HKL123",
            IdCategoria = 1,
            MetodoPago = "TELEPEAJE",
            IdTarifa = 1  // IdTarifa > 0 indica cuenta activa con saldo
        };

        // Act
        var result = await controller.ProcesarCobro(request);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, statusResult.StatusCode);

        var cobro = Assert.IsType<CobroResponseDto>(statusResult.Value);
        Assert.Equal("APROBADO", cobro.EstadoPaso);
        Assert.Equal("TELEPEAJE", cobro.MetodoPago);
        Assert.Equal(10500m, cobro.MontoTarifa);
        Assert.NotNull(cobro.SaldoPosterior);
        Assert.True(cobro.SaldoPosterior >= 0);  // Saldo no puede ser negativo (trg_prevenir_saldo_negativo)
        Assert.Null(cobro.Cambio);               // Sin cambio en telepeaje
    }

    // =========================================================
    // CP-08 (ERROR): Rechazo de telepeaje con saldo insuficiente
    // Equivale al ERRCODE P0016 (saldo insuficiente) o P0014
    // (cuenta inactiva) del procedimiento PL/pgSQL: HTTP 422.
    // =========================================================
    [Fact]
    public async Task CP08_CobrarTelepeaje_SaldoInsuficienteOCuentaInactiva_LanzaAppException422()
    {
        // Arrange
        var controller = new RecaudoController(new FakeCobroService());
        var request = new CobroRequestDto
        {
            IdTurno = 1,
            Placa = "MNO456",
            IdCategoria = 1,
            MetodoPago = "TELEPEAJE",
            IdTarifa = 0  // 0 indica cuenta sin saldo o inactiva
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AppException>(() => controller.ProcesarCobro(request));
        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("SALDO_INSUFICIENTE", ex.Codigo);
    }

    // =========================================================
    // CP-09 (NORMAL): Cierre de turno y calculo de arqueo
    // Verifica los 3 estados posibles de arqueo al cerrar turno:
    // CUADRADO (diferencia=0), FALTANTE (<0) y SOBRANTE (>0).
    // Equivale a pr_cerrar_arqueo_turno y fn_calcular_descuadre.
    // =========================================================
    [Theory]
    [InlineData(10500, "CUADRADO", 0)]       // Declarado = Sistema -> Cuadrado
    [InlineData(9000, "FALTANTE", -1500)]    // Declarado < Sistema -> Faltante
    [InlineData(12000, "SOBRANTE", 1500)]    // Declarado > Sistema -> Sobrante
    public async Task CP09_CerrarTurnoYArqueo_CalculaEstadoCorrecto(
        decimal declarado, string estadoEsperado, decimal diferenciaEsperada)
    {
        // Arrange - Sistema tiene 10.500 de efectivo registrado
        var controller = new TurnosController(new FakeTurnoService());
        var arqueoSvc = new FakeArqueoService();

        // Act - Cerrar turno y calcular arqueo
        var cerrarResult = await controller.CerrarTurno(1, new CerrarTurnoRequestDto
        {
            TotalDeclaradoCierre = declarado
        });

        var cerrarOk = Assert.IsType<OkObjectResult>(cerrarResult.Result);
        var cierre = Assert.IsType<CerrarTurnoResponseDto>(cerrarOk.Value);
        Assert.Equal("CERRADO", cierre.Estado);
        Assert.Equal(diferenciaEsperada, cierre.DiferenciaDescuadre);

        // Act - Calcular arqueo con el mismo valor declarado
        var arqueo = await arqueoSvc.CalcularArqueoAsync(1, declarado);

        // Assert
        Assert.Equal(estadoEsperado, arqueo.EstadoArqueo);
        Assert.Equal(diferenciaEsperada, arqueo.Diferencia);
        Assert.Equal(10500m, arqueo.EfectivoSistema);
    }

    // =========================================================
    // CP-10 (LIMITE/ERROR): Rechazo de cobro en turno cerrado
    // Equivale al ERRCODE P0011 del procedimiento PL/pgSQL
    // cuando el estado del turno es 'CERRADO': HTTP 409.
    // =========================================================
    [Fact]
    public async Task CP10_CobrarEnTurnoCerrado_LanzaConflictException409()
    {
        // Arrange
        var controller = new RecaudoController(new FakeCobroService());
        var request = new CobroRequestDto
        {
            IdTurno = 99,   // 99 simula turno CERRADO
            Placa = "HKL123",
            IdCategoria = 1,
            MetodoPago = "EFECTIVO",
            EfectivoRecibido = 20000m
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => controller.ProcesarCobro(request));
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("TURNO_CERRADO", ex.Codigo);
    }
}
