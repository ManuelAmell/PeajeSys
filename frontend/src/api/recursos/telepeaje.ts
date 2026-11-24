import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { normalizarPlaca } from '@/api/dominio/placa';
import { esquemaCuentaTelepeaje } from '@/types';
import type { CuentaTelepeaje } from '@/types';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export interface FiltrosCuentasTelepeaje {
  estado?: string;
  q?: string;
}

export async function obtenerCuentasTelepeaje(
  filtros?: FiltrosCuentasTelepeaje,
): Promise<CuentaTelepeaje[]> {
  return clienteHttp.get<CuentaTelepeaje[]>('/cuentas-telepeaje', {
    params: filtros as Record<string, string | undefined>,
    schema: z.array(esquemaCuentaTelepeaje),
  });
}

export async function obtenerCuentaPorPlaca(
  placa: string,
): Promise<CuentaTelepeaje> {
  const placaNormalizada = normalizarPlaca(placa);
  return clienteHttp.get<CuentaTelepeaje>(
    `/cuentas-telepeaje/por-placa/${placaNormalizada}`,
    {
      schema: esquemaCuentaTelepeaje,
    },
  );
}

export function useCuentasTelepeaje(filtros?: FiltrosCuentasTelepeaje) {
  return useQuery({
    queryKey: clavesApi.telepeaje.cuentas(filtros),
    queryFn: () => obtenerCuentasTelepeaje(filtros),
  });
}

export function useCuentaPorPlaca(
  placa: string,
  opciones?: { enabled?: boolean },
) {
  const placaNormalizada = normalizarPlaca(placa);

  return useQuery({
    queryKey: clavesApi.telepeaje.cuentaPorPlaca(placaNormalizada),
    queryFn: () => obtenerCuentaPorPlaca(placaNormalizada),
    enabled: Boolean(placaNormalizada) && opciones?.enabled !== false,
  });
}

/**
 * Respuesta de POST /api/telepeaje/recargar (RecargaTagResponseDto del backend).
 */
export const esquemaRecargaTelepeaje = z.object({
  id_cuenta: z.number().int(),
  placa_vehiculo: z.string().min(1),
  tag_rfid_serial: z.string().min(1),
  saldo_anterior: z.number(),
  saldo_nuevo: z.number(),
  monto_recargado: z.number(),
  fecha_hora: z.string().min(1),
  mensaje: z.string(),
});

export type RespuestaRecargaTelepeaje = z.infer<typeof esquemaRecargaTelepeaje>;

export interface DatosRecargaTelepeaje {
  /** Placa de la cuenta; se normaliza antes de enviarla. */
  placa?: string;
  tag_rfid_serial?: string;
  monto: number;
}

export async function recargarCuentaTelepeaje(
  datos: DatosRecargaTelepeaje,
): Promise<RespuestaRecargaTelepeaje> {
  const cuerpo: Record<string, string | number> = { monto: datos.monto };
  if (datos.placa) {
    cuerpo.placa_vehiculo = normalizarPlaca(datos.placa);
  }
  if (datos.tag_rfid_serial) {
    cuerpo.tag_rfid_serial = datos.tag_rfid_serial;
  }
  return clienteHttp.post<RespuestaRecargaTelepeaje>(
    '/telepeaje/recargar',
    cuerpo,
    {
      schema: esquemaRecargaTelepeaje,
    },
  );
}

export function useRecargarCuentaTelepeaje() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recargarCuentaTelepeaje,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clavesApi.telepeaje.todas });
    },
  });
}
