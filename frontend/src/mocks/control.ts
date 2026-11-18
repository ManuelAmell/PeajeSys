import { delay, HttpResponse } from 'msw';

export type ModoMock = 'normal' | 'vacio' | 'error' | 'lento';

/**
 * Obtiene el modo de control simulado configurado a través de la URL (?mock=...)
 * o persistido en sessionStorage ('peajesys:mock').
 */
export function obtenerModoMock(url?: string): ModoMock {
  let modoUrl: string | null = null;

  if (url) {
    try {
      const u = new URL(url, 'http://localhost');
      modoUrl = u.searchParams.get('mock');
    } catch {
      modoUrl = null;
    }
  } else if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      modoUrl = params.get('mock');
    } catch {
      modoUrl = null;
    }
  }

  if (modoUrl === 'vacio' || modoUrl === 'error' || modoUrl === 'lento') {
    return modoUrl;
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const sesion = window.sessionStorage.getItem('peajesys:mock');
      if (sesion === 'vacio' || sesion === 'error' || sesion === 'lento') {
        return sesion;
      }
    } catch {
      // Entorno sin acceso a sessionStorage
    }
  }

  return 'normal';
}

/**
 * Aplica latencia simulada según el entorno y el modo:
 * - En pruebas (Vitest / NODE_ENV === 'test'): latencia 0 ms
 * - Modo lento (?mock=lento): latencia ~2000 ms
 * - En navegador normal: latencia breve entre 50 y 150 ms
 */
export async function aplicarLatencia(modo: ModoMock, forzarCero = false): Promise<void> {
  const esEntornoPruebas =
    forzarCero ||
    typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ||
    typeof process !== 'undefined' && process.env.VITEST !== undefined;

  if (esEntornoPruebas) {
    return;
  }

  if (modo === 'lento') {
    await delay(2000);
    return;
  }

  // Latencia realista breve para navegador
  const ms = Math.floor(Math.random() * 100) + 50;
  await delay(ms);
}

/**
 * Evalúa los parámetros de control para una petición de lectura (GET).
 * Si el modo es 'error', retorna una respuesta HTTP 500 con el formato de error del contrato.
 * Si el modo es 'vacio', retorna indicador para responder lista vacía.
 */
export async function procesarControlLectura(
  request: Request,
  forzarCeroLatencia = false,
): Promise<{ errorResponse?: Response; esVacio: boolean }> {
  const modo = obtenerModoMock(request.url);
  await aplicarLatencia(modo, forzarCeroLatencia);

  if (modo === 'error') {
    const errorResponse = HttpResponse.json(
      {
        error: {
          codigo: 'ERROR_SIMULADO',
          mensaje: 'Error de servidor simulado mediante parámetro ?mock=error.',
        },
      },
      { status: 500 },
    );
    return { errorResponse, esVacio: false };
  }

  return { esVacio: modo === 'vacio' };
}
