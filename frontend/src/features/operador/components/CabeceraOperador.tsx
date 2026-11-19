import { useNavigate } from 'react-router-dom';
import { BotonTema } from '@/components/layout/BotonTema';
import { useSesion } from '@/lib/sesion';

export interface CabeceraOperadorProps {
  estacionNombre: string;
  carrilTexto: string;
  idTurno: number;
  fechaTurno: string;
  esDiurno: boolean;
  operadorNombre: string;
  cerrado: boolean;
  onAbrirCierre: () => void;
  botonCierreRef?: React.RefObject<HTMLButtonElement>;
}

export function CabeceraOperador({
  estacionNombre,
  carrilTexto,
  idTurno,
  fechaTurno,
  esDiurno,
  operadorNombre,
  cerrado,
  onAbrirCierre,
  botonCierreRef,
}: CabeceraOperadorProps) {
  const { cerrarSesion } = useSesion();
  const navigate = useNavigate();

  const handleCerrarSesion = () => {
    cerrarSesion();
    navigate('/login');
  };

  // Formato de fecha legible DD/MM/YYYY
  const fechaPartes = fechaTurno.split('-');
  const fechaFormateada =
    fechaPartes.length === 3
      ? `${fechaPartes[2]}/${fechaPartes[1]}/${fechaPartes[0]}`
      : fechaTurno;

  return (
    <header className="bg-asfalto text-white px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 md:gap-8">
      <img
        src="/img/logo-horizontal-claro.png"
        alt="PeajeSys"
        width="150"
        height="40"
        className="w-[150px] h-[40px] object-contain object-left shrink-0"
      />

      <dl className="m-0 flex flex-wrap gap-x-7 gap-y-2 text-[16px]">
        <div className="flex flex-col">
          <dt className="text-[#C9C3B7] text-[14px]">Estación</dt>
          <dd className="m-0 font-semibold">
            {estacionNombre} · {carrilTexto}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[#C9C3B7] text-[14px]">Turno</dt>
          <dd className="m-0 font-semibold">
            {idTurno} · {fechaFormateada} · {esDiurno ? 'diurno' : 'nocturno'}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[#C9C3B7] text-[14px]">Operadora</dt>
          <dd className="m-0 font-semibold">{operadorNombre}</dd>
        </div>
      </dl>

      <div className="flex items-center gap-3.5 flex-wrap">
        {cerrado ? (
          <span className="px-2.5 py-1 rounded-[4px] bg-superficie-2 text-texto-3 text-[15px] font-bold">
            CERRADO
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-[4px] bg-correcto-fondo text-correcto text-[15px] font-bold">
            ABIERTO
          </span>
        )}

        <BotonTema variante="oscuro" />

        <button
          ref={botonCierreRef}
          type="button"
          onClick={onAbrirCierre}
          disabled={cerrado}
          className="ps-oscuro h-[44px] px-4.5 rounded-[6px] border-2 border-white bg-transparent text-white text-[16px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-[3px] focus-visible:outline-white focus-visible:outline-offset-2"
        >
          Cerrar turno
        </button>

        <button
          type="button"
          onClick={handleCerrarSesion}
          className="ps-oscuro h-[44px] px-3.5 rounded-[6px] border border-white/50 bg-transparent text-white/90 text-[15px] font-medium transition-colors hover:border-white focus-visible:outline-[3px] focus-visible:outline-white focus-visible:outline-offset-2"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
