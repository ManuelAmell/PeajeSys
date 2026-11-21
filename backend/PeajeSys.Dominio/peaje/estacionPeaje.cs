using System;
namespace backend;

public class estacionPeaje{
public int Id_estacion{get; set;}
public string Nombre{get; set;}
public string Codigo_estacion{get; set;}
public string Ubicacion_geografica{get; set;}
public string Sentido_via{get; set;}
public string Estado{get; set;}
public DateTime Fecha{get; set;}

public estacionPeaje(int id_estacion, string nombre, string codigo_estacion, string ubicacion_geografica, string sentido_via, string estado, DateTime fecha )
{
    Id_estacion=id_estacion;
    Nombre=nombre;
    Codigo_estacion=codigo_estacion;Ubicacion_geografica=ubicacion_geografica;
    Sentido_via=sentido_via;
    Estado=estado;
    Fecha=fecha;
    
}

}