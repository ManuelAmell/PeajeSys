import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

export type ModoTema = 'claro' | 'oscuro';

const CLAVE_STORAGE_TEMA = 'peajesys_tema';

interface ContextoTemaTipo {
  tema: ModoTema;
  alternarTema: () => void;
  fijarTema: (nuevoTema: ModoTema) => void;
}

const ContextoTema = createContext<ContextoTemaTipo | undefined>(undefined);

function obtenerPreferenciaSistema(): ModoTema {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'claro';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'oscuro'
    : 'claro';
}

function leerTemaDeStorage(): ModoTema | null {
  try {
    if (typeof window === 'undefined') return null;
    const valor = window.localStorage?.getItem?.(CLAVE_STORAGE_TEMA);
    if (valor === 'claro' || valor === 'oscuro') {
      return valor;
    }
  } catch {
    // Si localStorage no está disponible
  }
  return null;
}

function guardarTemaEnStorage(tema: ModoTema): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage?.setItem?.(CLAVE_STORAGE_TEMA, tema);
  } catch {
    // Si localStorage no está disponible
  }
}

function aplicarAtributoTema(tema: ModoTema): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-tema', tema);
  }
}

export interface TemaProviderProps {
  children: ReactNode;
  temaPorDefecto?: ModoTema;
}

export function TemaProvider({ children, temaPorDefecto }: TemaProviderProps) {
  const [tema, setTema] = useState<ModoTema>(() => {
    if (temaPorDefecto) return temaPorDefecto;
    const guardado = leerTemaDeStorage();
    if (guardado) return guardado;
    return obtenerPreferenciaSistema();
  });

  const fijarTema = useCallback((nuevoTema: ModoTema) => {
    setTema(nuevoTema);
    aplicarAtributoTema(nuevoTema);
    guardarTemaEnStorage(nuevoTema);
  }, []);

  const alternarTema = useCallback(() => {
    fijarTema(tema === 'oscuro' ? 'claro' : 'oscuro');
  }, [tema, fijarTema]);

  useEffect(() => {
    aplicarAtributoTema(tema);
  }, [tema]);

  // Si no hay tema explícito guardado, escuchar cambios de prefers-color-scheme
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const manejarCambio = (e: MediaQueryListEvent) => {
      const guardado = leerTemaDeStorage();
      if (!guardado) {
        const nuevoTema: ModoTema = e.matches ? 'oscuro' : 'claro';
        setTema(nuevoTema);
        aplicarAtributoTema(nuevoTema);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', manejarCambio);
      return () => mediaQuery.removeEventListener('change', manejarCambio);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(manejarCambio);
      return () => mediaQuery.removeListener(manejarCambio);
    }
  }, []);

  return (
    <ContextoTema.Provider value={{ tema, alternarTema, fijarTema }}>
      {children}
    </ContextoTema.Provider>
  );
}

export function useTema(): ContextoTemaTipo {
  const contexto = useContext(ContextoTema);
  if (!contexto) {
    throw new Error('useTema debe usarse dentro de un TemaProvider');
  }
  return contexto;
}
