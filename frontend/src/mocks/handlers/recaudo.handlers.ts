import { http, HttpResponse } from 'msw';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

const FORMATO_DIA_BOGOTA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Día civil (YYYY-MM-DD) de un instante en Bogotá; equivale a ZonaHorariaApp.DiaCivil de la API. */
export function diaBogota(instante: string): string {
  return FORMATO_DIA_BOGOTA.format(new Date(instante));
}

export const recaudoHandlers = [
  http.get('/api/recaudo', async ({ request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json({ dias: [], carriles: [] });

    const url = new URL(request.url);
    const fecha = url.searchParams.get('fecha');
    const estacion = url.searchParams.get('estacion');

    const db = getDb();
    // Igual que la API: una transacción anulada (VOID) no cuenta en el recaudo.
    const anuladas = new Set(
      db.auditorias
        .filter((a) => a.tipo_operacion === 'VOID')
        .map((a) => a.id_transaccion),
    );
    let transacciones = db.transacciones.filter((t) => !anuladas.has(t.id_transaccion));

    if (fecha && fecha !== 'todas') {
      transacciones = transacciones.filter((t) => diaBogota(t.fecha_hora) === fecha);
    }

    if (estacion) {
      const idEst = parseInt(estacion, 10);
      const casetasIds = db.casetas.filter((c) => c.id_estacion === idEst).map((c) => c.id_caseta);
      const turnosIds = db.turnos.filter((tu) => casetasIds.includes(tu.id_caseta)).map((tu) => tu.id_turno);
      transacciones = transacciones.filter((t) => turnosIds.includes(t.id_turno));
    }

    // Agrupación por fecha
    const mapaDias = new Map<
      string,
      { fecha: string; veh: number; ef: number; tag: number; total: number }
    >();

    for (const tx of transacciones) {
      const diaKey = diaBogota(tx.fecha_hora);
      const actual = mapaDias.get(diaKey) || {
        fecha: diaKey,
        veh: 0,
        ef: 0,
        tag: 0,
        total: 0,
      };

      actual.veh += 1;
      if (tx.metodo_pago === 'EFECTIVO') {
        actual.ef += tx.monto_tarifa;
      } else if (tx.metodo_pago === 'TELEPEAJE') {
        actual.tag += tx.monto_tarifa;
      }
      actual.total = actual.ef + actual.tag;
      mapaDias.set(diaKey, actual);
    }

    const dias = Array.from(mapaDias.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Agrupación por carril
    const mapaCarriles = new Map<
      number,
      {
        id_caseta: number;
        numero_carril: number;
        tipo_carril: string;
        veh: number;
        ef: number;
        tag: number;
        total: number;
      }
    >();

    for (const tx of transacciones) {
      const turno = db.turnos.find((tu) => tu.id_turno === tx.id_turno);
      const idCaseta = turno ? turno.id_caseta : 1;
      const caseta = db.casetas.find((c) => c.id_caseta === idCaseta);

      const actual = mapaCarriles.get(idCaseta) || {
        id_caseta: idCaseta,
        numero_carril: caseta ? caseta.numero_carril : 1,
        tipo_carril: caseta ? caseta.tipo_carril : 'MANUAL',
        veh: 0,
        ef: 0,
        tag: 0,
        total: 0,
      };

      actual.veh += 1;
      if (tx.metodo_pago === 'EFECTIVO') {
        actual.ef += tx.monto_tarifa;
      } else if (tx.metodo_pago === 'TELEPEAJE') {
        actual.tag += tx.monto_tarifa;
      }
      actual.total = actual.ef + actual.tag;
      mapaCarriles.set(idCaseta, actual);
    }

    // Igual que la API: por estación, número de carril y caseta.
    const estacionDe = (idCaseta: number) =>
      db.casetas.find((c) => c.id_caseta === idCaseta)?.id_estacion ?? 0;
    const carriles = Array.from(mapaCarriles.values()).sort(
      (a, b) =>
        estacionDe(a.id_caseta) - estacionDe(b.id_caseta) ||
        a.numero_carril - b.numero_carril ||
        a.id_caseta - b.id_caseta,
    );

    const totalEfectivo = dias.reduce((sum, d) => sum + d.ef, 0);
    const totalTelepeaje = dias.reduce((sum, d) => sum + d.tag, 0);

    return HttpResponse.json({
      total_efectivo: totalEfectivo,
      total_telepeaje: totalTelepeaje,
      total_general: totalEfectivo + totalTelepeaje,
      dias,
      carriles,
    });
  }),
];
