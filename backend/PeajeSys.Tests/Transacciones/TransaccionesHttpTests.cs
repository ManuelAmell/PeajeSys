using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using PeajeSys.Tests.Api;
using Xunit;

namespace PeajeSys.Tests.Transacciones;

/// <summary>Los dos endpoints exigen token (sin BD: la autenticacion rechaza antes de llegar al servicio).</summary>
public class TransaccionesHttpTests : IClassFixture<PeajeSysApiFactory>
{
    private readonly HttpClient _cliente;

    public TransaccionesHttpTests(PeajeSysApiFactory fabrica)
    {
        _cliente = fabrica.CreateClient();
    }

    [Fact]
    public async Task ListarTransaccionesDeTurno_SinToken_Devuelve401()
    {
        var r = await _cliente.GetAsync("/api/turnos/1/transacciones");
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task AnularTransaccion_SinToken_Devuelve401()
    {
        var contenido = new StringContent("{\"motivo\":\"x\"}", Encoding.UTF8, "application/json");
        var r = await _cliente.PostAsync("/api/transacciones/1/anulacion", contenido);
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }
}
