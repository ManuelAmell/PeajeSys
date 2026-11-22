import { http, HttpResponse } from 'msw';
import { normalizarPlaca } from '@/api/dominio/placa';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

export const telepeajeHandlers = [
  http.get('/api/cuentas-telepeaje', async ({ request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json([]);

    const url = new URL(request.url);
    const estado = url.searchParams.get('estado');
    const q = url.searchParams.get('q')?.trim().toUpperCase();

    const db = getDb();
    let lista = [...db.cuentas_telepeaje];

    if (estado) {
      lista = lista.filter((c) => c.estado_cuenta === estado);
    }
    if (q) {
      lista = lista.filter(
        (c) => c.placa_vehiculo.toUpperCase().includes(q) || c.tag_rfid_serial.toUpperCase().includes(q),
      );
    }

    return HttpResponse.json(lista);
  }),

  http.get('/api/cuentas-telepeaje/por-placa/:placa', async ({ params, request }) => {
    const { errorResponse } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;

    const placaNorm = normalizarPlaca(String(params.placa));
    const db = getDb();

    const cuenta = db.cuentas_telepeaje.find((c) => c.placa_vehiculo.toUpperCase() === placaNorm);
    if (!cuenta) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'CUENTA_NO_ENCONTRADA',
            mensaje: `No existe cuenta de telepeaje asociada a la placa ${placaNorm}.`,
          },
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(cuenta);
  }),

  http.post('/api/telepeaje/recargar', async ({ request }) => {
    let cuerpo: Record<string, unknown> = {};
    try {
      cuerpo = (await request.json()) as Record<string, unknown>;
    } catch {
      return HttpResponse.json(
        { error: { codigo: 'CUERPO_INVALIDO', mensaje: 'JSON inválido' } },
        { status: 400 },
      );
    }

    const monto = Number(cuerpo.monto ?? cuerpo.valor_recarga ?? 0);
    if (!Number.isFinite(monto) || monto <= 0) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'MONTO_INVALIDO',
            mensaje: 'El monto de la recarga debe ser mayor a cero.',
          },
        },
        { status: 422 },
      );
    }

    const placa = normalizarPlaca(
      String(cuerpo.placa_vehiculo ?? cuerpo.placa ?? ''),
    );
    const serial = String(cuerpo.tag_rfid_serial ?? cuerpo.tag ?? '')
      .trim()
      .toUpperCase();
    const db = getDb();
    const cuenta = db.cuentas_telepeaje.find(
      (c) =>
        (placa && c.placa_vehiculo.toUpperCase() === placa) ||
        (serial && c.tag_rfid_serial.toUpperCase() === serial),
    );
    if (!cuenta) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'CUENTA_NO_ENCONTRADA',
            mensaje:
              'No existe una cuenta de telepeaje para la placa o el tag indicado.',
          },
        },
        { status: 404 },
      );
    }

    const saldoAnterior = cuenta.saldo_disponible;
    cuenta.saldo_disponible = saldoAnterior + monto;
    return HttpResponse.json({
      id_cuenta: cuenta.id_cuenta,
      placa_vehiculo: cuenta.placa_vehiculo,
      tag_rfid_serial: cuenta.tag_rfid_serial,
      saldo_anterior: saldoAnterior,
      saldo_nuevo: cuenta.saldo_disponible,
      monto_recargado: monto,
      fecha_hora: new Date().toISOString(),
      mensaje: 'Recarga procesada exitosamente.',
    });
  }),
];
