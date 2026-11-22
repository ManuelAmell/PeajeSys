import { z } from 'zod';
import { borrarToken, obtenerToken } from './sesionToken';

export interface DetalleErrorApi {
  codigo: string;
  mensaje: string;
  campos?: Record<string, string>;
}

export interface RespuestaErrorApi {
  error: DetalleErrorApi;
}

/**
 * Error tipado emitido por la capa de cliente HTTP de PeajeSys.
 */
export class ErrorApi extends Error {
  public readonly estado: number;
  public readonly codigo: string;
  public readonly campos?: Record<string, string>;

  constructor({
    estado,
    codigo,
    mensaje,
    campos,
  }: {
    estado: number;
    codigo: string;
    mensaje: string;
    campos?: Record<string, string>;
  }) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.campos = campos;
  }
}

export interface OpcionesClienteHttp<T = unknown> extends RequestInit {
  schema?: { safeParse(data: unknown): z.SafeParseReturnType<unknown, T> };
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Cliente HTTP unificado de PeajeSys.
 * Envuelve fetch nativo, antepone la URL base de entorno y valida respuestas con Zod en el borde.
 */
export async function clienteHttp<T>(
  ruta: string,
  opciones: OpcionesClienteHttp<T> = {},
): Promise<T> {
  const { schema, params, headers, ...init } = opciones;

  // Base URL configurable vía VITE_API_BASE_URL (por defecto '/api')
  const baseUrl = (
    (typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_API_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
    '/api'
  ).replace(/\/$/, '');

  // Normalizar ruta para evitar dobles barras
  const rutaNormalizada = ruta.startsWith('/') ? ruta : `/${ruta}`;
  let url = `${baseUrl}${rutaNormalizada}`;

  // En entornos JSDOM/Node con window.location, anteponer el origen para URLs relativas
  if (
    url.startsWith('/') &&
    typeof window !== 'undefined' &&
    window.location?.origin
  ) {
    url = `${window.location.origin}${url}`;
  }

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.set(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
  };

  if (init.body && typeof init.body === 'string') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const finalHeaders: Record<string, string> = {
    ...defaultHeaders,
    ...((headers as Record<string, string>) || {}),
  };

  // Token de sesión, salvo que el llamador ya pase su propia cabecera Authorization
  const token = obtenerToken();
  const traeAuthorization = Object.keys(finalHeaders).some(
    (k) => k.toLowerCase() === 'authorization',
  );
  if (token && !traeAuthorization) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: finalHeaders,
    });
  } catch (error) {
    throw new ErrorApi({
      estado: 0,
      codigo: 'ERROR_CONEXION',
      mensaje: `No se pudo conectar con el servidor: ${(error as Error).message}`,
    });
  }

  // Manejo de respuestas no exitosas (4xx / 5xx)
  if (!response.ok) {
    // Un 401 con token enviado significa sesión caducada o inválida
    if (response.status === 401 && token && !traeAuthorization) {
      borrarToken();
    }
    let errorData: RespuestaErrorApi | null = null;
    try {
      errorData = (await response.json()) as RespuestaErrorApi;
    } catch {
      // La respuesta no era JSON
    }

    const codigo = errorData?.error?.codigo || `HTTP_${response.status}`;
    const mensaje =
      errorData?.error?.mensaje ||
      response.statusText ||
      `Error de servidor con código HTTP ${response.status}.`;
    const campos = errorData?.error?.campos;

    throw new ErrorApi({
      estado: response.status,
      codigo,
      mensaje,
      campos,
    });
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let jsonData: unknown;
  try {
    jsonData = await response.json();
  } catch (error) {
    throw new ErrorApi({
      estado: response.status,
      codigo: 'RESPUESTA_NO_JSON',
      mensaje: `La respuesta del servidor no tiene formato JSON válido: ${(error as Error).message}`,
    });
  }

  // Validación de borde con Zod
  if (schema) {
    const parseResult = schema.safeParse(jsonData);
    if (!parseResult.success) {
      throw new ErrorApi({
        estado: response.status,
        codigo: 'ERROR_VALIDACION_RESPUESTA',
        mensaje:
          'La respuesta del servidor no cumple el esquema de datos esperado.',
        campos: Object.fromEntries(
          parseResult.error.issues.map((i) => [i.path.join('.'), i.message]),
        ),
      });
    }
    return parseResult.data;
  }

  return jsonData as T;
}

clienteHttp.get = <T>(ruta: string, opciones?: OpcionesClienteHttp<T>) =>
  clienteHttp<T>(ruta, { ...opciones, method: 'GET' });

clienteHttp.post = <T>(
  ruta: string,
  body?: unknown,
  opciones?: OpcionesClienteHttp<T>,
) =>
  clienteHttp<T>(ruta, {
    ...opciones,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

clienteHttp.patch = <T>(
  ruta: string,
  body?: unknown,
  opciones?: OpcionesClienteHttp<T>,
) =>
  clienteHttp<T>(ruta, {
    ...opciones,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

clienteHttp.delete = <T>(ruta: string, opciones?: OpcionesClienteHttp<T>) =>
  clienteHttp<T>(ruta, { ...opciones, method: 'DELETE' });
