import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { normalizarPlaca } from '@/api/dominio/placa';
import { esquemaCuentaTelepeaje, esquemaVehiculo } from '@/types';
import type { CuentaTelepeaje, Vehiculo } from '@/types';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export const esquemaDetalleVehiculo = z.object({
  vehiculo: esquemaVehiculo,
  cuenta: esquemaCuentaTelepeaje.nullable().optional(),
});

export interface DetalleVehiculo {
  vehiculo: Vehiculo;
  cuenta?: CuentaTelepeaje | null;
}

export async function obtenerVehiculo(placa: string): Promise<DetalleVehiculo> {
  const placaNormalizada = normalizarPlaca(placa);
  return clienteHttp.get<DetalleVehiculo>(`/vehiculos/${placaNormalizada}`, {
    schema: esquemaDetalleVehiculo,
  });
}

export function useVehiculo(placa: string, opciones?: { enabled?: boolean }) {
  const placaNormalizada = normalizarPlaca(placa);

  return useQuery({
    queryKey: clavesApi.vehiculos.detalle(placaNormalizada),
    queryFn: () => obtenerVehiculo(placaNormalizada),
    enabled: Boolean(placaNormalizada) && opciones?.enabled !== false,
  });
}
