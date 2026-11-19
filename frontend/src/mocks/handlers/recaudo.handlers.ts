import { http, HttpResponse } from 'msw';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

export const recaudoHandlers = [
  http.get('/api/recaudo', async ({ request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json({ dias: [], carriles: [] });

    const url = new URL(request.url);
    const fecha = url.searchParams.get('fecha');
    const estacion = url.searchParams.get('estacion');

    const db = getDb();
    let transacciones = [...db.transacciones];

    if (fecha && fecha !== 'todas') {
      transacciones = transacciones.filter((t) => t.fecha_hora.startsWith(fecha));
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
      const diaKey = tx.fecha_hora.slice(0, 10);
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

    const carriles = Array.from(mapaCarriles.values()).sort(
      (a, b) => a.numero_carril - b.numero_carril,
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
