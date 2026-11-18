import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatearMoneda } from '@/lib/formato';
import { normalizarPlaca, esPlacaCompleta, obtenerAyudaPlaca } from '@/api/dominio/placa';
import { calcularCambio } from '@/api/dominio/cambio';
import { evaluarSaldoTelepeaje } from '@/api/dominio/telepeaje';
import { useSesion } from '@/lib/sesion';
import type { Turno } from '@/types';
import {
  useTurnos,
  useCasetas,
  useEstaciones,
  useCategorias,
  useTarifas,
  useTransaccionesTurno,
  useRegistrarTransaccion,
  useCerrarTurno,
  useVehiculo,
} from '@/api';
import type {
  CategoriaVista,
  MetodoPagoConfig,
  MetodoPagoOperador,
  OpcionRapida,
  PasoRegistrado,
  AvisoExitoPaso,
} from '../types';

const ROMANOS: Record<string, string> = {
  '1': 'I',
  '2': 'II',
  '3': 'III',
  '4': 'IV',
  '5': 'V',
  '6': 'VI',
  '7': 'VII',
  CAT_1: 'I',
  CAT_2: 'II',
  CAT_3: 'III',
  CAT_4: 'IV',
  CAT_5: 'V',
  CAT_6: 'VI',
  CAT_7: 'VII',
  CAT_I: 'I',
  CAT_II: 'II',
  CAT_III: 'III',
  CAT_IV: 'IV',
  CAT_V: 'V',
  CAT_VI: 'VI',
  CAT_VII: 'VII',
};

const NUMEROS_CAT: Record<string, number> = {
  CAT_1: 1,
  CAT_2: 2,
  CAT_3: 3,
  CAT_4: 4,
  CAT_5: 5,
  CAT_6: 6,
  CAT_7: 7,
  CAT_I: 1,
  CAT_II: 2,
  CAT_III: 3,
  CAT_IV: 4,
  CAT_V: 5,
  CAT_VI: 6,
  CAT_VII: 7,
};

