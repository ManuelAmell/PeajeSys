import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EstadoVacioProps {
  titulo?: string;
  mensaje?: string;
  className?: string;
  accion?: ReactNode;
}

export function EstadoVacio({
  titulo = 'No hay datos disponibles',
  mensaje = 'Cuando se registren datos aparecerán en esta sección.',
  className,
  accion,
}: EstadoVacioProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-2.5 rounded-[10px] border border-borde bg-superficie p-7 text-texto',
        className,
      )}
    >
      <strong className="text-[15px] text-texto-2">Vacío</strong>
      <p className="m-0 text-[20px] font-bold">{titulo}</p>
      {mensaje && <p className="m-0 text-[16px] text-texto-2">{mensaje}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

export interface EstadoCargandoProps {
  titulo?: string;
  mensaje?: string;
  className?: string;
}

export function EstadoCargando({
  titulo = 'Cargando información…',
  mensaje = 'Consultando los datos con el servidor.',
  className,
}: EstadoCargandoProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-3 rounded-[10px] border border-borde bg-superficie p-7 text-texto',
        className,
      )}
    >
      <strong className="text-[15px] text-texto-2">Cargando</strong>
      <p className="m-0 text-[20px] font-bold">{titulo}</p>
      <div
        aria-hidden="true"
        className="ps-franja-loading h-[8px] rounded-[2px]"
      />
      {mensaje && <p className="m-0 text-[15px] text-texto-2">{mensaje}</p>}
    </div>
  );
}

export interface EstadoErrorProps {
  titulo?: string;
  mensaje?: string;
  onReintentar?: () => void;
  className?: string;
}

export function EstadoError({
  titulo = 'Ocurrió un error al cargar los datos',
  mensaje = 'No se pudo completar la operación. Por favor revisa la conexión e inténtalo de nuevo.',
  onReintentar,
  className,
}: EstadoErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-2.5 rounded-[10px] border-2 border-error bg-superficie p-7 text-texto',
        className,
      )}
    >
      <strong className="text-[15px] font-bold text-error">Error</strong>
      <p className="m-0 text-[20px] font-bold">{titulo}</p>
      {mensaje && <p className="m-0 text-[16px] text-texto-2">{mensaje}</p>}
      {onReintentar && (
        <Button
          type="button"
          variant="secundario"
          onClick={onReintentar}
          className="self-start mt-2"
        >
          Reintentar
        </Button>
      )}
    </div>
  );
}

export interface EstadoDatosProps<T = unknown> {
  isPending?: boolean;
  isError?: boolean;
  error?: Error | null | unknown;
  data?: T | null | undefined;
  onReintentar?: () => void;
  tituloCargando?: string;
  mensajeCargando?: string;
  tituloError?: string;
  mensajeError?: string;
  tituloVacio?: string;
  mensajeVacio?: string;
  esVacio?: (data: T) => boolean;
  children: ReactNode | ((data: T) => ReactNode);
  className?: string;
}

export function EstadoDatos<T>({
  isPending,
  isError,
  error,
  data,
  onReintentar,
  tituloCargando,
  mensajeCargando,
  tituloError,
  mensajeError,
  tituloVacio,
  mensajeVacio,
  esVacio,
  children,
  className,
}: EstadoDatosProps<T>) {
  if (isPending) {
    return (
      <EstadoCargando
        titulo={tituloCargando}
        mensaje={mensajeCargando}
        className={className}
      />
    );
  }

  if (isError) {
    const detalleError =
      mensajeError || (error instanceof Error ? error.message : undefined);
    return (
      <EstadoError
        titulo={tituloError}
        mensaje={detalleError}
        onReintentar={onReintentar}
        className={className}
      />
    );
  }

  const datosVacios = esVacio
    ? data !== undefined && data !== null && esVacio(data)
    : data === null ||
      data === undefined ||
      (Array.isArray(data) && data.length === 0);

  if (datosVacios) {
    return (
      <EstadoVacio
        titulo={tituloVacio}
        mensaje={mensajeVacio}
        className={className}
      />
    );
  }

  if (typeof children === 'function' && data !== undefined && data !== null) {
    return <>{children(data)}</>;
  }

  return <>{children as ReactNode}</>;
}
