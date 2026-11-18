import { z } from 'zod';

// =============================================================================
// Enumeraciones y Uniones del DDL
// =============================================================================

export const esquemaEstadoEstacion = z.enum(['ACTIVA', 'INACTIVA', 'MANTENIMIENTO']);
export const esquemaTipoCarril = z.enum(['MANUAL', 'TELEPEAJE_EXCLUSIVO', 'MIXTO']);
export const esquemaEstadoCaseta = z.enum(['OPERATIVA', 'CERRADA', 'MANTENIMIENTO']);
export const esquemaRolOperador = z.enum(['RECAUDADOR', 'SUPERVISOR']);
export const esquemaEstadoOperador = z.enum(['ACTIVO', 'INACTIVO']);
export const esquemaEstadoTurno = z.enum(['ABIERTO', 'CERRADO']);
export const esquemaEstadoCuentaTelepeaje = z.enum(['ACTIVA', 'SUSPENDIDA']);
export const esquemaMetodoPago = z.enum(['EFECTIVO', 'TELEPEAJE', 'EXENTO']);
export const esquemaEstadoPaso = z.enum(['APROBADO', 'EVASION', 'EXENTO']);
export const esquemaTipoOperacionAuditoria = z.enum(['INSERT', 'UPDATE', 'VOID']);

export const esquemaRolFrontend = z.enum(['RECAUDADOR', 'SUPERVISOR', 'ADMIN']);

// =============================================================================
// 1. ESTACION_PEAJE
// =============================================================================

export const esquemaEstacionPeaje = z.object({
  id_estacion: z.number().int().positive(),
  nombre: z.string().min(1).max(100),
  codigo_estacion: z.string().min(1).max(20),
  ubicacion_geografica: z.string().min(1).max(255),
  sentido_via: z.string().min(1).max(50),
  estado: esquemaEstadoEstacion,
  created_at: z.string(),
});

export const esquemaEstacionPeajeNueva = z.object({
  id_estacion: z.number().int().positive().optional(),
  nombre: z.string().min(1).max(100),
  codigo_estacion: z.string().min(1).max(20),
  ubicacion_geografica: z.string().min(1).max(255),
  sentido_via: z.string().min(1).max(50),
  estado: esquemaEstadoEstacion.default('ACTIVA'),
  created_at: z.string().optional(),
});

// =============================================================================
// 2. CASETA
// =============================================================================

export const esquemaCaseta = z.object({
  id_caseta: z.number().int().positive(),
  id_estacion: z.number().int().positive(),
  numero_carril: z.number().int().gt(0, 'El número de carril debe ser mayor que 0'),
  tipo_carril: esquemaTipoCarril,
  estado: esquemaEstadoCaseta,
});

export const esquemaCasetaNueva = z.object({
  id_caseta: z.number().int().positive().optional(),
  id_estacion: z.number().int().positive(),
  numero_carril: z.number().int().gt(0, 'El número de carril debe ser mayor que 0'),
  tipo_carril: esquemaTipoCarril,
  estado: esquemaEstadoCaseta.default('OPERATIVA'),
});

// =============================================================================
// 3. OPERADOR
// =============================================================================

export const esquemaOperador = z.object({
  id_operador: z.number().int().positive(),
  numero_documento: z.string().min(1).max(20),
  nombres: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  codigo_empleado: z.string().min(1).max(20),
  rol: esquemaRolOperador,
  estado: esquemaEstadoOperador,
});

export const esquemaOperadorNuevo = z.object({
  id_operador: z.number().int().positive().optional(),
  numero_documento: z.string().min(1).max(20),
  nombres: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  codigo_empleado: z.string().min(1).max(20),
  rol: esquemaRolOperador,
  estado: esquemaEstadoOperador.default('ACTIVO'),
});

// =============================================================================
// 4. TURNO
// =============================================================================

export const esquemaTurno = z.object({
  id_turno: z.number().int().positive(),
  id_caseta: z.number().int().positive(),
  id_operador: z.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato fecha YYYY-MM-DD'),
  diurno: z.boolean(),
  fondo_inicial_caja: z.number().gte(0, 'El fondo inicial no puede ser negativo'),
  total_recaudado_efectivo: z.number().gte(0, 'El total recaudado no puede ser negativo'),
  total_declarado_cierre: z.number().gte(0, 'El total declarado no puede ser negativo').nullable(),
  diferencia_descuadre: z.number().nullable(),
  estado: esquemaEstadoTurno,
});

