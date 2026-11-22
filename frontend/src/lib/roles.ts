/**
 * Tipos de roles del sistema PeajeSys.
 *
 * NOTA DE ARQUITECTURA:
 * - 'RECAUDADOR': Operador de caseta en el turno (registrado en BD).
 * - 'SUPERVISOR': Supervisor de estación a cargo de arqueos y turnos (registrado en BD).
 * - 'ADMIN': Administrador de estaciones, casetas y tarifas. En la BD es el rol ADMINISTRADOR
 *   de la tabla OPERADOR (e.g. ADM-001); la sesión del frontend lo nombra ADMIN.
 */
export type Rol = 'RECAUDADOR' | 'SUPERVISOR' | 'ADMIN';

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  codigo?: string;
}

/**
 * Devuelve la ruta de inicio según el rol del usuario.
 */
export function rutaPorDefectoSegunRol(rol: Rol): string {
  switch (rol) {
    case 'RECAUDADOR':
      return '/operador';
    case 'SUPERVISOR':
      return '/supervisor';
    case 'ADMIN':
      return '/admin';
  }
}
