import { http, HttpResponse } from 'msw';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

export const auditoriaHandlers = [
  http.get('/api/auditoria', async ({ request }) => {
    const { errorResponse, esVacio } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;
    if (esVacio) return HttpResponse.json([]);

    const url = new URL(request.url);
    const tipo = url.searchParams.get('tipo');
    const q = url.searchParams.get('q')?.trim().toLowerCase();

    const db = getDb();
    let lista = [...db.auditorias];

    if (tipo && tipo !== 'todas') {
      lista = lista.filter((a) => a.tipo_operacion === tipo);
    }

    if (q) {
      lista = lista.filter((a) => {
        const tx = db.transacciones.find((t) => t.id_transaccion === a.id_transaccion);
        const ticket = tx ? tx.numero_ticket.toLowerCase() : '';
        return (
          ticket.includes(q) ||
          a.usuario_sistema.toLowerCase().includes(q) ||
          (a.motivo && a.motivo.toLowerCase().includes(q))
        );
      });
    }

    return HttpResponse.json(lista);
  }),
];
