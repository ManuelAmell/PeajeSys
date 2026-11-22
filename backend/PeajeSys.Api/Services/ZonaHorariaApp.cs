namespace PeajeSys.Api.Services;

/// <summary>
/// Zona horaria civil de la aplicacion (Colombia: America/Bogota, UTC-5, sin horario de verano).
/// Los instantes se guardan en UTC (timestamptz); los dias civiles que pide el usuario se interpretan aqui.
/// </summary>
public static class ZonaHorariaApp
{
    private static readonly Lazy<TimeZoneInfo> Zona = new(Resolver);

    private static TimeZoneInfo Resolver()
    {
        // .NET 6+ resuelve IDs IANA tambien en Windows (ICU); "SA Pacific Standard Time" es el ID nativo de Windows.
        foreach (var id in new[] { "America/Bogota", "SA Pacific Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        // Ultimo recurso (contenedor sin tzdata/ICU): Colombia no tiene horario de verano, el desfase fijo es exacto.
        return TimeZoneInfo.CreateCustomTimeZone("America/Bogota", TimeSpan.FromHours(-5), "Bogota", "Bogota");
    }

    /// <summary>Zona horaria resuelta de la aplicacion.</summary>
    public static TimeZoneInfo ZonaInfo => Zona.Value;

    /// <summary>Convierte un DateTime a UTC interpretando Unspecified en la zona de la aplicacion.</summary>
    public static DateTime AUtc(DateTime dt)
    {
        if (dt.Kind == DateTimeKind.Utc) return dt;
        var unspec = DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(unspec, Zona.Value);
    }

    /// <summary>Rango UTC [inicio del dia civil, inicio del dia siguiente) para un dia de la zona de la aplicacion.</summary>
    public static (DateTime InicioUtc, DateTime FinUtc) RangoUtcDelDia(DateOnly dia)
    {
        var inicio = DateTime.SpecifyKind(dia.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        var fin = DateTime.SpecifyKind(dia.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        return (TimeZoneInfo.ConvertTimeToUtc(inicio, Zona.Value), TimeZoneInfo.ConvertTimeToUtc(fin, Zona.Value));
    }

    /// <summary>Dia civil (zona de la aplicacion) de un instante UTC.</summary>
    public static DateOnly DiaCivil(DateTime instanteUtc) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(AUtcSeguro(instanteUtc), Zona.Value));

    private static DateTime AUtcSeguro(DateTime dt) => DateTime.SpecifyKind(dt, DateTimeKind.Utc);

    /// <summary>Dia civil actual en la zona de la aplicacion.</summary>
    public static DateOnly Hoy() => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Zona.Value));
}
