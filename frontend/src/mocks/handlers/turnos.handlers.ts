import { http, HttpResponse } from 'msw';
import { esquemaTurnoCierre } from '@/types';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

export const turnosHandlers = [
  http.get('/api/turnos', async ({ request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json([]);

    const url = new URL(request.url);
    const estado = url.searchParams.get('estado');
    const fecha = url.searchParams.get('fecha');
    const estacion = url.searchParams.get('estacion');
    const operadorCod = url.searchParams.get('operador')?.trim().toUpperCase();

    const db = getDb();
    let lista = [...db.turnos];

    if (estado) {
      lista = lista.filter((t) => t.estado === estado);
    }
    if (fecha) {
      lista = lista.filter((t) => t.fecha === fecha);
    }
    if (estacion) {
      const idEst = parseInt(estacion, 10);
      const casetasEstacion = db.casetas.filter((c) => c.id_estacion === idEst).map((c) => c.id_caseta);
      lista = lista.filter((t) => casetasEstacion.includes(t.id_caseta));
    }
    if (operadorCod) {
      const op = db.operadores.find((o) => o.codigo_empleado.toUpperCase() === operadorCod);
      if (op) {
        lista = lista.filter((t) => t.id_operador === op.id_operador);
      } else {
        return HttpResponse.json([]);
      }
    }

    return HttpResponse.json(lista);
  }),

  http.get('/api/turnos/:id', async ({ params, request }) => {
    const { errorResponse } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;

    const id = parseInt(String(params.id), 10);
    const db = getDb();
    const turno = db.turnos.find((t) => t.id_turno === id);

    if (!turno) {
      return HttpResponse.json(
        { error: { codigo: 'TURNO_NO_ENCONTRADO', mensaje: `Turno ${id} no encontrado.` } },
        { status: 404 },
      );
    }

    return HttpResponse.json(turno);
  }),

  http.get('/api/turnos/:id/transacciones', async ({ params, request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json([]);

    const id = parseInt(String(params.id), 10);
    const db = getDb();
    const transacciones = db.transacciones.filter((t) => t.id_turno === id);

    return HttpResponse.json(transacciones);
  }),

  http.post('/api/turnos/:id/cierre', async ({ params, request }) => {
    const id = parseInt(String(params.id), 10);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { error: { codigo: 'CUERPO_INVALIDO', mensaje: 'JSON inválido' } },
        { status: 400 },
      );
    }

    const parse = esquemaTurnoCierre.safeParse(body);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'ERROR_VALIDACION',
            mensaje: 'El total declarado debe ser un número mayor o igual a 0.',
            campos: Object.fromEntries(
              parse.error.issues.map((i) => [i.path.join('.'), i.message]),
            ),
          },
        },
        { status: 422 },
      );
    }

    const db = getDb();
    const turnoExistente = db.turnos.find((t) => t.id_turno === id);
    if (!turnoExistente) {
      return HttpResponse.json(
        { error: { codigo: 'TURNO_NO_ENCONTRADO', mensaje: `Turno ${id} no encontrado.` } },
        { status: 404 },
      );
    }

    if (turnoExistente.estado === 'CERRADO') {
      return HttpResponse.json(
        {
          error: {
            codigo: 'TURNO_YA_CERRADO',
            mensaje: `El turno ${id} ya fue cerrado previamente. Concurrencia no permitida.`,
          },
        },
        { status: 409 },
      );
    }

    try {
      const turnoCerrado = db.cerrarTurno(id, parse.data.total_declarado_cierre);
      return HttpResponse.json(turnoCerrado, { status: 200 });
    } catch (err) {
      return HttpResponse.json(
        { error: { codigo: 'ERROR_CIERRE', mensaje: (err as Error).message } },
        { status: 400 },
      );
    }
  }),
];
