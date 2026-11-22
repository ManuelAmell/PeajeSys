import { useState } from 'react';

/** Estado local de visibilidad: vive solo en el diálogo, nunca en estado global. */
export function useVisibilidadClave() {
  const [visible, setVisible] = useState(false);
  return {
    visible,
    alternar: () => setVisible((v) => !v),
    tipo: visible ? 'text' : 'password',
  } as const;
}
