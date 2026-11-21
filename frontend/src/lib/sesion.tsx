import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { borrarToken } from '@/api/sesionToken';
import { Rol, Usuario, rutaPorDefectoSegunRol } from './roles';

const CLAVE_STORAGE_SESION = 'peajesys_sesion';

interface ContextoSesionTipo {
  usuario: Usuario | null;
  iniciarSesion: (nuevoUsuario: Usuario) => void;
  cerrarSesion: () => void;
}

const ContextoSesion = createContext<ContextoSesionTipo | undefined>(undefined);

function leerSesionDeStorage(): Usuario | null {
  try {
    if (typeof window === 'undefined') return null;
    const datos = window.sessionStorage?.getItem?.(CLAVE_STORAGE_SESION);
    if (!datos) return null;
    const parseado = JSON.parse(datos) as Usuario;
    if (
      parseado &&
      typeof parseado.id === 'string' &&
      typeof parseado.rol === 'string'
    ) {
      return parseado;
    }
  } catch {
    // Si sessionStorage está bloqueado o el JSON es inválido
  }
  return null;
}

function guardarSesionEnStorage(usuario: Usuario | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (usuario) {
      window.sessionStorage?.setItem?.(
        CLAVE_STORAGE_SESION,
        JSON.stringify(usuario),
      );
    } else {
      window.sessionStorage?.removeItem?.(CLAVE_STORAGE_SESION);
    }
  } catch {
    // Si sessionStorage no está disponible
  }
}

export interface SesionProviderProps {
  children: ReactNode;
  usuarioInicial?: Usuario | null;
}

export function SesionProvider({
  children,
  usuarioInicial = null,
}: SesionProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    if (usuarioInicial) return usuarioInicial;
    return leerSesionDeStorage();
  });

  const iniciarSesion = useCallback((nuevoUsuario: Usuario) => {
    setUsuario(nuevoUsuario);
    guardarSesionEnStorage(nuevoUsuario);
  }, []);

  const cerrarSesion = useCallback(() => {
    setUsuario(null);
    guardarSesionEnStorage(null);
    borrarToken();
  }, []);

  useEffect(() => {
    if (usuarioInicial !== undefined && usuarioInicial !== null) {
      setUsuario(usuarioInicial);
      guardarSesionEnStorage(usuarioInicial);
    }
  }, [usuarioInicial]);

  return (
    <ContextoSesion.Provider value={{ usuario, iniciarSesion, cerrarSesion }}>
      {children}
    </ContextoSesion.Provider>
  );
}

export function useSesion(): ContextoSesionTipo {
  const contexto = useContext(ContextoSesion);
  if (!contexto) {
    throw new Error('useSesion debe utilizarse dentro de un SesionProvider');
  }
  return contexto;
}

export interface RequireRolProps {
  children: ReactNode;
  rolPermitido: Rol | Rol[];
}

/**
 * Guardia de rutas para proteger vistas según rol del usuario.
 * - Si no hay sesión: redirige a /login.
 * - Si el usuario tiene un rol no permitido: redirige a la vista principal de su rol.
 */
export function RequireRol({ children, rolPermitido }: RequireRolProps) {
  const { usuario } = useSesion();
  const location = useLocation();

  if (!usuario) {
    return <Navigate to="/login" state={{ desde: location }} replace />;
  }

  const rolesArray = Array.isArray(rolPermitido)
    ? rolPermitido
    : [rolPermitido];

  if (!rolesArray.includes(usuario.rol)) {
    const rutaDestino = rutaPorDefectoSegunRol(usuario.rol);
    return <Navigate to={rutaDestino} replace />;
  }

  return <>{children}</>;
}
