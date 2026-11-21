using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace PeajeSys.Core.DTOs;

// ============================================================
// DTOs TURNO
// ============================================================

public class AbrirTurnoRequestDto
{
    [JsonPropertyName("id_caseta")]
    public int IdCaseta { get; set; }

    [JsonPropertyName("id_operador")]
    public int IdOperador { get; set; }

    [JsonPropertyName("fondo_inicial_caja")]
    public decimal FondoInicialCaja { get; set; }

    [JsonPropertyName("diurno")]
    public bool Diurno { get; set; } = true;
}

public class AbrirTurnoResponseDto
{
    [JsonPropertyName("id_turno")]
    public long IdTurno { get; set; }

    [JsonPropertyName("id_caseta")]
    public int IdCaseta { get; set; }

    [JsonPropertyName("id_operador")]
    public int IdOperador { get; set; }

    [JsonPropertyName("fecha")]
    public string Fecha { get; set; } = string.Empty;

    [JsonPropertyName("diurno")]
    public bool Diurno { get; set; }

    [JsonPropertyName("fondo_inicial_caja")]
    public decimal FondoInicialCaja { get; set; }

    [JsonPropertyName("total_recaudado_efectivo")]
    public decimal TotalRecaudadoEfectivo { get; set; }

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = "ABIERTO";
}

public class CerrarTurnoRequestDto
{
    [JsonPropertyName("total_declarado_cierre")]
    public decimal TotalDeclaradoCierre { get; set; }
}

public class TurnoDto
{
    [JsonPropertyName("id_turno")]
    public long IdTurno { get; set; }

    [JsonPropertyName("id_caseta")]
    public int IdCaseta { get; set; }

    [JsonPropertyName("id_operador")]
    public int IdOperador { get; set; }

    [JsonPropertyName("fecha")]
    public string Fecha { get; set; } = string.Empty;

    [JsonPropertyName("diurno")]
    public bool Diurno { get; set; }

    [JsonPropertyName("fondo_inicial_caja")]
    public decimal FondoInicialCaja { get; set; }

    [JsonPropertyName("total_recaudado_efectivo")]
    public decimal TotalRecaudadoEfectivo { get; set; }

    [JsonPropertyName("total_declarado_cierre")]
    public decimal? TotalDeclaradoCierre { get; set; }

    [JsonPropertyName("diferencia_descuadre")]
    public decimal? DiferenciaDescuadre { get; set; }

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = string.Empty;
}

// ============================================================
// DTOs VEHICULO
// ============================================================

public class VehiculoDetalleDto
{
    [JsonPropertyName("placa")]
    public string Placa { get; set; } = string.Empty;

    [JsonPropertyName("id_categoria")]
    public int IdCategoria { get; set; }

    [JsonPropertyName("marca")]
    public string? Marca { get; set; }

    [JsonPropertyName("modelo")]
    public string? Modelo { get; set; }

    [JsonPropertyName("color")]
    public string? Color { get; set; }
}

public class CuentaTelepeajeDetalleDto
{
    [JsonPropertyName("id_cuenta")]
    public long IdCuenta { get; set; }

    [JsonPropertyName("placa_vehiculo")]
    public string PlacaVehiculo { get; set; } = string.Empty;

    [JsonPropertyName("tag_rfid_serial")]
    public string TagRfidSerial { get; set; } = string.Empty;

    [JsonPropertyName("saldo_disponible")]
    public decimal SaldoDisponible { get; set; }

    [JsonPropertyName("estado_cuenta")]
    public string EstadoCuenta { get; set; } = "ACTIVA";
}

public class VehiculoConsultaDto
{
    [JsonPropertyName("placa")]
    public string Placa { get; set; } = string.Empty;

    [JsonPropertyName("encontrado")]
    public bool Encontrado { get; set; }

    [JsonPropertyName("id_categoria")]
    public int IdCategoria { get; set; }

    [JsonPropertyName("categoria_codigo")]
    public string CategoriaCodigo { get; set; } = string.Empty;

    [JsonPropertyName("categoria_descripcion")]
    public string CategoriaDescripcion { get; set; } = string.Empty;

    [JsonPropertyName("marca")]
    public string? Marca { get; set; }

    [JsonPropertyName("modelo")]
    public string? Modelo { get; set; }

    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [JsonPropertyName("tiene_tag")]
    public bool TieneTag { get; set; }

    [JsonPropertyName("tag_rfid_serial")]
    public string? TagRfidSerial { get; set; }

    [JsonPropertyName("estado_cuenta")]
    public string? EstadoCuenta { get; set; }

