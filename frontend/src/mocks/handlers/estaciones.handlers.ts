import { http, HttpResponse } from 'msw';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

export const estacionesHandlers = [
  http.get('/api/estaciones', async ({ request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json([]);

    const db = getDb();
    return HttpResponse.json(db.estaciones);
  }),

  http.get('/api/casetas', async ({ request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json([]);

    const url = new URL(request.url);
    const estacionParam = url.searchParams.get('estacion') || url.searchParams.get('id_estacion');
    const db = getDb();
    // Igual que la API: ocupada = la caseta tiene un turno ABIERTO (sin exponer el turno).
    const ocupadas = new Set(
      db.turnos.filter((t) => t.estado === 'ABIERTO').map((t) => t.id_caseta),
    );
    const conOcupada = db.casetas.map((c) => ({ ...c, ocupada: ocupadas.has(c.id_caseta) }));

    if (estacionParam) {
      const idEstacion = parseInt(estacionParam, 10);
      return HttpResponse.json(conOcupada.filter((c) => c.id_estacion === idEstacion));
    }

    return HttpResponse.json(conOcupada);
  }),
];
