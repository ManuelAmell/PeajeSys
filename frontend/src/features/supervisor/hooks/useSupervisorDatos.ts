import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { clavesApi } from '@/api/claves';
import { diagnosticarArqueo } from '@/api/dominio/arqueo';
import { conciliarTurnoPasos } from '@/api/dominio/conciliacion';
import { determinarCondicionCuenta } from '@/api/dominio/telepeaje';
import { useAuditoria } from '@/api/recursos/auditoria';
import { useCategorias } from '@/api/recursos/categorias';
import { useCasetas } from '@/api/recursos/estaciones';
import { useOperadores } from '@/api/recursos/operadores';
import { useRecaudo } from '@/api/recursos/recaudo';
import { useCuentasTelepeaje } from '@/api/recursos/telepeaje';
import { obtenerTransaccionesTurno, useTurnos } from '@/api/recursos/turnos';
import { obtenerVehiculo } from '@/api/recursos/vehiculos';
import { formatearMoneda } from '@/lib/formato';
import type { TransaccionPeaje } from '@/types';
import type {
  CuentaConDetalle,
  DiaRecaudoGrafico,
  EventoAuditoriaConDetalle,
  MetricasArqueo,
  TurnoConDetalle,
} from '../tipos';

export function useSupervisorDatos() {
  const turnosQuery = useTurnos();
  const casetasQuery = useCasetas();
  const operadoresQuery = useOperadores();
  const recaudoQuery = useRecaudo();
  const auditoriaQuery = useAuditoria();
  const cuentasQuery = useCuentasTelepeaje();
  const categoriasQuery = useCategorias();

  const turnos = useMemo(() => turnosQuery.data ?? [], [turnosQuery.data]);
  const casetas = useMemo(() => casetasQuery.data ?? [], [casetasQuery.data]);
  const operadores = useMemo(() => operadoresQuery.data ?? [], [operadoresQuery.data]);
  const recaudo = recaudoQuery.data;
  const auditorias = useMemo(() => auditoriaQuery.data ?? [], [auditoriaQuery.data]);
  const cuentas = useMemo(() => cuentasQuery.data ?? [], [cuentasQuery.data]);
  const categorias = useMemo(() => categoriasQuery.data ?? [], [categoriasQuery.data]);

  // Consulta paralela de transacciones por cada turno para el cálculo exacto de conciliación
  const transaccionesTurnosQueries = useQueries({
    queries: turnos.map((t) => ({
      queryKey: clavesApi.turnos.transacciones(t.id_turno),
      queryFn: () => obtenerTransaccionesTurno(t.id_turno),
      staleTime: 60000,
    })),
  });

  // Consulta paralela de vehículos de cada cuenta para determinar la categoría
  const vehiculosCuentasQueries = useQueries({
    queries: cuentas.map((c) => ({
      queryKey: clavesApi.vehiculos.detalle(c.placa_vehiculo),
      queryFn: () => obtenerVehiculo(c.placa_vehiculo),
      staleTime: 60000,
    })),
  });

  // Mapeo de transacciones por turno y global por id_transaccion
  const { mapaTransaccionesPorTurno, mapaTodasTransacciones } = useMemo(() => {
    const porTurno = new Map<number, TransaccionPeaje[]>();
    const todas = new Map<number, TransaccionPeaje>();

    turnos.forEach((t, i) => {
      const txs = transaccionesTurnosQueries[i]?.data ?? [];
      porTurno.set(t.id_turno, txs);
      txs.forEach((tx) => {
        todas.set(tx.id_transaccion, tx);
      });
    });

    return { mapaTransaccionesPorTurno: porTurno, mapaTodasTransacciones: todas };
  }, [turnos, transaccionesTurnosQueries]);

  // Transformación y enriquecimiento de la lista de turnos
  const turnosDetallados: TurnoConDetalle[] = useMemo(() => {
    return turnos.map((t) => {
      const txs = mapaTransaccionesPorTurno.get(t.id_turno) ?? [];
      const pasosEfectivo = txs
        .filter((tx) => tx.metodo_pago === 'EFECTIVO')
        .reduce((sum, tx) => sum + tx.monto_tarifa, 0);

      const caseta = casetas.find((c) => c.id_caseta === t.id_caseta);
      const operador = operadores.find((o) => o.id_operador === t.id_operador);

      const carrilTexto = caseta
        ? `${caseta.numero_carril} · ${caseta.tipo_carril.toLowerCase().replace('_', ' ')}`
        : `Carril ${t.id_caseta}`;

      const operadorNombre = operador
        ? `${operador.nombres} ${operador.apellidos}`
        : `Operador ${t.id_operador}`;

      const abierto = t.estado === 'ABIERTO';
      const arqueo = diagnosticarArqueo(
        abierto ? null : t.total_declarado_cierre,
        t.total_recaudado_efectivo,
      );

      let diagFondo = 'var(--superficie-2)';
      let diagColor = 'var(--texto-3)';
      if (!abierto) {
        if (arqueo.diagnostico === 'CUADRADO') {
          diagFondo = 'var(--correcto-fondo)';
          diagColor = 'var(--correcto-texto)';
        } else if (arqueo.diagnostico === 'SOBRANTE') {
          diagFondo = 'var(--aviso-fondo)';
          diagColor = 'var(--aviso-texto)';
        } else {
          diagFondo = 'var(--error-fondo)';
          diagColor = 'var(--error)';
        }
      }

      const conciliacion = conciliarTurnoPasos(t.total_recaudado_efectivo, pasosEfectivo);
      const conciliaColor = conciliacion.concilia ? 'var(--correcto-texto)' : 'var(--error)';

      return {
        ...t,
        carrilTexto,
        operadorNombre,
        pasosEfectivo,
        pasosTexto: formatearMoneda(pasosEfectivo),
        recaudadoTexto: formatearMoneda(t.total_recaudado_efectivo),
        declaradoTexto: abierto || t.total_declarado_cierre === null
          ? 'Turno abierto'
          : formatearMoneda(t.total_declarado_cierre),
        diagnostico: arqueo.diagnostico,
        diagnosticoTexto: arqueo.texto,
        diagFondo,
        diagColor,
        concilia: conciliacion.concilia,
        conciliacionTexto: conciliacion.mensaje,
        conciliaColor,
      };
    });
  }, [turnos, mapaTransaccionesPorTurno, casetas, operadores]);

  // Cálculo de métricas agregadas de arqueo
  const metricas: MetricasArqueo = useMemo(() => {
    const abiertos = turnosDetallados.filter((t) => t.estado === 'ABIERTO').length;
    const descuadre = turnosDetallados.filter(
      (t) => t.estado === 'CERRADO' && t.diagnostico !== 'CUADRADO',
    ).length;
    const sinConciliar = turnosDetallados.filter((t) => !t.concilia).length;

    return { abiertos, descuadre, sinConciliar };
  }, [turnosDetallados]);

  // Días con gráfico de barras proporcionales para recaudo
  const diasGrafico: DiaRecaudoGrafico[] = useMemo(() => {
    if (!recaudo || !recaudo.dias || recaudo.dias.length === 0) return [];

    const maxTotal = Math.max(...recaudo.dias.map((d) => d.total), 1);

    return recaudo.dias.map((d) => {
      const anchoPorcentaje = `${Math.max(10, Math.round((d.total / maxTotal) * 100))}%`;
      const efPorcentaje = d.total > 0 ? `${Math.round((d.ef / d.total) * 100)}%` : '0%';
      const ariaLabel = `${d.fecha}: efectivo ${formatearMoneda(d.ef)}, telepeaje ${formatearMoneda(d.tag)}`;

      return {
        ...d,
        totalTexto: formatearMoneda(d.total),
        efTexto: formatearMoneda(d.ef),
        tagTexto: formatearMoneda(d.tag),
        anchoPorcentaje,
        efPorcentaje,
        ariaLabel,
      };
    });
  }, [recaudo]);

  // Cuentas de telepeaje ordenadas por saldo ascendente con sus condiciones
  const cuentasDetalladas: CuentaConDetalle[] = useMemo(() => {
    const resultado = cuentas.map((c, i) => {
      const vehiculoInfo = vehiculosCuentasQueries[i]?.data?.vehiculo;
      const categoria = categorias.find((k) => k.id_categoria === vehiculoInfo?.id_categoria);
      const categoriaCodigo = categoria
        ? categoria.codigo.replace(/^CAT_/, '')
        : 'I';

      const condicion = determinarCondicionCuenta(c.saldo_disponible, c.estado_cuenta);

      let condFondo = 'var(--correcto-fondo)';
      let condColor = 'var(--correcto-texto)';
      if (condicion === 'SIN SALDO') {
        condFondo = 'var(--error-fondo)';
        condColor = 'var(--error)';
      } else if (condicion === 'SALDO CRÍTICO') {
        condFondo = 'var(--aviso-fondo)';
        condColor = 'var(--aviso-texto)';
      }

      return {
        ...c,
        categoriaCodigo,
        saldoTexto: formatearMoneda(c.saldo_disponible),
        condicion,
        condFondo,
        condColor,
      };
    });

    // Ordenar de menor a mayor saldo
    return resultado.sort((a, b) => a.saldo_disponible - b.saldo_disponible);
  }, [cuentas, vehiculosCuentasQueries, categorias]);

  // Bitácora de auditoría detallada
  const auditoriasDetalladas: EventoAuditoriaConDetalle[] = useMemo(() => {
    return auditorias.map((a) => {
      const tx = mapaTodasTransacciones.get(a.id_transaccion);
      const ticketNumero = tx ? tx.numero_ticket : `TCK-${String(a.id_transaccion).padStart(8, '0')}`;

      // Formatear fecha y hora
      const fechaTexto = a.fecha_hora_evento.replace('T', ' ').slice(0, 16);

      let tipoBorde = 'var(--texto)';
      let tipoFondo = 'var(--superficie)';
      if (a.tipo_operacion === 'UPDATE') {
        tipoBorde = 'var(--aviso-texto)';
        tipoFondo = 'var(--aviso-fondo)';
      } else if (a.tipo_operacion === 'VOID') {
        tipoBorde = 'var(--error)';
        tipoFondo = 'var(--error-fondo)';
      }

      return {
        ...a,
        ticketNumero,
        fechaTexto,
        tipoBorde,
        tipoFondo,
      };
    });
  }, [auditorias, mapaTodasTransacciones]);

  // Estado global de carga
  const isPending =
    turnosQuery.isPending ||
    recaudoQuery.isPending ||
    auditoriaQuery.isPending ||
    cuentasQuery.isPending;

  // Estado global de error
  const isError =
    turnosQuery.isError ||
    recaudoQuery.isError ||
    auditoriaQuery.isError ||
    cuentasQuery.isError;

  const refetchTodo = () => {
    turnosQuery.refetch();
    casetasQuery.refetch();
    operadoresQuery.refetch();
    recaudoQuery.refetch();
    auditoriaQuery.refetch();
    cuentasQuery.refetch();
    categoriasQuery.refetch();
  };

  return {
    isPending,
    isError,
    refetchTodo,
    turnos: turnosDetallados,
    metricas,
    recaudo,
    diasGrafico,
    cuentas: cuentasDetalladas,
    auditorias: auditoriasDetalladas,
  };
}
