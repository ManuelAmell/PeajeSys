import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSesion } from '@/lib/sesion';
import { ErrorApi } from '@/api/clienteHttp';
import { useCrearTarifa } from '@/api/recursos/tarifas';
import { generarHistorialTarifa } from '@/api/dominio/tarifa';
import type { EntradaHistorialTarifa } from '@/api/dominio/tarifa';
import { formatearMoneda } from '@/lib/formato';
import type { Tarifa } from '@/types';
import {
  esquemaFormularioTarifa,
  type DatosFormularioTarifa,
  type ValoresFormularioTarifa,
} from './esquemaTarifaForm';

export interface TarifaEnEdicion {
  idEstacion: number;
  estacionNombre: string;
  idCategoria: number;
  roman: string;
  /** Tarifa activa actual; null cuando la categoría aún no tiene tarifa. */
  tarifaActiva: Tarifa | null;
}

export interface DialogoTarifaProps {
  tarifa: TarifaEnEdicion;
  onCerrar: () => void;
  /** entrada es null cuando el monto no cambió: no se registra en el historial. */
  onGuardada: (entrada: EntradaHistorialTarifa | null, aviso: string) => void;
}

/**
 * Diálogo de edición de tarifa de Admin.dc.html con React Hook Form + Zod.
 * El guardado siempre crea una tarifa nueva (POST /api/tarifas): el servidor
 * cierra la vigente y conserva el historial con sus fechas.
 */
