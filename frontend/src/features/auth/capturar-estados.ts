import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { ChildProcess } from 'child_process';
import { chromium } from '@playwright/test';
import {
  lanzarPnpm,
  rutaChromium,
  terminarProceso,
} from '../../../scripts/plataforma';

/**
 * Capturas de los estados de error del inicio de sesión (B2):
 * INACTIVO, sin turno abierto y error del servidor, en claro y oscuro a 1280 y 390 px.
 *
 * El script compartido scripts/capturar.ts no soporta interacción con el formulario
 * (solo --ruta/--rol/--espera) y está fuera de la propiedad del bloque B2, así que este
 * driver vive en src/features/auth/ y usa el mismo formato de salida y controles
 * (≥ 30 KB, 0 errores de consola, verificación de URL y de elemento propio, MD5 únicos).
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUERTO = 5183;
// Salida relativa a la raiz del frontend; sobreescribible con CAPTURAS_SALIDA.
const SALIDA =
  process.env.CAPTURAS_SALIDA ||
  path.resolve(__dirname, '..', '..', '..', 'capturas', 'B2');
// Chromium del sistema solo si existe; si no, Playwright usa su navegador propio.
const CHROMIUM = rutaChromium();

interface Escenario {
  nombre: string;
  codigo: string;
  textoAlerta: string;
  simularErrorServidor: boolean;
}

const ESCENARIOS: Escenario[] = [
  {
    nombre: 'login-error-inactivo',
    codigo: 'EMP-009',
    textoAlerta:
      'El usuario EMP-009 está INACTIVO. Pide a un administrador que lo active.',
    simularErrorServidor: false,
  },
  {
    nombre: 'login-error-sin-turno',
    codigo: 'EMP-001',
    textoAlerta:
      'Carlos Alberto Gómez Pérez no tiene un turno abierto. El supervisor debe asignarle una caseta antes de cobrar.',
    simularErrorServidor: false,
  },
  {
    nombre: 'login-error-servidor',
    codigo: 'EMP-002',
    textoAlerta: 'Error de servidor simulado mediante parámetro ?mock=error.',
    simularErrorServidor: true,
  },
];

function servidorActivo(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PUERTO}/login`, () =>
      resolve(true),
    );
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function esperarServidor(maxIntentos = 30): Promise<boolean> {
  for (let i = 0; i < maxIntentos; i++) {
    if (await servidorActivo()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

interface ResultadoCaptura {
  archivo: string;
  bytes: number;
  tamanoKb: string;
  erroresConsola: number;
  md5: string;
  valido: boolean;
}

async function capturarEscenario(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  escenario: Escenario,
  resultados: ResultadoCaptura[],
): Promise<boolean> {
  let sinFallos = true;
  for (const vista of [
    { ancho: 1280, alto: 800, etiqueta: '1280' },
    { ancho: 390, alto: 844, etiqueta: '390' },
  ]) {
    for (const tema of ['claro', 'oscuro'] as const) {
      const context = await browser.newContext({
        viewport: { width: vista.ancho, height: vista.alto },
      });

      await context.addInitScript(
        ({ t, simularError }) => {
          try {
            localStorage.setItem('peajesys_tema', t);
            if (document.documentElement) {
              document.documentElement.setAttribute('data-tema', t);
            }
          } catch (e) {
            console.error('Error al fijar el tema en initScript:', e);
          }
          if (simularError) {
            const originalFetch = window.fetch.bind(window);
            window.fetch = async (entrada, init) => {
              const url =
                typeof entrada === 'string'
                  ? entrada
                  : entrada instanceof URL
                    ? entrada.href
                    : entrada.url;
              if (url.includes('/api/auth/login')) {
                return new Response(
                  JSON.stringify({
                    error: {
                      codigo: 'ERROR_SIMULADO',
                      mensaje:
                        'Error de servidor simulado mediante parámetro ?mock=error.',
                    },
                  }),
                  {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                  },
                );
              }
              return originalFetch(entrada, init);
            };
          }
        },
        { t: tema, simularError: escenario.simularErrorServidor },
      );

      const page = await context.newPage();
      const erroresConsola: string[] = [];
      const redEsperada: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        // Chromium registra como "error" toda respuesta HTTP 4xx/5xx. En estos
        // escenarios el 403/409 simulado por MSW es justamente el estado que se
        // captura, así que se lista aparte y no cuenta como error de la página.
        if (
          /Failed to load resource: the server responded with a status of \d{3}/.test(
            msg.text(),
          )
        ) {
          redEsperada.push(msg.text());
          return;
        }
        erroresConsola.push(msg.text());
      });
      page.on('pageerror', (err) => erroresConsola.push(err.message));

      try {
        await page.goto(`http://localhost:${PUERTO}/login`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForSelector('#lg-codigo', { timeout: 15000 });

        await page.fill('#lg-codigo', escenario.codigo);
        await page.fill('#lg-clave', 'prueba');
        await page.click('button[type="submit"]');
        const alerta = page.locator('#lg-error');
        await alerta.waitFor({ state: 'visible', timeout: 15000 });
        const textoAlerta = (await alerta.textContent())?.trim() ?? '';
        if (textoAlerta !== escenario.textoAlerta) {
          throw new Error(
            `La alerta mostrada fue "${textoAlerta}" y se esperaba "${escenario.textoAlerta}".`,
          );
        }

        const rutaActual = new URL(page.url()).pathname;
        if (rutaActual !== '/login') {
          throw new Error(`Redirección inesperada a "${rutaActual}".`);
        }
        const h1 = (await page.locator('h1').textContent())?.trim();
        if (h1 !== 'Inicia sesión') {
          throw new Error(`El h1 visible fue "${h1}".`);
        }

        await page.evaluate(() => document.fonts.ready);
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-tema', t);
        }, tema);
        await page.waitForTimeout(300);

        const nombreArchivo = `${escenario.nombre}-${tema}-${vista.etiqueta}.png`;
        const rutaCompleta = path.join(SALIDA, nombreArchivo);
        await page.screenshot({ path: rutaCompleta, fullPage: false });

        const bytes = fs.statSync(rutaCompleta).size;
        const contenido = fs.readFileSync(rutaCompleta);
        const md5 = crypto.createHash('md5').update(contenido).digest('hex');
        const valido = bytes >= 30 * 1024 && erroresConsola.length === 0;
        if (!valido) sinFallos = false;
        resultados.push({
          archivo: nombreArchivo,
          bytes,
          tamanoKb: `${(bytes / 1024).toFixed(1)} KB`,
          erroresConsola: erroresConsola.length,
          md5,
          valido,
        });
        if (redEsperada.length > 0) {
          console.log(
            `[red simulada esperada] ${nombreArchivo}: ${redEsperada.join(' | ')}`,
          );
        }
      } finally {
        await context.close();
      }
    }
  }
  return sinFallos;
}

async function ejecutar() {
  fs.mkdirSync(SALIDA, { recursive: true });

  let procesoServidor: ChildProcess | null = null;
  if (!(await servidorActivo())) {
    console.log(`Iniciando servidor de vista previa en puerto ${PUERTO}...`);
    procesoServidor = lanzarPnpm(
      ['preview', '--port', String(PUERTO), '--strictPort'],
      { cwd: path.resolve(__dirname, '..', '..'), stdio: 'pipe' },
    );
    if (!(await esperarServidor())) {
      console.error(`No se pudo conectar al servidor en puerto ${PUERTO}`);
      terminarProceso(procesoServidor);
      process.exit(1);
    }
  }

  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const resultados: ResultadoCaptura[] = [];
  let hayFallos = false;

  try {
    for (const escenario of ESCENARIOS) {
      const ok = await capturarEscenario(browser, escenario, resultados);
      if (!ok) hayFallos = true;
    }

    const hashesVistos = new Map<string, string>();
    for (const r of resultados) {
      if (hashesVistos.has(r.md5)) {
        console.error(
          `Colisión de hash: "${r.archivo}" repite el MD5 de "${hashesVistos.get(r.md5)}".`,
        );
        hayFallos = true;
      } else {
        hashesVistos.set(r.md5, r.archivo);
      }
    }
  } finally {
    await browser.close();
    if (procesoServidor) terminarProceso(procesoServidor);
  }

  console.log('\n### Resultados de capturas de estados de error (B2)');
  console.log(
    '| Archivo | Bytes | Tamaño | MD5 | Errores de consola | Estado |',
  );
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const r of resultados) {
    console.log(
      `| ${r.archivo} | ${r.bytes} | ${r.tamanoKb} | \`${r.md5}\` | ${r.erroresConsola} | ${r.valido ? 'PASS (≥ 30 KB)' : 'FAIL'} |`,
    );
  }

  if (hayFallos) {
    console.error(
      '\nError: una o más capturas pesaron menos de 30 KB, registraron errores o duplican hashes.',
    );
    process.exit(1);
  }
  console.log(
    '\nTodas las capturas de error cumplen el umbral (≥ 30 KB), 0 errores de consola y hashes únicos.',
  );
}

ejecutar().catch((err) => {
  console.error('Error fatal al generar capturas de error:', err);
  process.exit(1);
});
