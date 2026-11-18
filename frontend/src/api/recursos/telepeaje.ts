import { useQuery } from '@tanstack/react-query';
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

export async function obtenerCuentaPorPlaca(placa: string): Promise<CuentaTelepeaje> {
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

export function useCuentaPorPlaca(placa: string, opciones?: { enabled?: boolean }) {
  const placaNormalizada = normalizarPlaca(placa);

  return useQuery({
    queryKey: clavesApi.telepeaje.cuentaPorPlaca(placaNormalizada),
    queryFn: () => obtenerCuentaPorPlaca(placaNormalizada),
    enabled: Boolean(placaNormalizada) && opciones?.enabled !== false,
  });
}
