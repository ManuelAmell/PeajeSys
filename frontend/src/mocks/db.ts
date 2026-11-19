import type {
  AuditoriaTransaccion,
  Caseta,
  CategoriaVehiculo,
  CuentaTelepeaje,
  DetallePagoTelepeaje,
  EstacionPeaje,
  Operador,
  Tarifa,
  TransaccionPeaje,
  Turno,
  Vehiculo,
} from '@/types';
import { SEMILLA } from './semilla';
import type { Semilla } from './semilla.tipos';

/**
 * Base de datos en memoria para el servidor simulado de MSW.
 * Soporta cualquier semilla que cumpla la interfaz Semilla (B1b).
 */
export class BaseDatosMemoria {
  public estaciones: EstacionPeaje[] = [];
  public casetas: Caseta[] = [];
  public operadores: Operador[] = [];
  public turnos: Turno[] = [];
  public categorias: CategoriaVehiculo[] = [];
  public tarifas: Tarifa[] = [];
  public vehiculos: Vehiculo[] = [];
  public cuentas_telepeaje: CuentaTelepeaje[] = [];
  public transacciones: TransaccionPeaje[] = [];
  public detalles_telepeaje: DetallePagoTelepeaje[] = [];
  public auditorias: AuditoriaTransaccion[] = [];

  private seqTransaccion = 100;
  private seqTicket = 100;
  private seqAuditoria = 100;
  private seqDetalle = 100;
  private seqTarifa = 100;

  constructor(semilla: Semilla = SEMILLA) {
    this.cargarSemilla(semilla);
  }

  public cargarSemilla(semilla: Semilla): void {
    // Clonación profunda de arreglos y objetos para garantizar aislamiento
    this.estaciones = JSON.parse(JSON.stringify(semilla.estaciones));
    this.casetas = JSON.parse(JSON.stringify(semilla.casetas));
    this.operadores = JSON.parse(JSON.stringify(semilla.operadores));
    this.turnos = JSON.parse(JSON.stringify(semilla.turnos));
    this.categorias = JSON.parse(JSON.stringify(semilla.categorias));
    this.tarifas = JSON.parse(JSON.stringify(semilla.tarifas));
    this.vehiculos = JSON.parse(JSON.stringify(semilla.vehiculos));
    this.cuentas_telepeaje = JSON.parse(JSON.stringify(semilla.cuentas_telepeaje));
    this.transacciones = JSON.parse(JSON.stringify(semilla.transacciones));
    this.detalles_telepeaje = JSON.parse(JSON.stringify(semilla.detalles_telepeaje));
    this.auditorias = JSON.parse(JSON.stringify(semilla.auditorias));

    // Inicializar contadores de secuencias
    const maxTx = this.transacciones.reduce((max, t) => Math.max(max, t.id_transaccion), 0);
    this.seqTransaccion = maxTx + 1;
    this.seqTicket = maxTx + 1;

    const maxAud = this.auditorias.reduce((max, a) => Math.max(max, a.id_auditoria), 0);
    this.seqAuditoria = maxAud + 1;

    const maxDet = this.detalles_telepeaje.reduce((max, d) => Math.max(max, d.id_detalle_telepeaje), 0);
    this.seqDetalle = maxDet + 1;

    const maxTarifa = this.tarifas.reduce((max, t) => Math.max(max, t.id_tarifa), 0);
    this.seqTarifa = maxTarifa + 1;
  }

  // ---------------------------------------------------------------------------
  // Mutaciones transaccionales coherentes
  // ---------------------------------------------------------------------------

