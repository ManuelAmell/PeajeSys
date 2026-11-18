import { http, HttpResponse } from 'msw';
import { esquemaOperadorNuevo } from '@/types';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

export const operadoresHandlers = [
  http.get('/api/operadores', async ({ request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json([]);

    const url = new URL(request.url);
    const rol = url.searchParams.get('rol');
    const estado = url.searchParams.get('estado');
    const q = url.searchParams.get('q')?.trim().toLowerCase();

    const db = getDb();
    let lista = [...db.operadores];

    if (rol) {
      lista = lista.filter((o) => o.rol === rol);
    }
    if (estado) {
      lista = lista.filter((o) => o.estado === estado);
    }
    if (q) {
      lista = lista.filter(
        (o) =>
          o.codigo_empleado.toLowerCase().includes(q) ||
          `${o.nombres} ${o.apellidos}`.toLowerCase().includes(q) ||
          o.numero_documento.includes(q),
      );
    }

    return HttpResponse.json(lista);
  }),

  http.post('/api/operadores', async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { error: { codigo: 'CUERPO_INVALIDO', mensaje: 'JSON inválido' } },
        { status: 400 },
      );
    }

    const parse = esquemaOperadorNuevo.safeParse(body);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'ERROR_VALIDACION',
            mensaje: 'Datos del operador no cumplen el esquema del DDL.',
            campos: Object.fromEntries(
              parse.error.issues.map((i) => [i.path.join('.'), i.message]),
            ),
          },
        },
        { status: 422 },
      );
    }

    const db = getDb();
    const existeDoc = db.operadores.some((o) => o.numero_documento === parse.data.numero_documento);
    if (existeDoc) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'DOCUMENTO_DUPLICADO',
            mensaje: `Ya existe un operador con el documento ${parse.data.numero_documento}.`,
          },
        },
        { status: 409 },
      );
    }

    const existeCod = db.operadores.some(
      (o) => o.codigo_empleado.toUpperCase() === parse.data.codigo_empleado.toUpperCase(),
    );
    if (existeCod) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'CODIGO_DUPLICADO',
            mensaje: `Ya existe un operador con el código ${parse.data.codigo_empleado}.`,
          },
        },
        { status: 409 },
      );
    }

    const nuevoId = db.operadores.reduce((max, o) => Math.max(max, o.id_operador), 0) + 1;
    const nuevoOperador = {
      id_operador: nuevoId,
      ...parse.data,
      estado: parse.data.estado ?? 'ACTIVO',
    };

    db.operadores.push(nuevoOperador);
    return HttpResponse.json(nuevoOperador, { status: 201 });
  }),

  http.patch('/api/operadores/:id', async ({ params, request }) => {
    const id = parseInt(String(params.id), 10);
    const db = getDb();
    const op = db.operadores.find((o) => o.id_operador === id);

    if (!op) {
      return HttpResponse.json(
        { error: { codigo: 'OPERADOR_NO_ENCONTRADO', mensaje: `Operador ${id} no encontrado.` } },
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

    if (body.estado !== undefined) {
      if (body.estado !== 'ACTIVO' && body.estado !== 'INACTIVO') {
        return HttpResponse.json(
          { error: { codigo: 'ESTADO_INVALIDO', mensaje: 'El estado debe ser ACTIVO o INACTIVO.' } },
          { status: 422 },
        );
      }
      op.estado = body.estado;
    }

    if (body.nombres !== undefined) op.nombres = String(body.nombres);
    if (body.apellidos !== undefined) op.apellidos = String(body.apellidos);
    if (body.rol !== undefined) {
      if (body.rol !== 'RECAUDADOR' && body.rol !== 'SUPERVISOR') {
        return HttpResponse.json(
          { error: { codigo: 'ROL_INVALIDO', mensaje: 'El rol debe ser RECAUDADOR o SUPERVISOR.' } },
          { status: 422 },
        );
      }
      op.rol = body.rol;
    }

    return HttpResponse.json(op);
  }),
];
