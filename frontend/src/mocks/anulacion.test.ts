import { describe, expect, it } from 'vitest';
import { getDb } from '@/mocks/db';
import { tokenFalso } from '@/mocks/token';

const BASE = 'http://localhost:3000/api';

interface FilaTx {
  id_transaccion: number;
  anulada?: boolean;
}

const anular = (id: number, motivo: unknown, sub?: string) =>
  fetch(`${BASE}/transacciones/${id}/anulacion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sub ? { Authorization: `Bearer ${tokenFalso(sub)}` } : {}),
    },
    body: JSON.stringify({ motivo }),
  });

const turno = async (id: number) =>
  (await (await fetch(`${BASE}/turnos/${id}`)).json()) as {
    total_recaudado_efectivo: number;
  };

describe('MSW: anulación de transacciones (imita a la API real)', () => {
  it('el listado de un turno incluye siempre anulada (booleano)', async () => {
    const lista = (await (
      await fetch(`${BASE}/turnos/9/transacciones`)
    ).json()) as FilaTx[];

    expect(lista.length).toBeGreaterThan(0);
    expect(lista.every((t) => t.anulada === false)).toBe(true);
  });

  it('anular en efectivo marca anulada y resta el monto del recaudo del turno', async () => {
    const antes = (await turno(9)).total_recaudado_efectivo;

    const res = await anular(11, 'Cobro duplicado');

    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    expect(cuerpo.auditoria.tipo_operacion).toBe('VOID');
    expect(cuerpo.auditoria.motivo).toBe('Cobro duplicado');
    expect((await turno(9)).total_recaudado_efectivo).toBe(antes - 10500);
    const lista = (await (
      await fetch(`${BASE}/turnos/9/transacciones`)
    ).json()) as FilaTx[];
    expect(lista.find((t) => t.id_transaccion === 11)?.anulada).toBe(true);
  });

  it('anular por telepeaje devuelve el saldo a la cuenta y no toca el recaudo', async () => {
    const db = getDb();
    const cuenta = db.cuentas_telepeaje.find(
      (c) => c.placa_vehiculo === 'KJN456',
    )!;
    const saldoAntes = cuenta.saldo_disponible;
    const { transaccion } = db.registrarTransaccion({
      id_turno: 9,
      id_tarifa: 1,
      id_categoria: 1,
      placa_detectada: 'KJN456',
      monto_tarifa: 10500,
      metodo_pago: 'TELEPEAJE',
      estado_paso: 'APROBADO',
      usuario_sistema: 'EMP-002',
    });
    const recaudoAntes = (await turno(9)).total_recaudado_efectivo;

    const res = await anular(transaccion.id_transaccion, 'Lectura errónea');

    expect(res.status).toBe(200);
    expect(
      db.cuentas_telepeaje.find((c) => c.placa_vehiculo === 'KJN456')!
        .saldo_disponible,
    ).toBe(saldoAntes);
    expect((await turno(9)).total_recaudado_efectivo).toBe(recaudoAntes);
  });

  it('409 TRANSACCION_YA_ANULADA en la segunda anulación', async () => {
    await anular(11, 'Primera');
    const res = await anular(11, 'Segunda');

    expect(res.status).toBe(409);
    expect((await res.json()).error.codigo).toBe('TRANSACCION_YA_ANULADA');
  });

  it('409 TURNO_CERRADO si la transacción es de un turno cerrado', async () => {
    const res = await anular(1, 'Motivo');

    expect(res.status).toBe(409);
    expect((await res.json()).error.codigo).toBe('TURNO_CERRADO');
  });

  it('422 MOTIVO_REQUERIDO si falta o es solo espacios', async () => {
    for (const motivo of [undefined, '   ']) {
      const res = await anular(11, motivo);
      expect(res.status).toBe(422);
      expect((await res.json()).error.codigo).toBe('MOTIVO_REQUERIDO');
    }
  });

  it('422 MOTIVO_DEMASIADO_LARGO con más de 255 caracteres y 200 con exactamente 255', async () => {
    const largo = await anular(11, 'm'.repeat(256));
    expect(largo.status).toBe(422);
    expect((await largo.json()).error.codigo).toBe('MOTIVO_DEMASIADO_LARGO');

    expect((await anular(11, 'm'.repeat(255))).status).toBe(200);
  });

  it('404 TRANSACCION_NO_ENCONTRADA', async () => {
    const res = await anular(99999, 'Motivo');

    expect(res.status).toBe(404);
    expect((await res.json()).error.codigo).toBe('TRANSACCION_NO_ENCONTRADA');
  });

  it('403 TURNO_AJENO si un recaudador anula en el turno de otro; el dueño y el supervisor sí pueden', async () => {
    // Turno 9 es del operador 2 (RECAUDADOR). El operador 1 es otro RECAUDADOR; el 3 es SUPERVISOR.
    const ajeno = await anular(11, 'Motivo', '1');
    expect(ajeno.status).toBe(403);
    expect((await ajeno.json()).error.codigo).toBe('TURNO_AJENO');

    expect((await anular(11, 'Motivo', '2')).status).toBe(200);
    const db = getDb();
    const { transaccion } = db.registrarTransaccion({
      id_turno: 9,
      id_tarifa: 1,
      id_categoria: 1,
      placa_detectada: 'ABC123',
      monto_tarifa: 10500,
      metodo_pago: 'EFECTIVO',
      estado_paso: 'APROBADO',
      usuario_sistema: 'EMP-002',
    });
    expect(
      (await anular(transaccion.id_transaccion, 'Motivo', '3')).status,
    ).toBe(200);
  });
});
