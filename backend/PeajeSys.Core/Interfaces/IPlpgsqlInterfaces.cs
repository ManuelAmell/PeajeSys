using System.Threading.Tasks;

namespace PeajeSys.Core.Interfaces;

// ============================================================
// INTERFACES DE INTEGRACION CON OBJETOS PL/pgSQL
// Tarea BK-06: Capa de abstraccion para funciones almacenadas,
// procedimientos y triggers de PostgreSQL.
// ============================================================

/// <summary>
/// Encapsula la invocacion de fn_obtener_tarifa_vigente(p_placa, p_id_estacion).
/// Devuelve el monto NUMERIC(10,2) de la tarifa activa para la placa y estacion.
/// </summary>
public interface IFnTarifaVigenteService
{
    /// <summary>
    /// Invoca fn_obtener_tarifa_vigente(p_placa, p_id_estacion).
    /// Lanza NotFoundException si no existe tarifa activa o vehiculo no registrado.
    /// </summary>
    Task<decimal> ObtenerTarifaVigenteAsync(string placa, int idEstacion);
}

/// <summary>
/// Encapsula la invocacion de fn_validar_aptitud_telepeaje(p_tag_serial, p_monto_requerido).
/// Devuelve TRUE si la cuenta RFID esta activa y tiene saldo suficiente.
/// </summary>
public interface IFnValidarAptitudTelepeajeService
{
    /// <summary>
    /// Invoca fn_validar_aptitud_telepeaje(p_tag_serial, p_monto_requerido).
    /// Retorna true si la cuenta puede cruzar; false en caso contrario.
    /// </summary>
    Task<bool> ValidarAptitudTelepeajeAsync(string tagSerial, decimal montoRequerido);
}

/// <summary>
/// Encapsula la invocacion del procedimiento almacenado pr_cerrar_arqueo_turno.
/// Realiza cierre financiero atomico de un turno en PostgreSQL.
/// </summary>
public interface ISpCerrarArqueoTurnoService
{
    /// <summary>
    /// Invoca pr_cerrar_arqueo_turno(p_id_turno, p_efectivo_declarado, INOUT ...).
    /// Retorna el resultado del arqueo con diferencia y estado final.
    /// </summary>
    Task<ArqueoPlpgsqlResultDto> CerrarArqueoTurnoAsync(long idTurno, decimal efectivoDeclarado);
}

/// <summary>
/// Encapsula la invocacion del procedimiento almacenado pr_recargar_saldo_telepeaje.
/// Recarga la cuenta de telepeaje identificada por placa o serial RFID.
/// </summary>
public interface ISpRecargarSaldoTelepeajeService
{
    /// <summary>
    /// Invoca pr_recargar_saldo_telepeaje(p_tag_o_placa, p_monto_recarga, INOUT ...).
    /// Retorna el nuevo saldo y el estado final de la cuenta.
    /// </summary>
    Task<RecargaPlpgsqlResultDto> RecargarSaldoTelepeajeAsync(string tagOPlaca, decimal montoRecarga);
}

// ============================================================
// DTOs DE RESULTADO PARA PROCEDIMIENTOS PL/pgSQL
// ============================================================

/// <summary>
/// Resultado del procedimiento pr_cerrar_arqueo_turno.
/// Mapea los parametros INOUT de salida del stored procedure.
/// </summary>
public class ArqueoPlpgsqlResultDto
{
    public long IdTurno { get; set; }
    public decimal EfectivoDeclarado { get; set; }
    public decimal TotalSistema { get; set; }
    public decimal Diferencia { get; set; }

    /// <summary>Estado final: CERRADO.</summary>
    public string EstadoCierre { get; set; } = "CERRADO";

    /// <summary>Clasificacion de arqueo: CUADRADO, FALTANTE o SOBRANTE.</summary>
    public string ClasificacionArqueo { get; set; } = string.Empty;
}

/// <summary>
/// Resultado del procedimiento pr_recargar_saldo_telepeaje.
/// Mapea los parametros INOUT de salida del stored procedure.
/// </summary>
public class RecargaPlpgsqlResultDto
{
    public string TagOPlaca { get; set; } = string.Empty;
    public decimal MontoRecarga { get; set; }
    public decimal NuevoSaldo { get; set; }

    /// <summary>Estado final de la cuenta: ACTIVA.</summary>
    public string EstadoFinal { get; set; } = "ACTIVA";
}
