import { useState, useMemo, useRef, useEffect } from 'react';
import { normalizarPlaca, esPlacaCompleta, obtenerAyudaPlaca } from '@/api/dominio/placa';
import { useVehiculo } from '@/api/recursos/vehiculos';
import { useTarifas } from '@/api/recursos/tarifas';
import { formatearMoneda } from '@/lib/formato';
import type { CategoriaVista } from '../types';

export const ROMANOS: Record<string, number> = {
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
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

export const CODIGOS_A_ROMANO: Record<string, string> = {
  CAT_I: 'I',
  CAT_II: 'II',
  CAT_III: 'III',
  CAT_IV: 'IV',
  CAT_V: 'V',
  CAT_VI: 'VI',
  CAT_VII: 'VII',
};

export const NUMERO_A_ROMANO: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
};

export const CATEGORIAS_BASE: Array<{
  codigo: string;
  romano: string;
  numero: number;
  descripcion: string;
  silueta: string;
}> = [
  { codigo: 'CAT_I', romano: 'I', numero: 1, descripcion: 'Automóviles camperos...', silueta: '/img/cat-1.png' },
  { codigo: 'CAT_II', romano: 'II', numero: 2, descripcion: 'Buses y busetas', silueta: '/img/cat-2.png' },
  { codigo: 'CAT_III', romano: 'III', numero: 3, descripcion: 'Camiones de 2 ejes...', silueta: '/img/cat-3.png' },
  { codigo: 'CAT_IV', romano: 'IV', numero: 4, descripcion: 'Camiones de 2 ejes...', silueta: '/img/cat-4.png' },
  { codigo: 'CAT_V', romano: 'V', numero: 5, descripcion: 'Camiones de 3 y 4 ej...', silueta: '/img/cat-5.png' },
  { codigo: 'CAT_VI', romano: 'VI', numero: 6, descripcion: 'Camiones de 5 ejes...', silueta: '/img/cat-6.png' },
  { codigo: 'CAT_VII', romano: 'VII', numero: 7, descripcion: 'Camiones de 6 o más...', silueta: '/img/cat-7.png' },
];

interface OpcionesPlacaYCategoria {
  idEstacion?: number;
  onLimpiarAvisos?: () => void;
}

