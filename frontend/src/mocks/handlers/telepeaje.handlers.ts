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
];
