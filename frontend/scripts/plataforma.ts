import {
  spawn,
  spawnSync,
  type ChildProcess,
  type SpawnOptions,
} from 'child_process';
import fs from 'fs';

const CHROMIUM_SISTEMA = '/usr/bin/chromium';

/**
 * Ruta del Chromium a usar con Playwright.
 * 1. PLAYWRIGHT_CHROMIUM_PATH si esta definida.
 * 2. /usr/bin/chromium si existe.
 * 3. undefined: Playwright usa su navegador propio.
 */
export function rutaChromium(
  env: NodeJS.ProcessEnv = process.env,
  existe: (ruta: string) => boolean = fs.existsSync,
): string | undefined {
  if (env.PLAYWRIGHT_CHROMIUM_PATH) return env.PLAYWRIGHT_CHROMIUM_PATH;
  return existe(CHROMIUM_SISTEMA) ? CHROMIUM_SISTEMA : undefined;
}

/** En Windows pnpm es pnpm.cmd y necesita shell para resolverse. */
export function opcionesShell(plataforma: NodeJS.Platform): { shell: boolean } {
  return { shell: plataforma === 'win32' };
}

export function lanzarPnpm(
  args: string[],
  opciones: SpawnOptions = {},
): ChildProcess {
  return spawn('pnpm', args, {
    ...opcionesShell(process.platform),
    ...opciones,
  });
}

/** Termina el proceso y su arbol de hijos (taskkill /T en Windows). */
export function terminarProceso(proceso: ChildProcess): void {
  if (process.platform === 'win32') {
    if (proceso.pid !== undefined) {
      spawnSync('taskkill', ['/pid', String(proceso.pid), '/T', '/F']);
    }
    return;
  }
  proceso.kill('SIGTERM');
}
