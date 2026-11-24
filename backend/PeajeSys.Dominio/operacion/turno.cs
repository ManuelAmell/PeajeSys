using System;
namespace backend;

public class turno{

public long Id_turno{get; set;}
public int Id_caseta{get; set;}
public int Id_usuario{get; set;}
public DateTime Fecha{get; set;}
public bool Diurno{get; set;}
public decimal Fondo_inicial_caja{get; set;}
public decimal Total_recaudado_efectivo{get; set;}
public decimal Total_declarado_cierre{get; set;}
public decimal Diferencia_descuadre{get; set;}
public string Estado{get; set;}


public turno(long id_turno, int id_caseta, int id_usuario, DateTime fecha, bool diurno, decimal fondo_inicial_caja, decimal total_recaudado_efectivo, decimal total_declarado_cierre, decimal diferencia_descuadre, string estado)
{
    
Id_turno=id_turno;
Id_caseta=id_caseta;
Id_usuario=id_usuario;
Fecha=fecha;
Diurno=diurno;
Fondo_inicial_caja=fondo_inicial_caja;
Total_recaudado_efectivo=total_recaudado_efectivo;
Total_declarado_cierre=total_declarado_cierre;
Diferencia_descuadre=diferencia_descuadre;
Estado=estado;

}

}