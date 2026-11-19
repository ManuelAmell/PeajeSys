import { http, HttpResponse } from 'msw';
import { calcularCambio } from '@/api/dominio/cambio';
import { normalizarPlaca } from '@/api/dominio/placa';
import { esquemaTransaccionPeajeNueva } from '@/types';
import { getDb } from '../db';

export const transaccionesHandlers = [
  http.post('/api/transacciones', async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { error: { codigo: 'CUERPO_INVALIDO', mensaje: 'JSON inválido' } },
        { status: 400 },
      );
    }

    const parse = esquemaTransaccionPeajeNueva.safeParse(body);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'ERROR_VALIDACION',
            mensaje: 'Datos de la transacción no cumplen con el esquema.',
            campos: Object.fromEntries(
              parse.error.issues.map((i) => [i.path.join('.'), i.message]),
            ),
          },
        },
        { status: 422 },
      );
    }

    const payload = body as Record<string, unknown>;
    const recibido = typeof payload.recibido === 'number' ? payload.recibido : undefined;
    const usuarioSistema = typeof payload.usuario_sistema === 'string' ? payload.usuario_sistema : 'operador_caja';
    const db = getDb();

    // Validar turno
    const turno = db.turnos.find((t) => t.id_turno === parse.data.id_turno);
    if (!turno) {
      return HttpResponse.json(
        { error: { codigo: 'TURNO_NO_ENCONTRADO', mensaje: `Turno ${parse.data.id_turno} no encontrado.` } },
        { status: 404 },
      );
    }
    if (turno.estado === 'CERRADO') {
      return HttpResponse.json(
        {
          error: {
            codigo: 'TURNO_CERRADO',
            mensaje: 'El turno está cerrado: no se pueden registrar transacciones.',
          },
        },
        { status: 409 },
      );
    }

    // Efectivo: validar que el dinero recibido alcance
    let cambioResultado = 0;
    if (parse.data.metodo_pago === 'EFECTIVO') {
      const calculo = calcularCambio(recibido ?? parse.data.monto_tarifa, parse.data.monto_tarifa);
      if (!calculo.esSuficiente) {
        return HttpResponse.json(
          {
            error: {
              codigo: 'EFECTIVO_INSUFICIENTE',
              mensaje: calculo.mensaje ?? 'Dinero recibido insuficiente.',
            },
          },
          { status: 422 },
        );
      }
      cambioResultado = calculo.cambio;
    }

    // Telepeaje: validar cuenta y saldo disponible
    if (parse.data.metodo_pago === 'TELEPEAJE') {
      const placaNorm = normalizarPlaca(parse.data.placa_detectada || '');
      const cuenta = db.cuentas_telepeaje.find((c) => c.placa_vehiculo.toUpperCase() === placaNorm);

      if (!cuenta) {
        return HttpResponse.json(
          {
            error: {
              codigo: 'CUENTA_NO_ENCONTRADA',
              mensaje: `La placa ${placaNorm} no tiene cuenta de telepeaje registrada.`,
            },
          },
          { status: 404 },
        );
      }
      if (cuenta.estado_cuenta !== 'ACTIVA') {
        return HttpResponse.json(
          {
            error: {
              codigo: 'CUENTA_SUSPENDIDA',
              mensaje: `La cuenta ${cuenta.tag_rfid_serial} está SUSPENDIDA: cobra en efectivo.`,
            },
          },
          { status: 422 },
        );
      }
      if (cuenta.saldo_disponible < parse.data.monto_tarifa) {
        return HttpResponse.json(
          {
            error: {
              codigo: 'SALDO_INSUFICIENTE',
              mensaje: `Saldo insuficiente: la cuenta tiene $ ${cuenta.saldo_disponible} y el peaje cuesta $ ${parse.data.monto_tarifa}.`,
            },
          },
          { status: 422 },
        );
      }
    }

    try {
      const resultado = db.registrarTransaccion({
        id_turno: parse.data.id_turno,
        id_tarifa: parse.data.id_tarifa,
        id_categoria: parse.data.id_categoria,
        placa_detectada: parse.data.placa_detectada,
        monto_tarifa: parse.data.monto_tarifa,
        metodo_pago: parse.data.metodo_pago,
        estado_paso: parse.data.estado_paso,
        usuario_sistema: usuarioSistema,
      });

      return HttpResponse.json(
        {
          transaccion: resultado.transaccion,
          cambio: parse.data.metodo_pago === 'EFECTIVO' ? cambioResultado : null,
          saldo_posterior: resultado.cuentaActualizada ? resultado.cuentaActualizada.saldo_disponible : null,
          detalle_telepeaje: resultado.detalleTelepeaje ?? null,
        },
        { status: 201 },
      );
    } catch (err) {
      return HttpResponse.json(
        { error: { codigo: 'ERROR_REGISTRO', mensaje: (err as Error).message } },
        { status: 400 },
      );
    }
  }),

  http.post('/api/transacciones/:id/anulacion', async ({ params, request }) => {
    const id = parseInt(String(params.id), 10);
    let body: { usuario_sistema?: string; motivo?: string } = {};
    try {
      body = (await request.json()) as { usuario_sistema?: string; motivo?: string };
    } catch {
      return HttpResponse.json(
        { error: { codigo: 'CUERPO_INVALIDO', mensaje: 'JSON inválido' } },
        { status: 400 },
      );
    }

    if (!body.motivo || !body.motivo.trim()) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'MOTIVO_REQUERIDO',
            mensaje: 'Indica el motivo de la anulación para la auditoría.',
          },
        },
        { status: 422 },
      );
    }

    const db = getDb();
    const tx = db.transacciones.find((t) => t.id_transaccion === id);
    if (!tx) {
      return HttpResponse.json(
        { error: { codigo: 'TRANSACCION_NO_ENCONTRADA', mensaje: `Transacción ${id} no encontrada.` } },
        { status: 404 },
      );
    }

    const resultado = db.anularTransaccion(
      id,
      body.usuario_sistema || 'supervisor_auditoria',
      body.motivo.trim(),
    );

    return HttpResponse.json(
      {
        transaccion: resultado.transaccion,
        auditoria: resultado.auditoria,
      },
      { status: 200 },
    );
  }),
];
