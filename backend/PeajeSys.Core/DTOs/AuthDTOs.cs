using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace PeajeSys.Core.DTOs;

public class LoginRequestDto
{
    [JsonPropertyName("codigo_empleado")]
    public string? CodigoEmpleado { get; set; }

    [JsonPropertyName("codigo")]
    public string? Codigo { get; set; }

    [JsonPropertyName("password")]
    public string? Password { get; set; }

    [JsonPropertyName("clave")]
    public string? Clave { get; set; }

    public string ObtenerCodigo() => (CodigoEmpleado ?? Codigo ?? string.Empty).Trim();
    public string ObtenerPassword() => Password ?? Clave ?? string.Empty;
}

public class LoginResponseDto
{
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    [JsonPropertyName("usuario")]
    public UsuarioDto Usuario { get; set; } = new();

    [JsonPropertyName("turno_abierto")]
    public TurnoAbiertoDto? TurnoAbierto { get; set; }
}

public class UsuarioDto
{
    [JsonPropertyName("id_operador")]
    public int IdOperador { get; set; }

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("codigo_empleado")]
    public string CodigoEmpleado { get; set; } = string.Empty;

    [JsonPropertyName("codigo")]
    public string Codigo { get; set; } = string.Empty;

    [JsonPropertyName("nombres")]
    public string Nombres { get; set; } = string.Empty;

    [JsonPropertyName("apellidos")]
    public string Apellidos { get; set; } = string.Empty;

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [JsonPropertyName("apellido")]
    public string Apellido { get; set; } = string.Empty;

    [JsonPropertyName("nombre_completo")]
    public string NombreCompleto { get; set; } = string.Empty;

    [JsonPropertyName("rol")]
    public string Rol { get; set; } = string.Empty;

    [JsonPropertyName("rol_txt")]
    public string RolTxt { get; set; } = string.Empty;

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = string.Empty;

    [JsonPropertyName("destino")]
    public string Destino { get; set; } = string.Empty;

    [JsonPropertyName("destino_txt")]
    public string DestinoTxt { get; set; } = string.Empty;
}

public class TurnoAbiertoDto
{
    [JsonPropertyName("id_turno")]
    public long IdTurno { get; set; }

    [JsonPropertyName("id_caseta")]
    public int IdCaseta { get; set; }

    [JsonPropertyName("numero_carril")]
    public int NumeroCarril { get; set; }

    [JsonPropertyName("tipo_carril")]
    public string TipoCarril { get; set; } = string.Empty;

    [JsonPropertyName("id_estacion")]
    public int IdEstacion { get; set; }

    [JsonPropertyName("estacion_nombre")]
    public string EstacionNombre { get; set; } = string.Empty;

    [JsonPropertyName("fecha")]
    public string Fecha { get; set; } = string.Empty;

    [JsonPropertyName("diurno")]
    public bool Diurno { get; set; }

    [JsonPropertyName("fondo_inicial_caja")]
    public decimal FondoInicialCaja { get; set; }

    [JsonPropertyName("total_recaudado_efectivo")]
    public decimal TotalRecaudadoEfectivo { get; set; }
}

public class ErrorEnvelope
{
    [JsonPropertyName("error")]
    public ErrorDetails Error { get; set; } = new();
}

public class ErrorDetails
{
    [JsonPropertyName("codigo")]
    public string Codigo { get; set; } = string.Empty;

    [JsonPropertyName("mensaje")]
    public string Mensaje { get; set; } = string.Empty;

    [JsonPropertyName("campos")]
    public IDictionary<string, string>? Campos { get; set; }
}
