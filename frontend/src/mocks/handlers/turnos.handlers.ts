import { http, HttpResponse } from 'msw';
import { esquemaTurnoCierre } from '@/types';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

/** Id del operador (claim sub) del token Bearer de la petición, o null si falta o no es válido. */
function idOperadorDelToken(request: Request): number | null {
  const cabecera = request.headers.get('authorization');
  const token = cabecera?.replace(/^Bearer\s+/i, '');
  const partes = token?.split('.');
  if (!partes || partes.length < 2 || !partes[1]) return null;
  try {
    const payload = JSON.parse(
      atob(partes[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { sub?: string; nameid?: string };
    const id = parseInt(String(payload.sub ?? payload.nameid ?? ''), 10);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

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

    // Igual que la API: un RECAUDADOR (rol deducido del sub del token) solo recibe sus turnos,
    // ignorando operador=. Sin token válido no se acota (las rutas protegidas lo exigen en la API real).
    const idActor = idOperadorDelToken(request);
    const actor =
      idActor === null
        ? undefined
        : db.operadores.find((o) => o.id_operador === idActor);
    const soloPropios = actor?.rol === 'RECAUDADOR';
    if (soloPropios) {
      lista = lista.filter((t) => t.id_operador === actor.id_operador);
    }

    if (estado) {
      lista = lista.filter((t) => t.estado === estado);
    }
    if (fecha) {
      lista = lista.filter((t) => t.fecha === fecha);
    }
    if (estacion) {
      const idEst = parseInt(estacion, 10);
      const casetasEstacion = db.casetas
        .filter((c) => c.id_estacion === idEst)
        .map((c) => c.id_caseta);
      lista = lista.filter((t) => casetasEstacion.includes(t.id_caseta));
    }
    if (operadorCod && !soloPropios) {
      const op = db.operadores.find(
        (o) => o.codigo_empleado.toUpperCase() === operadorCod,
      );
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
        {
          error: {
            codigo: 'TURNO_NO_ENCONTRADO',
            mensaje: `Turno ${id} no encontrado.`,
          },
        },
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
        {
          error: {
            codigo: 'TURNO_NO_ENCONTRADO',
            mensaje: `Turno ${id} no encontrado.`,
          },
        },
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
      const turnoCerrado = db.cerrarTurno(
        id,
        parse.data.total_declarado_cierre,
      );
      return HttpResponse.json(turnoCerrado, { status: 200 });
    } catch (err) {
      return HttpResponse.json(
        { error: { codigo: 'ERROR_CIERRE', mensaje: (err as Error).message } },
        { status: 400 },
      );
    }
  }),

  http.post('/api/turnos/abrir', async ({ request }) => {
    // Igual que la API: el turno se abre siempre a nombre del operador del token;
    // el id_operador del cuerpo se ignora.
    const idOperador = idOperadorDelToken(request);
    if (idOperador === null) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'NO_AUTENTICADO',
            mensaje: 'Token JWT ausente, expirado o inválido.',
          },
        },
        { status: 401 },
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return HttpResponse.json(
        {
          error: {
            codigo: 'CUERPO_INVALIDO',
            mensaje: 'El cuerpo de la petición debe ser un JSON válido.',
          },
        },
        { status: 400 },
      );
    }

    const idCaseta = Number(body?.id_caseta ?? 0);
    const fondoInicial = Number(body?.fondo_inicial_caja ?? 0);
    const diurno = body?.diurno !== undefined ? Boolean(body.diurno) : true;

    if (!idCaseta || idCaseta <= 0) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'CASETA_REQUERIDA',
            mensaje: 'El identificador de caseta es invalido.',
          },
        },
        { status: 400 },
      );
    }

    if (fondoInicial < 0) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'ERROR_VALIDACION',
            mensaje: 'El fondo inicial de caja no puede ser negativo.',
            campos: { fondo_inicial_caja: 'Debe ser mayor o igual a 0.' },
          },
        },
        { status: 422 },
      );
    }

    const db = getDb();

    // Regla: caseta sin turno ABIERTO
    const casetaOcupada = db.turnos.some(
      (t) => t.id_caseta === idCaseta && t.estado === 'ABIERTO',
    );
    if (casetaOcupada) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'CASETA_OCUPADA',
            mensaje: 'La caseta ya tiene un turno ABIERTO.',
          },
        },
        { status: 409 },
      );
    }

    // Regla: operador sin turno ABIERTO
    const operadorActivo = db.turnos.some(
      (t) => t.id_operador === idOperador && t.estado === 'ABIERTO',
    );
    if (operadorActivo) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'OPERADOR_CON_TURNO_ACTIVO',
            mensaje: 'El operador ya tiene un turno ABIERTO en el sistema.',
          },
        },
        { status: 409 },
      );
    }

    const nuevoTurno = db.abrirTurno({
      id_caseta: idCaseta,
      id_operador: idOperador,
      fondo_inicial_caja: fondoInicial,
      diurno,
    });

    return HttpResponse.json(nuevoTurno, { status: 201 });
  }),
];
