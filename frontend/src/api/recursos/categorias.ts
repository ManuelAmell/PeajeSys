import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { esquemaCategoriaVehiculo } from '@/types';
import type { CategoriaVehiculo, CategoriaVehiculoNueva } from '@/types';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export async function obtenerCategorias(): Promise<CategoriaVehiculo[]> {
  return clienteHttp.get<CategoriaVehiculo[]>('/categorias', {
    schema: z.array(esquemaCategoriaVehiculo),
  });
}

export async function crearCategoria(
  datos: CategoriaVehiculoNueva,
): Promise<CategoriaVehiculo> {
  return clienteHttp.post<CategoriaVehiculo>('/categorias', datos, {
    schema: esquemaCategoriaVehiculo,
  });
}

export async function actualizarCategoria({
  id,
  datos,
}: {
  id: number;
  datos: Partial<CategoriaVehiculoNueva>;
}): Promise<CategoriaVehiculo> {
  return clienteHttp.patch<CategoriaVehiculo>(`/categorias/${id}`, datos, {
    schema: esquemaCategoriaVehiculo,
  });
}

export function useCategorias() {
  return useQuery({
    queryKey: clavesApi.categorias.lista(),
    queryFn: obtenerCategorias,
  });
}

export function useCrearCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crearCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clavesApi.categorias.todas });
      queryClient.invalidateQueries({ queryKey: clavesApi.tarifas.todas });
    },
  });
}

export function useActualizarCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: actualizarCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clavesApi.categorias.todas });
      queryClient.invalidateQueries({ queryKey: clavesApi.tarifas.todas });
    },
  });
}
