import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawn, spawnSync } from 'child_process';
import {
  lanzarPnpm,
  opcionesShell,
  rutaChromium,
  terminarProceso,
} from './plataforma';

vi.mock('child_process', () => {
  const spawn = vi.fn(() => ({ pid: 1234, kill: vi.fn() }));
  const spawnSync = vi.fn();
  return { default: { spawn, spawnSync }, spawn, spawnSync };
});

function conPlataforma(valor: NodeJS.Platform, fn: () => void) {
  const original = Object.getOwnPropertyDescriptor(process, 'platform')!;
  Object.defineProperty(process, 'platform', { value: valor });
  try {
    fn();
  } finally {
    Object.defineProperty(process, 'platform', original);
  }
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('rutaChromium', () => {
  it('devuelve PLAYWRIGHT_CHROMIUM_PATH si esta definida', () => {
    const existe = vi.fn(() => true);
    expect(
      rutaChromium({ PLAYWRIGHT_CHROMIUM_PATH: '/opt/chrome' }, existe),
    ).toBe('/opt/chrome');
    expect(existe).not.toHaveBeenCalled();
  });

  it('devuelve /usr/bin/chromium cuando existe', () => {
    const existe = vi.fn(() => true);
    expect(rutaChromium({}, existe)).toBe('/usr/bin/chromium');
    expect(existe).toHaveBeenCalledWith('/usr/bin/chromium');
  });

  it('devuelve undefined cuando no existe', () => {
    expect(rutaChromium({}, () => false)).toBeUndefined();
  });
});

describe('opcionesShell', () => {
  it('usa shell solo en win32', () => {
    expect(opcionesShell('win32')).toEqual({ shell: true });
    expect(opcionesShell('linux')).toEqual({ shell: false });
    expect(opcionesShell('darwin')).toEqual({ shell: false });
  });
});

describe('lanzarPnpm', () => {
  it('lanza pnpm con shell segun la plataforma y respeta opciones', () => {
    conPlataforma('win32', () => {
      lanzarPnpm(['preview'], { cwd: '/x' });
    });
    expect(spawn).toHaveBeenCalledWith('pnpm', ['preview'], {
      shell: true,
      cwd: '/x',
    });
    conPlataforma('linux', () => {
      lanzarPnpm(['preview']);
    });
    expect(spawn).toHaveBeenLastCalledWith('pnpm', ['preview'], {
      shell: false,
    });
  });
});

describe('terminarProceso', () => {
  it('usa taskkill en win32', () => {
    const kill = vi.fn();
    conPlataforma('win32', () => {
      terminarProceso({ pid: 42, kill } as never);
    });
    expect(spawnSync).toHaveBeenCalledWith('taskkill', [
      '/pid',
      '42',
      '/T',
      '/F',
    ]);
    expect(kill).not.toHaveBeenCalled();
  });

  it('usa SIGTERM fuera de win32', () => {
    const kill = vi.fn();
    conPlataforma('linux', () => {
      terminarProceso({ pid: 42, kill } as never);
    });
    expect(kill).toHaveBeenCalledWith('SIGTERM');
    expect(spawnSync).not.toHaveBeenCalled();
  });
});
