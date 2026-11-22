import { useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSesion } from '@/lib/sesion';
import { useTurnos, useTransaccionesTurno } from '@/api/recursos/turnos';
import { useCasetas } from '@/api/recursos/estaciones';
import { useEstaciones } from '@/api/recursos/estaciones';
import { formatearMoneda } from '@/lib/formato';
import { usePlacaYCategoria, CODIGOS_A_ROMANO, ROMANOS } from './usePlacaYCategoria';
import { useCobroOperador } from './useCobroOperador';
import { useCierreTurnoOperador } from './useCierreTurnoOperador';
import type { PasoRegistrado, MetodoPagoOperador } from '../types';

export function useTerminalCobro() {
  const { usuario } = useSesion();
  const [searchParams] = useSearchParams();

  // C1: Parámetro de prueba ?carril= solo activo si VITE_USAR_MOCKS === 'true'
  const usarMocks = import.meta.env.VITE_USAR_MOCKS === 'true';
  const carrilParam = usarMocks ? searchParams.get('carril')?.toLowerCase() : null;

  // C2: Obtener turno abierto del operador autenticado mediante filtro de API
  const operadorCodigo = usuario?.codigo || usuario?.id;
  const {
    data: turnos,
    isLoading: cargandoTurnos,
    isError: errorTurnos,
    refetch: reintentarTurnos,
  } = useTurnos(
    operadorCodigo ? { estado: 'ABIERTO', operador: operadorCodigo } : { estado: 'ABIERTO' },
  );

  // Hook de cierre de turno
  const idTurnoParaCierre = turnos?.[0]?.id_turno ?? 0;
  const totalRecaudadoEfectivoTurno = turnos?.[0]?.total_recaudado_efectivo ?? 0;

  const cierre = useCierreTurnoOperador({
    idTurno: idTurnoParaCierre,
    totalRecaudadoEfectivo: totalRecaudadoEfectivoTurno,
  });

  // Turno abierto efectivo: el abierto de la API o el recién cerrado para persistencia visual
  const turnoAbierto = useMemo(() => {
    if (cierre.ultimoTurnoCerrado) return cierre.ultimoTurnoCerrado;
    if (!turnos || turnos.length === 0) return null;
    return turnos[0];
  }, [turnos, cierre.ultimoTurnoCerrado]);

  const idTurno = turnoAbierto?.id_turno ?? 0;
  const idCaseta = turnoAbierto?.id_caseta ?? 1;

  // Casetas y Estaciones
  const {
    data: casetas,
    isLoading: cargandoCasetas,
    isError: errorCasetas,
    refetch: reintentarCasetas,
  } = useCasetas(1);

  const {
    data: estaciones,
    isLoading: cargandoEstaciones,
    isError: errorEstaciones,
    refetch: reintentarEstaciones,
  } = useEstaciones();

  const casetaActual = useMemo(() => {
    return casetas?.find((c) => c.id_caseta === idCaseta) ?? casetas?.[0];
  }, [casetas, idCaseta]);

  const estacionActual = useMemo(() => {
    const idEst = casetaActual?.id_estacion ?? 1;
    return estaciones?.find((e) => e.id_estacion === idEst) ?? estaciones?.[0];
  }, [estaciones, casetaActual]);

  // Transacciones del turno
  const {
    data: transaccionesData,
    isLoading: cargandoTransacciones,
    refetch: refetchTransacciones,
  } = useTransaccionesTurno(idTurno);

  // C1: Carril efectivo (respetando si VITE_USAR_MOCKS está activo)
  const { tipoCarrilEfectivo, carrilTexto } = useMemo(() => {
    const numero = casetaActual?.numero_carril ?? 2;
    if (carrilParam === 'mixto') {
      return {
        tipoCarrilEfectivo: 'MIXTO' as const,
        carrilTexto: `Carril ${numero} · mixto (dato de prueba)`,
      };
    }
    if (carrilParam === 'manual') {
      return {
        tipoCarrilEfectivo: 'MANUAL' as const,
        carrilTexto: `Carril ${numero} · manual (dato de prueba)`,
      };
    }
    if (carrilParam === 'exclusivo') {
      return {
        tipoCarrilEfectivo: 'TELEPEAJE_EXCLUSIVO' as const,
        carrilTexto: `Carril ${numero} · telepeaje exclusivo (dato de prueba)`,
      };
    }

    const real = casetaActual?.tipo_carril ?? 'MANUAL';
    const desc =
      real === 'MANUAL' ? 'manual' : real === 'MIXTO' ? 'mixto' : 'telepeaje exclusivo';
    return {
      tipoCarrilEfectivo: real as 'MANUAL' | 'MIXTO' | 'TELEPEAJE_EXCLUSIVO',
      carrilTexto: `Carril ${numero} · ${desc}`,
    };
  }, [carrilParam, casetaActual]);

  const turnoEstaCerrado = cierre.turnoEstaCerradoLocal || turnoAbierto?.estado === 'CERRADO';

  // Hook de Placa y Categoría
  const placaCat = usePlacaYCategoria({
    idEstacion: estacionActual?.id_estacion ?? 1,
    onLimpiarAvisos: () => {
      cobro.onCerrarAvisoExito();
    },
  });

  const recibidoInputRef = useRef<HTMLInputElement>(null);

  const onExitoCobro = useCallback(() => {
    placaCat.limpiarFormularioPlaca();
    refetchTransacciones();
    placaCat.placaInputRef.current?.focus();
  }, [placaCat, refetchTransacciones]);

  // Hook de Cobro
  const cobro = useCobroOperador({
    idTurno,
    fechaTurno: turnoAbierto?.fecha,
    tarifaActual: placaCat.tarifaActual,
    categoriaActiva: {
      numero: placaCat.categoriaActiva.numero,
      romano: placaCat.categoriaActiva.romano,
      tarifaId: placaCat.categoriaActiva.tarifaId,
    },
    placaNormalizada: placaCat.placaNormalizada,
    esPlacaValida: placaCat.esPlacaValida,
    tipoCarrilEfectivo,
    turnoEstaCerrado,
    operadorIdentificador: usuario?.codigo || usuario?.nombre || 'operador_caja',
    onExitoCobro,
  });

  // Lista de pasos registrados para la caja
  const pasosFormateados: PasoRegistrado[] = useMemo(() => {
    if (!transaccionesData) return [];
    return [...transaccionesData]
      .sort((a, b) => (b.id_transaccion ?? 0) - (a.id_transaccion ?? 0))
      .map((t) => {
        const horaStr = t.fecha_hora
          ? new Date(t.fecha_hora).toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : '00:00';

        const numCat = ROMANOS[`CAT_${t.id_categoria}`] ?? t.id_categoria;
        const catRomano = CODIGOS_A_ROMANO[`CAT_${numCat}`] ?? String(numCat);

        return {
          id_transaccion: t.id_transaccion,
          ticket: t.numero_ticket,
          hora: horaStr,
          placa: t.placa_detectada || '',
          categoriaRomano: catRomano,
          metodoPago: t.metodo_pago as MetodoPagoOperador,
          monto: t.monto_tarifa,
          montoTexto: formatearMoneda(t.monto_tarifa),
          anulada: t.anulada === true,
        };
      });
  }, [transaccionesData]);

  // Recaudado y fondo
  const totalRecaudadoEfectivo = turnoAbierto?.total_recaudado_efectivo ?? 0;
  const fondoInicialCaja = turnoAbierto?.fondo_inicial_caja ?? 100000;

  // C3: Estados de datos derivados exclusivamente de TanStack Query
  const estaCargandoTodo =
    cargandoTurnos ||
    cargandoCasetas ||
    cargandoEstaciones ||
    placaCat.cargandoTarifas ||
    cargandoTransacciones;

  const hayErrorCarga = Boolean(
    errorTurnos ||
    errorCasetas ||
    errorEstaciones ||
    placaCat.errorTarifas,
  );

  const reintentarCarga = () => {
    reintentarTurnos();
    reintentarCasetas();
    reintentarEstaciones();
    placaCat.reintentarTarifas();
    refetchTransacciones();
  };

  return {
    usuario,
    turnoAbierto,
    turnoEstaCerrado,
    estaCargandoTodo,
    hayErrorCarga,
    reintentarCarga,
    // Cabecera
    estacionNombre: estacionActual?.nombre ?? 'Estación Gambote',
    carrilTexto,
    idTurno: turnoAbierto?.id_turno ?? 9,
    fechaTurno: turnoAbierto?.fecha ?? '2026-10-06',
    esDiurno: turnoAbierto?.diurno ?? true,
    operadorNombre: usuario?.nombre ?? 'Operadora de caseta',
    // Placa
    placa: placaCat.placa,
    setPlaca: placaCat.setPlaca,
    placaInputRef: placaCat.placaInputRef,
    ayudaPlacaTexto: placaCat.ayudaPlacaInfo.texto,
    ayudaPlacaTipo: placaCat.ayudaPlacaInfo.tipo,
    // Categorías
    categorias: placaCat.categoriasVista,
    categoriaSeleccionadaCodigo: placaCat.categoriaActiva.codigo,
    onSeleccionarCategoria: placaCat.seleccionarCategoria,
    onSeleccionarCategoriaNumero: placaCat.seleccionarCategoriaNumero,
    avisoDiferenciaCategoria: placaCat.avisoDiferenciaCategoria,
    resolucionTexto: placaCat.resolucionTexto,
    tarifaActual: placaCat.tarifaActual,
    categoriaActivaRomano: placaCat.categoriaActiva.romano,
    // Métodos de pago
    metodoSeleccionado: cobro.metodoPago,
    metodos: cobro.metodos,
    onSeleccionarMetodo: cobro.seleccionarMetodo,
    avisoCarrilMetodo: cobro.avisoCarrilMetodo,
    // Efectivo
    recibidoTexto: cobro.recibidoTexto,
    onCambiarRecibido: cobro.setRecibidoTexto,
    opcionesRapidas: cobro.opcionesRapidas,
    onSeleccionarRapida: (val: number) => {
      cobro.setRecibidoTexto(String(val));
    },
    cambioCalculadoTexto: cobro.cambioInfo
      ? formatearMoneda(cobro.cambioInfo.cambio)
      : null,
    faltanteTexto:
      cobro.cambioInfo && !cobro.cambioInfo.esSuficiente
        ? formatearMoneda(cobro.cambioInfo.faltante)
        : null,
    recibidoInputRef,
    // Telepeaje
    tagSerial: cobro.tagSerial,
    saldoActual: cobro.saldoActual,
    saldoPosterior: cobro.saldoPosterior,
    esValidoParaDebitarTag: cobro.esValidoParaDebitarTag,
    mensajeErrorTag: cobro.mensajeErrorTag,
    // Botón Cobrar
    puedeCobrar: cobro.puedeCobrar,
    textoBotonCobrar: cobro.textoBotonCobrar,
    mensajeBloqueo: cobro.mensajeBloqueo,
    esExitoOListo: cobro.puedeCobrar || (cobro.avisoExito !== null && !placaCat.placa),
    estaRegistrandoPaso: cobro.estaRegistrandoPaso,
    ejecutarCobro: cobro.ejecutarCobro,
    avisoExito: cobro.avisoExito,
    onCerrarAvisoExito: cobro.onCerrarAvisoExito,
    errorCobro: cobro.errorCobro,
    // Resumen caja
    fondoInicialCaja,
    totalRecaudadoEfectivo,
    pasos: pasosFormateados,
    // Diálogo Cierre
    cierreModalAbierto: cierre.cierreModalAbierto,
    onAbrirCierre: cierre.onAbrirCierre,
    onCancelarCierre: cierre.onCancelarCierre,
    declaradoTexto: cierre.declaradoTexto,
    onCambiarDeclarado: cierre.setDeclaradoTexto,
    diagnosticoTexto: cierre.resultadoArqueo.texto,
    diagnosticoTipo: cierre.resultadoArqueo.diagnostico,
    diferenciaCierreTexto:
      cierre.resultadoArqueo.diferencia !== null
        ? `${cierre.resultadoArqueo.diferencia < 0 ? '− ' : '+ '}${formatearMoneda(Math.abs(cierre.resultadoArqueo.diferencia))}`
        : null,
    ejecutarConfirmarCierre: cierre.ejecutarConfirmarCierre,
    botonCierreTriggerRef: cierre.botonCierreTriggerRef,
    errorCierre: cierre.errorCierre,
    estaCerrandoTurno: cierre.esMutandoCierre,
  };
}
