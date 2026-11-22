import type { FormEventHandler, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFocoPrevio } from './useFocoPrevio';

export interface MarcoDialogoOperadorProps {
  idTitulo: string;
  titulo: string;
  descripcion: string;
  textoEnviar: string;
  enviando: boolean;
  errorServidor: string | null;
  onCerrar: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

/** Estructura común de los diálogos de operador: título, error del servidor y botones. */
export function MarcoDialogoOperador({
  idTitulo,
  titulo,
  descripcion,
  textoEnviar,
  enviando,
  errorServidor,
  onCerrar,
  onSubmit,
  children,
}: MarcoDialogoOperadorProps) {
  const { alCerrarAutoFoco } = useFocoPrevio();

  return (
    <Dialog open onOpenChange={(abierta) => !abierta && onCerrar()}>
      <DialogContent
        aria-labelledby={idTitulo}
        className="max-h-[92vh] max-w-[640px] gap-4 overflow-y-auto rounded-[10px] border-[3px] border-texto p-7"
        onCloseAutoFocus={alCerrarAutoFoco}
      >
        <DialogTitle id={idTitulo} className="text-[26px] font-bold">
          {titulo}
        </DialogTitle>
        <DialogDescription className="text-[16px]">
          {descripcion}
        </DialogDescription>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {children}

          {errorServidor && (
            <p
              role="alert"
              className="m-0 rounded-[6px] bg-error-fondo p-[10px] px-[14px] text-[16px] font-semibold text-error"
            >
              {errorServidor}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secundario"
              onClick={onCerrar}
              className="h-[52px] px-[20px] text-[17px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primario"
              disabled={enviando}
              className="h-[52px] border-[3px] px-[20px] text-[17px]"
            >
              {textoEnviar}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
