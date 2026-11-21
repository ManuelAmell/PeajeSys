import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  esquemaAuditoriaTransaccion,
  esquemaDetallePagoTelepeaje,
  esquemaTransaccionPeaje,
} from '@/types';
import type {
  AuditoriaTransaccion,
  DetallePagoTelepeaje,
  TransaccionPeaje,
  TransaccionPeajeNueva,
} from '@/types';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export interface ParametrosRegistroTransaccion extends TransaccionPeajeNueva {
  recibido?: number;
  usuario_sistema?: string;
}

export const esquemaRespuestaRegistroTransaccion = z.object({
  transaccion: esquemaTransaccionPeaje,
  cambio: z.number().nullish(),
  saldo_posterior: z.number().nullish(),
  detalle_telepeaje: esquemaDetallePagoTelepeaje.nullish(),
});

/** La API no devuelve los ids del detalle dentro de la respuesta del cobro. */
export type DetallePagoTelepeajeRespuesta = Omit<
  DetallePagoTelepeaje,
  'id_detalle_telepeaje' | 'id_transaccion'
> &
  Partial<Pick<DetallePagoTelepeaje, 'id_detalle_telepeaje' | 'id_transaccion'>>;

export interface RespuestaRegistroTransaccion {
  transaccion: TransaccionPeaje;
  cambio?: number | null;
  saldo_posterior?: number | null;
  detalle_telepeaje?: DetallePagoTelepeajeRespuesta | null;
}

export const esquemaRespuestaAnulacionTransaccion = z.object({
  transaccion: esquemaTransaccionPeaje,
  auditoria: esquemaAuditoriaTransaccion,
});

export interface RespuestaAnulacionTransaccion {
  transaccion: TransaccionPeaje;
  auditoria: AuditoriaTransaccion;
}

export interface ParametrosAnulacionTransaccion {
  idTransaccion: number;
  motivo: string;
  usuario_sistema?: string;
}

export async function registrarTransaccion(
  datos: ParametrosRegistroTransaccion,
): Promise<RespuestaRegistroTransaccion> {
  return clienteHttp.post<RespuestaRegistroTransaccion>('/transacciones', datos, {
    schema: esquemaRespuestaRegistroTransaccion,
  });
}

export async function anularTransaccion({
  idTransaccion,
  motivo,
  usuario_sistema,
}: ParametrosAnulacionTransaccion): Promise<RespuestaAnulacionTransaccion> {
  return clienteHttp.post<RespuestaAnulacionTransaccion>(
    `/transacciones/${idTransaccion}/anulacion`,
    { motivo, usuario_sistema },
    {
      schema: esquemaRespuestaAnulacionTransaccion,
    },
  );
}

export function useRegistrarTransaccion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registrarTransaccion,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: clavesApi.turnos.todas });
      queryClient.invalidateQueries({
        queryKey: clavesApi.turnos.transacciones(variables.id_turno),
      });
      queryClient.invalidateQueries({ queryKey: clavesApi.telepeaje.todas });
      queryClient.invalidateQueries({ queryKey: clavesApi.recaudo.todas });
      queryClient.invalidateQueries({ queryKey: clavesApi.auditoria.todas });
    },
  });
}

export function useAnularTransaccion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: anularTransaccion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clavesApi.turnos.todas });
      queryClient.invalidateQueries({ queryKey: clavesApi.auditoria.todas });
      queryClient.invalidateQueries({ queryKey: clavesApi.recaudo.todas });
    },
  });
}
