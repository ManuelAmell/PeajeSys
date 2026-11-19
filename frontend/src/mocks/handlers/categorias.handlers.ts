import { http, HttpResponse } from 'msw';
import { esquemaCategoriaVehiculoNueva } from '@/types';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

export const categoriasHandlers = [
  http.get('/api/categorias', async ({ request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json([]);

    const db = getDb();
    return HttpResponse.json(db.categorias);
  }),

  http.post('/api/categorias', async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { error: { codigo: 'CUERPO_INVALIDO', mensaje: 'JSON inválido' } },
        { status: 400 },
      );
    }

    const parse = esquemaCategoriaVehiculoNueva.safeParse(body);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'ERROR_VALIDACION',
            mensaje: 'Datos de categoría inválidos según el DDL.',
            campos: Object.fromEntries(
              parse.error.issues.map((i) => [i.path.join('.'), i.message]),
            ),
          },
        },
        { status: 422 },
      );
    }

    const db = getDb();
    const existe = db.categorias.some((c) => c.codigo === parse.data.codigo);
    if (existe) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'CODIGO_DUPLICADO',
            mensaje: `Ya existe una categoría con el código ${parse.data.codigo}.`,
          },
        },
        { status: 409 },
      );
    }

    const nuevoId = db.categorias.reduce((max, c) => Math.max(max, c.id_categoria), 0) + 1;
    const nuevaCategoria = {
      id_categoria: nuevoId,
      ...parse.data,
      peso_maximo_ton: parse.data.peso_maximo_ton ?? null,
      activo: parse.data.activo ?? true,
    };

    db.categorias.push(nuevaCategoria);
    return HttpResponse.json(nuevaCategoria, { status: 201 });
  }),

  http.patch('/api/categorias/:id', async ({ params, request }) => {
    const id = parseInt(String(params.id), 10);
    const db = getDb();
    const cat = db.categorias.find((c) => c.id_categoria === id);

    if (!cat) {
      return HttpResponse.json(
        { error: { codigo: 'CATEGORIA_NO_ENCONTRADA', mensaje: `Categoría ${id} no encontrada.` } },
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

    if (body.descripcion !== undefined) cat.descripcion = String(body.descripcion);
    if (body.activo !== undefined) cat.activo = Boolean(body.activo);
    if (body.peso_maximo_ton !== undefined) {
      cat.peso_maximo_ton = body.peso_maximo_ton === null ? null : Number(body.peso_maximo_ton);
    }

    return HttpResponse.json(cat);
  }),
];
