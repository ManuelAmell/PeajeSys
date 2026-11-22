/**
 * Token JWT de la sesión. Vive en sessionStorage (sobrevive a un F5 en la
 * pestaña y se borra al cerrarla); si el almacenamiento falla, queda en memoria.
 */
const CLAVE_TOKEN = 'peajesys_token';

let tokenEnMemoria: string | null = null;

export function obtenerToken(): string | null {
  try {
    const guardado = window.sessionStorage?.getItem?.(CLAVE_TOKEN);
    if (guardado) return guardado;
  } catch {
    // sessionStorage bloqueado: se usa la memoria
  }
  return tokenEnMemoria;
}

export function guardarToken(token: string): void {
  tokenEnMemoria = token;
  try {
    window.sessionStorage?.setItem?.(CLAVE_TOKEN, token);
  } catch {
    // Queda solo en memoria
  }
}

export function borrarToken(): void {
  tokenEnMemoria = null;
  try {
    window.sessionStorage?.removeItem?.(CLAVE_TOKEN);
  } catch {
    // Nada que borrar fuera de la memoria
  }
}
