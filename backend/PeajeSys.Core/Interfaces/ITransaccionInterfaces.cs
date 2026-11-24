using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;

namespace PeajeSys.Core.Interfaces;

/// <summary>Operador autenticado que ejecuta la operacion (claims del token).</summary>
public sealed record ActorOperacion(int IdOperador, string CodigoEmpleado, string Rol);

public interface ITransaccionService
{
    /// <summary>Transacciones de un turno ordenadas por fecha_hora.</summary>
    Task<IReadOnlyList<TransaccionDetalleDto>> ListarPorTurnoAsync(long idTurno, ActorOperacion actor);

    /// <summary>Anula una transaccion: registra un VOID en auditoria y revierte el dinero.</summary>
    Task<AnulacionTransaccionResponseDto> AnularAsync(long idTransaccion, AnularTransaccionRequestDto request, ActorOperacion actor);
}
