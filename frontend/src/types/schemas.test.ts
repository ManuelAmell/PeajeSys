import { describe, expect, it } from 'vitest';
import {
  esquemaAuditoriaTransaccion,
  esquemaAuditoriaTransaccionNueva,
  esquemaCaseta,
  esquemaCasetaNueva,
  esquemaCategoriaVehiculo,
  esquemaCategoriaVehiculoNueva,
  esquemaCuentaTelepeaje,
  esquemaCuentaTelepeajeNueva,
  esquemaDetallePagoTelepeaje,
  esquemaDetallePagoTelepeajeNuevo,
  esquemaEstacionPeaje,
  esquemaEstacionPeajeNueva,
  esquemaOperador,
  esquemaOperadorNuevo,
  esquemaTarifa,
  esquemaTarifaNueva,
  esquemaTransaccionPeaje,
  esquemaTransaccionPeajeNueva,
  esquemaTurno,
  esquemaTurnoCierre,
  esquemaTurnoNuevo,
  esquemaVehiculo,
  esquemaVehiculoNuevo,
} from './esquemas';

describe('Esquemas Zod y restricciones DDL (CHECKs y límites)', () => {
  describe('1. ESTACION_PEAJE', () => {
    const baseEstacion = {
      id_estacion: 1,
      nombre: 'Estación Gambote',
      codigo_estacion: 'PEA-GAM-01',
      ubicacion_geografica: 'Km 25 Vía Ruta del Sol',
      sentido_via: 'BOGOTA-CARTAGENA',
      estado: 'ACTIVA' as const,
      created_at: '2026-10-01T07:00:00-05:00',
    };

    it('acepta una estación válida', () => {
      const res = esquemaEstacionPeaje.safeParse(baseEstacion);
      expect(res.success).toBe(true);
    });

    it('CHECK estado IN (ACTIVA, INACTIVA, MANTENIMIENTO): acepta válidos y rechaza inválidos', () => {
      expect(esquemaEstacionPeaje.safeParse({ ...baseEstacion, estado: 'ACTIVA' }).success).toBe(true);
      expect(esquemaEstacionPeaje.safeParse({ ...baseEstacion, estado: 'INACTIVA' }).success).toBe(true);
      expect(esquemaEstacionPeaje.safeParse({ ...baseEstacion, estado: 'MANTENIMIENTO' }).success).toBe(true);
      expect(esquemaEstacionPeaje.safeParse({ ...baseEstacion, estado: 'SUSPENDIDA' }).success).toBe(false);
    });

    it('valida límites de longitud VARCHAR', () => {
      expect(esquemaEstacionPeaje.safeParse({ ...baseEstacion, nombre: 'a'.repeat(100) }).success).toBe(true);
      expect(esquemaEstacionPeaje.safeParse({ ...baseEstacion, nombre: 'a'.repeat(101) }).success).toBe(false);
      expect(esquemaEstacionPeaje.safeParse({ ...baseEstacion, codigo_estacion: 'a'.repeat(20) }).success).toBe(true);
      expect(esquemaEstacionPeaje.safeParse({ ...baseEstacion, codigo_estacion: 'a'.repeat(21) }).success).toBe(false);
    });

    it('esquemaEstacionPeajeNueva permite omitir id_estacion, estado por defecto y created_at', () => {
      const nueva = {
        nombre: 'Nueva Estación',
        codigo_estacion: 'PEA-NUE-01',
        ubicacion_geografica: 'Km 10',
        sentido_via: 'NORTE-SUR',
      };
      const res = esquemaEstacionPeajeNueva.safeParse(nueva);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.estado).toBe('ACTIVA');
      }
    });
  });

  describe('2. CASETA', () => {
    const baseCaseta = {
      id_caseta: 1,
      id_estacion: 1,
      numero_carril: 1,
      tipo_carril: 'MANUAL' as const,
      estado: 'OPERATIVA' as const,
    };

    it('CHECK numero_carril > 0: acepta 1 (límite válido) y rechaza 0 y negativos', () => {
      expect(esquemaCaseta.safeParse({ ...baseCaseta, numero_carril: 1 }).success).toBe(true);
      expect(esquemaCaseta.safeParse({ ...baseCaseta, numero_carril: 0 }).success).toBe(false);
      expect(esquemaCaseta.safeParse({ ...baseCaseta, numero_carril: -1 }).success).toBe(false);
    });

    it('CHECK tipo_carril IN (MANUAL, TELEPEAJE_EXCLUSIVO, MIXTO)', () => {
      expect(esquemaCaseta.safeParse({ ...baseCaseta, tipo_carril: 'MANUAL' }).success).toBe(true);
      expect(esquemaCaseta.safeParse({ ...baseCaseta, tipo_carril: 'TELEPEAJE_EXCLUSIVO' }).success).toBe(true);
      expect(esquemaCaseta.safeParse({ ...baseCaseta, tipo_carril: 'MIXTO' }).success).toBe(true);
      expect(esquemaCaseta.safeParse({ ...baseCaseta, tipo_carril: 'AUTOMATICO' }).success).toBe(false);
    });

    it('CHECK estado IN (OPERATIVA, CERRADA, MANTENIMIENTO)', () => {
      expect(esquemaCaseta.safeParse({ ...baseCaseta, estado: 'OPERATIVA' }).success).toBe(true);
      expect(esquemaCaseta.safeParse({ ...baseCaseta, estado: 'CERRADA' }).success).toBe(true);
      expect(esquemaCaseta.safeParse({ ...baseCaseta, estado: 'MANTENIMIENTO' }).success).toBe(true);
      expect(esquemaCaseta.safeParse({ ...baseCaseta, estado: 'INACTIVA' }).success).toBe(false);
    });

    it('esquemaCasetaNueva asigna estado OPERATIVA por defecto', () => {
      const res = esquemaCasetaNueva.safeParse({
        id_estacion: 1,
        numero_carril: 2,
        tipo_carril: 'MIXTO',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.estado).toBe('OPERATIVA');
      }
    });
  });

  describe('3. OPERADOR', () => {
    const baseOperador = {
      id_operador: 1,
      numero_documento: '1047123456',
      nombres: 'Carlos Alberto',
      apellidos: 'Gómez Pérez',
      codigo_empleado: 'EMP-001',
      rol: 'RECAUDADOR' as const,
      estado: 'ACTIVO' as const,
    };

    it('CHECK rol IN (RECAUDADOR, SUPERVISOR)', () => {
      expect(esquemaOperador.safeParse({ ...baseOperador, rol: 'RECAUDADOR' }).success).toBe(true);
      expect(esquemaOperador.safeParse({ ...baseOperador, rol: 'SUPERVISOR' }).success).toBe(true);
      expect(esquemaOperador.safeParse({ ...baseOperador, rol: 'ADMINISTRADOR' }).success).toBe(false);
    });

    it('CHECK estado IN (ACTIVO, INACTIVO)', () => {
      expect(esquemaOperador.safeParse({ ...baseOperador, estado: 'ACTIVO' }).success).toBe(true);
      expect(esquemaOperador.safeParse({ ...baseOperador, estado: 'INACTIVO' }).success).toBe(true);
      expect(esquemaOperador.safeParse({ ...baseOperador, estado: 'BLOQUEADO' }).success).toBe(false);
    });

    it('valida límites de longitud VARCHAR', () => {
      expect(esquemaOperador.safeParse({ ...baseOperador, numero_documento: '1'.repeat(20) }).success).toBe(true);
      expect(esquemaOperador.safeParse({ ...baseOperador, numero_documento: '1'.repeat(21) }).success).toBe(false);
      expect(esquemaOperador.safeParse({ ...baseOperador, codigo_empleado: 'E'.repeat(20) }).success).toBe(true);
      expect(esquemaOperador.safeParse({ ...baseOperador, codigo_empleado: 'E'.repeat(21) }).success).toBe(false);
    });

    it('esquemaOperadorNuevo asigna estado ACTIVO por defecto', () => {
      const res = esquemaOperadorNuevo.safeParse({
        numero_documento: '1047654321',
        nombres: 'María Fernanda',
        apellidos: 'López Martínez',
        codigo_empleado: 'EMP-002',
        rol: 'RECAUDADOR',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.estado).toBe('ACTIVO');
      }
    });
  });

  describe('4. TURNO', () => {
    const baseTurno = {
      id_turno: 1,
      id_caseta: 1,
      id_operador: 1,
      fecha: '2026-10-01',
      diurno: true,
      fondo_inicial_caja: 100000,
      total_recaudado_efectivo: 315000,
      total_declarado_cierre: 315000,
      diferencia_descuadre: 0,
      estado: 'CERRADO' as const,
    };

    it('CHECK fondo_inicial_caja >= 0: acepta 0 y rechaza negativos', () => {
      expect(esquemaTurno.safeParse({ ...baseTurno, fondo_inicial_caja: 0 }).success).toBe(true);
      expect(esquemaTurno.safeParse({ ...baseTurno, fondo_inicial_caja: -0.01 }).success).toBe(false);
    });

    it('CHECK total_recaudado_efectivo >= 0: acepta 0 y rechaza negativos', () => {
      expect(esquemaTurno.safeParse({ ...baseTurno, total_recaudado_efectivo: 0 }).success).toBe(true);
      expect(esquemaTurno.safeParse({ ...baseTurno, total_recaudado_efectivo: -1 }).success).toBe(false);
    });

    it('CHECK total_declarado_cierre >= 0: acepta null (abierto), 0 (cierre exacto sin saldo) y rechaza negativos', () => {
      expect(esquemaTurno.safeParse({ ...baseTurno, total_declarado_cierre: null }).success).toBe(true);
      expect(esquemaTurno.safeParse({ ...baseTurno, total_declarado_cierre: 0 }).success).toBe(true);
      expect(esquemaTurno.safeParse({ ...baseTurno, total_declarado_cierre: -5 }).success).toBe(false);
    });

    it('CHECK estado IN (ABIERTO, CERRADO)', () => {
      expect(esquemaTurno.safeParse({ ...baseTurno, estado: 'ABIERTO' }).success).toBe(true);
      expect(esquemaTurno.safeParse({ ...baseTurno, estado: 'CERRADO' }).success).toBe(true);
      expect(esquemaTurno.safeParse({ ...baseTurno, estado: 'FINALIZADO' }).success).toBe(false);
    });

    it('permite diferencia_descuadre negativa, cero o positiva', () => {
      expect(esquemaTurno.safeParse({ ...baseTurno, diferencia_descuadre: -2000 }).success).toBe(true);
      expect(esquemaTurno.safeParse({ ...baseTurno, diferencia_descuadre: 0 }).success).toBe(true);
      expect(esquemaTurno.safeParse({ ...baseTurno, diferencia_descuadre: 5000 }).success).toBe(true);
      expect(esquemaTurno.safeParse({ ...baseTurno, diferencia_descuadre: null }).success).toBe(true);
    });

    it('esquemaTurnoNuevo asigna valores por defecto del DDL', () => {
      const res = esquemaTurnoNuevo.safeParse({
        id_caseta: 1,
        id_operador: 1,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.diurno).toBe(true);
        expect(res.data.fondo_inicial_caja).toBe(0);
        expect(res.data.total_recaudado_efectivo).toBe(0);
        expect(res.data.estado).toBe('ABIERTO');
      }
    });

    it('esquemaTurnoCierre valida total_declarado_cierre >= 0', () => {
      expect(esquemaTurnoCierre.safeParse({ total_declarado_cierre: 248000 }).success).toBe(true);
      expect(esquemaTurnoCierre.safeParse({ total_declarado_cierre: 0 }).success).toBe(true);
      expect(esquemaTurnoCierre.safeParse({ total_declarado_cierre: -1 }).success).toBe(false);
    });
  });

  describe('5. CATEGORIA_VEHICULO', () => {
    const baseCategoria = {
      id_categoria: 1,
      codigo: 'CAT_I',
      descripcion: 'Automóviles, camperos y camionetas',
      numero_ejes_min: 2,
      numero_ejes_max: 2,
      peso_maximo_ton: 3.5,
      activo: true,
    };

    it('CHECK numero_ejes_min >= 1: acepta 1 y rechaza 0', () => {
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, numero_ejes_min: 1, numero_ejes_max: 2 }).success).toBe(true);
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, numero_ejes_min: 0, numero_ejes_max: 2 }).success).toBe(false);
    });

    it('CHECK chk_ejes_valido: numero_ejes_max >= numero_ejes_min', () => {
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, numero_ejes_min: 3, numero_ejes_max: 4 }).success).toBe(true);
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, numero_ejes_min: 4, numero_ejes_max: 4 }).success).toBe(true);
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, numero_ejes_min: 5, numero_ejes_max: 4 }).success).toBe(false);
    });

    it('CHECK peso_maximo_ton > 0 (si no es nulo): acepta 0.01 y rechaza 0 y negativos', () => {
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, peso_maximo_ton: 0.01 }).success).toBe(true);
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, peso_maximo_ton: null }).success).toBe(true);
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, peso_maximo_ton: 0 }).success).toBe(false);
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, peso_maximo_ton: -1 }).success).toBe(false);
    });

    it('valida límites de longitud VARCHAR', () => {
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, codigo: 'C'.repeat(10) }).success).toBe(true);
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, codigo: 'C'.repeat(11) }).success).toBe(false);
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, descripcion: 'D'.repeat(150) }).success).toBe(true);
      expect(esquemaCategoriaVehiculo.safeParse({ ...baseCategoria, descripcion: 'D'.repeat(151) }).success).toBe(false);
    });
  });

  describe('6. TARIFA', () => {
    const baseTarifa = {
      id_tarifa: 1,
      id_estacion: 1,
      id_categoria: 1,
      monto: 10500,
      resolucion_legal: 'Res. MinTransporte 0045/2026',
      fecha_inicio_vigencia: '2026-01-01',
      fecha_fin_vigencia: null,
      activa: true,
    };

    it('CHECK monto > 0: acepta 0.01 y rechaza 0 y negativos', () => {
      expect(esquemaTarifa.safeParse({ ...baseTarifa, monto: 0.01 }).success).toBe(true);
      expect(esquemaTarifa.safeParse({ ...baseTarifa, monto: 0 }).success).toBe(false);
      expect(esquemaTarifa.safeParse({ ...baseTarifa, monto: -100 }).success).toBe(false);
    });

    it('CHECK chk_fechas_vigencia: fecha_fin_vigencia IS NULL OR fecha_fin_vigencia >= fecha_inicio_vigencia', () => {
      expect(esquemaTarifa.safeParse({ ...baseTarifa, fecha_fin_vigencia: null }).success).toBe(true);
      expect(esquemaTarifa.safeParse({ ...baseTarifa, fecha_fin_vigencia: '2026-01-01' }).success).toBe(true);
      expect(esquemaTarifa.safeParse({ ...baseTarifa, fecha_fin_vigencia: '2026-12-31' }).success).toBe(true);
      expect(esquemaTarifa.safeParse({ ...baseTarifa, fecha_fin_vigencia: '2025-12-31' }).success).toBe(false);
    });

    it('esquemaTarifaNueva asigna activa = true por defecto', () => {
      const res = esquemaTarifaNueva.safeParse({
        id_estacion: 1,
        id_categoria: 1,
        monto: 10500,
        fecha_inicio_vigencia: '2026-01-01',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.activa).toBe(true);
      }
    });
  });

  describe('7. VEHICULO', () => {
    const baseVehiculo = {
      placa: 'HKL123',
      id_categoria: 1,
      marca: 'Mazda',
      modelo: 'CX-5',
      color: 'Gris',
    };

    it('acepta vehículo válido y campos opcionales nulos', () => {
      expect(esquemaVehiculo.safeParse(baseVehiculo).success).toBe(true);
      expect(
        esquemaVehiculo.safeParse({
          placa: 'HKL123',
          id_categoria: 1,
          marca: null,
          modelo: null,
          color: null,
        }).success,
      ).toBe(true);
    });

    it('valida límites de longitud VARCHAR', () => {
      expect(esquemaVehiculo.safeParse({ ...baseVehiculo, placa: 'P'.repeat(10) }).success).toBe(true);
      expect(esquemaVehiculo.safeParse({ ...baseVehiculo, placa: 'P'.repeat(11) }).success).toBe(false);
      expect(esquemaVehiculo.safeParse({ ...baseVehiculo, marca: 'M'.repeat(50) }).success).toBe(true);
      expect(esquemaVehiculo.safeParse({ ...baseVehiculo, marca: 'M'.repeat(51) }).success).toBe(false);
    });
  });

  describe('8. CUENTA_TELEPEAJE', () => {
    const baseCuenta = {
      id_cuenta: 1,
      placa_vehiculo: 'HKL123',
      tag_rfid_serial: 'TAG-COL-9900112233',
      saldo_disponible: 150000,
      estado_cuenta: 'ACTIVA' as const,
    };

    it('CHECK saldo_disponible >= 0: acepta 0 y rechaza negativos', () => {
      expect(esquemaCuentaTelepeaje.safeParse({ ...baseCuenta, saldo_disponible: 0 }).success).toBe(true);
      expect(esquemaCuentaTelepeaje.safeParse({ ...baseCuenta, saldo_disponible: -0.01 }).success).toBe(false);
    });

    it('CHECK estado_cuenta IN (ACTIVA, SUSPENDIDA)', () => {
      expect(esquemaCuentaTelepeaje.safeParse({ ...baseCuenta, estado_cuenta: 'ACTIVA' }).success).toBe(true);
      expect(esquemaCuentaTelepeaje.safeParse({ ...baseCuenta, estado_cuenta: 'SUSPENDIDA' }).success).toBe(true);
      expect(esquemaCuentaTelepeaje.safeParse({ ...baseCuenta, estado_cuenta: 'CANCELADA' }).success).toBe(false);
    });

    it('valida límites de longitud VARCHAR', () => {
      expect(esquemaCuentaTelepeaje.safeParse({ ...baseCuenta, tag_rfid_serial: 'T'.repeat(64) }).success).toBe(true);
      expect(esquemaCuentaTelepeaje.safeParse({ ...baseCuenta, tag_rfid_serial: 'T'.repeat(65) }).success).toBe(false);
    });

    it('esquemaCuentaTelepeajeNueva asigna saldo 0 y estado ACTIVA por defecto', () => {
      const res = esquemaCuentaTelepeajeNueva.safeParse({
        placa_vehiculo: 'HKL123',
        tag_rfid_serial: 'TAG-COL-9900112233',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.saldo_disponible).toBe(0);
        expect(res.data.estado_cuenta).toBe('ACTIVA');
      }
    });
  });

  describe('9. TRANSACCION_PEAJE', () => {
    const baseTransaccion = {
      id_transaccion: 1,
      id_turno: 1,
      id_tarifa: 1,
      id_categoria: 1,
      placa_detectada: 'HKL123',
      monto_tarifa: 10500,
      metodo_pago: 'EFECTIVO' as const,
      numero_ticket: 'TCK-20261001-00001',
      fecha_hora: '2026-10-01T07:15:00-05:00',
      estado_paso: 'APROBADO' as const,
    };

    it('CHECK monto_tarifa >= 0: acepta 0 (exento) y rechaza negativos', () => {
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, monto_tarifa: 0 }).success).toBe(true);
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, monto_tarifa: -1 }).success).toBe(false);
    });

    it('CHECK metodo_pago IN (EFECTIVO, TELEPEAJE, EXENTO)', () => {
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, metodo_pago: 'EFECTIVO' }).success).toBe(true);
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, metodo_pago: 'TELEPEAJE' }).success).toBe(true);
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, metodo_pago: 'EXENTO' }).success).toBe(true);
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, metodo_pago: 'TARJETA' }).success).toBe(false);
    });

    it('CHECK estado_paso IN (APROBADO, EVASION, EXENTO)', () => {
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, estado_paso: 'APROBADO' }).success).toBe(true);
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, estado_paso: 'EVASION' }).success).toBe(true);
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, estado_paso: 'EXENTO' }).success).toBe(true);
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, estado_paso: 'RECHAZADO' }).success).toBe(false);
    });

    it('valida límites de longitud VARCHAR', () => {
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, numero_ticket: 'T'.repeat(40) }).success).toBe(true);
      expect(esquemaTransaccionPeaje.safeParse({ ...baseTransaccion, numero_ticket: 'T'.repeat(41) }).success).toBe(false);
    });

    it('esquemaTransaccionPeajeNueva asigna estado_paso APROBADO por defecto', () => {
      const res = esquemaTransaccionPeajeNueva.safeParse({
        id_turno: 1,
        id_tarifa: 1,
        id_categoria: 1,
        monto_tarifa: 10500,
        metodo_pago: 'EFECTIVO',
        numero_ticket: 'TCK-20261001-00001',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.estado_paso).toBe('APROBADO');
      }
    });
  });

  describe('10. DETALLE_PAGO_TELEPEAJE', () => {
    const baseDetalle = {
      id_detalle_telepeaje: 1,
      id_transaccion: 4,
      id_cuenta: 1,
      saldo_anterior: 160500,
      saldo_posterior: 150000,
      antena_lectora_id: 'ANT-CAM-03A',
    };

    it('CHECK saldo_anterior >= 0 y saldo_posterior >= 0: acepta 0 y rechaza negativos', () => {
      expect(esquemaDetallePagoTelepeaje.safeParse({ ...baseDetalle, saldo_anterior: 0 }).success).toBe(true);
      expect(esquemaDetallePagoTelepeaje.safeParse({ ...baseDetalle, saldo_anterior: -0.01 }).success).toBe(false);
      expect(esquemaDetallePagoTelepeaje.safeParse({ ...baseDetalle, saldo_posterior: 0 }).success).toBe(true);
      expect(esquemaDetallePagoTelepeaje.safeParse({ ...baseDetalle, saldo_posterior: -1 }).success).toBe(false);
    });

    it('valida límites de longitud VARCHAR', () => {
      expect(esquemaDetallePagoTelepeaje.safeParse({ ...baseDetalle, antena_lectora_id: 'A'.repeat(30) }).success).toBe(true);
      expect(esquemaDetallePagoTelepeaje.safeParse({ ...baseDetalle, antena_lectora_id: 'A'.repeat(31) }).success).toBe(false);
    });
  });

  describe('11. AUDITORIA_TRANSACCION', () => {
    const baseAuditoria = {
      id_auditoria: 1,
      id_transaccion: 1,
      tipo_operacion: 'INSERT' as const,
      usuario_sistema: 'carlos_gomez',
      fecha_hora_evento: '2026-10-01T07:15:00-05:00',
      motivo: 'Paso de vehículo registrado en caja manual',
    };

    it('CHECK tipo_operacion IN (INSERT, UPDATE, VOID)', () => {
      expect(esquemaAuditoriaTransaccion.safeParse({ ...baseAuditoria, tipo_operacion: 'INSERT' }).success).toBe(true);
      expect(esquemaAuditoriaTransaccion.safeParse({ ...baseAuditoria, tipo_operacion: 'UPDATE' }).success).toBe(true);
      expect(esquemaAuditoriaTransaccion.safeParse({ ...baseAuditoria, tipo_operacion: 'VOID' }).success).toBe(true);
      expect(esquemaAuditoriaTransaccion.safeParse({ ...baseAuditoria, tipo_operacion: 'DELETE' }).success).toBe(false);
    });

    it('valida límites de longitud VARCHAR', () => {
      expect(esquemaAuditoriaTransaccion.safeParse({ ...baseAuditoria, usuario_sistema: 'u'.repeat(50) }).success).toBe(true);
      expect(esquemaAuditoriaTransaccion.safeParse({ ...baseAuditoria, usuario_sistema: 'u'.repeat(51) }).success).toBe(false);
      expect(esquemaAuditoriaTransaccion.safeParse({ ...baseAuditoria, motivo: 'm'.repeat(255) }).success).toBe(true);
      expect(esquemaAuditoriaTransaccion.safeParse({ ...baseAuditoria, motivo: 'm'.repeat(256) }).success).toBe(false);
    });

    it('esquemaAuditoriaTransaccionNueva permite registrar evento de auditoría', () => {
      const res = esquemaAuditoriaTransaccionNueva.safeParse({
        id_transaccion: 1,
        tipo_operacion: 'INSERT',
        usuario_sistema: 'carlos_gomez',
        motivo: 'Registro manual',
      });
      expect(res.success).toBe(true);
    });
  });
});
