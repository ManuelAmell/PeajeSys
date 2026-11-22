import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { ErrorApi } from '@/api/clienteHttp';
import {
  esquemaRecargaTelepeaje,
  recargarCuentaTelepeaje,
} from './telepeaje';
import { esquemaArqueoTurno, obtenerArqueoTurno } from './turnos';

describe('recargarCuentaTelepeaje (POST /api/telepeaje/recargar)', () => {
  it('envía placa y monto y valida la respuesta con zod', async () => {
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.post('*/api/telepeaje/recargar', async ({ request }) => {
        cuerpo = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id_cuenta: 1,
          placa_vehiculo: 'ABC123',
          tag_rfid_serial: 'TAG-1',
          saldo_anterior: 1000,
          saldo_nuevo: 51000,
          monto_recargado: 50000,
          fecha_hora: '2026-11-21T20:00:00Z',
          mensaje: 'Recarga procesada exitosamente.',
        });
      }),
    );

    const r = await recargarCuentaTelepeaje({ placa: 'abc 123', monto: 50000 });

    expect(cuerpo).toEqual({ placa_vehiculo: 'ABC123', monto: 50000 });
    expect(r.saldo_nuevo).toBe(51000);
    expect(esquemaRecargaTelepeaje.safeParse(r).success).toBe(true);
  });

  it('con MSW por defecto suma al saldo de la cuenta', async () => {
    const r = await recargarCuentaTelepeaje({ placa: 'ABC123', monto: 20000 });
    expect(r.monto_recargado).toBe(20000);
    expect(r.saldo_nuevo).toBe(r.saldo_anterior + 20000);
  });

  it('propaga el 404 de cuenta inexistente como ErrorApi', async () => {
    await expect(recargarCuentaTelepeaje({ placa: 'ZZZ999', monto: 1000 })).rejects.toBeInstanceOf(ErrorApi);
  });

  it('rechaza una respuesta que no cumple el esquema', async () => {
    server.use(http.post('*/api/telepeaje/recargar', () => HttpResponse.json({ id_cuenta: 'x' })));
    await expect(recargarCuentaTelepeaje({ placa: 'ABC123', monto: 1000 })).rejects.toBeDefined();
  });
});

describe('obtenerArqueoTurno (GET /api/turnos/{id}/arqueo)', () => {
  it('pasa efectivo_reportado y valida el DTO real', async () => {
    let consulta = '';
    server.use(
      http.get('*/api/turnos/:id/arqueo', ({ request }) => {
        consulta = new URL(request.url).search;
        return HttpResponse.json({
          id_turno: 2,
          id_operador: 2,
          id_caseta: 1,
          efectivo_sistema: 100000,
          efectivo_reportado: 90000,
          diferencia: -10000,
          estado_arqueo: 'FALTANTE',
          total_vehiculos: 12,
        });
      }),
    );

    const a = await obtenerArqueoTurno(2, 90000);

    expect(consulta).toBe('?efectivo_reportado=90000');
    expect(a.estado_arqueo).toBe('FALTANTE');
    expect(esquemaArqueoTurno.safeParse(a).success).toBe(true);
  });

  it('con MSW por defecto calcula diferencia y estado', async () => {
    const a = await obtenerArqueoTurno(2, 0);
    expect(a.id_turno).toBe(2);
    expect(a.diferencia).toBe(a.efectivo_reportado - a.efectivo_sistema);
    expect(['CUADRADO', 'FALTANTE', 'SOBRANTE']).toContain(a.estado_arqueo);
  });

  it('un turno inexistente da ErrorApi 404', async () => {
    await expect(obtenerArqueoTurno(99999, 0)).rejects.toMatchObject({ estado: 404 });
  });
});
