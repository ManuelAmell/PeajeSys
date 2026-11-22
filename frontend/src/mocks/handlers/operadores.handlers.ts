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

  http.get('/api/operadores/:id', async ({ params, request }) => {
    const { errorResponse } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;

    const id = parseInt(String(params.id), 10);
    const db = getDb();
    const op = db.operadores.find((o) => o.id_operador === id);

    if (!op) {
      return HttpResponse.json(
        { error: { codigo: 'OPERADOR_NO_ENCONTRADO', mensaje: `Operador ${id} no encontrado.` } },
        { status: 404 },
      );
    }

    return HttpResponse.json(op);
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
    // Igual que la API: primero el código, después el documento; ambos dan 409 OPERADOR_DUPLICADO.
    const codigo = parse.data.codigo_empleado.trim().toUpperCase();
    if (db.operadores.some((o) => o.codigo_empleado.toUpperCase() === codigo)) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'OPERADOR_DUPLICADO',
            mensaje: `Ya existe un operador con el codigo de empleado '${codigo}'.`,
          },
        },
        { status: 409 },
      );
    }
    if (
      db.operadores.some(
        (o) => o.numero_documento === parse.data.numero_documento,
      )
    ) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'OPERADOR_DUPLICADO',
            mensaje: `Ya existe un operador con el numero de documento '${parse.data.numero_documento}'.`,
          },
        },
        { status: 409 },
      );
    }

    // La contraseña se valida pero no se guarda ni se devuelve (la API real solo guarda el hash).
    const { password: _clave, ...datosPublicos } = parse.data;
    void _clave;
    const nuevoId =
      db.operadores.reduce((max, o) => Math.max(max, o.id_operador), 0) + 1;
    const nuevoOperador = {
      ...datosPublicos,
      id_operador: nuevoId,
      codigo_empleado: codigo,
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

    const error422 = (codigo: string, mensaje: string) =>
      HttpResponse.json({ error: { codigo, mensaje } }, { status: 422 });
    const roles = ['RECAUDADOR', 'SUPERVISOR', 'ADMINISTRADOR'];

    // Actualización parcial: se valida todo lo presente antes de aplicar nada.
    if (
      body.estado !== undefined &&
      body.estado !== 'ACTIVO' &&
      body.estado !== 'INACTIVO'
    ) {
      return error422(
        'ESTADO_INVALIDO',
        'El estado debe ser ACTIVO o INACTIVO.',
      );
    }
    if (body.rol !== undefined && !roles.includes(String(body.rol))) {
      return error422(
        'ROL_INVALIDO',
        'El rol debe ser RECAUDADOR, SUPERVISOR o ADMINISTRADOR.',
      );
    }
    for (const campo of ['nombres', 'apellidos'] as const) {
      const valor = body[campo];
      if (
        valor !== undefined &&
        (typeof valor !== 'string' || valor.trim() === '' || valor.length > 100)
      ) {
        return error422('ERROR_VALIDACION', `El campo ${campo} es invalido.`);
      }
    }
    if (
      body.password !== undefined &&
      (typeof body.password !== 'string' || body.password.trim() === '')
    ) {
      return error422(
        'ERROR_VALIDACION',
        'La contrasena no puede estar vacia.',
      );
    }

    if (body.estado !== undefined)
      op.estado = body.estado as 'ACTIVO' | 'INACTIVO';
    if (body.nombres !== undefined) op.nombres = String(body.nombres).trim();
    if (body.apellidos !== undefined)
      op.apellidos = String(body.apellidos).trim();
    if (body.rol !== undefined)
      op.rol = body.rol as 'RECAUDADOR' | 'SUPERVISOR' | 'ADMINISTRADOR';
    // password: se acepta y se descarta; nunca se devuelve.

    return HttpResponse.json(op);
  }),
];
