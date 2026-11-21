using System.Text.RegularExpressions;
using PeajeSys.Core.Security;
using Xunit;

namespace PeajeSys.Tests.Auth;

/// <summary>
/// Los usuarios de prueba del equipo viven en la base de datos con su hash BCrypt. Estas pruebas leen los
/// SQL versionados y mantienen sincronizados el DML, el maestro y la tabla del README raiz.
/// </summary>
public class UsuariosEquipoSqlTests
{
    private sealed record UsuarioSql(string Documento, string Nombres, string Apellidos, string Codigo, string Rol, string Estado, string Hash);

    private static readonly (string Codigo, string Nombres, string Apellidos, string Rol, string Clave)[] Esperados =
    {
        ("ADM-001", "Manuel", "Amell", "ADMINISTRADOR", "Manuel2026*"),
        ("SUP-001", "Samuel", "Otero", "SUPERVISOR", "Samuel2026*"),
        ("REC-001", "Alex", "Florez", "RECAUDADOR", "Alex2026*"),
        ("REC-002", "Camilo", "Guzmán", "RECAUDADOR", "Camilo2026*"),
    };

    private static readonly Regex Fila = new(
        @"\('(?<doc>[^']+)',\s*'(?<nom>[^']+)',\s*'(?<ape>[^']+)',\s*'(?<cod>[^']+)',\s*'(?<rol>[^']+)',\s*'(?<est>[^']+)',\s*'(?<hash>\$2[ab]\$[^']+)'\)",
        RegexOptions.Compiled);

    private static string RutaRepo(string relativa)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidata = Path.Combine(dir.FullName, relativa);
            if (File.Exists(candidata))
                return candidata;
            dir = dir.Parent;
        }
        throw new FileNotFoundException("No se encontro " + relativa + " subiendo desde " + AppContext.BaseDirectory);
    }

    private static List<UsuarioSql> Leer(string relativa) =>
        Fila.Matches(File.ReadAllText(RutaRepo(relativa)))
            .Select(m => new UsuarioSql(m.Groups["doc"].Value, m.Groups["nom"].Value, m.Groups["ape"].Value,
                m.Groups["cod"].Value, m.Groups["rol"].Value, m.Groups["est"].Value, m.Groups["hash"].Value))
            .ToList();

    private const string Dml = "database/02_SQL/02_DML_Datos_PeajeSys.sql";
    private const string Maestro = "database/00_Master_PeajeSys.sql";

    [Fact]
    public void Dml_TraeLosCuatroUsuariosDelEquipoActivosYConDocumentoUnico()
    {
        var usuarios = Leer(Dml);

        Assert.Equal(Esperados.Select(e => e.Codigo), usuarios.Select(u => u.Codigo));
        Assert.All(usuarios, u => Assert.Equal("ACTIVO", u.Estado));
        Assert.Equal(usuarios.Count, usuarios.Select(u => u.Documento).Distinct().Count());
        foreach (var esperado in Esperados)
        {
            var u = usuarios.Single(x => x.Codigo == esperado.Codigo);
            Assert.Equal(esperado.Nombres, u.Nombres);
            Assert.Equal(esperado.Apellidos, u.Apellidos);
            Assert.Equal(esperado.Rol, u.Rol);
        }
    }

    [Fact]
    public void Dml_CadaHashCorrespondeALaContrasenaDocumentada()
    {
        var hasher = new PasswordHasher(12);
        var usuarios = Leer(Dml);

        foreach (var esperado in Esperados)
        {
            var u = usuarios.Single(x => x.Codigo == esperado.Codigo);
            Assert.Equal(60, u.Hash.Length);
            Assert.StartsWith("$2a$12$", u.Hash);
            Assert.True(hasher.VerifyPassword(esperado.Clave, u.Hash), $"El hash de {esperado.Codigo} no corresponde a su contrasena");
            Assert.False(hasher.VerifyPassword("otra-clave", u.Hash));
        }
    }

    [Fact]
    public void Maestro_TraeLosMismosInsertQueElDml()
    {
        Assert.Equal(Leer(Dml), Leer(Maestro));
    }

    [Fact]
    public void Ddl_Y_Maestro_DefinenPasswordHashYElRolAdministrador()
    {
        foreach (var archivo in new[] { "database/02_SQL/01_DDL_PeajeSys.sql", Maestro })
        {
            var sql = File.ReadAllText(RutaRepo(archivo));
            Assert.Contains("password_hash VARCHAR(100) NULL", sql);
            Assert.Contains("rol IN ('RECAUDADOR', 'SUPERVISOR', 'ADMINISTRADOR')", sql);
        }
    }

    [Fact]
    public void Readme_DocumentaLaMismaContrasenaQueElDml()
    {
        var readme = File.ReadAllText(RutaRepo("README.md"));

        foreach (var esperado in Esperados)
        {
            Assert.Contains(esperado.Codigo, readme);
            Assert.Contains(esperado.Clave, readme);
        }
    }
}
