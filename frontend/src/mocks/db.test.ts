import { beforeEach, describe, expect, it } from 'vitest';
import { procesarControlLectura, obtenerModoMock } from './control';
import { crearDb, getDb, reiniciarDb } from './db';
import { SEMILLA_MINIMA } from './semilla.minima';

describe('Base de datos en memoria (MSW db.ts) y control de estados (control.ts)', () => {
  beforeEach(() => {
    reiniciarDb(SEMILLA_MINIMA);
  });

  describe('Inicialización y reinicio de la base en memoria', () => {
    it('inicializa con las 11 colecciones pobladas desde la semilla', () => {
      const db = getDb();
      expect(db.estaciones.length).toBe(2);
      expect(db.casetas.length).toBe(6);
      expect(db.operadores.length).toBe(10);
      expect(db.categorias.length).toBe(7);
      expect(db.tarifas.length).toBe(10);
      expect(db.vehiculos.length).toBe(10);
      expect(db.cuentas_telepeaje.length).toBe(10);
      expect(db.turnos.length).toBe(10);
      expect(db.transacciones.length).toBe(18);
      expect(db.detalles_telepeaje.length).toBe(10);
      expect(db.auditorias.length).toBe(12);
    });

    it('crearDb acepta cualquier semilla personalizada', () => {
      const semillaCustom = {
        ...SEMILLA_MINIMA,
        estaciones: [
          {
            id_estacion: 99,
            nombre: 'Estación Personalizada',
            codigo_estacion: 'PEA-CUS-99',
            ubicacion_geografica: 'Km 50',
            sentido_via: 'ORIENTE-OCCIDENTE',
            estado: 'ACTIVA' as const,
            created_at: '2026-10-01T00:00:00-05:00',
          },
        ],
      };
      const customDb = crearDb(semillaCustom);
      expect(customDb.estaciones.length).toBe(1);
      expect(customDb.estaciones[0]!.codigo_estacion).toBe('PEA-CUS-99');
    });

    it('reiniciarDb restablece el estado inicial tras modificaciones', () => {
      const db = getDb();
      db.estaciones.pop();
      expect(db.estaciones.length).toBe(1);
      reiniciarDb();
      expect(getDb().estaciones.length).toBe(2);
    });
  });

  describe('Operaciones transaccionales coherentes', () => {
    it('registrarTransaccion en efectivo: suma al turno y genera registro de auditoría', () => {
      const db = getDb();
      const turnoInicial = db.turnos.find((t) => t.id_turno === 9)!;
      const recaudadoAntes = turnoInicial.total_recaudado_efectivo;
      const auditoriasAntes = db.auditorias.length;

      const res = db.registrarTransaccion({
        id_turno: 9,
        id_tarifa: 1,
        id_categoria: 1,
        placa_detectada: 'HKL123',
        monto_tarifa: 10500,
        metodo_pago: 'EFECTIVO',
      });

      expect(res.transaccion.numero_ticket).toContain('TCK-');
      expect(turnoInicial.total_recaudado_efectivo).toBe(recaudadoAntes + 10500);
      expect(db.auditorias.length).toBe(auditoriasAntes + 1);
      expect(db.auditorias[0]!.tipo_operacion).toBe('INSERT');
    });

    it('registrarTransaccion en telepeaje: descuenta saldo, crea detalle y genera auditoría', () => {
      const db = getDb();
      const cuenta = db.cuentas_telepeaje.find((c) => c.placa_vehiculo === 'HKL123')!;
      const saldoAntes = cuenta.saldo_disponible;

      const res = db.registrarTransaccion({
        id_turno: 10,
        id_tarifa: 1,
        id_categoria: 1,
        placa_detectada: 'HKL123',
        monto_tarifa: 10500,
        metodo_pago: 'TELEPEAJE',
      });

      expect(cuenta.saldo_disponible).toBe(saldoAntes - 10500);
      expect(res.detalleTelepeaje).toBeDefined();
      expect(res.detalleTelepeaje?.saldo_anterior).toBe(saldoAntes);
      expect(res.detalleTelepeaje?.saldo_posterior).toBe(saldoAntes - 10500);
    });

    it('registrarTransaccion en telepeaje: rechaza cuenta suspendida', () => {
      const db = getDb();
      expect(() =>
        db.registrarTransaccion({
          id_turno: 10,
          id_tarifa: 5,
          id_categoria: 5,
          placa_detectada: 'ZXC987',
          monto_tarifa: 31500,
          metodo_pago: 'TELEPEAJE',
        }),
      ).toThrow(/SUSPENDIDA/);
    });

    it('registrarTransaccion en telepeaje: rechaza saldo insuficiente', () => {
      const db = getDb();
      expect(() =>
        db.registrarTransaccion({
          id_turno: 10,
          id_tarifa: 3,
          id_categoria: 3,
          placa_detectada: 'QWE321',
          monto_tarifa: 15300,
          metodo_pago: 'TELEPEAJE',
        }),
      ).toThrow(/Saldo insuficiente/);
    });

    it('registrarTransaccion: rechaza registrar pasos en un turno cerrado', () => {
      const db = getDb();
      expect(() =>
        db.registrarTransaccion({
          id_turno: 1, // Turno 1 está CERRADO en la semilla
          id_tarifa: 1,
          id_categoria: 1,
          placa_detectada: 'HKL123',
          monto_tarifa: 10500,
          metodo_pago: 'EFECTIVO',
        }),
      ).toThrow(/turno está cerrado/);
    });

    it('cerrarTurno: fija monto declarado, calcula descuadre y marca CERRADO', () => {
      const db = getDb();
      // Turno 9 tiene total_recaudado_efectivo = 10500
      const turnoCerrado = db.cerrarTurno(9, 10000);
      expect(turnoCerrado.estado).toBe('CERRADO');
      expect(turnoCerrado.total_declarado_cierre).toBe(10000);
      expect(turnoCerrado.diferencia_descuadre).toBe(-500); // 10.000 - 10.500 = -500 FALTANTE
    });

    it('cerrarTurno: rechaza cerrar un turno que ya está cerrado', () => {
      const db = getDb();
      expect(() => db.cerrarTurno(1, 315000)).toThrow(/ya se encuentra cerrado/);
    });

    it('anularTransaccion: registra evento VOID en auditoría sin modificar registros previos de auditoría', () => {
      const db = getDb();
      const res = db.anularTransaccion(1, 'supervisor_test', 'Cobro duplicado por error');
      expect(res.auditoria.tipo_operacion).toBe('VOID');
      expect(res.auditoria.usuario_sistema).toBe('supervisor_test');
      expect(res.auditoria.motivo).toBe('Cobro duplicado por error');
    });

    it('guardarTarifa: desactiva la tarifa previa activa y conserva el historial', () => {
      const db = getDb();
      const tarifaPrevia = db.tarifas.find((t) => t.id_estacion === 1 && t.id_categoria === 1 && t.activa)!;
      expect(tarifaPrevia.activa).toBe(true);

      const nueva = db.guardarTarifa({
        id_estacion: 1,
        id_categoria: 1,
        monto: 11000,
        resolucion_legal: 'Res. 0099/2026',
        fecha_inicio_vigencia: '2026-11-01',
      });

      expect(nueva.activa).toBe(true);
      expect(nueva.monto).toBe(11000);
      expect(tarifaPrevia.activa).toBe(false);
      expect(tarifaPrevia.fecha_fin_vigencia).toBe('2026-11-01');
    });

    it('inmutabilidad: actualizarAuditoria y eliminarAuditoria arrojan error por restricción legal', () => {
      const db = getDb();
      expect(() => db.actualizarAuditoria()).toThrow(/trg_auditoria_inmutable|append-only/);
      expect(() => db.eliminarAuditoria()).toThrow(/trg_auditoria_inmutable|append-only/);
    });
  });

  describe('Control de estados (?mock=vacio|error|lento)', () => {
    it('obtenerModoMock detecta los modos desde URL o sesión', () => {
      expect(obtenerModoMock('http://localhost:5181/api/turnos?mock=vacio')).toBe('vacio');
      expect(obtenerModoMock('http://localhost:5181/api/turnos?mock=error')).toBe('error');
      expect(obtenerModoMock('http://localhost:5181/api/turnos?mock=lento')).toBe('lento');
      expect(obtenerModoMock('http://localhost:5181/api/turnos')).toBe('normal');
    });

    it('procesarControlLectura con mock=error devuelve HTTP 500 con formato del contrato', async () => {
      const req = new Request('http://localhost:5181/api/estaciones?mock=error');
      const res = await procesarControlLectura(req, true);
      expect(res.errorResponse).toBeDefined();
      expect(res.errorResponse?.status).toBe(500);

      const body = await res.errorResponse?.json();
      expect(body.error.codigo).toBe('ERROR_SIMULADO');
      expect(body.error.mensaje).toContain('Error de servidor simulado');
    });

    it('procesarControlLectura con mock=vacio devuelve indicador esVacio: true', async () => {
      const req = new Request('http://localhost:5181/api/estaciones?mock=vacio');
      const res = await procesarControlLectura(req, true);
      expect(res.errorResponse).toBeUndefined();
      expect(res.esVacio).toBe(true);
    });

    it('procesarControlLectura en modo normal devuelve esVacio: false', async () => {
      const req = new Request('http://localhost:5181/api/estaciones');
      const res = await procesarControlLectura(req, true);
      expect(res.errorResponse).toBeUndefined();
      expect(res.esVacio).toBe(false);
    });
  });
});
