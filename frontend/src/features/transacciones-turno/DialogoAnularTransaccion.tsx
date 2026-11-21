import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorApi } from '@/api/clienteHttp';
import { useAnularTransaccion } from '@/api/recursos/transacciones';
import type { FilaTransaccion } from './tipos';

export const MAX_MOTIVO = 255;

export interface DialogoAnularTransaccionProps {
  /** Transacción a anular; null mantiene el diálogo cerrado. */
  transaccion: FilaTransaccion | null;
  onCerrar: () => void;
  /** Se llama tras anular con éxito (antes de cerrar). */
  onAnulada?: () => void;
  /** Devuelve el foco al cerrar; true si el llamador ya lo gestionó (se omite el comportamiento por defecto). */
  onRestaurarFoco?: () => boolean;
}

export function DialogoAnularTransaccion({
  transaccion,
  onCerrar,
  onAnulada,
  onRestaurarFoco,
}: DialogoAnularTransaccionProps) {
  const anular = useAnularTransaccion();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const id = transaccion?.id_transaccion;

  // Cada vez que se abre para otra transacción se parte de un formulario limpio.
  useEffect(() => {
    setMotivo('');
    setError(null);
  }, [id]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaccion || anular.isPending) return;
    const limpio = motivo.trim();
    if (limpio.length === 0) {
      setError('Escribe el motivo de la anulación: queda en la auditoría.');
      campoRef.current?.focus();
      return;
    }
    setError(null);
    try {
      await anular.mutateAsync({
        idTransaccion: transaccion.id_transaccion,
        motivo: limpio,
      });
      toast.success(`Transacción ${transaccion.numero_ticket} anulada.`);
      onAnulada?.();
      onCerrar();
    } catch (err) {
      setError(
        err instanceof ErrorApi
          ? err.message
          : 'No se pudo anular la transacción. Inténtalo de nuevo.',
      );
    }
  };

  return (
    <Dialog
      open={transaccion !== null}
      onOpenChange={(abierto) => {
        if (!abierto && !anular.isPending) onCerrar();
      }}
    >
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[520px] max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(ev) => {
          ev.preventDefault();
          campoRef.current?.focus();
        }}
        onCloseAutoFocus={(ev) => {
          if (onRestaurarFoco?.()) ev.preventDefault();
        }}
      >
        <DialogTitle>Anular transacción</DialogTitle>
        {transaccion && (
          <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
            <DialogDescription asChild>
              <p className="m-0 p-3 rounded-[6px] bg-superficie-2 text-[15px] text-texto leading-relaxed">
                <strong className="tracking-wide">
                  {transaccion.placa_detectada || 'Sin placa'}
                </strong>
                {' · '}
                {transaccion.montoTexto}
                {' · '}
                {transaccion.metodo_pago}
                <br />
                <span className="text-texto-2">
                  {transaccion.hora} · Cat. {transaccion.categoriaRomano} ·{' '}
                  {transaccion.numero_ticket}
                </span>
              </p>
            </DialogDescription>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="anular-motivo"
                className="text-[16px] font-semibold text-texto"
              >
                Motivo
              </label>
              <textarea
                ref={campoRef}
                id="anular-motivo"
                rows={3}
                maxLength={MAX_MOTIVO}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={anular.isPending}
                aria-required="true"
                aria-invalid={error ? true : undefined}
                aria-describedby="anular-contador"
                className="w-full px-3 py-2 border-2 border-texto rounded-[6px] bg-superficie text-texto text-[16px] box-border resize-y focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:opacity-50"
              />
              <span
                id="anular-contador"
                className="self-end text-[14px] text-texto-2"
              >
                {motivo.length}/{MAX_MOTIVO}
              </span>
            </div>

            {error && (
              <p
                role="alert"
                className="m-0 p-3 rounded-[6px] bg-error-fondo text-error text-[15px] font-semibold border border-error/30"
              >
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onCerrar}
                disabled={anular.isPending}
                className="h-[48px] px-5 border-2 border-texto rounded-[6px] bg-superficie text-texto text-[16px] font-semibold ps-secundario focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={anular.isPending}
                className="h-[48px] px-5 border-[3px] border-texto rounded-[6px] bg-[#FCBD17] text-sobre-acento text-[16px] font-bold ps-primario focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:opacity-60"
              >
                {anular.isPending ? 'Anulando…' : 'Anular transacción'}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
