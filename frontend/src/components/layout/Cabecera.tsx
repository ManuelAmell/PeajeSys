import { useNavigate } from 'react-router-dom';
import { useSesion } from '@/lib/sesion';
import { BotonTema } from './BotonTema';
import { cn } from '@/lib/utils';

export interface CabeceraProps {
  titulo?: string;
  subtitulo?: string;
  className?: string;
}

/**
 * Cabecera principal compartida de PeajeSys.
 * Fondo --asfalto (#1f1d19 en claro / #0a0908 en oscuro), texto blanco,
 * logo, título de la vista, datos de la persona autenticada, alternador de tema y cierre de sesión.
 * Diseñada con flex-wrap para ser totalmente responsiva a 1280 px y 390 px sin desbordamiento.
 */
export function Cabecera({ titulo, subtitulo, className }: CabeceraProps) {
  const { usuario, cerrarSesion } = useSesion();
  const navigate = useNavigate();

  const handleCerrarSesion = () => {
    cerrarSesion();
    navigate('/login');
  };

  return (
    <header
      className={cn(
        'bg-asfalto text-white px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 md:gap-6',
        className,
      )}
    >
      <div className="flex items-center gap-4 flex-wrap">
        <img
          src="/img/logo-horizontal-claro.png"
          alt="PeajeSys"
          width="150"
          height="40"
          className="h-[36px] md:h-[40px] w-auto object-contain object-left"
        />
        {titulo && (
          <div className="flex flex-col">
            <span className="text-[17px] md:text-[18px] font-semibold tracking-tight text-white">
              {titulo}
            </span>
            {subtitulo && (
              <span className="text-[13px] text-[#C9C3B7]">{subtitulo}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-5 flex-wrap text-[15px] md:text-[16px]">
        {usuario && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-white/95">{usuario.nombre}</span>
            <span className="text-white/60">·</span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-[13px] font-semibold text-[#FCBD17]">
              {usuario.rol}
            </span>
          </div>
        )}

        <BotonTema variante="oscuro" />

        {usuario && (
          <button
            type="button"
            onClick={handleCerrarSesion}
            className="ps-oscuro h-[44px] px-4 rounded-[6px] border-2 border-white bg-transparent font-semibold text-white transition-colors focus-visible:outline-[3px] focus-visible:outline-white focus-visible:outline-offset-2"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </header>
  );
}