export function usePlacaYCategoria({ idEstacion = 1, onLimpiarAvisos }: OpcionesPlacaYCategoria) {
  const [placa, setPlacaState] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('CAT_I');
  const [categoriaFueModificadaManualmente, setCategoriaFueModificadaManualmente] = useState(false);
  const placaInputRef = useRef<HTMLInputElement>(null);

  const placaNormalizada = useMemo(() => normalizarPlaca(placa), [placa]);
  const esPlacaValida = useMemo(() => esPlacaCompleta(placaNormalizada), [placaNormalizada]);

  // Consulta de vehículo registrado en BD
  const { data: detalleVehiculo } = useVehiculo(placaNormalizada, {
    enabled: esPlacaValida,
  });

  const vehiculoRegistrado = detalleVehiculo?.vehiculo;

  const ayudaPlacaInfo = useMemo(() => {
    return obtenerAyudaPlaca(
      placa,
      detalleVehiculo
        ? {
            categoriaRomano:
              NUMERO_A_ROMANO[detalleVehiculo.vehiculo.id_categoria] ||
              String(detalleVehiculo.vehiculo.id_categoria),
            estadoCuenta: detalleVehiculo.cuenta?.estado_cuenta || 'SIN TAG',
          }
        : null,
    );
  }, [placa, detalleVehiculo]);

  // Consulta de tarifas vigentes
  const {
    data: tarifas,
    isLoading: cargandoTarifas,
    isError: errorTarifas,
    refetch: reintentarTarifas,
  } = useTarifas({ estacion: idEstacion });

  // Selección automática de categoría cuando la placa está registrada
  useEffect(() => {
    if (vehiculoRegistrado?.id_categoria && !categoriaFueModificadaManualmente) {
      const idCat = vehiculoRegistrado.id_categoria;
      const numRom = ROMANOS[String(idCat)] ?? ROMANOS[`CAT_${idCat}`] ?? idCat;
      const romanosMap = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
      const codAuto = `CAT_${romanosMap[numRom - 1] ?? 'I'}`;
      setCategoriaSeleccionada(codAuto);
    }
  }, [vehiculoRegistrado, categoriaFueModificadaManualmente]);

  const setPlaca = (nuevaPlaca: string) => {
    setPlacaState(nuevaPlaca);
    setCategoriaFueModificadaManualmente(false);
    onLimpiarAvisos?.();
  };

  const seleccionarCategoria = (codigo: string) => {
    setCategoriaSeleccionada(codigo);
    setCategoriaFueModificadaManualmente(true);
    onLimpiarAvisos?.();
  };

  const seleccionarCategoriaNumero = (num: number) => {
    if (num >= 1 && num <= 7) {
      const cat = CATEGORIAS_BASE[num - 1];
      if (cat) {
        seleccionarCategoria(cat.codigo);
      }
    }
  };

  const limpiarFormularioPlaca = () => {
    setPlacaState('');
    setCategoriaSeleccionada('CAT_I');
    setCategoriaFueModificadaManualmente(false);
  };

  // Construcción de tarjetas de categorías con precios reales
  const categoriasVista: CategoriaVista[] = useMemo(() => {
    return CATEGORIAS_BASE.map((cat) => {
      const tarifaEncontrada = tarifas?.find(
        (t) =>
          t.id_categoria === cat.numero &&
          t.id_estacion === idEstacion &&
          t.activa === true,
      );

      const monto = tarifaEncontrada?.monto ?? 0;
      const tieneTarifa = Boolean(tarifaEncontrada && monto > 0);

      return {
        codigo: cat.codigo,
        romano: cat.romano,
        descripcion: cat.descripcion,
        numero: cat.numero,
        tarifaMonto: monto,
        tarifaId: tarifaEncontrada?.id_tarifa ?? 0,
        tarifaTexto: tieneTarifa ? formatearMoneda(monto) : 'Sin tarifa',
        deshabilitada: !tieneTarifa,
        motivoDeshabilitada: !tieneTarifa
          ? 'No hay tarifa vigente para esta categoría en la estación.'
          : undefined,
        siluetaUrl: cat.silueta,
      };
    });
  }, [tarifas, idEstacion]);

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

  const tarifaActual = categoriaActiva.tarifaMonto;

  // Advertencia de discrepancia de categoría
  const avisoDiferenciaCategoria = useMemo(() => {
    if (!vehiculoRegistrado?.id_categoria) return null;
    const catRegId = vehiculoRegistrado.id_categoria;
    const numReg = ROMANOS[String(catRegId)] ?? ROMANOS[`CAT_${catRegId}`] ?? catRegId;
    if (categoriaActiva.numero !== numReg) {
      const romanosMap = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
      const regRomano = romanosMap[numReg - 1] ?? String(numReg);
      return `Vehículo registrado como categoría ${regRomano}. Estás cobrando como categoría ${categoriaActiva.romano}.`;
    }
    return null;
  }, [vehiculoRegistrado, categoriaActiva]);

  return {
    placa,
    setPlaca,
    placaNormalizada,
    esPlacaValida,
    placaInputRef,
    ayudaPlacaInfo,
    vehiculoRegistrado,
    categoriaSeleccionada,
    categoriaActiva,
    categoriasVista,
    seleccionarCategoria,
    seleccionarCategoriaNumero,
    limpiarFormularioPlaca,
    tarifaActual,
    avisoDiferenciaCategoria,
    cargandoTarifas,
    errorTarifas,
    reintentarTarifas,
    resolucionTexto: tarifas?.[0]?.resolucion_legal ?? 'Res. MinTransporte 0045/2026',
  };
}
