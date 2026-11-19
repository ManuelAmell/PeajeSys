

namespace backend;

public class usuario
{
public int Id_usuario{get; set;}
public int Nro_documento{get; set;} //en base de datos por alguna razon esta como  stringm deberia cambiarse
public string Nombres{get; set;}
public string Apellidos{get; set;}
public string Codigo_empleado{get; set;}
public string Rol{get; set;}
public string Estado{get; set;}


public usuario(int id_usuario, int nro_documento, string nombres, string apellidos, string codigo_empleado, string rol, string estado){
Id_usuario=id_usuario;
Nro_documento=nro_documento;
Nombres=nombres;
Apellidos=apellidos;
Codigo_empleado=codigo_empleado;
Rol=rol;
Estado=estado;
}

}