  /**
   * Registra un paso vehicular de forma transaccional:
   * 1. Inserta la transacción en TRANSACCION_PEAJE.
   * 2. Si es EFECTIVO: actualiza total_recaudado_efectivo en TURNO.
   * 3. Si es TELEPEAJE: descuenta saldo en CUENTA_TELEPEAJE e inserta en DETALLE_PAGO_TELEPEAJE.
   * 4. Inserta registro de auditoría INSERT en AUDITORIA_TRANSACCION.
   */
  public registrarTransaccion(datos: {
    id_turno: number;
    id_tarifa: number;
    id_categoria: number;
    placa_detectada?: string | null;
    monto_tarifa: number;
    metodo_pago: 'EFECTIVO' | 'TELEPEAJE' | 'EXENTO';
    estado_paso?: 'APROBADO' | 'EVASION' | 'EXENTO';
    usuario_sistema?: string;
  }): {
    transaccion: TransaccionPeaje;
    detalleTelepeaje?: DetallePagoTelepeaje;
    cuentaActualizada?: CuentaTelepeaje;
  } {
    const turno = this.turnos.find((t) => t.id_turno === datos.id_turno);
    if (!turno) {
      throw new Error(`Turno ${datos.id_turno} no encontrado.`);
    }
    if (turno.estado === 'CERRADO') {
      throw new Error('El turno está cerrado: no se pueden registrar nuevos pasos.');
    }

    const id_transaccion = this.seqTransaccion++;
    const fechaHora = new Date().toISOString();
    const hoyStr = fechaHora.slice(0, 10).replace(/-/g, '');
    const numero_ticket = `TCK-${hoyStr}-${String(this.seqTicket++).padStart(5, '0')}`;

    const nuevaTx: TransaccionPeaje = {
      id_transaccion,
      id_turno: datos.id_turno,
      id_tarifa: datos.id_tarifa,
      id_categoria: datos.id_categoria,
      placa_detectada: datos.placa_detectada ?? null,
      monto_tarifa: datos.monto_tarifa,
      metodo_pago: datos.metodo_pago,
      numero_ticket,
      fecha_hora: fechaHora,
      estado_paso: datos.estado_paso ?? (datos.metodo_pago === 'EXENTO' ? 'EXENTO' : 'APROBADO'),
    };

    let detalleTelepeaje: DetallePagoTelepeaje | undefined;
    let cuentaActualizada: CuentaTelepeaje | undefined;

    // Efectivo: sumar al turno
    if (datos.metodo_pago === 'EFECTIVO') {
      turno.total_recaudado_efectivo += datos.monto_tarifa;
    }

    // Telepeaje: descontar cuenta y crear detalle
    if (datos.metodo_pago === 'TELEPEAJE') {
      const placa = datos.placa_detectada?.toUpperCase();
      const cuenta = this.cuentas_telepeaje.find((c) => c.placa_vehiculo.toUpperCase() === placa);

      if (!cuenta) {
        throw new Error(`No se encontró cuenta de telepeaje para la placa ${placa}.`);
      }
      if (cuenta.estado_cuenta !== 'ACTIVA') {
        throw new Error(`La cuenta ${cuenta.tag_rfid_serial} está SUSPENDIDA.`);
      }
      if (cuenta.saldo_disponible < datos.monto_tarifa) {
        throw new Error('Saldo insuficiente para el cobro de telepeaje.');
      }

      const saldoAnterior = cuenta.saldo_disponible;
      cuenta.saldo_disponible -= datos.monto_tarifa;
      const saldoPosterior = cuenta.saldo_disponible;

      detalleTelepeaje = {
        id_detalle_telepeaje: this.seqDetalle++,
        id_transaccion,
        id_cuenta: cuenta.id_cuenta,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        antena_lectora_id: 'ANT-CARRIL-01',
      };

      this.detalles_telepeaje.unshift(detalleTelepeaje);
      cuentaActualizada = { ...cuenta };
    }

    this.transacciones.unshift(nuevaTx);

    // Auditoría inmutable (INSERT)
    const nuevaAuditoria: AuditoriaTransaccion = {
      id_auditoria: this.seqAuditoria++,
      id_transaccion,
      tipo_operacion: 'INSERT',
      usuario_sistema: datos.usuario_sistema || 'sistema_peaje',
      fecha_hora_evento: fechaHora,
      motivo: `Registro de paso con método ${datos.metodo_pago}`,
    };
    this.auditorias.unshift(nuevaAuditoria);

    return { transaccion: nuevaTx, detalleTelepeaje, cuentaActualizada };
  }

