import { useState, useMemo } from 'react';
import { useCuentaPorPlaca } from '@/api/recursos/telepeaje';
import { useRegistrarTransaccion } from '@/api/recursos/transacciones';
import { calcularCambio } from '@/api/dominio/cambio';
import { formatearMoneda } from '@/lib/formato';
import type {
  MetodoPagoOperador,
  MetodoPagoConfig,
  AvisoExitoPaso,
  OpcionRapida,
} from '../types';

interface OpcionesCobroOperador {
  idTurno: number;
  fechaTurno?: string;
  tarifaActual: number;
  categoriaActiva: {
    numero: number;
    romano: string;
    tarifaId?: number;
  };
  placaNormalizada: string;
  esPlacaValida: boolean;
  tipoCarrilEfectivo: 'MANUAL' | 'MIXTO' | 'TELEPEAJE_EXCLUSIVO';
  turnoEstaCerrado: boolean;
  operadorIdentificador: string;
  onExitoCobro: () => void;
}

export function useCobroOperador({
  idTurno,
  fechaTurno = '20261006',
  tarifaActual,
  categoriaActiva,
  placaNormalizada,
  esPlacaValida,
  tipoCarrilEfectivo,
  turnoEstaCerrado,
  operadorIdentificador,
  onExitoCobro,
}: OpcionesCobroOperador) {
  const [metodoPago, setMetodoPago] = useState<MetodoPagoOperador>('EFECTIVO');
  const [recibidoTexto, setRecibidoTexto] = useState('');
  const [avisoExito, setAvisoExito] = useState<AvisoExitoPaso | null>(null);
  const [errorCobro, setErrorCobro] = useState<string | null>(null);

  const registrarTransaccionMutation = useRegistrarTransaccion();

  // Consulta de cuenta telepeaje por placa
  const { data: cuentaTelepeaje, isLoading: cargandoCuentaTelepeaje } = useCuentaPorPlaca(
    placaNormalizada,
    {
      enabled: esPlacaValida && metodoPago === 'TELEPEAJE',
    },
  );

  // Validación y estado de telepeaje
  const estadoTelepeaje = useMemo(() => {
    if (!esPlacaValida || !cuentaTelepeaje) {
      return {
        tipo: 'SIN_CUENTA' as const,
        mensaje: 'Sin cuenta de telepeaje registrada para esta placa.',
        saldo: 0,
        puedeDebitar: false,
        saldoRestante: null,
      };
    }
    if (cuentaTelepeaje.estado_cuenta !== 'ACTIVA') {
      return {
        tipo: 'SUSPENDIDA' as const,
        mensaje: `La cuenta ${cuentaTelepeaje.tag_rfid_serial} está SUSPENDIDA. Cobro bloqueado.`,
        saldo: cuentaTelepeaje.saldo_disponible,
        puedeDebitar: false,
        saldoRestante: null,
      };
    }
    if (cuentaTelepeaje.saldo_disponible < tarifaActual) {
      return {
        tipo: 'INSUFICIENTE' as const,
        mensaje: `Saldo insuficiente ($ ${cuentaTelepeaje.saldo_disponible.toLocaleString('es-CO')} < ${formatearMoneda(tarifaActual)}). Pasa a cobro en efectivo.`,
        saldo: cuentaTelepeaje.saldo_disponible,
        puedeDebitar: false,
        saldoRestante: null,
      };
    }
    return {
      tipo: 'OK' as const,
      mensaje: `TAG ACTIVA · Saldo suficiente: ${formatearMoneda(cuentaTelepeaje.saldo_disponible)}`,
      saldo: cuentaTelepeaje.saldo_disponible,
      puedeDebitar: true,
      saldoRestante: cuentaTelepeaje.saldo_disponible - tarifaActual,
    };
  }, [esPlacaValida, cuentaTelepeaje, tarifaActual]);

  // Cálculo de efectivo
  const recNumerico = useMemo(() => {
    const lim = recibidoTexto.replace(/\D/g, '');
    return lim ? parseInt(lim, 10) : 0;
  }, [recibidoTexto]);

  const cambioInfo = useMemo(() => {
    if (!recibidoTexto) return null;
    return calcularCambio(recNumerico, tarifaActual);
  }, [recibidoTexto, recNumerico, tarifaActual]);

  // Opciones de billetes rápidos
  const opcionesRapidas: OpcionRapida[] = useMemo(() => {
    return [
      { etiqueta: 'Exacto', valor: tarifaActual },
      { etiqueta: '$ 20.000', valor: 20000 },
      { etiqueta: '$ 50.000', valor: 50000 },
      { etiqueta: '$ 100.000', valor: 100000 },
    ];
  }, [tarifaActual]);

  // Configuración de botones de métodos de pago
  const telepeajeDeshabilitado = tipoCarrilEfectivo === 'MANUAL';
  const efectivoDeshabilitado = tipoCarrilEfectivo === 'TELEPEAJE_EXCLUSIVO';

  const metodos: MetodoPagoConfig[] = useMemo(() => {
    return [
      {
        id: 'EFECTIVO',
        etiqueta: 'Efectivo',
        tecla: 'F1',
        deshabilitado: efectivoDeshabilitado,
        motivoDeshabilitado: efectivoDeshabilitado ? 'Solo carril de telepeaje' : undefined,
      },
      {
        id: 'TELEPEAJE',
        etiqueta: 'Telepeaje',
        tecla: 'F2',
        deshabilitado: telepeajeDeshabilitado,
        motivoDeshabilitado: telepeajeDeshabilitado ? 'Solo carril mixto' : undefined,
      },
      {
        id: 'EXENTO',
        etiqueta: 'Exento',
        tecla: 'F3',
        deshabilitado: false,
      },
    ];
  }, [telepeajeDeshabilitado, efectivoDeshabilitado]);

  // Motivo de deshabilitación de método de pago por carril
  const avisoCarrilMetodo = useMemo(() => {
    if (tipoCarrilEfectivo === 'MANUAL' && metodoPago === 'TELEPEAJE') {
      return 'Telepeaje no disponible: este carril es manual. Los pasos con TAG van por los carriles 3 y 4.';
    }
    if (tipoCarrilEfectivo === 'TELEPEAJE_EXCLUSIVO' && metodoPago === 'EFECTIVO') {
      return 'Efectivo no disponible: este carril es exclusivo para telepeaje.';
    }
    return null;
  }, [tipoCarrilEfectivo, metodoPago]);

  // Validación de cobro y diagnóstico de bloqueo
  const { puedeCobrar, bloqueoTexto, bloqueoTipo } = useMemo(() => {
    if (turnoEstaCerrado) {
      return {
        puedeCobrar: false,
        bloqueoTexto: 'Turno cerrado: no se pueden registrar transacciones.',
        bloqueoTipo: 'error' as const,
      };
    }
    if (!esPlacaValida) {
      return {
        puedeCobrar: false,
        bloqueoTexto: 'Ingresa una placa válida (3 letras y 3 números) para cobrar.',
        bloqueoTipo: 'info' as const,
      };
    }
    if (metodoPago === 'EFECTIVO') {
      if (efectivoDeshabilitado) {
        return {
          puedeCobrar: false,
          bloqueoTexto: 'Efectivo no permitido en este carril exclusivo.',
          bloqueoTipo: 'error' as const,
        };
      }
      if (!recibidoTexto) {
        return {
          puedeCobrar: false,
          bloqueoTexto: 'Digita el dinero recibido para calcular el cambio.',
          bloqueoTipo: 'info' as const,
        };
      }
      if (cambioInfo && !cambioInfo.esSuficiente) {
        return {
          puedeCobrar: false,
          bloqueoTexto: `Faltan ${formatearMoneda(cambioInfo.faltante)} para cubrir la tarifa.`,
          bloqueoTipo: 'error' as const,
        };
      }
    }
    if (metodoPago === 'TELEPEAJE') {
      if (telepeajeDeshabilitado) {
        return {
          puedeCobrar: false,
          bloqueoTexto: 'Telepeaje no disponible en carril manual.',
          bloqueoTipo: 'error' as const,
        };
      }
      if (cargandoCuentaTelepeaje) {
        return {
          puedeCobrar: false,
          bloqueoTexto: 'Consultando saldo de telepeaje...',
          bloqueoTipo: 'info' as const,
        };
      }
      if (estadoTelepeaje.tipo === 'SIN_CUENTA') {
        return {
          puedeCobrar: false,
          bloqueoTexto: 'No hay cuenta de telepeaje asociada a esta placa.',
          bloqueoTipo: 'error' as const,
        };
      }
      if (estadoTelepeaje.tipo === 'SUSPENDIDA') {
        return {
          puedeCobrar: false,
          bloqueoTexto: 'La cuenta de telepeaje está suspendida.',
          bloqueoTipo: 'error' as const,
        };
      }
      if (estadoTelepeaje.tipo === 'INSUFICIENTE') {
        return {
          puedeCobrar: false,
          bloqueoTexto: 'Saldo insuficiente en cuenta de telepeaje. Pasa a efectivo.',
          bloqueoTipo: 'error' as const,
        };
      }
    }
    return {
      puedeCobrar: true,
      bloqueoTexto: null,
      bloqueoTipo: null,
    };
  }, [
    turnoEstaCerrado,
    esPlacaValida,
    metodoPago,
    recibidoTexto,
    cambioInfo,
    efectivoDeshabilitado,
    telepeajeDeshabilitado,
    cargandoCuentaTelepeaje,
    estadoTelepeaje,
  ]);

  const textoBotonCobrar = useMemo(() => {
    if (turnoEstaCerrado) return 'Turno cerrado';
    if (metodoPago === 'EXENTO') return 'Registrar exento $ 0';
    return `Cobrar ${formatearMoneda(tarifaActual)}`;
  }, [turnoEstaCerrado, metodoPago, tarifaActual]);

  const seleccionarMetodo = (m: MetodoPagoOperador) => {
    if (m === 'TELEPEAJE' && telepeajeDeshabilitado) return;
    if (m === 'EFECTIVO' && efectivoDeshabilitado) return;
    setMetodoPago(m);
    setErrorCobro(null);
    setAvisoExito(null);
  };

  const ejecutarCobro = async () => {
    if (!puedeCobrar || turnoEstaCerrado || !idTurno) return;

    setErrorCobro(null);
    try {
      const fechaNum = fechaTurno.replace(/-/g, '');
      const numTicketAleatorio = String(Date.now()).slice(-5);
      const ticketGenerado = `TCK-${fechaNum}-${numTicketAleatorio}`;

      const respuesta = await registrarTransaccionMutation.mutateAsync({
        id_turno: idTurno,
        id_tarifa: categoriaActiva.tarifaId || 1,
        id_categoria: categoriaActiva.numero || 1,
        placa_detectada: placaNormalizada,
        monto_tarifa: metodoPago === 'EXENTO' ? 0 : tarifaActual,
        metodo_pago: metodoPago,
        numero_ticket: ticketGenerado,
        estado_paso: metodoPago === 'EXENTO' ? 'EXENTO' : 'APROBADO',
        recibido: metodoPago === 'EFECTIVO' ? recNumerico : undefined,
        usuario_sistema: operadorIdentificador,
      });

      let textoAviso = `${placaNormalizada} · Cat. ${categoriaActiva.romano} · ${metodoPago} · ${formatearMoneda(metodoPago === 'EXENTO' ? 0 : tarifaActual)}`;
      if (metodoPago === 'EFECTIVO' && respuesta.cambio != null) {
        textoAviso += ` · cambio ${formatearMoneda(respuesta.cambio)}`;
      }
      if (metodoPago === 'TELEPEAJE' && respuesta.saldo_posterior != null) {
        textoAviso += ` · saldo restante ${formatearMoneda(respuesta.saldo_posterior)}`;
      }

      setAvisoExito({
        ticket: respuesta.transaccion.numero_ticket,
        texto: textoAviso,
      });

      setRecibidoTexto('');
      onExitoCobro();
    } catch (err) {
      const mensaje = (err as Error).message || 'Error al procesar el cobro.';
      setErrorCobro(mensaje);
    }
  };

  const limpiarCobro = () => {
    setRecibidoTexto('');
    setErrorCobro(null);
  };

  return {
    metodoPago,
    metodos,
    seleccionarMetodo,
    recibidoTexto,
    setRecibidoTexto,
    recNumerico,
    cambioInfo,
    opcionesRapidas,
    estadoTelepeaje,
    tagSerial: cuentaTelepeaje?.tag_rfid_serial ?? '',
    saldoActual: cuentaTelepeaje ? cuentaTelepeaje.saldo_disponible : null,
    saldoPosterior: estadoTelepeaje.saldoRestante,
    esValidoParaDebitarTag: estadoTelepeaje.puedeDebitar,
    mensajeErrorTag: estadoTelepeaje.tipo !== 'OK' ? estadoTelepeaje.mensaje : null,
    cargandoCuentaTelepeaje,
    avisoCarrilMetodo,
    puedeCobrar,
    bloqueoTexto,
    bloqueoTipo,
    textoBotonCobrar,
    mensajeBloqueo: bloqueoTexto ?? '',
    avisoExito,
    onCerrarAvisoExito: () => setAvisoExito(null),
    errorCobro,
    ejecutarCobro,
    limpiarCobro,
    estaRegistrandoPaso: registrarTransaccionMutation.isPending,
  };
}