export function DialogoTarifa({
  tarifa,
  onCerrar,
  onGuardada,
}: DialogoTarifaProps) {
  const { usuario } = useSesion();
  const crear = useCrearTarifa();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  // Captura en render (antes de que Radix mueva el foco al diálogo en su
  // efecto de montaje) para poder devolverlo a quien abrió el diálogo.
  if (focoPrevio.current === null) {
    focoPrevio.current = document.activeElement as HTMLElement | null;
  }

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ValoresFormularioTarifa, unknown, DatosFormularioTarifa>({
    resolver: zodResolver(esquemaFormularioTarifa),
    defaultValues: {
      monto: tarifa.tarifaActiva ? String(tarifa.tarifaActiva.monto) : '',
      resolucion: tarifa.tarifaActiva?.resolucion_legal ?? '',
      desde: tarifa.tarifaActiva?.fecha_inicio_vigencia ?? '',
      hasta: tarifa.tarifaActiva?.fecha_fin_vigencia ?? '',
    },
  });

  const enviar = async (datos: DatosFormularioTarifa) => {
    setErrorServidor(null);
    const activa = tarifa.tarifaActiva;
    const mismoMonto = activa !== null && activa.monto === datos.monto;
    const todoIgual =
      mismoMonto &&
      datos.resolucion === (activa.resolucion_legal ?? '') &&
      datos.desde === activa.fecha_inicio_vigencia &&
      datos.hasta === (activa.fecha_fin_vigencia ?? null);
    if (todoIgual) {
      onGuardada(
        null,
        `Sin cambios: la tarifa de la categoría ${tarifa.roman} en ${tarifa.estacionNombre} ya es ${formatearMoneda(datos.monto)}.`,
      );
      return;
    }
    try {
      const nueva = await crear.mutateAsync({
        id_estacion: tarifa.idEstacion,
        id_categoria: tarifa.idCategoria,
        monto: datos.monto,
        resolucion_legal: datos.resolucion,
        fecha_inicio_vigencia: datos.desde,
        fecha_fin_vigencia: datos.hasta,
      });

      if (mismoMonto) {
        onGuardada(
          null,
          `Sin cambios en el monto de la categoría ${tarifa.roman} en ${tarifa.estacionNombre} (${formatearMoneda(nueva.monto)}); se guardó la nueva resolución o vigencia.`,
        );
        return;
      }

      const entrada = generarHistorialTarifa(
        tarifa.tarifaActiva,
        {
          monto: nueva.monto,
          resolucion: nueva.resolucion_legal ?? datos.resolucion,
          admin: usuario?.codigo ?? 'ADM-001',
        },
        tarifa.estacionNombre,
        tarifa.roman,
      );

      onGuardada(
        entrada,
        `Tarifa de la categoría ${tarifa.roman} en ${tarifa.estacionNombre} guardada: ${formatearMoneda(nueva.monto)}.`,
      );
    } catch (error) {
      const errorApi = error instanceof ErrorApi ? error : null;
      if (errorApi?.campos?.monto) {
        setError(
          'monto',
          { type: 'servidor', message: errorApi.campos.monto },
          { shouldFocus: true },
        );
      } else if (errorApi?.campos?.fecha_fin_vigencia) {
        setError(
          'hasta',
          { type: 'servidor', message: errorApi.campos.fecha_fin_vigencia },
          { shouldFocus: true },
        );
      } else if (errorApi?.campos?.resolucion_legal) {
        setError(
          'resolucion',
          { type: 'servidor', message: errorApi.campos.resolucion_legal },
          { shouldFocus: true },
        );
      } else {
        setErrorServidor(
          errorApi?.message ?? 'No se pudo conectar con el servidor.',
        );
      }
    }
  };

  const campoError = errors.monto
    ? 'monto'
    : errors.resolucion
      ? 'resolucion'
      : errors.desde
        ? 'desde'
        : errors.hasta
          ? 'hasta'
          : null;

  return (
    <Dialog open onOpenChange={(abierta) => !abierta && onCerrar()}>
      <DialogContent
        aria-labelledby="t-editar"
        className="max-w-[520px] gap-4 rounded-[10px] border-[3px] border-texto p-7"
        onCloseAutoFocus={(evento) => {
          evento.preventDefault();
          focoPrevio.current?.focus();
        }}
      >
        <DialogTitle id="t-editar" className="text-[26px] font-bold">
          {tarifa.tarifaActiva ? 'Editar tarifa' : 'Definir tarifa'} · categoría{' '}
          {tarifa.roman}
        </DialogTitle>
        <DialogDescription className="text-[16px]">
          {tarifa.estacionNombre}. El cambio queda en el historial.
        </DialogDescription>

        <form
          onSubmit={handleSubmit(enviar)}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="ad-monto" className="text-[16px] font-semibold">
              Monto en pesos
            </label>
            <input
              id="ad-monto"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              aria-invalid={campoError === 'monto'}
              aria-describedby={
                campoError === 'monto' ? 'ad-monto-error' : undefined
              }
              className={`h-[52px] rounded-[6px] border-2 bg-superficie px-[14px] text-[24px] font-bold text-texto ${
                campoError === 'monto' ? 'border-error' : 'border-texto'
              }`}
              {...register('monto', {
                onChange: (evento) => {
                  evento.currentTarget.value = evento.currentTarget.value
                    .replace(/\D/g, '')
                    .slice(0, 9);
                },
              })}
            />
            {errors.monto && (
              <p
                id="ad-monto-error"
                role="alert"
                className="m-0 text-[15px] font-semibold text-error"
              >
                {errors.monto.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="ad-res" className="text-[16px] font-semibold">
              Resolución que la autoriza
            </label>
            <input
              id="ad-res"
              autoComplete="off"
              maxLength={100}
              aria-invalid={campoError === 'resolucion'}
              aria-describedby={
                campoError === 'resolucion' ? 'ad-res-error' : undefined
              }
              className={`h-[48px] rounded-[6px] border-2 bg-superficie px-[14px] text-[18px] font-medium text-texto ${
                campoError === 'resolucion'
                  ? 'border-error'
                  : 'border-borde-fuerte'
              }`}
              {...register('resolucion')}
            />
            {errors.resolucion && (
              <p
                id="ad-res-error"
                role="alert"
                className="m-0 text-[15px] font-semibold text-error"
              >
                {errors.resolucion.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="ad-desde" className="text-[16px] font-semibold">
                Vigente desde
              </label>
              <input
                id="ad-desde"
                type="date"
                aria-invalid={campoError === 'desde'}
                aria-describedby={
                  campoError === 'desde' ? 'ad-desde-error' : undefined
                }
                className={`h-[48px] rounded-[6px] border-2 bg-superficie px-[14px] text-[18px] font-medium text-texto ${
                  campoError === 'desde'
                    ? 'border-error'
                    : 'border-borde-fuerte'
                }`}
                {...register('desde')}
              />
              {errors.desde && (
                <p
                  id="ad-desde-error"
                  role="alert"
                  className="m-0 text-[15px] font-semibold text-error"
                >
                  {errors.desde.message}
                </p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="ad-hasta" className="text-[16px] font-semibold">
                Vigente hasta
              </label>
              <input
                id="ad-hasta"
                type="date"
                aria-invalid={campoError === 'hasta'}
                aria-describedby={
                  campoError === 'hasta' ? 'ad-hasta-error' : undefined
                }
                className={`h-[48px] rounded-[6px] border-2 bg-superficie px-[14px] text-[18px] font-medium text-texto ${
                  campoError === 'hasta'
                    ? 'border-error'
                    : 'border-borde-fuerte'
                }`}
                {...register('hasta')}
              />
              {errors.hasta && (
                <p
                  id="ad-hasta-error"
                  role="alert"
                  className="m-0 text-[15px] font-semibold text-error"
                >
                  {errors.hasta.message}
                </p>
              )}
            </div>
          </div>

          {errorServidor && (
            <p
              role="alert"
              className="m-0 rounded-[6px] bg-error-fondo p-[10px] px-[14px] text-[16px] font-semibold text-error"
            >
              {errorServidor}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secundario"
              onClick={onCerrar}
              className="h-[52px] px-[20px] text-[17px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primario"
              disabled={isSubmitting || crear.isPending}
              className="h-[52px] border-[3px] px-[20px] text-[17px]"
            >
              Guardar tarifa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
