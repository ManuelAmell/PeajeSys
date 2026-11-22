using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace PeajeSys.Core.DTOs;

// ============================================================
// DTOs TARIFAS
// ============================================================

public class TarifaDto
{
    [JsonPropertyName("id_tarifa")]
    public int IdTarifa { get; set; }

    [JsonPropertyName("id_estacion")]
    public int IdEstacion { get; set; }

    [JsonPropertyName("estacion_nombre")]
    public string? EstacionNombre { get; set; }

    [JsonPropertyName("id_categoria")]
    public int IdCategoria { get; set; }

    [JsonPropertyName("categoria_codigo")]
    public string? CategoriaCodigo { get; set; }

    [JsonPropertyName("monto")]
    public decimal Monto { get; set; }

    [JsonPropertyName("resolucion_legal")]
    public string ResolucionLegal { get; set; } = string.Empty;

    // Columnas DATE: se serializan como YYYY-MM-DD (igual que TurnoDto.fecha).
    [JsonPropertyName("fecha_inicio_vigencia")]
    public string FechaInicioVigencia { get; set; } = string.Empty;

    [JsonPropertyName("fecha_fin_vigencia")]
    public string? FechaFinVigencia { get; set; }

    [JsonPropertyName("activa")]
    public bool Activa { get; set; }
}

public class CrearTarifaRequestDto
{
    [JsonPropertyName("id_estacion")]
    public int IdEstacion { get; set; }

    [JsonPropertyName("id_categoria")]
    public int IdCategoria { get; set; }

    /// <summary>Alias legado de <see cref="MontoTarifa"/>.</summary>
    [JsonPropertyName("monto")]
    public decimal Monto { get; set; }

    /// <summary>Nombre de la columna del DDL (monto_tarifa); tiene prioridad sobre el alias monto.</summary>
    [JsonPropertyName("monto_tarifa")]
    public decimal? MontoTarifa { get; set; }

    [JsonPropertyName("resolucion_legal")]
    public string? ResolucionLegal { get; set; }

    [JsonPropertyName("fecha_inicio_vigencia")]
    public DateTime? FechaInicioVigencia { get; set; }

    [JsonPropertyName("fecha_fin_vigencia")]
    public DateTime? FechaFinVigencia { get; set; }
}

public class ActualizarTarifaRequestDto
{
    [JsonPropertyName("monto")]
    public decimal? Monto { get; set; }

    [JsonPropertyName("monto_tarifa")]
    public decimal? MontoTarifa { get; set; }

    [JsonPropertyName("resolucion_legal")]
    public string? ResolucionLegal { get; set; }

    [JsonPropertyName("fecha_inicio_vigencia")]
    public DateTime? FechaInicioVigencia { get; set; }

    [JsonPropertyName("fecha_fin_vigencia")]
    public DateTime? FechaFinVigencia { get; set; }

    [JsonPropertyName("activa")]
    public bool? Activa { get; set; }
}

// ============================================================
// DTOs OPERADORES / PERSONAL
// ============================================================

public class OperadorAdminDto
{
    [JsonPropertyName("id_operador")]
    public int IdOperador { get; set; }

    [JsonPropertyName("numero_documento")]
    public string NumeroDocumento { get; set; } = string.Empty;

    [JsonPropertyName("nombres")]
    public string Nombres { get; set; } = string.Empty;

    [JsonPropertyName("apellidos")]
    public string Apellidos { get; set; } = string.Empty;

    [JsonPropertyName("codigo_empleado")]
    public string CodigoEmpleado { get; set; } = string.Empty;

    [JsonPropertyName("rol")]
    public string Rol { get; set; } = string.Empty;

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = string.Empty;
}

public class CrearOperadorRequestDto
{
    [JsonPropertyName("numero_documento")]
    public string? NumeroDocumento { get; set; }

    [JsonPropertyName("documento_identidad")]
    public string? DocumentoIdentidad { get; set; }

    [JsonPropertyName("nombres")]
    public string Nombres { get; set; } = string.Empty;

    [JsonPropertyName("apellidos")]
    public string Apellidos { get; set; } = string.Empty;

    [JsonPropertyName("codigo_empleado")]
    public string? CodigoEmpleado { get; set; }

    [JsonPropertyName("codigo")]
    public string? Codigo { get; set; }

    [JsonPropertyName("rol")]
    public string Rol { get; set; } = "RECAUDADOR";

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = "ACTIVO";

    [JsonPropertyName("password")]
    public string? Password { get; set; }

    [JsonPropertyName("clave")]
    public string? Clave { get; set; }

    public string ObtenerDocumento() => (NumeroDocumento ?? DocumentoIdentidad ?? string.Empty).Trim();
    public string ObtenerCodigo() => (CodigoEmpleado ?? Codigo ?? string.Empty).Trim().ToUpperInvariant();
    public string ObtenerPassword() => Password ?? Clave ?? string.Empty;
}

