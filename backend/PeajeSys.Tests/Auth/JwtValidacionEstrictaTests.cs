using System.Security.Claims;
using PeajeSys.Core.Security;
using Xunit;

namespace PeajeSys.Tests.Auth;

public class JwtValidacionEstrictaTests
{
    private readonly JwtTokenService _servicio = new(
        JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);

    private static DateTimeOffset Ahora => DateTimeOffset.UtcNow;

    private ClaimsPrincipal? Validar(Dictionary<string, object> payload, object? cabecera = null) =>
        _servicio.ValidateToken(JwtTestHelper.Construir(cabecera ?? JwtTestHelper.CabeceraValida(), payload));

    [Fact]
    public void ValidateToken_PayloadValidoFirmadoManualmente_DevuelvePrincipal()
    {
        var principal = Validar(JwtTestHelper.PayloadValido());

        Assert.NotNull(principal);
        Assert.Equal("7", principal!.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal("OPERADOR", principal.FindFirst(ClaimTypes.Role)?.Value);
        Assert.Equal("EMP-007", principal.FindFirst("codigo_empleado")?.Value);
    }

    [Fact]
    public void ValidateToken_SinExp_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload.Remove("exp");
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_ExpiradoHace60Segundos_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["exp"] = Ahora.AddSeconds(-60).ToUnixTimeSeconds();
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_ExpiradoHace10SegundosDentroDelMargen_EsValido()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["exp"] = Ahora.AddSeconds(-10).ToUnixTimeSeconds();
        Assert.NotNull(Validar(payload));
    }