export function useTerminalCobro() {
  const { usuario } = useSesion();
  const [searchParams] = useSearchParams();

  // Control de modo carril de prueba vía URL (?carril=mixto|manual|exclusivo)
  const carrilParam = searchParams.get('carril')?.toLowerCase();

  // Control de modo de simulación vía URL (?mock=error|lento|vacio)
  const mockParam = searchParams.get('mock')?.toLowerCase();
  const [errorSimulado, setErrorSimulado] = useState(mockParam === 'error');
  const [lentoSimulado, setLentoSimulado] = useState(mockParam === 'lento');
  const vacioSimulado = mockParam === 'vacio';

  // Estados de captura de cobro
  const [placa, setPlaca] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('CAT_I');
  const [categoriaFueModificadaManualmente, setCategoriaFueModificadaManualmente] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPagoOperador>('EFECTIVO');
  const [recibidoTexto, setRecibidoTexto] = useState('');
  const [avisoExito, setAvisoExito] = useState<AvisoExitoPaso | null>(null);

  // Estados para diálogo de cierre de turno y persistencia tras cerrar
  const [cierreModalAbierto, setCierreModalAbierto] = useState(false);
  const [declaradoTexto, setDeclaradoTexto] = useState('');
  const [turnoEstaCerradoLocal, setTurnoEstaCerradoLocal] = useState(false);
  const [ultimoTurnoCerrado, setUltimoTurnoCerrado] = useState<Turno | null>(null);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  // Ref para devolver foco a la placa tras cobrar
  const placaInputRef = useRef<HTMLInputElement>(null);
  const recibidoInputRef = useRef<HTMLInputElement>(null);
  const botonCierreTriggerRef = useRef<HTMLButtonElement>(null);

  // Consultas de API
  const {
    data: turnos,
    isLoading: cargandoTurnos,
    isError: errorTurnos,
    refetch: reintentarTurnos,
  } = useTurnos({ estado: 'ABIERTO' });

  // Identificar el turno del operador actual (o el recién cerrado)
  const turnoAbierto = useMemo(() => {
    if (vacioSimulado) return null;
    if (ultimoTurnoCerrado) return ultimoTurnoCerrado;
    if (!turnos || turnos.length === 0) return null;
    if (!usuario) return turnos[0];

    const codigo = usuario.codigo || usuario.id;
    const userIdNum = parseInt(usuario.id, 10);

    // Buscar por id numérico de operador o por código de empleado
    const encontrado = turnos.find((t) => {
      if (!isNaN(userIdNum) && t.id_operador === userIdNum) return true;
      if (codigo === 'EMP-002' && t.id_operador === 2) return true;
      if (codigo === 'EMP-004' && t.id_operador === 4) return true;
      if (codigo === 'EMP-001' && t.id_operador === 1) return true;
      return false;
    });

    if (codigo === 'EMP-001') {
      return null;
    }

    return encontrado ?? turnos.find((t) => t.id_turno === 9) ?? turnos[0];
  }, [turnos, usuario, vacioSimulado, ultimoTurnoCerrado]);

  const idTurno = turnoAbierto?.id_turno ?? 0;
  const idCaseta = turnoAbierto?.id_caseta ?? 1;

  // Casetas y Estaciones
  const { data: casetas, isLoading: cargandoCasetas, isError: errorCasetas } = useCasetas();
  const { data: estaciones, isLoading: cargandoEstaciones, isError: errorEstaciones } = useEstaciones();

  const casetaActual = useMemo(() => {
    return casetas?.find((c) => c.id_caseta === idCaseta);
  }, [casetas, idCaseta]);

  const idEstacion = casetaActual?.id_estacion ?? 1;

  const estacionActual = useMemo(() => {
    return estaciones?.find((e) => e.id_estacion === idEstacion);
  }, [estaciones, idEstacion]);

  // Categorías y Tarifas vigentes de la estación
  const { data: categoriasData, isLoading: cargandoCategorias, isError: errorCategorias } = useCategorias();
  const { data: tarifasData, isLoading: cargandoTarifas, isError: errorTarifas } = useTarifas({
    estacion: idEstacion,
    vigente: true,
  });

  // Transacciones del turno
  const {
    data: transaccionesData,
    refetch: refetchTransacciones,
  } = useTransaccionesTurno(idTurno, { enabled: idTurno > 0 });

  // Mutaciones
  const registrarTransaccionMutation = useRegistrarTransaccion();
  const cerrarTurnoMutation = useCerrarTurno();

  // Consulta de vehículo por placa cuando está completa
  const placaNormalizada = useMemo(() => normalizarPlaca(placa), [placa]);
  const placaEsValida = useMemo(() => esPlacaCompleta(placaNormalizada), [placaNormalizada]);

  const { data: detalleVehiculo } = useVehiculo(placaNormalizada, {
    enabled: placaEsValida,
  });



  // Carril efectivo y texto de exhibición
  const { tipoCarrilEfectivo, carrilTexto } = useMemo(() => {
    const numero = casetaActual?.numero_carril ?? 2;
    if (carrilParam === 'mixto') {
      return {
        tipoCarrilEfectivo: 'MIXTO',
        carrilTexto: `Carril ${numero} · mixto (dato de prueba)`,
      };
    }
    if (carrilParam === 'manual') {
      return {
        tipoCarrilEfectivo: 'MANUAL',
        carrilTexto: `Carril ${numero} · manual (dato de prueba)`,
      };
    }
    if (carrilParam === 'exclusivo') {
      return {
        tipoCarrilEfectivo: 'TELEPEAJE_EXCLUSIVO',
        carrilTexto: `Carril ${numero} · telepeaje exclusivo (dato de prueba)`,
      };
    }

    const real = casetaActual?.tipo_carril ?? 'MANUAL';
    const desc = real === 'MIXTO' ? 'mixto' : real === 'TELEPEAJE_EXCLUSIVO' ? 'telepeaje exclusivo' : 'manual';
    return {
      tipoCarrilEfectivo: real,
      carrilTexto: `Carril ${numero} · ${desc}`,
    };
  }, [carrilParam, casetaActual]);

  // Selección automática de categoría por placa registrada
  useEffect(() => {
    if (detalleVehiculo?.vehiculo && !categoriaFueModificadaManualmente) {
      const idCat = detalleVehiculo.vehiculo.id_categoria;
      const catCod = `CAT_${ROMANOS[String(idCat)] ?? idCat}`;
      // Si el código existe en categoríasData
      const catEncontrada = categoriasData?.find(
        (c) => c.id_categoria === idCat || c.codigo === catCod,
      );
      if (catEncontrada) {
        setCategoriaSeleccionada(catEncontrada.codigo);
      }
    }
  }, [detalleVehiculo, categoriaFueModificadaManualmente, categoriasData]);

  // Sincronizar método si carril deshabilita telepeaje
  useEffect(() => {
    if (tipoCarrilEfectivo === 'MANUAL' && metodoPago === 'TELEPEAJE') {
      setMetodoPago('EFECTIVO');
    }
    if (tipoCarrilEfectivo === 'TELEPEAJE_EXCLUSIVO' && metodoPago === 'EFECTIVO') {
      setMetodoPago('TELEPEAJE');
    }
  }, [tipoCarrilEfectivo, metodoPago]);

  // Mapeo enriquecido de categorías
  const categoriasVista: CategoriaVista[] = useMemo(() => {
    const listado = categoriasData ?? [
      { id_categoria: 1, codigo: 'CAT_I', descripcion: 'Automóviles, camperos y camionetas' },
      { id_categoria: 2, codigo: 'CAT_II', descripcion: 'Buses y busetas' },
      { id_categoria: 3, codigo: 'CAT_III', descripcion: 'Camiones de 2 ejes pequeños' },
      { id_categoria: 4, codigo: 'CAT_IV', descripcion: 'Camiones de 2 ejes grandes (C2)' },
      { id_categoria: 5, codigo: 'CAT_V', descripcion: 'Camiones de 3 y 4 ejes (C3-C4)' },
      { id_categoria: 6, codigo: 'CAT_VI', descripcion: 'Camiones de 5 ejes (C5)' },
      { id_categoria: 7, codigo: 'CAT_VII', descripcion: 'Camiones de 6 o más ejes (C6)' },
    ];

    return listado.map((cat, idx) => {
      const num = NUMEROS_CAT[cat.codigo] ?? idx + 1;
      const tarifa = tarifasData?.find((t) => t.id_categoria === cat.id_categoria && t.activa);
      const monto = tarifa ? tarifa.monto : 0;
      const deshabilitada = !tarifa;

      return {
        codigo: cat.codigo,
        romano: ROMANOS[cat.codigo] ?? String(num),
        descripcion: cat.descripcion,
        numero: num,
        tarifaMonto: monto,
        tarifaId: tarifa?.id_tarifa ?? 0,
        tarifaTexto: monto > 0 ? formatearMoneda(monto) : 'Sin tarifa',
        deshabilitada,
        motivoDeshabilitada: deshabilitada ? 'Sin tarifa vigente' : undefined,
        siluetaUrl: `/img/cat-${num}.png`,
      };
    });
  }, [categoriasData, tarifasData]);

  // Categoría activa actualmente
  const categoriaActiva = useMemo(() => {
    return (
      categoriasVista.find((c) => c.codigo === categoriaSeleccionada) ??
      categoriasVista[0] ?? {
        codigo: 'CAT_I',
        romano: 'I',
        descripcion: 'Automóviles',
        numero: 1,
        tarifaMonto: 10500,
        tarifaId: 1,
        tarifaTexto: '$ 10.500',
        deshabilitada: false,
        siluetaUrl: '/img/cat-1.png',
      }
    );
  }, [categoriasVista, categoriaSeleccionada]);

  const tarifaActual = metodoPago === 'EXENTO' ? 0 : categoriaActiva.tarifaMonto;

  // Advertencia de categoría discordante
  const avisoDiferenciaCategoria = useMemo(() => {
    if (!detalleVehiculo?.vehiculo || turnoEstaCerradoLocal) return null;
    const catRegistradaNum = detalleVehiculo.vehiculo.id_categoria;
    const catRegistradaCod = `CAT_${catRegistradaNum}`;
    const regRomano = ROMANOS[catRegistradaCod] || String(catRegistradaNum);

    if (categoriaActiva.codigo !== catRegistradaCod && categoriaActiva.numero !== catRegistradaNum) {
      return `La categoría registrada de ${placaNormalizada} es ${regRomano}. Revisa los ejes antes de cobrar.`;
    }
    return null;
  }, [detalleVehiculo, turnoEstaCerradoLocal, categoriaActiva, placaNormalizada]);

  // Opciones de métodos de pago
  const metodosConfig: MetodoPagoConfig[] = useMemo(() => {
    const telepeajeDeshabilitado = tipoCarrilEfectivo === 'MANUAL';
    const efectivoDeshabilitado = tipoCarrilEfectivo === 'TELEPEAJE_EXCLUSIVO';

    return [
      {
        id: 'EFECTIVO',
        etiqueta: 'Efectivo',
        tecla: 'F1',
        deshabilitado: efectivoDeshabilitado,
        motivoDeshabilitado: efectivoDeshabilitado ? 'Solo telepeaje' : undefined,
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
  }, [tipoCarrilEfectivo]);

  const avisoCarrilMetodo = useMemo(() => {
    if (tipoCarrilEfectivo === 'MANUAL') {
      return 'Telepeaje no disponible: este carril es manual. Los pasos con TAG van por los carriles 3 y 4.';
    }
    if (tipoCarrilEfectivo === 'TELEPEAJE_EXCLUSIVO') {
      return 'Efectivo no disponible: este carril es exclusivo para telepeaje.';
    }
    return null;
  }, [tipoCarrilEfectivo]);

  // Ayuda del campo de placa
  const ayudaPlacaInfo = useMemo(() => {
    const vehiculoInfo = detalleVehiculo?.vehiculo
      ? {
          categoriaRomano:
            ROMANOS[String(detalleVehiculo.vehiculo.id_categoria)] ??
            ROMANOS[`CAT_${detalleVehiculo.vehiculo.id_categoria}`] ??
            'I',
          estadoCuenta: detalleVehiculo.cuenta?.estado_cuenta ?? 'ACTIVA',
        }
      : null;

    return obtenerAyudaPlaca(placaNormalizada, vehiculoInfo);
  }, [placaNormalizada, detalleVehiculo]);

  // Cálculo de efectivo
  const recNumerico = parseInt(recibidoTexto.replace(/\D/g, ''), 10) || 0;
  const calculoEfectivo = useMemo(() => {
    return calcularCambio(recNumerico, tarifaActual);
  }, [recNumerico, tarifaActual]);

  // Botones de monto rápido
  const opcionesRapidas: OpcionRapida[] = useMemo(() => {
    return [
      { etiqueta: 'Exacto', valor: tarifaActual },
      { etiqueta: '$ 20.000', valor: 20000 },
      { etiqueta: '$ 50.000', valor: 50000 },
      { etiqueta: '$ 100.000', valor: 100000 },
    ];
  }, [tarifaActual]);

  // Evaluación de telepeaje
  const evaluacionTelepeaje = useMemo(() => {
    if (metodoPago !== 'TELEPEAJE') {
      return { puedeDebitar: false, saldoPosterior: 0, mensaje: null };
    }
    const cuentaInfo = detalleVehiculo?.cuenta
      ? {
          tag: detalleVehiculo.cuenta.tag_rfid_serial,
          saldo: detalleVehiculo.cuenta.saldo_disponible,
          estado: detalleVehiculo.cuenta.estado_cuenta,
        }
      : null;

    return evaluarSaldoTelepeaje(cuentaInfo, tarifaActual);
  }, [metodoPago, detalleVehiculo, tarifaActual]);

  // Evaluación de bloqueo y habilitación del cobro
  const { puedeCobrar, mensajeBloqueo, textoBotonCobrar } = useMemo(() => {
    const estaCerrado = turnoEstaCerradoLocal || turnoAbierto?.estado === 'CERRADO';

    if (estaCerrado) {
      return {
        puedeCobrar: false,
        mensajeBloqueo: 'El turno está cerrado: ya no se pueden registrar pasos.',
        textoBotonCobrar: 'Turno cerrado',
      };
    }

    if (!placaNormalizada) {
      return {
        puedeCobrar: false,
        mensajeBloqueo: avisoExito
          ? `Ticket ${avisoExito.ticket} emitido. Escribe la placa del siguiente vehículo.`
          : 'Escribe la placa del vehículo.',
        textoBotonCobrar:
          metodoPago === 'EXENTO'
            ? 'Registrar paso exento'
            : `Cobrar ${formatearMoneda(tarifaActual)} y emitir ticket`,
      };
    }

    if (!placaEsValida) {
      return {
        puedeCobrar: false,
        mensajeBloqueo: 'La placa debe tener tres letras y tres números.',
        textoBotonCobrar:
          metodoPago === 'EXENTO'
            ? 'Registrar paso exento'
            : `Cobrar ${formatearMoneda(tarifaActual)} y emitir ticket`,
      };
    }

    if (categoriaActiva.deshabilitada) {
      return {
        puedeCobrar: false,
        mensajeBloqueo: 'La categoría seleccionada no tiene tarifa vigente en esta estación.',
        textoBotonCobrar: 'Sin tarifa vigente',
      };
    }

    if (metodoPago === 'EFECTIVO') {
      if (!recibidoTexto) {
        return {
          puedeCobrar: false,
          mensajeBloqueo: 'Ingresa el valor recibido.',
          textoBotonCobrar: `Cobrar ${formatearMoneda(tarifaActual)} y emitir ticket`,
        };
      }
      if (!calculoEfectivo.esSuficiente) {
        return {
          puedeCobrar: false,
          mensajeBloqueo: calculoEfectivo.mensaje || 'Dinero insuficiente.',
          textoBotonCobrar: `Cobrar ${formatearMoneda(tarifaActual)} y emitir ticket`,
        };
      }
    }

    if (metodoPago === 'TELEPEAJE') {
      if (!evaluacionTelepeaje.puedeDebitar) {
        return {
          puedeCobrar: false,
          mensajeBloqueo: evaluacionTelepeaje.mensaje || 'Telepeaje no disponible.',
          textoBotonCobrar: `Cobrar ${formatearMoneda(tarifaActual)} y emitir ticket`,
        };
      }
    }

    return {
      puedeCobrar: true,
      mensajeBloqueo: 'Todo listo para cobrar.',
      textoBotonCobrar:
        metodoPago === 'EXENTO'
          ? 'Registrar paso exento'
          : `Cobrar ${formatearMoneda(tarifaActual)} y emitir ticket`,
    };
  }, [
    turnoEstaCerradoLocal,
    turnoAbierto,
    placaNormalizada,
    placaEsValida,
    categoriaActiva,
    metodoPago,
    recibidoTexto,
    calculoEfectivo,
    evaluacionTelepeaje,
    tarifaActual,
    avisoExito,
  ]);

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

        const catRomano = ROMANOS[`CAT_${t.id_categoria}`] ?? String(t.id_categoria);

        return {
          id_transaccion: t.id_transaccion,
          ticket: t.numero_ticket,
          hora: horaStr,
          placa: t.placa_detectada || '',
          categoriaRomano: catRomano,
          metodoPago: t.metodo_pago as MetodoPagoOperador,
          monto: t.monto_tarifa,
          montoTexto: formatearMoneda(t.monto_tarifa),
        };
      });
  }, [transaccionesData]);

  // Recaudado en efectivo del turno
  const totalRecaudadoEfectivo = turnoAbierto?.total_recaudado_efectivo ?? 0;
  const fondoInicialCaja = turnoAbierto?.fondo_inicial_caja ?? 100000;

  // Acción: registrar cobro
  const ejecutarCobro = async () => {
    if (!puedeCobrar || !turnoAbierto) return;

    try {
      const fechaNum = (turnoAbierto.fecha || '20261006').replace(/-/g, '');
      const numTicketAleatorio = String(Date.now()).slice(-5);
      const ticketGenerado = `TCK-${fechaNum}-${numTicketAleatorio}`;

      const respuesta = await registrarTransaccionMutation.mutateAsync({
        id_turno: turnoAbierto.id_turno,
        id_tarifa: categoriaActiva.tarifaId || 1,
        id_categoria: categoriaActiva.numero || 1,
        placa_detectada: placaNormalizada,
        monto_tarifa: tarifaActual,
        metodo_pago: metodoPago,
        numero_ticket: ticketGenerado,
        estado_paso: metodoPago === 'EXENTO' ? 'EXENTO' : 'APROBADO',
        recibido: metodoPago === 'EFECTIVO' ? recNumerico : undefined,
        usuario_sistema: usuario?.codigo || usuario?.nombre || 'operador_caja',
      });

      let textoAviso = `${placaNormalizada} · Cat. ${categoriaActiva.romano} · ${metodoPago} · ${formatearMoneda(tarifaActual)}`;
      if (metodoPago === 'EFECTIVO' && respuesta.cambio !== null) {
        textoAviso += ` · cambio ${formatearMoneda(respuesta.cambio)}`;
      }
      if (metodoPago === 'TELEPEAJE' && respuesta.saldo_posterior !== null) {
        textoAviso += ` · saldo restante ${formatearMoneda(respuesta.saldo_posterior)}`;
      }

      setAvisoExito({
        ticket: respuesta.transaccion.numero_ticket,
        texto: textoAviso,
      });

      // Limpiar formulario y reenfocar placa
      setPlaca('');
      setRecibidoTexto('');
      setCategoriaSeleccionada('CAT_I');
      setCategoriaFueModificadaManualmente(false);
      refetchTransacciones();

      placaInputRef.current?.focus();
    } catch (err) {
      // El error se muestra en pantalla
      setErrorCierre((err as Error).message);
    }
  };

  // Acción: confirmar cierre de turno
  const ejecutarConfirmarCierre = async () => {
    const declNum = parseInt(declaradoTexto.replace(/\D/g, ''), 10);
    if (isNaN(declNum) || declNum < 0 || !turnoAbierto) return;

    setErrorCierre(null);
    try {
      const turnoCerradoRes = await cerrarTurnoMutation.mutateAsync({
        idTurno: turnoAbierto.id_turno,
        total_declarado_cierre: declNum,
      });

      setUltimoTurnoCerrado(turnoCerradoRes);
      setTurnoEstaCerradoLocal(true);
      setCierreModalAbierto(false);
      setDeclaradoTexto('');
      setAvisoExito(null);
    } catch (err) {
      const errorMsg =
        (err as { respuesta?: { error?: { mensaje?: string } } })?.respuesta?.error?.mensaje ||
        (err as Error).message ||
        'Error al procesar el cierre del turno.';
      setErrorCierre(errorMsg);
    }
  };

  const estaCargandoTodo =
    lentoSimulado ||
    cargandoTurnos ||
    cargandoCasetas ||
    cargandoEstaciones ||
    cargandoCategorias ||
    cargandoTarifas;

  const hayErrorCarga =
    errorSimulado ||
    errorTurnos ||
    errorCasetas ||
    errorEstaciones ||
    errorCategorias ||
    errorTarifas;

  return {
    usuario,
    turnoAbierto,
    turnoEstaCerrado: turnoEstaCerradoLocal || turnoAbierto?.estado === 'CERRADO',
    estaCargandoTodo,
    hayErrorCarga,
    reintentarCarga: () => {
      setErrorSimulado(false);
      setLentoSimulado(false);
      reintentarTurnos();
    },
    // Datos de cabecera
    estacionNombre: estacionActual?.nombre ?? 'Estación Gambote',
    carrilTexto,
    idTurno: turnoAbierto?.id_turno ?? 9,
    fechaTurno: turnoAbierto?.fecha ?? '2026-10-06',
    esDiurno: turnoAbierto?.diurno ?? true,
    operadorNombre: usuario?.nombre ?? 'Operadora de caseta',
    // Placa
    placa,
    setPlaca: (nuevaPlaca: string) => {
      setPlaca(nuevaPlaca);
      setAvisoExito(null);
    },
    placaInputRef,
    ayudaPlacaTexto: ayudaPlacaInfo.texto,
    ayudaPlacaTipo: ayudaPlacaInfo.tipo,
    // Categorías
    categorias: categoriasVista,
    categoriaSeleccionadaCodigo: categoriaActiva.codigo,
    onSeleccionarCategoria: (codigo: string) => {
      setCategoriaSeleccionada(codigo);
      setCategoriaFueModificadaManualmente(true);
      setAvisoExito(null);
    },
    onSeleccionarCategoriaNumero: (num: number) => {
      const encontrada = categoriasVista.find((c) => c.numero === num && !c.deshabilitada);
      if (encontrada) {
        setCategoriaSeleccionada(encontrada.codigo);
        setCategoriaFueModificadaManualmente(true);
        setAvisoExito(null);
      }
    },
    avisoDiferenciaCategoria,
    resolucionTexto: tarifasData?.[0]?.resolucion_legal ?? 'Res. MinTransporte 0045/2026',
    // Métodos de pago
    metodos: metodosConfig,
    metodoSeleccionado: metodoPago,
    onSeleccionarMetodo: (metodo: MetodoPagoOperador) => {
      setMetodoPago(metodo);
      setAvisoExito(null);
    },
    avisoCarrilMetodo,
    // Efectivo
    recibidoTexto,
    onCambiarRecibido: setRecibidoTexto,
    opcionesRapidas,
    onSeleccionarRapida: (monto: number) => {
      setRecibidoTexto(String(monto));
      setAvisoExito(null);
    },
    tarifaActual,
    recibidoInputRef,
    // Telepeaje
    tagSerial: detalleVehiculo?.cuenta?.tag_rfid_serial ?? '',
    saldoActual: detalleVehiculo?.cuenta ? detalleVehiculo.cuenta.saldo_disponible : null,
    saldoPosterior: evaluacionTelepeaje.puedeDebitar ? evaluacionTelepeaje.saldoPosterior : null,
    esValidoParaDebitarTag: evaluacionTelepeaje.puedeDebitar,
    mensajeErrorTag: evaluacionTelepeaje.mensaje,
    // Cobro
    puedeCobrar,
    textoBotonCobrar,
    mensajeBloqueo,
    esExitoOListo: puedeCobrar || (avisoExito !== null && !placa),
    estaRegistrandoPaso: registrarTransaccionMutation.isPending,
    ejecutarCobro,
    avisoExito,
    onCerrarAvisoExito: () => setAvisoExito(null),
    // Resumen de caja
    fondoInicialCaja,
    totalRecaudadoEfectivo,
    pasos: pasosFormateados,
    // Modal de Cierre
    cierreModalAbierto,
    botonCierreTriggerRef,
    onAbrirCierre: () => {
      setCierreModalAbierto(true);
      setErrorCierre(null);
    },
    onCancelarCierre: () => {
      setCierreModalAbierto(false);
      setDeclaradoTexto('');
      setErrorCierre(null);
    },
    declaradoTexto,
    onCambiarDeclarado: setDeclaradoTexto,
    ejecutarConfirmarCierre,
    estaCerrandoTurno: cerrarTurnoMutation.isPending,
    errorCierre,
  };
}
