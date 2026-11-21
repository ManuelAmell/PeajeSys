using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace PeajeSys.Core.DTOs;

// ============================================================
// DTOs ARQUEO
// ============================================================

public class ArqueoTurnoDto
{
    [JsonPropertyName("id_turno")]
    public long IdTurno { get; set; }

    [JsonPropertyName("id_operador")]
    public int IdOperador { get; set; }

    [JsonPropertyName("id_caseta")]
    public int IdCaseta { get; set; }

    [JsonPropertyName("efectivo_sistema")]
    public decimal EfectivoSistema { get; set; }

    [JsonPropertyName("efectivo_reportado")]
    public decimal EfectivoReportado { get; set; }

    [JsonPropertyName("diferencia")]
    public decimal Diferencia { get; set; }

    [JsonPropertyName("estado_arqueo")]
    public string EstadoArqueo { get; set; } = "CUADRADO";

    [JsonPropertyName("total_vehiculos")]
    public long TotalVehiculos { get; set; }
}

// ============================================================
// DTOs REPORTE RECAUDO DIARIO
// ============================================================

public class RecaudoDiaItemDto
{
    [JsonPropertyName("fecha")]
    public string Fecha { get; set; } = string.Empty;

    [JsonPropertyName("veh")]
    public long Veh { get; set; }

    [JsonPropertyName("ef")]
    public decimal Ef { get; set; }

    [JsonPropertyName("tag")]
    public decimal Tag { get; set; }

    [JsonPropertyName("total")]
    public decimal Total { get; set; }
}

public class RecaudoCarrilItemDto
{
    [JsonPropertyName("id_caseta")]
    public int IdCaseta { get; set; }

    [JsonPropertyName("numero_carril")]
    public int NumeroCarril { get; set; }

    [JsonPropertyName("tipo_carril")]
    public string TipoCarril { get; set; } = string.Empty;

    [JsonPropertyName("veh")]
    public long Veh { get; set; }

    [JsonPropertyName("ef")]
    public decimal Ef { get; set; }

    [JsonPropertyName("tag")]
    public decimal Tag { get; set; }

    [JsonPropertyName("total")]
    public decimal Total { get; set; }
}

public class RecaudoDiarioDto
{
    [JsonPropertyName("id_estacion")]
    public int? IdEstacion { get; set; }

    [JsonPropertyName("estacion")]
    public string? Estacion { get; set; }

    [JsonPropertyName("fecha")]
    public string? Fecha { get; set; }

    [JsonPropertyName("total_vehiculos")]
    public long TotalVehiculos { get; set; }

    [JsonPropertyName("total_efectivo")]
    public decimal TotalEfectivo { get; set; }

    [JsonPropertyName("total_telepeaje")]
    public decimal TotalTelepeaje { get; set; }

    [JsonPropertyName("total_general")]
    public decimal TotalGeneral { get; set; }

    [JsonPropertyName("dias")]
    public List<RecaudoDiaItemDto> Dias { get; set; } = new();

    [JsonPropertyName("carriles")]
    public List<RecaudoCarrilItemDto> Carriles { get; set; } = new();
}

// ============================================================
// DTOs AUDITORIA
// ============================================================

public class AuditoriaItemDto
{
    [JsonPropertyName("id_auditoria")]
    public long IdAuditoria { get; set; }

    [JsonPropertyName("id_transaccion")]
    public long IdTransaccion { get; set; }

    [JsonPropertyName("tipo_operacion")]
    public string TipoOperacion { get; set; } = string.Empty;

    [JsonPropertyName("usuario_sistema")]
    public string UsuarioSistema { get; set; } = string.Empty;

    [JsonPropertyName("fecha_hora_evento")]
    public DateTime FechaHoraEvento { get; set; }

    [JsonPropertyName("motivo")]
    public string? Motivo { get; set; }

    // Campos de solo lectura obtenidos por JOIN con TRANSACCION_PEAJE (el esquema del frontend los ignora).
    [JsonPropertyName("placa_detectada")]
    public string? PlacaDetectada { get; set; }

    [JsonPropertyName("metodo_pago")]
    public string? MetodoPago { get; set; }
}

// ============================================================
// DTOs MONITOREO TELEPEAJE Y RECARGAS
// ============================================================

public class MonitoreoCuentaTelepeajeDto
{
    [JsonPropertyName("id_cuenta")]
    public long IdCuenta { get; set; }

    [JsonPropertyName("placa_vehiculo")]
    public string PlacaVehiculo { get; set; } = string.Empty;

    [JsonPropertyName("categoria_vehiculo")]
    public string CategoriaVehiculo { get; set; } = string.Empty;

    [JsonPropertyName("tag_rfid_serial")]
    public string TagRfidSerial { get; set; } = string.Empty;

    [JsonPropertyName("saldo_disponible")]
    public decimal SaldoDisponible { get; set; }

    [JsonPropertyName("estado_cuenta")]
    public string EstadoCuenta { get; set; } = string.Empty;

    [JsonPropertyName("condicion_saldo")]
    public string CondicionSaldo { get; set; } = string.Empty;
}

public class RecargaTagRequestDto
{
    [JsonPropertyName("placa")]
    public string? Placa { get; set; }

    [JsonPropertyName("placa_vehiculo")]
    public string? PlacaVehiculo { get; set; }

    [JsonPropertyName("tag_rfid_serial")]
    public string? TagRfidSerial { get; set; }

    [JsonPropertyName("tag")]
    public string? Tag { get; set; }

    [JsonPropertyName("monto")]
    public decimal? Monto { get; set; }

    [JsonPropertyName("valor_recarga")]
    public decimal? ValorRecarga { get; set; }

    public string ObtenerPlaca() => (PlacaVehiculo ?? Placa ?? string.Empty).Trim().ToUpperInvariant().Replace(" ", "");
    public string ObtenerSerialTag() => (TagRfidSerial ?? Tag ?? string.Empty).Trim().ToUpperInvariant();
    public decimal ObtenerMonto() => Monto ?? ValorRecarga ?? 0;
}

public class RecargaTagResponseDto
{
    [JsonPropertyName("id_cuenta")]
    public long IdCuenta { get; set; }

    [JsonPropertyName("placa_vehiculo")]
    public string PlacaVehiculo { get; set; } = string.Empty;

    [JsonPropertyName("tag_rfid_serial")]
    public string TagRfidSerial { get; set; } = string.Empty;

    [JsonPropertyName("saldo_anterior")]
    public decimal SaldoAnterior { get; set; }

    [JsonPropertyName("saldo_nuevo")]
    public decimal SaldoNuevo { get; set; }

    [JsonPropertyName("monto_recargado")]
    public decimal MontoRecargado { get; set; }

    [JsonPropertyName("fecha_hora")]
    public DateTime FechaHora { get; set; }

    [JsonPropertyName("mensaje")]
    public string Mensaje { get; set; } = "Recarga procesada exitosamente.";
}
