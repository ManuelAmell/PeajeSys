export interface BotonCobrarProps {
  onCobrar: () => void;
  puedeCobrar: boolean;
  textoBoton: string;
  mensajeBloqueo: string;
  esExitoOListo: boolean;
  estaCargando?: boolean;
}

export function BotonCobrar({
  onCobrar,
  puedeCobrar,
  textoBoton,
  mensajeBloqueo,
  esExitoOListo,
  estaCargando = false,
}: BotonCobrarProps) {
  const getBloqueoColorClase = () => {
    if (esExitoOListo) return 'text-correcto-texto font-semibold';
    if (!puedeCobrar && mensajeBloqueo) return 'text-error font-semibold';
    return 'text-texto-2';
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        id="op-btn-cobrar"
        type="button"
        onClick={onCobrar}
        disabled={!puedeCobrar || estaCargando}
        aria-describedby="op-bloqueo"
        className={`min-h-[76px] px-4 md:px-7 py-3 rounded-[6px] text-[20px] sm:text-[22px] md:text-[26px] font-bold text-left flex items-center justify-between gap-4 transition-colors focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 ${
          puedeCobrar && !estaCargando
            ? 'border-[3px] border-texto bg-[#FCBD17] text-sobre-acento cursor-pointer ps-primario shadow-sm'
            : 'border-[3px] border-borde-fuerte bg-superficie-2 text-texto-2 cursor-not-allowed opacity-75'
        }`}
      >
        <span>{estaCargando ? 'Registrando paso…' : textoBoton}</span>
        <kbd
          className={`font-semibold text-[15px] md:text-[16px] rounded-[4px] px-2.5 py-1 shrink-0 ${
            puedeCobrar && !estaCargando
              ? 'bg-[#1f1d19] text-[#FCBD17]'
              : 'bg-borde text-texto-2'
          }`}
        >
          Enter
        </kbd>
      </button>

      <span
        id="op-bloqueo"
        role="status"
        className={`text-[16px] leading-tight ${getBloqueoColorClase()}`}
      >
        {mensajeBloqueo}
      </span>

      <span className="text-[14px] text-texto-2">
        Atajos: números 1 a 7 (categoría), F1 a F3 (método de pago), Enter (cobrar).
      </span>
    </div>
  );
}
