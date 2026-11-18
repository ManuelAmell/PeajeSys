import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export const esquemaDiaRecaudo = z.object({
  fecha: z.string(),
  veh: z.number(),
  ef: z.number(),
  tag: z.number(),
  total: z.number(),
});

export type DiaRecaudo = z.infer<typeof esquemaDiaRecaudo>;

export const esquemaCarrilRecaudo = z.object({
  id_caseta: z.number(),
  numero_carril: z.number(),
  tipo_carril: z.string(),
  veh: z.number(),
  ef: z.number(),
  tag: z.number(),
  total: z.number(),
});

export type CarrilRecaudo = z.infer<typeof esquemaCarrilRecaudo>;

export const esquemaResumenRecaudo = z.object({
  total_efectivo: z.number().default(0),
  total_telepeaje: z.number().default(0),
  total_general: z.number().default(0),
  dias: z.array(esquemaDiaRecaudo).default([]),
  carriles: z.array(esquemaCarrilRecaudo).default([]),
});

export type ResumenRecaudo = z.infer<typeof esquemaResumenRecaudo>;

export interface FiltrosRecaudo {
  fecha?: string;
  estacion?: number;
}

export async function obtenerRecaudo(filtros?: FiltrosRecaudo): Promise<ResumenRecaudo> {
  return clienteHttp.get<ResumenRecaudo>('/recaudo', {
    params: filtros as Record<string, string | number | undefined>,
    schema: esquemaResumenRecaudo,
  });
}

export function useRecaudo(filtros?: FiltrosRecaudo) {
  return useQuery({
    queryKey: clavesApi.recaudo.resumen(filtros),
    queryFn: () => obtenerRecaudo(filtros),
  });
}
