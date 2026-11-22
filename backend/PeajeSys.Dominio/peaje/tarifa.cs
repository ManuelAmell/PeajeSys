using System;
namespace backend;

public class tarifa{
    public int Id_tarifa{get; set;}
    public int Id_estacion{get; set;}
    public int Id_categoria{get; set;}
    public decimal Monto{get; set;}
    public string Resolucion_legal{get; set;}
    public DateTime Fecha_inicio_vigencia{get; set;}
    public DateTime Fecha_fin_vigencia{get; set;}
    public bool Activa{get; set;}

public tarifa(int id_tarifa, int id_estacion, int id_categoria, decimal monto, string resolucion_legal, DateTime fecha_inicio_vigencia, DateTime fecha_fin_vigencia, bool activa)
{
    Id_tarifa=id_tarifa;
    Id_estacion=id_estacion;
    Id_categoria=id_categoria;
    Monto=monto;
    Resolucion_legal=resolucion_legal;
    Fecha_inicio_vigencia=fecha_inicio_vigencia;
    Fecha_fin_vigencia=fecha_fin_vigencia;
    Activa=activa;
    
}

}
