namespace PeajeSys.Tests.Auth;

/// <summary>Reloj de pruebas con instante fijo y ajustable.</summary>
internal sealed class RelojFalso : TimeProvider
{
    private DateTimeOffset _ahora;

    public RelojFalso(DateTimeOffset ahora) => _ahora = ahora;

    public override DateTimeOffset GetUtcNow() => _ahora;

    public void Avanzar(TimeSpan intervalo) => _ahora = _ahora.Add(intervalo);
}
