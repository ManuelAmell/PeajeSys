import { USUARIOS_DEMO, UsuarioDemo } from './usuariosDemo';

export interface SeccionUsuariosPruebaProps {
  alUsar: (usuario: UsuarioDemo) => void;
}

/**
 * Sección «Usuarios de prueba» del prototipo Login.dc.html.
 * Solo se muestra con VITE_USAR_MOCKS=true (simulación sin backend).
 */
export function SeccionUsuariosPrueba({ alUsar }: SeccionUsuariosPruebaProps) {
  return (
    <section
      aria-labelledby="lg-prueba"
      className="flex flex-col gap-[10px] border-t border-borde pt-[20px]"
    >
      <h2 id="lg-prueba" className="m-0 text-[18px] font-bold">
        Usuarios de prueba
      </h2>
      <p className="m-0 text-[15px] text-texto-2">
        Simulación sin backend: cualquier contraseña sirve. Los empleados salen
        del DML del Avance 2.
      </p>
      <div className="flex flex-col gap-[8px]">
        {USUARIOS_DEMO.map((demo) => (
          <button
            key={demo.codigo}
            type="button"
            onClick={() => alUsar(demo)}
            className="ps-secundario flex min-h-[48px] items-center justify-between gap-[12px] rounded-[6px] border-2 border-borde bg-superficie px-[14px] py-[8px] text-left text-texto"
          >
            <span className="flex flex-col">
              <strong className="text-[16px]">
                {demo.codigo} · {demo.nombre}
              </strong>
              <span className="text-[14px] text-texto-2">{demo.nota}</span>
            </span>
            <span className="text-[15px] font-semibold text-acento-texto">
              Usar
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
