

namespace backend;

public class operador
{
public int Id_operador{get; set;}
public string Nro_documento{get; set;}
public string Nombres{get; set;}
public string Apellidos{get; set;}
public string Codigo_empleado{get; set;}
public string Rol{get; set;}
public string Estado{get; set;}


public operador(int id_operador, string nro_documento, string nombres, string apellidos, string codigo_empleado, string rol, string estado){
Id_operador=id_operador;
Nro_documento=nro_documento;
Nombres=nombres;
Apellidos=apellidos;
Codigo_empleado=codigo_empleado;
Rol=rol;
Estado=estado;
}

}
