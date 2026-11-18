import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OpcionesCaptura {
  ruta: string;
  rol: 'RECAUDADOR' | 'SUPERVISOR' | 'ADMIN' | 'ninguno';
  espera: string;
  salida: string;
  nombre?: string;
  puerto: number;
}

function parsearArgumentos(): OpcionesCaptura {
  const args = process.argv.slice(2);
  const opciones: Partial<OpcionesCaptura> = {
    puerto: 5180,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const siguiente = args[i + 1];

    if (arg === '--ruta' && siguiente) {
      opciones.ruta = siguiente;
      i++;
    } else if (arg === '--rol' && siguiente) {
      opciones.rol = siguiente as OpcionesCaptura['rol'];
      i++;
    } else if (arg === '--espera' && siguiente) {
      opciones.espera = siguiente;
      i++;
    } else if (arg === '--salida' && siguiente) {
      opciones.salida = siguiente;
      i++;
    } else if (arg === '--nombre' && siguiente) {
      opciones.nombre = siguiente;
      i++;
    } else if (arg === '--puerto' && siguiente) {
      opciones.puerto = parseInt(siguiente, 10);
      i++;
    }
  }

  if (!opciones.ruta || !opciones.rol || !opciones.espera || !opciones.salida) {
    console.error(
      'Uso: pnpm capturar -- --ruta <ruta> --rol <RECAUDADOR|SUPERVISOR|ADMIN|ninguno> --espera <selector> --salida <carpeta> [--nombre <prefijo>] [--puerto <puerto>]',
    );
    process.exit(1);
  }

  return opciones as OpcionesCaptura;
}

function verificarServidor(puerto: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${puerto}/login`, () => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function esperarServidor(
  puerto: number,
  maxIntentos = 30,
): Promise<boolean> {
  for (let i = 0; i < maxIntentos; i++) {
    const ok = await verificarServidor(puerto);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function obtenerUsuarioDeRol(rol: OpcionesCaptura['rol']) {
  switch (rol) {
    case 'RECAUDADOR':
      return {
        id: 'EMP-001',
        nombre: 'María Fernanda López Martínez',
        rol: 'RECAUDADOR',
        estacion: 'Gambote',
        carril: 'Carril 1',
      };
    case 'SUPERVISOR':
      return {
        id: 'SUP-001',
        nombre: 'Juan David Rodríguez Silva',
        rol: 'SUPERVISOR',
        estacion: 'Gambote',
      };
    case 'ADMIN':
      return {
        id: 'ADM-001',
        nombre: 'ADMIN-01 (usuario de prueba)',
        rol: 'ADMIN',
      };
    case 'ninguno':
      return null;
  }
}

interface ResultadoCaptura {
  archivo: string;
  bytes: number;
  tamanoKb: string;
  erroresConsola: number;
  valido: boolean;
}

async function ejecutar() {
  const opts = parsearArgumentos();
  const usuario = obtenerUsuarioDeRol(opts.rol);
  const prefijoBase =
    opts.nombre || opts.ruta.replace(/^\//, '').replace(/\//g, '-') || 'inicio';

  // Asegurar directorio de salida
  fs.mkdirSync(opts.salida, { recursive: true });

  // Iniciar servidor preview si no está corriendo
  let procesoServidor: ChildProcess | null = null;
  const servidorActivo = await verificarServidor(opts.puerto);

  if (!servidorActivo) {
    console.log(
      `Iniciando servidor de vista previa en puerto ${opts.puerto}...`,
    );
    procesoServidor = spawn(
      'pnpm',
      ['preview', '--port', String(opts.puerto), '--strictPort'],
      {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'pipe',
      },
    );

    const listo = await esperarServidor(opts.puerto);
    if (!listo) {
      console.error(
        `❌ No se pudo conectar al servidor en el puerto ${opts.puerto}`,
      );
      if (procesoServidor) procesoServidor.kill('SIGTERM');
      process.exit(1);
    }
  }

  const chromiumPath =
    process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium';

  const browser = await chromium.launch({
    executablePath: chromiumPath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const vistas = [
    { ancho: 1280, alto: 800, etiqueta: '1280' },
    { ancho: 390, alto: 844, etiqueta: '390' },
  ];

  const temas: Array<'claro' | 'oscuro'> = ['claro', 'oscuro'];
  const resultados: ResultadoCaptura[] = [];
  let hayFallos = false;

  try {
    for (const vista of vistas) {
      for (const tema of temas) {
        const context = await browser.newContext({
          viewport: { width: vista.ancho, height: vista.alto },
        });

        // Inyectar tema y sesión antes de cargar la página
        await context.addInitScript(
          ({ t, u }) => {
            try {
              localStorage.setItem('peajesys_tema', t);
              document.documentElement.setAttribute('data-tema', t);
              if (u) {
                sessionStorage.setItem('peajesys_sesion', JSON.stringify(u));
              } else {
                sessionStorage.removeItem('peajesys_sesion');
              }
            } catch {
              // noop
            }
          },
          { t: tema, u: usuario },
        );

        const page = await context.newPage();
        const erroresConsola: string[] = [];

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            erroresConsola.push(msg.text());
          }
        });
        page.on('pageerror', (err) => {
          erroresConsola.push(err.message);
        });

        const url = `http://localhost:${opts.puerto}${opts.ruta}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector(opts.espera, { timeout: 15000 });
        await page.evaluate(() => document.fonts.ready);

        // Asegurar que data-tema esté fijado en el DOM
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-tema', t);
        }, tema);

        // Esperar brevemente a la estabilidad de la renderización
        await page.waitForTimeout(300);

        const nombreArchivo = `${prefijoBase}-${tema}-${vista.etiqueta}.png`;
        const rutaCompleta = path.join(opts.salida, nombreArchivo);

        await page.screenshot({
          path: rutaCompleta,
          fullPage: false,
        });

        await context.close();

        const stats = fs.statSync(rutaCompleta);
        const bytes = stats.size;
        const tamanoKb = `${(bytes / 1024).toFixed(1)} KB`;
        const esMayor30Kb = bytes >= 30 * 1024;
        const sinErrores = erroresConsola.length === 0;
        const esValido = esMayor30Kb && sinErrores;

        if (!esValido) {
          hayFallos = true;
        }

        resultados.push({
          archivo: nombreArchivo,
          bytes,
          tamanoKb,
          erroresConsola: erroresConsola.length,
          valido: esValido,
        });
      }
    }
  } finally {
    await browser.close();
    if (procesoServidor) {
      procesoServidor.kill('SIGTERM');
    }
  }

  // Imprimir tabla de resultados
  console.log('\n### Resultados de capturas');
  console.log('| Archivo | Bytes | Tamaño | Errores de consola | Estado |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const r of resultados) {
    const estado = r.valido ? 'PASS (≥ 30 KB)' : 'FAIL';
    console.log(
      `| ${r.archivo} | ${r.bytes} | ${r.tamanoKb} | ${r.erroresConsola} | ${estado} |`,
    );
  }

  if (hayFallos) {
    console.error(
      '\n❌ Error: Una o más capturas pesaron menos de 30 KB o registraron errores de consola.',
    );
    process.exit(1);
  } else {
    console.log(
      '\n✅ Todas las capturas cumplen el umbral de tamaño (≥ 30 KB) y 0 errores de consola.',
    );
  }
}

ejecutar().catch((err) => {
  console.error('Error fatal al generar capturas:', err);
  process.exit(1);
});
