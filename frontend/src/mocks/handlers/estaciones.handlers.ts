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
    const estacionParam = url.searchParams.get('estacion');
    const db = getDb();

    if (estacionParam) {
      const idEstacion = parseInt(estacionParam, 10);
      return HttpResponse.json(db.casetas.filter((c) => c.id_estacion === idEstacion));
    }

    return HttpResponse.json(db.casetas);
  }),
];
