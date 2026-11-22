import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, reiniciarDb } from '@/mocks/db';
import { diaBogota } from '@/mocks/handlers/recaudo.handlers';

const BASE = 'http://localhost:3000/api';

interface Carril {
  id_caseta: number;
  numero_carril: number;
  tipo_carril: string;
  veh: number;
  ef: number;
  tag: number;
  total: number;
}

describe('MSW: GET /api/recaudo (imita a la API real)', () => {
  beforeEach(() => reiniciarDb());

  it('diaBogota convierte el instante al día civil de Bogotá (UTC-5)', () => {
    expect(diaBogota('2026-11-22T00:43:00.000Z')).toBe('2026-11-21');
    expect(diaBogota('2026-11-22T05:30:00.000Z')).toBe('2026-11-22');
    expect(diaBogota('2026-10-01T07:15:00-05:00')).toBe('2026-10-01');
  });

  it('devuelve el desglose por carril con la forma del esquema y sin anuladas', async () => {
    const db = getDb();
    const turno0 = db.turnos[0]!;
    const idCaseta = turno0.id_caseta;
    const idTurno = turno0.id_turno;
    const base = {
      id_turno: idTurno,
      id_tarifa: 1,
      id_categoria: 1,
      placa_detectada: null,
      estado_paso: 'APROBADO' as const,
    };
    // 19:43 Bogotá del 21 (UTC ya es 22) y 00:30 Bogotá del 22.
    db.transacciones.push(
      {
        ...base,
        id_transaccion: 9001,
        monto_tarifa: 1000,
        metodo_pago: 'EFECTIVO',
        numero_ticket: 'T-9001',
        fecha_hora: '2031-05-11T00:43:00.000Z',
      },
      {
        ...base,
        id_transaccion: 9002,
        monto_tarifa: 2000,
        metodo_pago: 'TELEPEAJE',
        numero_ticket: 'T-9002',
        fecha_hora: '2031-05-11T00:50:00.000Z',
      },
      {
        ...base,
        id_transaccion: 9003,
        monto_tarifa: 4000,
        metodo_pago: 'EFECTIVO',
        numero_ticket: 'T-9003',
        fecha_hora: '2031-05-11T01:00:00.000Z',
      },
      {
        ...base,
        id_transaccion: 9004,
        monto_tarifa: 8000,
        metodo_pago: 'EFECTIVO',
        numero_ticket: 'T-9004',
        fecha_hora: '2031-05-11T05:30:00.000Z',
      },
    );
    db.auditorias.push({
      id_auditoria: 9999,
      id_transaccion: 9003,
      tipo_operacion: 'VOID',
      usuario_sistema: 'REC-001',
      motivo: 'duplicado',
      fecha_hora_evento: '2031-05-11T01:10:00.000Z',
    } as never);

    const dia10 = await (
      await fetch(`${BASE}/recaudo?fecha=2031-05-10`)
    ).json();
    const dia11 = await (
      await fetch(`${BASE}/recaudo?fecha=2031-05-11`)
    ).json();

    expect(dia10.total_general).toBe(3000);
    expect(dia10.dias).toEqual([
      { fecha: '2031-05-10', veh: 2, ef: 1000, tag: 2000, total: 3000 },
    ]);
    const carril = (dia10.carriles as Carril[]).find(
      (c) => c.id_caseta === idCaseta,
    );
    expect(carril).toMatchObject({ veh: 2, ef: 1000, tag: 2000, total: 3000 });
    expect(carril?.tipo_carril).toBeTruthy();
    expect(dia11.total_general).toBe(8000);
  });

  it('sin filtros trae carriles no vacíos', async () => {
    const data = await (await fetch(`${BASE}/recaudo`)).json();

    expect(data.carriles.length).toBeGreaterThan(0);
  });
});
