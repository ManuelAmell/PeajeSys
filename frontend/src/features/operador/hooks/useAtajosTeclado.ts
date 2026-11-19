import { useEffect } from 'react';
import type { MetodoPagoOperador } from '../types';

interface AtajosTecladoOpciones {
  habilitado?: boolean;
  onSeleccionarCategoria?: (numero: number) => void;
  onSeleccionarMetodo?: (metodo: MetodoPagoOperador) => void;
  onCobrar?: () => void;
  onEscape?: () => void;
  puedeCobrar?: boolean;
  modalAbierto?: boolean;
}

/**
 * Hook para gestión de atajos de teclado del operador:
 * - 1 a 7: selecciona categoría (solo si el foco NO está en un input/textarea)
 * - F1: Efectivo
 * - F2: Telepeaje
 * - F3: Exento
 * - Enter: Cobrar (si puede cobrar y el foco no está en un botón interactivo)
 * - Escape: Cerrar modales
 */
export function useAtajosTeclado({
  habilitado = true,
  onSeleccionarCategoria,
  onSeleccionarMetodo,
  onCobrar,
  onEscape,
  puedeCobrar = false,
  modalAbierto = false,
}: AtajosTecladoOpciones) {
  useEffect(() => {
    if (!habilitado) return;

    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const targetEl = e.target as HTMLElement | null;
      const esInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        targetEl instanceof HTMLInputElement ||
        targetEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      const esBoton =
        activeEl instanceof HTMLButtonElement ||
        activeEl instanceof HTMLAnchorElement;

      // Escape siempre tiene prioridad
      if (e.key === 'Escape') {
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        return;
      }

      // Si hay un modal abierto, los atajos de fondo no deben ejecutarse
      if (modalAbierto) return;

      // Métodos de pago F1, F2, F3
      if (e.key === 'F1') {
        e.preventDefault();
        onSeleccionarMetodo?.('EFECTIVO');
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        onSeleccionarMetodo?.('TELEPEAJE');
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        onSeleccionarMetodo?.('EXENTO');
        return;
      }

      // Tecla Enter para cobrar
      if (e.key === 'Enter') {
        // Si el foco está en un botón (ej. cancelar, alternar tema), respetar la acción del botón
        if (esBoton && activeEl.getAttribute('id') !== 'op-btn-cobrar') {
          return;
        }

        if (puedeCobrar && onCobrar) {
          e.preventDefault();
          onCobrar();
        }
        return;
      }

      // Atajos numéricos 1 a 7 para categorías (solo si NO está escribiendo en un input)
      if (!esInput && /^[1-7]$/.test(e.key)) {
        e.preventDefault();
        const num = parseInt(e.key, 10);
        onSeleccionarCategoria?.(num);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    habilitado,
    onSeleccionarCategoria,
    onSeleccionarMetodo,
    onCobrar,
    onEscape,
    puedeCobrar,
    modalAbierto,
  ]);
}
