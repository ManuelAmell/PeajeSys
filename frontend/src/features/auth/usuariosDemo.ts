export interface UsuarioDemo {
  codigo: string;
  nombre: string;
  nota: string;
}

/**
 * Contraseña de prueba de la lista demo del prototipo: cualquier texto no vacío sirve.
 */
export const CLAVE_PRUEBA = 'prueba';

/**
 * Lista demo de Login.dc.html, palabra por palabra. Es la fuente de las notas
 * «dato de prueba» del bloque: EMP-001 sin turno, EMP-009 INACTIVO y ADMIN-01
 * como usuario que solo existe en el frontend.
 */
export const USUARIOS_DEMO: UsuarioDemo[] = [
  {
    codigo: 'EMP-002',
    nombre: 'María Fernanda López',
    nota: 'Recaudadora con el turno 9 abierto',
  },
  {
    codigo: 'EMP-003',
    nombre: 'Juan David Rodríguez',
    nota: 'Supervisor',
  },
  {
    codigo: 'ADMIN-01',
    nombre: 'Administración',
    nota: 'Usuario solo del front: el rol ADMINISTRADOR aún no existe en la BD',
  },
  {
    codigo: 'EMP-001',
    nombre: 'Carlos Alberto Gómez',
    nota: 'Recaudador sin turno abierto (muestra el aviso)',
  },
  {
    codigo: 'EMP-009',
    nombre: 'Jorge Luis Vargas',
    nota: 'Usuario INACTIVO (muestra el error)',
  },
];
