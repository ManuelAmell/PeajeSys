import type { TransaccionPeaje } from '@/types';

/** Transacción del listado de un turno preparada para mostrarse. */
export interface FilaTransaccion extends TransaccionPeaje {
  anulada: boolean;
  hora: string;
  categoriaRomano: string;
  montoTexto: string;
}
