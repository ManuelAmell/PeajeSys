export interface UsuarioDemo {
  codigo: string;
  nombre: string;
  nota: string;
}

/**
 * Contraseña de prueba de la lista demo: en modo mocks cualquier texto no vacío sirve
 * (con la API real hay que usar la contraseña del README).
 */
export const CLAVE_PRUEBA = 'prueba';

/**
 * Usuarios del equipo, los mismos que viven en la tabla OPERADOR del DML
 * (database/02_SQL/02_DML_Datos_PeajeSys.sql).
 */
export const USUARIOS_DEMO: UsuarioDemo[] = [
  {
    codigo: 'ADM-001',
    nombre: 'Manuel Amell',
    nota: 'Administrador',
  },
  {
    codigo: 'SUP-001',
    nombre: 'Samuel Otero',
    nota: 'Supervisor',
  },
  {
    codigo: 'REC-001',
    nombre: 'Alex Florez',
    nota: 'Recaudador (sin turno abierto en la simulación: muestra el aviso)',
  },
  {
    codigo: 'REC-002',
    nombre: 'Camilo Guzmán',
    nota: 'Recaudador (sin turno abierto en la simulación: muestra el aviso)',
  },
];
