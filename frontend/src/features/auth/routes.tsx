import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSesion } from '@/lib/sesion';
import { rutaPorDefectoSegunRol } from '@/lib/roles';
import { BotonTema } from '@/components/layout/BotonTema';
import { Franja } from '@/components/layout/Franja';
import { FormularioLogin, PrecargaCredenciales } from './FormularioLogin';
import { SeccionUsuariosPrueba } from './SeccionUsuariosPrueba';
import { CLAVE_PRUEBA, UsuarioDemo } from './usuariosDemo';

/**
 * Vista de inicio de sesión de Login.dc.html: panel izquierdo con la foto de la
 * estación, el logo y el texto; panel derecho con el formulario, el botón de
 * tema, los mensajes de error y, tras entrar, la tarjeta «Ir a …».
 */
export default function AuthPage() {
  const { usuario } = useSesion();
  const usarMocks = import.meta.env.VITE_USAR_MOCKS === 'true';
  const [precarga, setPrecarga] = useState<PrecargaCredenciales | null>(null);

  // Si ya hay sesión al llegar a /login, redirige a la página del rol.
  const [sesionPrevia] = useState(() => usuario);
  if (sesionPrevia) {
    return <Navigate to={rutaPorDefectoSegunRol(sesionPrevia.rol)} replace />;
  }

  const usarDemo = (demo: UsuarioDemo) => {
    setPrecarga({ codigo: demo.codigo, clave: CLAVE_PRUEBA });
  };

  return (
    <div className="flex min-h-screen flex-wrap bg-fondo font-sans text-texto">
      <header className="relative flex min-h-[360px] flex-1 basis-[520px] flex-col overflow-hidden bg-asfalto md:min-h-screen">
        <img
          src="/img/login-estacion.webp"
          alt="Estación de peaje al atardecer, con casetas bajo una cubierta, barreras amarillas y negras y conos naranjas"
          width={1280}
          height={1589}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[center_70%]"
        />
        <div className="relative z-10 m-[32px] flex max-w-[460px] flex-col gap-[14px] rounded-[8px] bg-[#1f1d19]/90 p-[24px] text-white md:px-[28px]">
          <img
            src="/img/logo-horizontal-claro.png"
            alt="PeajeSys"
            width={200}
            height={54}
            className="h-[54px] w-[200px] object-contain object-left"
          />
          <p className="m-0 text-[18px] leading-[1.4] md:text-[20px]">
            Control, recaudo y arqueo de las estaciones de peaje Gambote y La
            Ceballos.
          </p>
        </div>
        <Franja className="relative z-10 mt-auto" />
      </header>

      <main
        id="contenido-principal"
        tabIndex={-1}
        className="flex min-w-0 flex-1 basis-[420px] items-center justify-center px-[24px] py-[48px] outline-none"
      >
        <div className="flex w-full max-w-[440px] flex-col gap-[24px]">
          <div className="self-end">
            <BotonTema variante="secundario" />
          </div>

          <div className="flex flex-col gap-[6px]">
            <h1 className="m-0 text-[36px] font-bold tracking-tight md:text-[40px]">
              Inicia sesión
            </h1>
            <p className="m-0 text-[17px] text-texto-2 md:text-[18px]">
              Entra con tu código de empleado. El menú que ves depende de tu
              rol.
            </p>
          </div>

          <FormularioLogin precarga={precarga} />

          {usarMocks && <SeccionUsuariosPrueba alUsar={usarDemo} />}
        </div>
      </main>
    </div>
  );
}
