import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { esquemaCaseta, esquemaEstacionPeaje } from '@/types';
import type { Caseta, EstacionPeaje } from '@/types';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export async function obtenerEstaciones(): Promise<EstacionPeaje[]> {
  return clienteHttp.get<EstacionPeaje[]>('/estaciones', {
    schema: z.array(esquemaEstacionPeaje),
  });
}

export async function obtenerCasetas(idEstacion?: number): Promise<Caseta[]> {
  return clienteHttp.get<Caseta[]>('/casetas', {
    params: idEstacion ? { id_estacion: idEstacion } : undefined,
    schema: z.array(esquemaCaseta),
  });
}

export function useEstaciones() {
  return useQuery({
    queryKey: clavesApi.estaciones.lista(),
    queryFn: obtenerEstaciones,
  });
}

export function useCasetas(idEstacion?: number) {
  return useQuery({
    queryKey: clavesApi.estaciones.casetas(idEstacion),
    queryFn: () => obtenerCasetas(idEstacion),
  });
}
