using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;

namespace PeajeSys.Core.Interfaces;

public interface ITurnoService
{
    Task<AbrirTurnoResponseDto> AbrirTurnoAsync(AbrirTurnoRequestDto request, ActorOperacion actor);
    Task<TurnoDto> CerrarTurnoAsync(long idTurno, CerrarTurnoRequestDto request, ActorOperacion actor);
    Task<TurnoDto> ObtenerTurnoAsync(long idTurno, ActorOperacion actor);
    /// <summary>Listado acotado por rol: el RECAUDADOR solo recibe sus propios turnos.</summary>
    Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, string? operador, string? estado, string? fecha, int? idEstacion, ActorOperacion actor);
}

public interface IVehiculoService
{
    Task<VehiculoConsultaDto> ConsultarVehiculoAsync(string placa);
}

public interface ICobroService
{
    Task<CobroResponseDto> ProcesarCobroAsync(CobroRequestDto request, ActorOperacion actor);
}

/// <summary>Consecutivo fiscal del tiquete. La implementacion real usa la secuencia de BD y NO tiene respaldo en memoria.</summary>
public interface IGeneradorNumeroTicket
{
    Task<long> SiguienteAsync();
}

/// <summary>
/// Operaciones de dinero que deben ser atomicas en la BD (un solo UPDATE, sin leer-modificar-escribir).
/// La implementacion Npgsql usa SQL; las pruebas con EF InMemory usan un fake.
/// </summary>
public interface IAjustesAtomicos
{
    /// <summary>Resta el monto del saldo solo si alcanza. Devuelve el saldo nuevo, o null si el saldo es insuficiente o la cuenta no esta ACTIVA.</summary>
    Task<decimal?> DebitarCuentaAsync(long idCuenta, decimal monto);

    /// <summary>Suma el monto al saldo y devuelve el saldo nuevo. Lanza NotFoundException si la cuenta no existe.</summary>
    Task<decimal> AcreditarCuentaAsync(long idCuenta, decimal monto);

    /// <summary>Resta el monto de total_recaudado_efectivo del turno.</summary>
    Task RestarRecaudoEfectivoAsync(long idTurno, decimal monto);
}
