/** Token falso con formato JWT (tres segmentos base64url), como el de la API real. */
export function tokenFalso(sub: string): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub })}.firma-simulada`;
}

/** Id del operador (claim sub) del token Bearer de la petición, o null si falta o no es válido. */
export function idOperadorDelToken(request: Request): number | null {
  const cabecera = request.headers.get('authorization');
  const token = cabecera?.replace(/^Bearer\s+/i, '');
  const partes = token?.split('.');
  if (!partes || partes.length < 2 || !partes[1]) return null;
  try {
    const payload = JSON.parse(
      atob(partes[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { sub?: string; nameid?: string };
    const id = parseInt(String(payload.sub ?? payload.nameid ?? ''), 10);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