  /**
   * Cierra un turno operativo fijando el valor declarado y calculando el descuadre.
   */
  public cerrarTurno(
    id_turno: number,
    total_declarado_cierre: number,
  ): Turno {
    const turno = this.turnos.find((t) => t.id_turno === id_turno);
    if (!turno) {
      throw new Error(`Turno ${id_turno} no encontrado.`);
    }
    if (turno.estado === 'CERRADO') {
      throw new Error(`El turno ${id_turno} ya se encuentra cerrado.`);
    }

    turno.total_declarado_cierre = total_declarado_cierre;
    turno.diferencia_descuadre = Math.round(total_declarado_cierre - turno.total_recaudado_efectivo);
    turno.estado = 'CERRADO';

    return { ...turno };
  }

  /**
   * Anula una transacción existente registrando un evento VOID en AUDITORIA_TRANSACCION.
   */
  public anularTransaccion(
    id_transaccion: number,
    usuario_sistema: string,
    motivo: string,
  ): { transaccion: TransaccionPeaje; auditoria: AuditoriaTransaccion } {
    const tx = this.transacciones.find((t) => t.id_transaccion === id_transaccion);
    if (!tx) {
      throw new Error(`Transacción ${id_transaccion} no encontrada.`);
    }

    // Insertar registro de auditoría VOID (la tabla AUDITORIA_TRANSACCION es append-only)
    const fechaHora = new Date().toISOString();
    const audVoid: AuditoriaTransaccion = {
      id_auditoria: this.seqAuditoria++,
      id_transaccion,
      tipo_operacion: 'VOID',
      usuario_sistema,
      fecha_hora_evento: fechaHora,
      motivo: motivo || 'Anulación de cobro',
    };
    this.auditorias.unshift(audVoid);

    return { transaccion: { ...tx }, auditoria: audVoid };
  }

  /**
   * Crea o actualiza una tarifa para una estación y categoría.
   * Si existía una tarifa previa activa, la cierra preservando el historial.
   */
  public guardarTarifa(datos: {
    id_estacion: number;
    id_categoria: number;
    monto: number;
    resolucion_legal: string;
    fecha_inicio_vigencia: string;
    fecha_fin_vigencia?: string | null;
  }): Tarifa {
    // Cerrar tarifa previa activa para la misma estación y categoría
    const tarifaPrevia = this.tarifas.find(
      (t) => t.id_estacion === datos.id_estacion && t.id_categoria === datos.id_categoria && t.activa,
    );

    if (tarifaPrevia) {
      tarifaPrevia.activa = false;
      tarifaPrevia.fecha_fin_vigencia = datos.fecha_inicio_vigencia;
    }

    const nuevaTarifa: Tarifa = {
      id_tarifa: this.seqTarifa++,
      id_estacion: datos.id_estacion,
      id_categoria: datos.id_categoria,
      monto: datos.monto,
      resolucion_legal: datos.resolucion_legal,
      fecha_inicio_vigencia: datos.fecha_inicio_vigencia,
      fecha_fin_vigencia: datos.fecha_fin_vigencia ?? null,
      activa: true,
    };

    this.tarifas.unshift(nuevaTarifa);
    return nuevaTarifa;
  }

  // ---------------------------------------------------------------------------
  // Control de inmutabilidad de AUDITORIA_TRANSACCION (trg_auditoria_inmutable)
  // ---------------------------------------------------------------------------
  public actualizarAuditoria(): never {
    throw new Error(
      'Operación denegada: La tabla AUDITORIA_TRANSACCION es estrictamente de solo lectura/inserción (append-only) para garantizar trazabilidad legal.',
    );
  }

  public eliminarAuditoria(): never {
    throw new Error(
      'Operación denegada: La tabla AUDITORIA_TRANSACCION es estrictamente de solo lectura/inserción (append-only) para garantizar trazabilidad legal.',
    );
  }
}

// Instancia singleton por defecto
export let db = new BaseDatosMemoria();

export function crearDb(semilla: Semilla = SEMILLA): BaseDatosMemoria {
  db = new BaseDatosMemoria(semilla);
  return db;
}

export function reiniciarDb(semilla: Semilla = SEMILLA): void {
  db.cargarSemilla(semilla);
}

export function getDb(): BaseDatosMemoria {
  return db;
}
