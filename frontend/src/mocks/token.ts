/** Token falso con formato JWT (tres segmentos base64url), como el de la API real. */
export function tokenFalso(sub: string): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub })}.firma-simulada`;
}