export const esquemaTurnoNuevo = z.object({
  id_turno: z.number().int().positive().optional(),
  id_caseta: z.number().int().positive(),
  id_operador: z.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().slice(0, 10)),
  diurno: z.boolean().default(true),
  fondo_inicial_caja: z.number().gte(0).default(0),
  total_recaudado_efectivo: z.number().gte(0).default(0),
  total_declarado_cierre: z.number().gte(0).nullable().default(null),
  diferencia_descuadre: z.number().nullable().default(null),
  estado: esquemaEstadoTurno.default('ABIERTO'),
});

export const esquemaTurnoCierre = z.object({
  total_declarado_cierre: z.number().gte(0, 'El total declarado no puede ser negativo'),
});

// =============================================================================
// 5. CATEGORIA_VEHICULO
// =============================================================================

const baseCategoriaVehiculo = z.object({
  id_categoria: z.number().int().positive(),
  codigo: z.string().min(1).max(10),
  descripcion: z.string().min(1).max(150),
  numero_ejes_min: z.number().int().gte(1, 'El número mínimo de ejes debe ser al menos 1'),
  numero_ejes_max: z.number().int(),
  peso_maximo_ton: z.number().gt(0, 'El peso máximo en toneladas debe ser mayor que 0').nullable(),
  activo: z.boolean(),
});

export const esquemaCategoriaVehiculo = baseCategoriaVehiculo.refine(
  (data) => data.numero_ejes_max >= data.numero_ejes_min,
  {
    message: 'numero_ejes_max debe ser mayor o igual a numero_ejes_min (chk_ejes_valido)',
    path: ['numero_ejes_max'],
  },
);

const baseCategoriaVehiculoNueva = z.object({
  id_categoria: z.number().int().positive().optional(),
  codigo: z.string().min(1).max(10),
  descripcion: z.string().min(1).max(150),
  numero_ejes_min: z.number().int().gte(1, 'El número mínimo de ejes debe ser al menos 1'),
  numero_ejes_max: z.number().int(),
  peso_maximo_ton: z.number().gt(0, 'El peso máximo en toneladas debe ser mayor que 0').nullable().default(null),
  activo: z.boolean().default(true),
});

export const esquemaCategoriaVehiculoNueva = baseCategoriaVehiculoNueva.refine(
  (data) => data.numero_ejes_max >= data.numero_ejes_min,
  {
    message: 'numero_ejes_max debe ser mayor o igual a numero_ejes_min (chk_ejes_valido)',
    path: ['numero_ejes_max'],
  },
);

// =============================================================================
// 6. TARIFA
// =============================================================================

const baseTarifa = z.object({
  id_tarifa: z.number().int().positive(),
  id_estacion: z.number().int().positive(),
  id_categoria: z.number().int().positive(),
  monto: z.number().gt(0, 'El monto debe ser mayor que 0'),
  resolucion_legal: z.string().max(100).nullable(),
  fecha_inicio_vigencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato fecha YYYY-MM-DD'),
  fecha_fin_vigencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  activa: z.boolean(),
});

export const esquemaTarifa = baseTarifa.refine(
  (data) => data.fecha_fin_vigencia === null || data.fecha_fin_vigencia >= data.fecha_inicio_vigencia,
  {
    message: 'fecha_fin_vigencia debe ser mayor o igual a fecha_inicio_vigencia (chk_fechas_vigencia)',
    path: ['fecha_fin_vigencia'],
  },
);

const baseTarifaNueva = z.object({
  id_tarifa: z.number().int().positive().optional(),
  id_estacion: z.number().int().positive(),
  id_categoria: z.number().int().positive(),
  monto: z.number().gt(0, 'El monto debe ser mayor que 0'),
  resolucion_legal: z.string().max(100).nullable().default(null),
  fecha_inicio_vigencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin_vigencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  activa: z.boolean().default(true),
});

export const esquemaTarifaNueva = baseTarifaNueva.refine(
  (data) => data.fecha_fin_vigencia === null || data.fecha_fin_vigencia >= data.fecha_inicio_vigencia,
  {
    message: 'fecha_fin_vigencia debe ser mayor o igual a fecha_inicio_vigencia (chk_fechas_vigencia)',
    path: ['fecha_fin_vigencia'],
  },
);

// =============================================================================
// 7. VEHICULO
// =============================================================================

export const esquemaVehiculo = z.object({
  placa: z.string().min(1).max(10),
  id_categoria: z.number().int().positive(),
  marca: z.string().max(50).nullable(),
  modelo: z.string().max(50).nullable(),
  color: z.string().max(30).nullable(),
});

