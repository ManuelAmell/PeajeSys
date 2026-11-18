import { useRef, KeyboardEvent } from 'react';
import { type IdPestanaSupervisor, PESTANAS_SUPERVISOR } from '../tipos';

interface PestanasSupervisionProps {
  pestanaActiva: IdPestanaSupervisor;
  onCambiarPestana: (id: IdPestanaSupervisor) => void;
}

export function PestanasSupervision({
  pestanaActiva,
  onCambiarPestana,
}: PestanasSupervisionProps) {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let proximoIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        proximoIndex = (index + 1) % PESTANAS_SUPERVISOR.length;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        proximoIndex = (index - 1 + PESTANAS_SUPERVISOR.length) % PESTANAS_SUPERVISOR.length;
        break;
      case 'Home':
        e.preventDefault();
        proximoIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        proximoIndex = PESTANAS_SUPERVISOR.length - 1;
        break;
      default:
        return;
    }

    if (proximoIndex >= 0) {
      const botonObjetivo = tabsRef.current[proximoIndex];
      const pestanaObjetivo = PESTANAS_SUPERVISOR[proximoIndex];
      if (botonObjetivo && pestanaObjetivo) {
        botonObjetivo.focus();
        onCambiarPestana(pestanaObjetivo.id);
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Secciones de supervisión"
      className="flex flex-wrap gap-2 items-center"
    >
      {PESTANAS_SUPERVISOR.map((p, index) => {
        const esActiva = pestanaActiva === p.id;

        return (
          <button
            key={p.id}
            id={`tab-${p.id}`}
            role="tab"
            type="button"
            aria-selected={esActiva}
            aria-controls={`panel-${p.id}`}
            tabIndex={esActiva ? 0 : -1}
            ref={(el) => {
              tabsRef.current[index] = el;
            }}
            onClick={() => onCambiarPestana(p.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`h-[48px] px-4 md:px-5 rounded-[6px] text-[16px] md:text-[17px] transition-colors cursor-pointer focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 ${
              esActiva
                ? 'bg-[#FCBD17] text-sobre-acento border-[3px] border-texto font-bold shadow-sm'
                : 'bg-superficie text-texto border-2 border-borde font-semibold hover:bg-hover'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
