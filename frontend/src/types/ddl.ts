/**
 * Tipos TypeScript del esquema relacional de PeajeSys generados a partir de database/01_DDL_PeajeSys.sql.
 *
 * Convenciones:
 * - SERIAL / BIGSERIAL / INT -> number
 * - NUMERIC -> number (pesos colombianos)
 * - DATE -> string YYYY-MM-DD
 * - TIMESTAMPTZ -> string ISO 8601 con zona horaria (e.g. 2026-10-01T07:15:00-05:00)
 * - BOOLEAN -> boolean
 * - Columnas nulables -> T | null
 * - Columnas con DEFAULT o generadas por el motor -> opcionales en tipos de creación (XxxNuevo)
 * - Restricciones CHECK ... IN (...) -> uniones literales estrictas
 */

// =============================================================================
// Uniones literales de restricciones CHECK del DDL
// =============================================================================

export type EstadoEstacion = 'ACTIVA' | 'INACTIVA' | 'MANTENIMIENTO';
export type TipoCarril = 'MANUAL' | 'TELEPEAJE_EXCLUSIVO' | 'MIXTO';
export type EstadoCaseta = 'OPERATIVA' | 'CERRADA' | 'MANTENIMIENTO';
export type RolOperador = 'RECAUDADOR' | 'SUPERVISOR' | 'ADMINISTRADOR';
export type EstadoOperador = 'ACTIVO' | 'INACTIVO';
export type EstadoTurno = 'ABIERTO' | 'CERRADO';
export type EstadoCuentaTelepeaje = 'ACTIVA' | 'SUSPENDIDA';
export type MetodoPago = 'EFECTIVO' | 'TELEPEAJE' | 'EXENTO';
export type EstadoPaso = 'APROBADO' | 'EVASION' | 'EXENTO';
export type TipoOperacionAuditoria = 'INSERT' | 'UPDATE' | 'VOID';

/**
 * Rol extendido en frontend para administración de catálogo.
 * NOTA: En la base de datos física (DDL) los operadores tienen rol RECAUDADOR, SUPERVISOR o ADMINISTRADOR.
 * El rol ADMIN es el nombre que la sesión del frontend da a ADMINISTRADOR (e.g. ADM-001).
 */
export type RolFrontend = RolOperador | 'ADMIN';

// =============================================================================
// Tabla 1: ESTACION_PEAJE
// =============================================================================
export interface EstacionPeaje {
  id_estacion: number;
  nombre: string;
  codigo_estacion: string;
  ubicacion_geografica: string;
  sentido_via: string;
  estado: EstadoEstacion;
  created_at: string;
}

export interface EstacionPeajeNueva {
  id_estacion?: number;
  nombre: string;
  codigo_estacion: string;
  ubicacion_geografica: string;
  sentido_via: string;
  estado?: EstadoEstacion;
  created_at?: string;
}

// =============================================================================
// Tabla 2: CASETA
// =============================================================================
export interface Caseta {
  id_caseta: number;
  id_estacion: number;
  numero_carril: number;
  tipo_carril: TipoCarril;
  estado: EstadoCaseta;
  /** Calculado por la API: true si la caseta tiene un turno ABIERTO. */
  ocupada?: boolean;
}

export interface CasetaNueva {
  id_caseta?: number;
  id_estacion: number;
  numero_carril: number;
  tipo_carril: TipoCarril;
  estado?: EstadoCaseta;
}

// =============================================================================
// Tabla 3: OPERADOR
// =============================================================================
export interface Operador {
  id_operador: number;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  codigo_empleado: string;
  rol: RolOperador;
  estado: EstadoOperador;
}

export interface OperadorNuevo {
  id_operador?: number;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  codigo_empleado: string;
  rol: RolOperador;
  estado?: EstadoOperador;
}

// =============================================================================
// Tabla 4: TURNO
// =============================================================================
export interface Turno {
  id_turno: number;
  id_caseta: number;
  id_operador: number;
  fecha: string;
  diurno: boolean;
  fondo_inicial_caja: number;
  total_recaudado_efectivo: number;
  total_declarado_cierre?: number | null;
  diferencia_descuadre?: number | null;
  estado: EstadoTurno;
}

export interface TurnoNuevo {
  id_turno?: number;
  id_caseta: number;
  id_operador: number;
  fecha?: string;
  diurno?: boolean;
  fondo_inicial_caja?: number;
  total_recaudado_efectivo?: number;
  total_declarado_cierre?: number | null;
  diferencia_descuadre?: number | null;
  estado?: EstadoTurno;
}

