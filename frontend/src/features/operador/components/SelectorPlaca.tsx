import { RefObject } from 'react';

export interface SelectorPlacaProps {
  placa: string;
  onCambiarPlaca: (nuevaPlaca: string) => void;
  ayudaTexto: string;
  ayudaTipo: 'neutro' | 'error' | 'exito';
  inputRef?: RefObject<HTMLInputElement>;
  deshabilitado?: boolean;
}

export function SelectorPlaca({
  placa,
  onCambiarPlaca,
  ayudaTexto,
  ayudaTipo,
  inputRef,
  deshabilitado = false,
}: SelectorPlacaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = String(e.target.value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    onCambiarPlaca(val);
  };

  const getAyudaColorClass = () => {
    switch (ayudaTipo) {
      case 'error':
        return 'text-error';
      case 'exito':
        return 'text-correcto-texto font-semibold';
      case 'neutro':
      default:
        return 'text-texto-2 font-medium';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="op-placa" className="text-[16px] font-semibold text-texto">
        Placa
      </label>
      <input
        ref={inputRef}
        id="op-placa"
        type="text"
        value={placa}
        onChange={handleChange}
        maxLength={6}
        autoComplete="off"
        spellCheck={false}
        placeholder="ABC123"
        disabled={deshabilitado}
        aria-describedby="op-placa-ayuda"
        className="h-[76px] w-full max-w-[360px] px-5 border-[3px] border-texto rounded-[6px] bg-superficie text-texto font-bold text-[36px] md:text-[42px] tracking-[0.12em] uppercase box-border focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <span
        id="op-placa-ayuda"
        className={`text-[16px] leading-tight ${getAyudaColorClass()}`}
      >
        {ayudaTexto}
      </span>
    </div>
  );
}
