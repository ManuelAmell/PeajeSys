import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { esquemaTransaccionPeaje, esquemaTurno } from '@/types';
import type { TransaccionPeaje, Turno } from '@/types';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export interface FiltrosTurnos {
  estado?: string;
  fecha?: string;
  estacion?: number;
  operador?: string;
}

export async function obtenerTurnos(filtros?: FiltrosTurnos): Promise<Turno[]> {
  return clienteHttp.get<Turno[]>('/turnos', {
    params: filtros as Record<string, string | number | undefined>,
    schema: z.array(esquemaTurno),
  });
}

export async function obtenerTurno(id: number): Promise<Turno> {
  return clienteHttp.get<Turno>(`/turnos/${id}`, {
    schema: esquemaTurno,
  });
}

export async function obtenerTransaccionesTurno(
  idTurno: number,
): Promise<TransaccionPeaje[]> {
  return clienteHttp.get<TransaccionPeaje[]>(
    `/turnos/${idTurno}/transacciones`,
    {
      schema: z.array(esquemaTransaccionPeaje),
    },
  );
}

export async function cerrarTurno({
  idTurno,
  total_declarado_cierre,
}: {
  idTurno: number;
  total_declarado_cierre: number;
}): Promise<Turno> {
  return clienteHttp.post<Turno>(
    `/turnos/${idTurno}/cierre`,
    { total_declarado_cierre },
    {
      schema: esquemaTurno,
    },
  );
}

export function useTurnos(filtros?: FiltrosTurnos) {
  return useQuery({
    queryKey: clavesApi.turnos.lista(filtros),
    queryFn: () => obtenerTurnos(filtros),
  });
}

export function useTurno(id: number, opciones?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clavesApi.turnos.detalle(id),
    queryFn: () => obtenerTurno(id),
    enabled: opciones?.enabled !== false && id > 0,
  });
}

export function useTransaccionesTurno(
  idTurno: number,
  opciones?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: clavesApi.turnos.transacciones(idTurno),
    queryFn: () => obtenerTransaccionesTurno(idTurno),
    enabled: opciones?.enabled !== false && idTurno > 0,
  });
}

export function useCerrarTurno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cerrarTurno,
    onSuccess: (turnoActualizado) => {
      queryClient.invalidateQueries({ queryKey: clavesApi.turnos.todas });
      queryClient.setQueryData(
        clavesApi.turnos.detalle(turnoActualizado.id_turno),
        turnoActualizado,
      );
      queryClient.invalidateQueries({ queryKey: clavesApi.auditoria.todas });
      queryClient.invalidateQueries({ queryKey: clavesApi.recaudo.todas });
    },
  });
}

export interface DatosAbrirTurno {
  id_caseta: number;
  fondo_inicial_caja: number;
  diurno: boolean;
  id_operador?: number;
}

export async function abrirTurno(datos: DatosAbrirTurno): Promise<Turno> {
  return clienteHttp.post<Turno>('/turnos/abrir', datos, {
    schema: esquemaTurno,
  });
}

export function useAbrirTurno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: abrirTurno,
    onSuccess: (nuevoTurno) => {
      queryClient.invalidateQueries({ queryKey: clavesApi.turnos.todas });
      queryClient.setQueryData(
        clavesApi.turnos.detalle(nuevoTurno.id_turno),
        nuevoTurno,
      );
    },
  });
}

/**
 * Respuesta de GET /api/turnos/{id}/arqueo (ArqueoTurnoDto del backend).
 */
export const esquemaArqueoTurno = z.object({
  id_turno: z.number().int(),
  id_operador: z.number().int(),
  id_caseta: z.number().int(),
  efectivo_sistema: z.number(),
  efectivo_reportado: z.number(),
  diferencia: z.number(),
  estado_arqueo: z.enum(['CUADRADO', 'FALTANTE', 'SOBRANTE']),
  total_vehiculos: z.number().int(),
});

export type ArqueoTurno = z.infer<typeof esquemaArqueoTurno>;

export async function obtenerArqueoTurno(
  idTurno: number,
  efectivoReportado: number,
): Promise<ArqueoTurno> {
  return clienteHttp.get<ArqueoTurno>(`/turnos/${idTurno}/arqueo`, {
    params: { efectivo_reportado: efectivoReportado },
    schema: esquemaArqueoTurno,
  });
}

export function useArqueoTurno(
  idTurno: number,
  efectivoReportado: number,
  opciones?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: clavesApi.turnos.arqueo(idTurno, efectivoReportado),
    queryFn: () => obtenerArqueoTurno(idTurno, efectivoReportado),
    enabled: opciones?.enabled !== false && idTurno > 0,
  });
}