    [JsonPropertyName("saldo_disponible")]
    public decimal? SaldoDisponible { get; set; }

    [JsonPropertyName("vehiculo")]
    public VehiculoDetalleDto? Vehiculo { get; set; }

    [JsonPropertyName("cuenta")]
    public CuentaTelepeajeDetalleDto? Cuenta { get; set; }
}

// ============================================================
// DTOs COBRO
// ============================================================

public class CobroRequestDto
{
    [JsonPropertyName("id_turno")]
    public long IdTurno { get; set; }

    [JsonPropertyName("placa")]
    public string? Placa { get; set; }

    [JsonPropertyName("placa_detectada")]
    public string? PlacaDetectada { get; set; }

    [JsonPropertyName("id_categoria")]
    public int IdCategoria { get; set; }

    [JsonPropertyName("id_tarifa")]
    public int? IdTarifa { get; set; }

    [JsonPropertyName("metodo_pago")]
    public string MetodoPago { get; set; } = "EFECTIVO";

    [JsonPropertyName("efectivo_recibido")]
    public decimal? EfectivoRecibido { get; set; }

    [JsonPropertyName("recibido")]
    public decimal? Recibido { get; set; }

    public string ObtenerPlaca()
    {
        string raw = PlacaDetectada ?? Placa ?? string.Empty;
        return raw.Trim().ToUpperInvariant().Replace(" ", "");
    }

    public decimal ObtenerEfectivoRecibido()
    {
        return EfectivoRecibido ?? Recibido ?? 0;
    }
}

public class TransaccionDetalleDto
{
    [JsonPropertyName("id_transaccion")]
    public long IdTransaccion { get; set; }

    [JsonPropertyName("id_turno")]
    public long IdTurno { get; set; }

    [JsonPropertyName("id_tarifa")]
    public int IdTarifa { get; set; }

    [JsonPropertyName("id_categoria")]
    public int IdCategoria { get; set; }

    [JsonPropertyName("placa_detectada")]
    public string? PlacaDetectada { get; set; }

    [JsonPropertyName("monto_tarifa")]
    public decimal MontoTarifa { get; set; }

    [JsonPropertyName("metodo_pago")]
    public string MetodoPago { get; set; } = string.Empty;

    [JsonPropertyName("numero_ticket")]
    public string NumeroTicket { get; set; } = string.Empty;

    [JsonPropertyName("fecha_hora")]
    public DateTime FechaHora { get; set; }

    [JsonPropertyName("estado_paso")]
    public string EstadoPaso { get; set; } = "APROBADO";
}

public class DetallePagoTelepeajeDto
{
    [JsonPropertyName("id_cuenta")]
    public long IdCuenta { get; set; }

    [JsonPropertyName("saldo_anterior")]
    public decimal SaldoAnterior { get; set; }

    [JsonPropertyName("saldo_posterior")]
    public decimal SaldoPosterior { get; set; }

    [JsonPropertyName("antena_lectora_id")]
    public string AntenaLectoraId { get; set; } = string.Empty;
}

public class CobroResponseDto
{
    [JsonPropertyName("id_transaccion")]
    public long IdTransaccion { get; set; }

    [JsonPropertyName("numero_ticket")]
    public string NumeroTicket { get; set; } = string.Empty;

    [JsonPropertyName("placa")]
    public string? Placa { get; set; }

    [JsonPropertyName("placa_detectada")]
    public string? PlacaDetectada { get; set; }

    [JsonPropertyName("id_categoria")]
    public int IdCategoria { get; set; }

    [JsonPropertyName("monto_tarifa")]
    public decimal MontoTarifa { get; set; }

    [JsonPropertyName("metodo_pago")]
    public string MetodoPago { get; set; } = string.Empty;

    [JsonPropertyName("efectivo_recibido")]
    public decimal? EfectivoRecibido { get; set; }

    [JsonPropertyName("cambio")]
    public decimal? Cambio { get; set; }

    [JsonPropertyName("saldo_posterior")]
    public decimal? SaldoPosterior { get; set; }

    [JsonPropertyName("estado_paso")]
    public string EstadoPaso { get; set; } = "APROBADO";

    [JsonPropertyName("fecha_hora")]
    public DateTime FechaHora { get; set; }

    [JsonPropertyName("transaccion")]
    public TransaccionDetalleDto? Transaccion { get; set; }

    [JsonPropertyName("detalle_telepeaje")]
    public DetallePagoTelepeajeDto? DetalleTelepeaje { get; set; }
}
