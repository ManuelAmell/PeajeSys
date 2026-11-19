import { http, HttpResponse } from 'msw';
import { normalizarPlaca } from '@/api/dominio/placa';
import { procesarControlLectura } from '../control';
import { getDb } from '../db';

export const vehiculosHandlers = [
  http.get('/api/vehiculos/:placa', async ({ params, request }) => {
    const { errorResponse } = await procesarControlLectura(request);
    if (errorResponse) return errorResponse;

    const placaNorm = normalizarPlaca(String(params.placa));
    const db = getDb();

    const vehiculo = db.vehiculos.find((v) => v.placa.toUpperCase() === placaNorm);
    if (!vehiculo) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'VEHICULO_NO_ENCONTRADO',
            mensaje: `Vehículo con placa ${placaNorm} no encontrado en el sistema.`,
          },
        },
        { status: 404 },
      );
    }

    const cuenta = db.cuentas_telepeaje.find((c) => c.placa_vehiculo.toUpperCase() === placaNorm);

    return HttpResponse.json({
      vehiculo,
      cuenta: cuenta ?? null,
    });
  }),
];
