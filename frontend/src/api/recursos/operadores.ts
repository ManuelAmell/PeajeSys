import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { esquemaOperador } from '@/types';
import type { Operador, OperadorNuevo } from '@/types';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export interface FiltrosOperadores {
  rol?: string;
  estado?: string;
  q?: string;
}

export async function obtenerOperadores(filtros?: FiltrosOperadores): Promise<Operador[]> {
  return clienteHttp.get<Operador[]>('/operadores', {
    params: filtros as Record<string, string | undefined>,
    schema: z.array(esquemaOperador),
  });
}

export async function obtenerOperador(id: number): Promise<Operador> {
  return clienteHttp.get<Operador>(`/operadores/${id}`, {
    schema: esquemaOperador,
  });
}

export async function crearOperador(datos: OperadorNuevo): Promise<Operador> {
  return clienteHttp.post<Operador>('/operadores', datos, {
    schema: esquemaOperador,
  });
}

export async function actualizarOperador({
  id,
  datos,
}: {
  id: number;
  datos: Partial<OperadorNuevo>;
}): Promise<Operador> {
  return clienteHttp.patch<Operador>(`/operadores/${id}`, datos, {
    schema: esquemaOperador,
  });
}

export function useOperadores(filtros?: FiltrosOperadores) {
  return useQuery({
    queryKey: clavesApi.operadores.lista(filtros),
    queryFn: () => obtenerOperadores(filtros),
  });
}

export function useOperador(id: number, opciones?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clavesApi.operadores.detalle(id),
    queryFn: () => obtenerOperador(id),
    enabled: opciones?.enabled !== false && id > 0,
  });
}

export function useCrearOperador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crearOperador,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clavesApi.operadores.todas });
    },
  });
}

export function useActualizarOperador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: actualizarOperador,
    onSuccess: (operadorActualizado) => {
      queryClient.invalidateQueries({ queryKey: clavesApi.operadores.todas });
      queryClient.setQueryData(
        clavesApi.operadores.detalle(operadorActualizado.id_operador),
        operadorActualizado,
      );
    },
  });
}
