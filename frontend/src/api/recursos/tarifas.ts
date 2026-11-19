import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { esquemaTarifa } from '@/types';
import type { Tarifa, TarifaNueva } from '@/types';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export interface FiltrosTarifas {
  estacion?: number;
  categoria?: number;
  vigente?: boolean;
}

export async function obtenerTarifas(filtros?: FiltrosTarifas): Promise<Tarifa[]> {
  return clienteHttp.get<Tarifa[]>('/tarifas', {
    params: filtros as Record<string, string | number | boolean | undefined>,
    schema: z.array(esquemaTarifa),
  });
}

export async function crearTarifa(datos: TarifaNueva): Promise<Tarifa> {
  return clienteHttp.post<Tarifa>('/tarifas', datos, {
    schema: esquemaTarifa,
  });
}

export async function actualizarTarifa({
  id,
  datos,
}: {
  id: number;
  datos: Partial<TarifaNueva>;
}): Promise<Tarifa> {
  return clienteHttp.patch<Tarifa>(`/tarifas/${id}`, datos, {
    schema: esquemaTarifa,
  });
}

export function useTarifas(filtros?: FiltrosTarifas) {
  return useQuery({
    queryKey: clavesApi.tarifas.lista(filtros),
    queryFn: () => obtenerTarifas(filtros),
  });
}

export function useCrearTarifa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crearTarifa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clavesApi.tarifas.todas });
    },
  });
}

export function useActualizarTarifa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: actualizarTarifa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clavesApi.tarifas.todas });
    },
  });
}