    [Fact]
    public void ValidateToken_NbfDentroDe60Segundos_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["nbf"] = Ahora.AddSeconds(60).ToUnixTimeSeconds();
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_NbfDentroDe10SegundosDentroDelMargen_EsValido()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["nbf"] = Ahora.AddSeconds(10).ToUnixTimeSeconds();
        Assert.NotNull(Validar(payload));
    }

    [Fact]
    public void ValidateToken_NbfNoNumerico_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["nbf"] = "ayer";
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_IssuerDistinto_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["iss"] = "otro-emisor";
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_SinIssuer_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload.Remove("iss");
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_AudienceDistinta_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["aud"] = "otra-audiencia";
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_SinAudience_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload.Remove("aud");
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_AudienceArrayQueContieneLaAudiencia_EsValido()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["aud"] = new[] { "otra", JwtPruebas.Audience };
        Assert.NotNull(Validar(payload));
    }

    [Fact]
    public void ValidateToken_AudienceArraySinLaAudiencia_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["aud"] = new[] { "otra", "mas" };
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_AudienceDeTipoNoValido_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["aud"] = 5;
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_AlgNoneConFirmaVacia_DevuelveNull()
    {
        var cabecera = new Dictionary<string, object> { ["alg"] = "none", ["typ"] = "JWT" };
        string token = JwtTestHelper.Construir(cabecera, JwtTestHelper.PayloadValido(), firma: "");
        Assert.Null(_servicio.ValidateToken(token));
    }

    [Fact]
    public void ValidateToken_AlgHS512FirmadoConLaClave_DevuelveNull()
    {
        var cabecera = new Dictionary<string, object> { ["alg"] = "HS512", ["typ"] = "JWT" };
        Assert.Null(Validar(JwtTestHelper.PayloadValido(), cabecera));
    }

    [Fact]
    public void ValidateToken_SinAlg_DevuelveNull()
    {
        var cabecera = new Dictionary<string, object> { ["typ"] = "JWT" };
        Assert.Null(Validar(JwtTestHelper.PayloadValido(), cabecera));
    }

    [Fact]
    public void ValidateToken_AlgDeTipoNoString_DevuelveNull()
    {
        var cabecera = new Dictionary<string, object> { ["alg"] = 256, ["typ"] = "JWT" };
        Assert.Null(Validar(JwtTestHelper.PayloadValido(), cabecera));
    }

    [Fact]
    public void ValidateToken_TypDistintoDeJwt_DevuelveNull()
    {
        var cabecera = new Dictionary<string, object> { ["alg"] = "HS256", ["typ"] = "JWE" };
        Assert.Null(Validar(JwtTestHelper.PayloadValido(), cabecera));
    }

    [Fact]
    public void ValidateToken_SinTyp_EsValido()
    {
        var cabecera = new Dictionary<string, object> { ["alg"] = "HS256" };
        Assert.NotNull(Validar(JwtTestHelper.PayloadValido(), cabecera));
    }

    [Fact]
    public void ValidateToken_PayloadAlteradoConservandoLaFirma_DevuelveNull()
    {
        string original = JwtTestHelper.Construir(JwtTestHelper.CabeceraValida(), JwtTestHelper.PayloadValido());
        string[] partes = original.Split('.');
        var alterado = JwtTestHelper.PayloadValido();
        alterado["role"] = "ADMINISTRADOR";
        string token = $"{partes[0]}.{JwtTestHelper.Base64Url(System.Text.Json.JsonSerializer.Serialize(alterado))}.{partes[2]}";

        Assert.Null(_servicio.ValidateToken(token));
    }

    [Fact]
    public void ValidateToken_FirmaNoBase64Url_DevuelveNullSinExcepcion()
    {
        string token = JwtTestHelper.Construir(
            JwtTestHelper.CabeceraValida(), JwtTestHelper.PayloadValido(), firma: "***");
        Assert.Null(_servicio.ValidateToken(token));
    }

    [Fact]
    public void ValidateToken_ExpComoString_DevuelveNull()
    {
        var payload = JwtTestHelper.PayloadValido();
        payload["exp"] = Ahora.AddHours(1).ToUnixTimeSeconds().ToString();
        Assert.Null(Validar(payload));
    }

    [Fact]
    public void ValidateToken_CabeceraQueNoEsJson_DevuelveNull()
    {
        string sinFirma = $"{JwtTestHelper.Base64Url("esto no es json")}.{JwtTestHelper.Base64Url("{}")}";
        string token = $"{sinFirma}.{JwtTestHelper.Firmar(sinFirma)}";
        Assert.Null(_servicio.ValidateToken(token));
    }

    [Fact]
    public void ValidateToken_PayloadQueNoEsObjetoJson_DevuelveNull()
    {
        string sinFirma = $"{JwtTestHelper.Base64Url("{\"alg\":\"HS256\"}")}.{JwtTestHelper.Base64Url("[1,2]")}";
        string token = $"{sinFirma}.{JwtTestHelper.Firmar(sinFirma)}";
        Assert.Null(_servicio.ValidateToken(token));
    }

    [Theory]
    [InlineData("a.b")]
    [InlineData("a.b.c.d")]
    [InlineData("..")]
    [InlineData("a..c")]
    [InlineData(".b.c")]
    [InlineData("a.b.")]
    [InlineData("%%%.@@@.###")]
    [InlineData("eyJhbGciOiJIUzI1NiJ9.e30.")]
    [InlineData("....")]
    [InlineData("\0.\0.\0")]
    [InlineData("AAAA.AAAA.AAAA")]
    public void ValidateToken_Basura_DevuelveNullSinExcepcion(string token)
    {
        var ex = Record.Exception(() => Assert.Null(_servicio.ValidateToken(token)));
        Assert.Null(ex);
    }

    [Fact]
    public void ValidateToken_SegmentosAleatorios_NuncaLanzanExcepcion()
    {
        var azar = new Random(1234);
        for (int i = 0; i < 200; i++)
        {
            string Segmento() => JwtTestHelper.Base64Url(
                Enumerable.Range(0, azar.Next(0, 40)).Select(_ => (byte)azar.Next(256)).ToArray());
            string token = $"{Segmento()}.{Segmento()}.{Segmento()}";
            var ex = Record.Exception(() => _servicio.ValidateToken(token));
            Assert.Null(ex);
        }
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_ExpirationHoursNoPositivo_LanzaArgumentException(int horas)
    {
        Assert.Throws<ArgumentException>(
            () => new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, horas));
    }

    [Fact]
    public void ValidateToken_RelojInyectado_RespetaExpiracionYMargen()
    {
        var reloj = new RelojFalso(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero));
        var servicio = new JwtTokenService(
            JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, 1, reloj);
        string token = servicio.GenerateToken(new PeajeSys.Core.Entities.Operador
        {
            IdOperador = 3, CodigoEmpleado = "EMP-003", Nombres = "Ana", Apellidos = "Perez", Rol = "OPERADOR"
        });

        reloj.Avanzar(TimeSpan.FromHours(1) + TimeSpan.FromSeconds(29));
        Assert.NotNull(servicio.ValidateToken(token));

        reloj.Avanzar(TimeSpan.FromSeconds(2));
        Assert.Null(servicio.ValidateToken(token));
    }
}
