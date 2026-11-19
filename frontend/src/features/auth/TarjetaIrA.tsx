import { Button } from '@/components/ui/button';

export interface TarjetaIrAProps {
  nombre: string;
  rolTxt: string;
  codigo: string;
  destinoTxt: string;
  alNavegar: () => void;
  alVolver: () => void;
}

/**
 * Tarjeta «Ir a …» del prototipo Login.dc.html que se muestra tras entrar.
 */
export function TarjetaIrA({
  nombre,
  rolTxt,
  codigo,
  destinoTxt,
  alNavegar,
  alVolver,
}: TarjetaIrAProps) {
  return (
    <div
      role="status"
      className="flex flex-col gap-[16px] rounded-[8px] border-2 border-correcto bg-superficie p-[24px]"
    >
      <div className="flex flex-col gap-[4px]">
        <strong className="text-[24px] font-bold">Hola, {nombre}</strong>
        <span className="text-[17px] text-texto-2">
          {rolTxt} · {codigo}
        </span>
      </div>
      <button
        type="button"
        onClick={alNavegar}
        className="ps-enlace flex h-[56px] items-center justify-center rounded-[6px] border-[3px] border-texto bg-marca-amarillo text-[19px] font-bold text-sobre-acento"
      >
        {destinoTxt}
      </button>
      <Button
        type="button"
        variant="secundario"
        onClick={alVolver}
        className="h-[48px] text-[17px]"
      >
        No soy yo, volver
      </Button>
    </div>
  );
}
