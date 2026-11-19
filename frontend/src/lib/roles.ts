/**
 * Tipos de roles del sistema PeajeSys.
 *
 * NOTA DE ARQUITECTURA:
 * - 'RECAUDADOR': Operador de caseta en el turno (registrado en BD).
 * - 'SUPERVISOR': Supervisor de estación a cargo de arqueos y turnos (registrado en BD).
 * - 'ADMIN': Rol exclusivo del frontend para administración de estaciones, casetas y tarifas.
 *   En la base de datos física no existe tabla de administradores en este avance; se maneja
 *   como usuario de prueba de frontend (e.g. ADMIN-01).
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