/// <summary>
/// Actualizacion parcial de un operador: solo se validan y aplican los campos presentes (no nulos).
/// La contrasena se hashea al guardarla y nunca se devuelve.
/// </summary>
public class ActualizarOperadorRequestDto
{
    [JsonPropertyName("numero_documento")]
    public string? NumeroDocumento { get; set; }

    [JsonPropertyName("documento_identidad")]
    public string? DocumentoIdentidad { get; set; }

    [JsonPropertyName("nombres")]
    public string? Nombres { get; set; }

    [JsonPropertyName("apellidos")]
    public string? Apellidos { get; set; }

    [JsonPropertyName("codigo_empleado")]
    public string? CodigoEmpleado { get; set; }

    [JsonPropertyName("codigo")]
    public string? Codigo { get; set; }

    [JsonPropertyName("rol")]
    public string? Rol { get; set; }

    [JsonPropertyName("estado")]
    public string? Estado { get; set; }

    [JsonPropertyName("password")]
    public string? Password { get; set; }

    [JsonPropertyName("clave")]
    public string? Clave { get; set; }

    public string? ObtenerDocumento() => NumeroDocumento ?? DocumentoIdentidad;
    public string? ObtenerCodigo() => CodigoEmpleado ?? Codigo;
    public string? ObtenerPassword() => Password ?? Clave;
}

public class ActualizarEstadoRequestDto
{
    [JsonPropertyName("estado")]
    public string Estado { get; set; } = string.Empty;
}

// ============================================================
// DTOs ESTACIONES Y CASETAS
// ============================================================

public class EstacionDto
{
    [JsonPropertyName("id_estacion")]
    public int IdEstacion { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [JsonPropertyName("codigo_estacion")]
    public string CodigoEstacion { get; set; } = string.Empty;

    [JsonPropertyName("ubicacion_geografica")]
    public string UbicacionGeografica { get; set; } = string.Empty;

    [JsonPropertyName("sentido_via")]
    public string SentidoVia { get; set; } = string.Empty;

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = string.Empty;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

public class CasetaDto
{
    [JsonPropertyName("id_caseta")]
    public int IdCaseta { get; set; }

    [JsonPropertyName("id_estacion")]
    public int IdEstacion { get; set; }

    [JsonPropertyName("estacion_nombre")]
    public string? EstacionNombre { get; set; }

    [JsonPropertyName("numero_carril")]
    public int NumeroCarril { get; set; }

    [JsonPropertyName("tipo_carril")]
    public string TipoCarril { get; set; } = string.Empty;

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = string.Empty;

    /// <summary>True si la caseta tiene un turno ABIERTO (no expone quien ni cuanto).</summary>
    [JsonPropertyName("ocupada")]
    public bool Ocupada { get; set; }
}

// ============================================================
// DTOs CATEGORIAS VEHICULO
// ============================================================

public class CategoriaVehiculoDto
{
    [JsonPropertyName("id_categoria")]
    public int IdCategoria { get; set; }

    [JsonPropertyName("codigo")]
    public string Codigo { get; set; } = string.Empty;

    [JsonPropertyName("descripcion")]
    public string Descripcion { get; set; } = string.Empty;

    [JsonPropertyName("numero_ejes_min")]
    public int NumeroEjesMin { get; set; }

    [JsonPropertyName("numero_ejes_max")]
    public int NumeroEjesMax { get; set; }

    [JsonPropertyName("peso_maximo_ton")]
    public decimal? PesoMaximoTon { get; set; }

    [JsonPropertyName("activo")]
    public bool Activo { get; set; }
}

public class CrearCategoriaRequestDto
{
    [JsonPropertyName("codigo")]
    public string Codigo { get; set; } = string.Empty;

    [JsonPropertyName("descripcion")]
    public string Descripcion { get; set; } = string.Empty;

    [JsonPropertyName("numero_ejes_min")]
    public int NumeroEjesMin { get; set; } = 2;

    [JsonPropertyName("numero_ejes_max")]
    public int NumeroEjesMax { get; set; } = 2;

    [JsonPropertyName("peso_maximo_ton")]
    public decimal? PesoMaximoTon { get; set; }

    [JsonPropertyName("activo")]
    public bool Activo { get; set; } = true;
}

public class ActualizarCategoriaRequestDto
{
    [JsonPropertyName("codigo")]
    public string? Codigo { get; set; }

    [JsonPropertyName("descripcion")]
    public string? Descripcion { get; set; }

    [JsonPropertyName("numero_ejes_min")]
    public int? NumeroEjesMin { get; set; }

    [JsonPropertyName("numero_ejes_max")]
    public int? NumeroEjesMax { get; set; }

    [JsonPropertyName("peso_maximo_ton")]
    public decimal? PesoMaximoTon { get; set; }

    [JsonPropertyName("activo")]
    public bool? Activo { get; set; }
}
