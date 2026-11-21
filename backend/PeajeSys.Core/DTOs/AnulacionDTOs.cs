using System.Text.Json.Serialization;

namespace PeajeSys.Core.DTOs;

public class AnularTransaccionRequestDto
{
    [JsonPropertyName("motivo")]
    public string? Motivo { get; set; }

    // El frontend lo envia por compatibilidad, pero el usuario de auditoria sale siempre del token.
    [JsonPropertyName("usuario_sistema")]
    public string? UsuarioSistema { get; set; }
}

public class AnulacionTransaccionResponseDto
{
    [JsonPropertyName("transaccion")]
    public TransaccionDetalleDto Transaccion { get; set; } = new();

    [JsonPropertyName("auditoria")]
    public AuditoriaItemDto Auditoria { get; set; } = new();
}
