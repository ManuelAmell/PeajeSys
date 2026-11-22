import { useRef } from 'react';

/**
 * Captura en el primer render, antes de que Radix mueva el foco al diálogo,
 * el elemento que lo abrió para devolverle el foco al cerrar.
 */
export function useFocoPrevio() {
  const ref = useRef<HTMLElement | null>(null);
  if (ref.current === null) {
    ref.current = document.activeElement as HTMLElement | null;
  }
  return {
    alCerrarAutoFoco: (evento: Event) => {
      evento.preventDefault();
      ref.current?.focus();
    },
  };
}