export const esquemaVehiculoNuevo = z.object({
  placa: z.string().min(1).max(10),
  id_categoria: z.number().int().positive(),
  marca: z.string().max(50).nullable().default(null),
  modelo: z.string().max(50).nullable().default(null),
  color: z.string().max(30).nullable().default(null),
});

// =============================================================================
// 8. CUENTA_TELEPEAJE
// =============================================================================

export const esquemaCuentaTelepeaje = z.object({
  id_cuenta: z.number().int().positive(),
  placa_vehiculo: z.string().min(1).max(10),
  tag_rfid_serial: z.string().min(1).max(64),
  saldo_disponible: z.number().gte(0, 'El saldo disponible no puede ser negativo'),
  estado_cuenta: esquemaEstadoCuentaTelepeaje,
});

export const esquemaCuentaTelepeajeNueva = z.object({
  id_cuenta: z.number().int().positive().optional(),
  placa_vehiculo: z.string().min(1).max(10),
  tag_rfid_serial: z.string().min(1).max(64),
  saldo_disponible: z.number().gte(0).default(0),
  estado_cuenta: esquemaEstadoCuentaTelepeaje.default('ACTIVA'),
});

// =============================================================================
// 9. TRANSACCION_PEAJE
// =============================================================================

export const esquemaTransaccionPeaje = z.object({
  id_transaccion: z.number().int().positive(),
  id_turno: z.number().int().positive(),
  id_tarifa: z.number().int().positive(),
  id_categoria: z.number().int().positive(),
  placa_detectada: z.string().max(10).nullable(),
  monto_tarifa: z.number().gte(0, 'El monto de la tarifa no puede ser negativo'),
  metodo_pago: esquemaMetodoPago,
  numero_ticket: z.string().min(1).max(40),
  fecha_hora: z.string(),
  estado_paso: esquemaEstadoPaso,
});

export const esquemaTransaccionPeajeNueva = z.object({
  id_transaccion: z.number().int().positive().optional(),
  id_turno: z.number().int().positive(),
  id_tarifa: z.number().int().positive(),
  id_categoria: z.number().int().positive(),
  placa_detectada: z.string().max(10).nullable().default(null),
  monto_tarifa: z.number().gte(0, 'El monto de la tarifa no puede ser negativo'),
  metodo_pago: esquemaMetodoPago,
  numero_ticket: z.string().min(1).max(40),
  fecha_hora: z.string().default(() => new Date().toISOString()),
  estado_paso: esquemaEstadoPaso.default('APROBADO'),
});

// =============================================================================
// 10. DETALLE_PAGO_TELEPEAJE
// =============================================================================

export const esquemaDetallePagoTelepeaje = z.object({
  id_detalle_telepeaje: z.number().int().positive(),
  id_transaccion: z.number().int().positive(),
  id_cuenta: z.number().int().positive(),
  saldo_anterior: z.number().gte(0, 'El saldo anterior no puede ser negativo'),
  saldo_posterior: z.number().gte(0, 'El saldo posterior no puede ser negativo'),
  antena_lectora_id: z.string().max(30).nullable(),
});

export const esquemaDetallePagoTelepeajeNuevo = z.object({
  id_detalle_telepeaje: z.number().int().positive().optional(),
  id_transaccion: z.number().int().positive(),
  id_cuenta: z.number().int().positive(),
  saldo_anterior: z.number().gte(0, 'El saldo anterior no puede ser negativo'),
  saldo_posterior: z.number().gte(0, 'El saldo posterior no puede ser negativo'),
  antena_lectora_id: z.string().max(30).nullable().default(null),
});

// =============================================================================
// 11. AUDITORIA_TRANSACCION
// =============================================================================

export const esquemaAuditoriaTransaccion = z.object({
  id_auditoria: z.number().int().positive(),
  id_transaccion: z.number().int().positive(),
  tipo_operacion: esquemaTipoOperacionAuditoria,
  usuario_sistema: z.string().min(1).max(50),
  fecha_hora_evento: z.string(),
  motivo: z.string().max(255).nullable(),
});

export const esquemaAuditoriaTransaccionNueva = z.object({
  id_auditoria: z.number().int().positive().optional(),
  id_transaccion: z.number().int().positive(),
  tipo_operacion: esquemaTipoOperacionAuditoria,
  usuario_sistema: z.string().min(1).max(50),
  fecha_hora_evento: z.string().default(() => new Date().toISOString()),
  motivo: z.string().max(255).nullable().default(null),
});
