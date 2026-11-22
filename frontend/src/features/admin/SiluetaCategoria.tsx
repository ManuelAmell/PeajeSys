import { useState } from 'react';
import { Truck } from 'lucide-react';
import { rutaSilueta, tieneSilueta } from './ayudas';

export interface SiluetaCategoriaProps {
  idCategoria: number;
  ancho: number;
  alto: number;
}

/**
 * Silueta de la categoría. Si la categoría no tiene imagen procesada (una
 * categoría nueva) o la imagen no carga, muestra un icono por defecto en lugar
 * de un <img> roto.
 */
export function SiluetaCategoria({
  idCategoria,
  ancho,
  alto,
}: SiluetaCategoriaProps) {
  const [fallo, setFallo] = useState(false);

  if (fallo || !tieneSilueta(idCategoria)) {
    return (
      <span
        data-testid="silueta-por-defecto"
        aria-hidden="true"
        style={{ width: ancho, height: alto }}
        className="inline-flex shrink-0 items-center justify-center rounded-[4px] bg-superficie-2 text-texto-2"
      >
        <Truck className="h-[60%] w-auto" strokeWidth={1.75} />
      </span>
    );
  }

  return (
    <img
      className="ps-silueta"
      src={rutaSilueta(idCategoria)}
      alt=""
      width={ancho}
      height={alto}
      onError={() => setFallo(true)}
    />
  );
}
