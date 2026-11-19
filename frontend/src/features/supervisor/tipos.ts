import type { AuditoriaTransaccion, CuentaTelepeaje, Turno } from '@/types';
import type { TipoDiagnosticoArqueo } from '@/api/dominio/arqueo';
import type { CondicionCuenta } from '@/api/dominio/telepeaje';

export type IdPestanaSupervisor = 'arqueo' | 'recaudo' | 'auditoria' | 'cuentas';

export interface InfoPestana {
  id: IdPestanaSupervisor;
  label: string;
}

export const PESTANAS_SUPERVISOR: InfoPestana[] = [
  { id: 'arqueo', label: 'Arqueo de turnos' },
  { id: 'recaudo', label: 'Recaudo diario' },
  { id: 'auditoria', label: 'Auditoría' },
  { id: 'cuentas', label: 'Cuentas de telepeaje' },
];

export interface TurnoConDetalle extends Turno {
  carrilTexto: string;
  operadorNombre: string;
  pasosEfectivo: number;
  pasosTexto: string;
  recaudadoTexto: string;
  declaradoTexto: string;
  diagnostico: TipoDiagnosticoArqueo | null;
  diagnosticoTexto: string;
  diagFondo: string;
  diagColor: string;
  concilia: boolean;
  conciliacionTexto: string;
  conciliaColor: string;
}

export interface MetricasArqueo {
  abiertos: number;
  descuadre: number;
  sinConciliar: number;
}

export interface CuentaConDetalle extends CuentaTelepeaje {
  categoriaCodigo: string;
  saldoTexto: string;
  condicion: CondicionCuenta;
  condFondo: string;
  condColor: string;
}

export interface EventoAuditoriaConDetalle extends AuditoriaTransaccion {
  ticketNumero: string;
  fechaTexto: string;
  tipoBorde: string;
  tipoFondo: string;
}

export interface DiaRecaudoGrafico {
  fecha: string;
  veh: number;
  ef: number;
  tag: number;
  total: number;
  totalTexto: string;
  efTexto: string;
  tagTexto: string;
  anchoPorcentaje: string;
  efPorcentaje: string;
  ariaLabel: string;
}
