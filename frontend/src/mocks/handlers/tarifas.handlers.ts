import { http, HttpResponse } from 'msw';
import { esquemaTarifaNueva } from '@/types';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

export const tarifasHandlers = [
  http.get('/api/tarifas', async ({ request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json([]);

    const url = new URL(request.url);
    const estacion = url.searchParams.get('estacion');
    const categoria = url.searchParams.get('categoria');
    const vigente = url.searchParams.get('vigente');

    const db = getDb();
    let lista = [...db.tarifas];

    if (estacion) {
      const idEst = parseInt(estacion, 10);
      lista = lista.filter((t) => t.id_estacion === idEst);
    }
    if (categoria) {
      const idCat = parseInt(categoria, 10);
      lista = lista.filter((t) => t.id_categoria === idCat);
    }
    if (vigente === 'true') {
      lista = lista.filter((t) => t.activa);
    } else if (vigente === 'false') {
      lista = lista.filter((t) => !t.activa);
    }

    return HttpResponse.json(lista);
  }),

  http.post('/api/tarifas', async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { error: { codigo: 'CUERPO_INVALIDO', mensaje: 'JSON inválido' } },
        { status: 400 },
      );
    }

    const parse = esquemaTarifaNueva.safeParse(body);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'ERROR_VALIDACION',
            mensaje: 'Datos de tarifa inválidos según el DDL.',
            campos: Object.fromEntries(
              parse.error.issues.map((i) => [i.path.join('.'), i.message]),
            ),
          },
        },
        { status: 422 },
      );
    }

    const db = getDb();
    const nuevaTarifa = db.guardarTarifa({
      id_estacion: parse.data.id_estacion,
      id_categoria: parse.data.id_categoria,
      monto: parse.data.monto,
      resolucion_legal: parse.data.resolucion_legal ?? 'Resolución no especificada',
      fecha_inicio_vigencia: parse.data.fecha_inicio_vigencia,
      fecha_fin_vigencia: parse.data.fecha_fin_vigencia ?? null,
    });

    return HttpResponse.json(nuevaTarifa, { status: 201 });
  }),

  http.patch('/api/tarifas/:id', async ({ params, request }) => {
    const id = parseInt(String(params.id), 10);
    const db = getDb();
    const tarifa = db.tarifas.find((t) => t.id_tarifa === id);

    if (!tarifa) {
      return HttpResponse.json(
        { error: { codigo: 'TARIFA_NO_ENCONTRADA', mensaje: `Tarifa ${id} no encontrada.` } },
        { status: 404 },
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return HttpResponse.json(
        { error: { codigo: 'CUERPO_INVALIDO', mensaje: 'JSON inválido' } },
        { status: 400 },
      );
    }

    if (body.monto !== undefined) tarifa.monto = Number(body.monto);
    if (body.activa !== undefined) tarifa.activa = Boolean(body.activa);
    if (body.fecha_fin_vigencia !== undefined) {
      tarifa.fecha_fin_vigencia = body.fecha_fin_vigencia ? String(body.fecha_fin_vigencia) : null;
    }
    if (body.resolucion_legal !== undefined) {
      tarifa.resolucion_legal = String(body.resolucion_legal);
    }

    return HttpResponse.json(tarifa);
  }),
];
