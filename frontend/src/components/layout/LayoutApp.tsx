import { ReactNode } from 'react';
import { Cabecera } from './Cabecera';
import { Franja } from './Franja';
import { cn } from '@/lib/utils';

export interface LayoutAppProps {
  children: ReactNode;
  titulo?: string;
  subtitulo?: string;
  className?: string;
}

/**
 * Layout principal de la aplicación PeajeSys:
 * - Enlace accesible «Saltar al contenido»
 * - Cabecera con datos del usuario, alternador de tema y botón de cierre de sesión
 * - Franja vial diagonal amarilla y negra
 * - Contenedor principal semántico <main> con id="contenido-principal"
 */
export function LayoutApp({
  children,
  titulo,
  subtitulo,
  className,
}: LayoutAppProps) {
  return (
    <div className="min-h-screen flex flex-col bg-fondo text-texto font-sans">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-[6px] focus:bg-[#FCBD17] focus:px-4 focus:py-2.5 focus:font-bold focus:text-sobre-acento focus:outline-[3px] focus:outline-texto"
      >
        Saltar al contenido
      </a>

      <Cabecera titulo={titulo} subtitulo={subtitulo} />
      <Franja />

      <main
        id="contenido-principal"
        tabIndex={-1}
        className={cn('flex-1 outline-none', className)}
      >
        {children}
      </main>
    </div>
  );
}