export interface TurnoCierre {
  total_declarado_cierre: number;
}

// =============================================================================
// Tabla 5: CATEGORIA_VEHICULO
// =============================================================================
export interface CategoriaVehiculo {
  id_categoria: number;
  codigo: string;
  descripcion: string;
  numero_ejes_min: number;
  numero_ejes_max: number;
  peso_maximo_ton?: number | null;
  activo: boolean;
}

export interface CategoriaVehiculoNueva {
  id_categoria?: number;
  codigo: string;
  descripcion: string;
  numero_ejes_min: number;
  numero_ejes_max: number;
  peso_maximo_ton?: number | null;
  activo?: boolean;
}

// =============================================================================
// Tabla 6: TARIFA
// =============================================================================
export interface Tarifa {
  id_tarifa: number;
  id_estacion: number;
  id_categoria: number;
  monto: number;
  resolucion_legal?: string | null;
  fecha_inicio_vigencia: string;
  fecha_fin_vigencia?: string | null;
  activa: boolean;
}

export interface TarifaNueva {
  id_tarifa?: number;
  id_estacion: number;
  id_categoria: number;
  monto: number;
  resolucion_legal?: string | null;
  fecha_inicio_vigencia: string;
  fecha_fin_vigencia?: string | null;
  activa?: boolean;
}

// =============================================================================
// Tabla 7: VEHICULO
// =============================================================================
export interface Vehiculo {
  placa: string;
  id_categoria: number;
  marca?: string | null;
  modelo?: string | null;
  color?: string | null;
}

export interface VehiculoNuevo {
  placa: string;
  id_categoria: number;
  marca?: string | null;
  modelo?: string | null;
  color?: string | null;
}

// =============================================================================
// Tabla 8: CUENTA_TELEPEAJE
// =============================================================================
export interface CuentaTelepeaje {
  id_cuenta: number;
  placa_vehiculo: string;
  tag_rfid_serial: string;
  saldo_disponible: number;
  estado_cuenta: EstadoCuentaTelepeaje;
}

export interface CuentaTelepeajeNueva {
  id_cuenta?: number;
  placa_vehiculo: string;
  tag_rfid_serial: string;
  saldo_disponible?: number;
  estado_cuenta?: EstadoCuentaTelepeaje;
}

// =============================================================================
// Tabla 9: TRANSACCION_PEAJE
// =============================================================================
export interface TransaccionPeaje {
  id_transaccion: number;
  id_turno: number;
  id_tarifa: number;
  id_categoria: number;
  placa_detectada?: string | null;
  monto_tarifa: number;
  metodo_pago: MetodoPago;
  numero_ticket: string;
  fecha_hora: string;
  estado_paso: EstadoPaso;
  /** Solo lo trae el listado de un turno: true si hay un VOID en la auditoría. */
  anulada?: boolean;
}

export interface TransaccionPeajeNueva {
  id_transaccion?: number;
  id_turno: number;
  id_tarifa: number;
  id_categoria: number;
  placa_detectada?: string | null;
  monto_tarifa: number;
  metodo_pago: MetodoPago;
  numero_ticket: string;
  fecha_hora?: string;
  estado_paso?: EstadoPaso;
}

// =============================================================================
// Tabla 10: DETALLE_PAGO_TELEPEAJE
// =============================================================================
export interface DetallePagoTelepeaje {
  id_detalle_telepeaje: number;
  id_transaccion: number;
  id_cuenta: number;
  saldo_anterior: number;
  saldo_posterior: number;
  antena_lectora_id?: string | null;
}

export interface DetallePagoTelepeajeNuevo {
  id_detalle_telepeaje?: number;
  id_transaccion: number;
  id_cuenta: number;
  saldo_anterior: number;
  saldo_posterior: number;
  antena_lectora_id?: string | null;
}

// =============================================================================
// Tabla 11: AUDITORIA_TRANSACCION (Inmutable / Append-Only)
// =============================================================================
export interface AuditoriaTransaccion {
  id_auditoria: number;
  id_transaccion: number;
  tipo_operacion: TipoOperacionAuditoria;
  usuario_sistema: string;
  fecha_hora_evento: string;
  motivo?: string | null;
}

export interface AuditoriaTransaccionNueva {
  id_auditoria?: number;
  id_transaccion: number;
  tipo_operacion: TipoOperacionAuditoria;
  usuario_sistema: string;
  fecha_hora_evento?: string;
  motivo?: string | null;
}
