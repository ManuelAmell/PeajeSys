import { useNavigate } from 'react-router-dom';
import { useSesion } from '@/lib/sesion';
import { BotonTema } from '@/components/layout/BotonTema';
import { Franja } from '@/components/layout/Franja';
import { Button } from '@/components/ui/button';

export default function AuthPage() {
  const { iniciarSesion } = useSesion();
  const navigate = useNavigate();

  // TODO(B2): sustituir por el inicio de sesión real con formulario, validaciones Zod y API
  const handleEntrarComo = (
    rol: 'RECAUDADOR' | 'SUPERVISOR' | 'ADMIN',
    nombre: string,
    id: string,
  ) => {
    iniciarSesion({ id, nombre, rol });
    if (rol === 'RECAUDADOR') navigate('/operador');
    else if (rol === 'SUPERVISOR') navigate('/supervisor');
    else navigate('/admin');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-fondo text-texto font-sans">
      {/* Columna visual izquierda inspirada en Login.dc.html */}
      <header className="flex-1 min-h-[320px] md:min-h-screen relative bg-asfalto flex flex-col justify-between overflow-hidden">
        <img
          src="/img/login-estacion.webp"
          alt="Estación de peaje al atardecer"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
        />
        <div className="relative z-10 m-6 md:m-10 p-6 rounded-[8px] bg-[#1f1d19]/90 text-white max-w-[460px] flex flex-col gap-3.5">
          <img
            src="/img/logo-horizontal-claro.png"
            alt="PeajeSys"
            width="200"
            height="54"
            className="w-[180px] md:w-[200px] h-auto object-contain object-left"
          />
          <p className="m-0 text-[18px] md:text-[20px] text-[#E4E0D6] leading-snug">
            Control, recaudo y arqueo de las estaciones de peaje Gambote y La
            Ceballos.
          </p>
        </div>
        <Franja className="relative z-10 mt-auto" />
      </header>

      {/* Columna derecha con formulario y stubs de acceso */}
      <main
        id="contenido-principal"
        tabIndex={-1}
        className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 outline-none"
      >
        <div className="w-full max-w-[440px] flex flex-col gap-6">
          <div className="self-end">
            <BotonTema variante="secundario" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-[36px] md:text-[40px] font-bold tracking-tight text-texto">
              Inicio de sesión
            </h1>
            <p className="text-[17px] text-texto-2">En construcción</p>
          </div>

          <div className="rounded-[8px] border-2 border-borde bg-superficie p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-texto">
                Accesos rápidos de prueba (DML):
              </span>
              <span className="text-[13px] text-texto-2">
                Usuarios temporales para desarrollo (TODO(B2): sustituir por el
                inicio de sesión real).
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="primario"
                onClick={() =>
                  handleEntrarComo(
                    'RECAUDADOR',
                    'María Fernanda López Martínez',
                    'EMP-002',
                  )
                }
              >
                Entrar como Recaudador (EMP-002)
              </Button>
              <Button
                type="button"
                variant="secundario"
                onClick={() =>
                  handleEntrarComo(
                    'SUPERVISOR',
                    'Juan David Rodríguez Silva',
                    'EMP-003',
                  )
                }
              >
                Entrar como Supervisor (EMP-003)
              </Button>
              <Button
                type="button"
                variant="secundario"
                onClick={() =>
                  handleEntrarComo('ADMIN', 'Administración', 'ADMIN-01')
                }
              >
                Entrar como Administrador (ADMIN-01)
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
