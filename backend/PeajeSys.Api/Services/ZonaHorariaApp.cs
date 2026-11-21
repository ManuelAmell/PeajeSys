namespace PeajeSys.Api.Services;

public static class ZonaHorariaApp
{
    public static (DateTime InicioUtc, DateTime FinUtc) RangoUtcDelDia(DateOnly dia) =>
        (DateTime.SpecifyKind(dia.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc),
         DateTime.SpecifyKind(dia.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc));
}
