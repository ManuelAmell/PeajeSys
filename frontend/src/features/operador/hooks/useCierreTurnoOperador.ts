import { useState, useMemo, useRef } from 'react';
import { useCerrarTurno } from '@/api/recursos/turnos';
import { diagnosticarArqueo } from '@/api/dominio/arqueo';
import type { Turno } from '@/types';

interface OpcionesCierreTurnoOperador {
  idTurno: number;
  totalRecaudadoEfectivo: number;
  onTurnoCerrado?: (turno: Turno) => void;
}

export function useCierreTurnoOperador({
  idTurno,
  totalRecaudadoEfectivo,
  onTurnoCerrado,
}: OpcionesCierreTurnoOperador) {
  const [cierreModalAbierto, setCierreModalAbierto] = useState(false);
  const [declaradoTexto, setDeclaradoTexto] = useState('');
  const [turnoEstaCerradoLocal, setTurnoEstaCerradoLocal] = useState(false);
  const [ultimoTurnoCerrado, setUltimoTurnoCerrado] = useState<Turno | null>(null);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  const botonCierreTriggerRef = useRef<HTMLButtonElement>(null);
  const cerrarTurnoMutation = useCerrarTurno();

  const declaradoNumerico = useMemo(() => {
    if (!declaradoTexto.trim()) return null;
    const limpio = declaradoTexto.replace(/\D/g, '');
    return limpio ? parseInt(limpio, 10) : 0;
  }, [declaradoTexto]);

  const resultadoArqueo = useMemo(() => {
    return diagnosticarArqueo(declaradoNumerico, totalRecaudadoEfectivo);
  }, [declaradoNumerico, totalRecaudadoEfectivo]);

  const onAbrirCierre = () => {
    setErrorCierre(null);
    setCierreModalAbierto(true);
  };

  const onCancelarCierre = () => {
    setCierreModalAbierto(false);
    setErrorCierre(null);
    botonCierreTriggerRef.current?.focus();
  };

  const ejecutarConfirmarCierre = async () => {
    if (declaradoNumerico === null || declaradoNumerico < 0 || !idTurno) return;

    setErrorCierre(null);
    try {
      const turnoCerradoRes = await cerrarTurnoMutation.mutateAsync({
        idTurno,
        total_declarado_cierre: declaradoNumerico,
      });

      setUltimoTurnoCerrado(turnoCerradoRes);
      setTurnoEstaCerradoLocal(true);
      setCierreModalAbierto(false);
      setDeclaradoTexto('');
      onTurnoCerrado?.(turnoCerradoRes);
      botonCierreTriggerRef.current?.focus();
    } catch (err) {
      const mensaje = (err as Error).message || 'No se pudo cerrar el turno.';
      setErrorCierre(mensaje);
    }
  };

  return {
    cierreModalAbierto,
    onAbrirCierre,
    onCancelarCierre,
    declaradoTexto,
    setDeclaradoTexto,
    declaradoNumerico,
    resultadoArqueo,
    ejecutarConfirmarCierre,
    botonCierreTriggerRef,
    turnoEstaCerradoLocal,
    ultimoTurnoCerrado,
    errorCierre,
    esMutandoCierre: cerrarTurnoMutation.isPending,
  };
}
