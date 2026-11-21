import { http, HttpResponse } from 'msw';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

/**
 * Handlers de autenticación.
 * Mensajes de error y reglas idénticos a docs/diseno/claude-design/Login.dc.html:120-135.
 */
/** Token falso con formato JWT (tres segmentos base64url), como el de la API real. */
function tokenFalso(sub: string): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub })}.firma-simulada`;
}

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    // Control de simulación ?mock=error, igual que los handlers de lectura.
    const { errorResponse } = await procesarControlLectura(request);
    if (errorResponse) {
      return errorResponse;
    }

    let body: { codigo?: string; clave?: string } = {};
    try {
      body = (await request.json()) as { codigo?: string; clave?: string };
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

    const codigo = String(body.codigo || '').trim().toUpperCase();
    const clave = String(body.clave || '');

    // Validación 1: Código requerido (Login.dc.html:123)
    if (!codigo) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'CODIGO_REQUERIDO',
            mensaje: 'Escribe tu código de empleado.',
            campos: { codigo: 'Escribe tu código de empleado.' },
          },
        },
        { status: 400 },
      );
    }

    // Validación 2: Contraseña requerida (Login.dc.html:124)
    if (!clave) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'CLAVE_REQUERIDA',
            mensaje: 'Escribe tu contraseña.',
            campos: { clave: 'Escribe tu contraseña.' },
          },
        },
        { status: 400 },
      );
    }

    // Caso especial: ADMIN-01 (Rol exclusivo de frontend, no existe en la base de datos relacional)
    if (codigo === 'ADMIN-01') {
      return HttpResponse.json(
        {
          token: tokenFalso('ADMIN-01'),
          usuario: {
            id: 'ADMIN-01',
            codigo: 'ADMIN-01',
            nombre: 'Administración',
            rol: 'ADMINISTRADOR',
            rol_txt: 'Administrador',
            destino: '/admin',
            destino_txt: 'Ir a la administración',
          },
        },
        { status: 200 },
      );
    }

    const db = getDb();
    const emp = db.operadores.find((o) => o.codigo_empleado.toUpperCase() === codigo);

    // Validación 3: Empleado no existe (Login.dc.html:126)
    if (!emp) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'EMPLEADO_NO_ENCONTRADO',
            mensaje: `No existe un empleado con el código ${codigo}.`,
            campos: { codigo: `No existe un empleado con el código ${codigo}.` },
          },
        },
        { status: 404 },
      );
    }

    // Validación 4: Empleado inactivo (Login.dc.html:127)
    if (emp.estado !== 'ACTIVO') {
      return HttpResponse.json(
        {
          error: {
            codigo: 'EMPLEADO_INACTIVO',
            mensaje: `El usuario ${codigo} está INACTIVO. Pide a un administrador que lo active.`,
            campos: { codigo: `El usuario ${codigo} está INACTIVO. Pide a un administrador que lo active.` },
          },
        },
        { status: 403 },
      );
    }

    const nombreCompleto = `${emp.nombres} ${emp.apellidos}`;
    const nombreCorto = nombreCompleto.split(' ').slice(0, 2).join(' ');

    // Rol: RECAUDADOR -> verificar si tiene turno abierto
    if (emp.rol === 'RECAUDADOR') {
      const turnoAbierto = db.turnos.find(
        (t) => t.id_operador === emp.id_operador && t.estado === 'ABIERTO',
      );

      // Validación 5: Recaudador sin turno abierto -> HTTP 409 Conflict (Login.dc.html:128)
      if (!turnoAbierto) {
        return HttpResponse.json(
          {
            error: {
              codigo: 'SIN_TURNO_ABIERTO',
              mensaje: `${nombreCompleto} no tiene un turno abierto. El supervisor debe asignarle una caseta antes de cobrar.`,
              campos: {
                codigo: `${nombreCompleto} no tiene un turno abierto. El supervisor debe asignarle una caseta antes de cobrar.`,
              },
            },
          },
          { status: 409 },
        );
      }

      const caseta = db.casetas.find((c) => c.id_caseta === turnoAbierto.id_caseta);
      const estacion = caseta ? db.estaciones.find((e) => e.id_estacion === caseta.id_estacion) : undefined;

      return HttpResponse.json(
        {
          token: tokenFalso(String(emp.id_operador)),
          usuario: {
            id: String(emp.id_operador),
            codigo: emp.codigo_empleado,
            nombre: nombreCorto,
            nombre_completo: nombreCompleto,
            rol: 'RECAUDADOR',
            rol_txt: 'Recaudador',
            destino: '/operador',
            destino_txt: `Ir a la terminal de cobro (turno ${turnoAbierto.id_turno})`,
          },
          turno_abierto: {
            id_turno: turnoAbierto.id_turno,
            id_caseta: turnoAbierto.id_caseta,
            numero_carril: caseta?.numero_carril ?? 1,
            tipo_carril: caseta?.tipo_carril ?? 'MANUAL',
            id_estacion: caseta?.id_estacion ?? 1,
            estacion_nombre: estacion?.nombre ?? 'Estación Gambote',
            fecha: turnoAbierto.fecha,
            diurno: turnoAbierto.diurno,
            fondo_inicial_caja: turnoAbierto.fondo_inicial_caja,
            total_recaudado_efectivo: turnoAbierto.total_recaudado_efectivo,
          },
        },
        { status: 200 },
      );
    }

    // Rol: SUPERVISOR
    return HttpResponse.json(
      {
        token: tokenFalso(String(emp.id_operador)),
        usuario: {
          id: String(emp.id_operador),
          codigo: emp.codigo_empleado,
          nombre: nombreCorto,
          nombre_completo: nombreCompleto,
          rol: 'SUPERVISOR',
          rol_txt: 'Supervisor',
          destino: '/supervisor',
          destino_txt: 'Ir al panel del supervisor',
        },
      },
      { status: 200 },
    );
  }),
];
