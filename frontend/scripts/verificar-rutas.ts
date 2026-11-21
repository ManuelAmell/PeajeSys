import http from 'http';
import { chromium } from '@playwright/test';

function consultarUrl(ruta: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:5180${ruta}`, (res) => {
      resolve(res.statusCode || 0);
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function verificar() {
  console.log('--- Verificando respuestas HTTP directas en puerto 5180 ---');
  const rutas = ['/login', '/operador', '/supervisor', '/admin', '/ruta-inexistente'];
  for (const r of rutas) {
    const status = await consultarUrl(r);
    console.log(`Ruta ${r} responde con HTTP ${status}`);
  }

  console.log('--- Verificando comportamiento de RequireRol en navegador ---');
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_PATH ||
      (process.platform === 'linux' ? '/usr/bin/chromium' : undefined),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Intento de acceso sin sesión a /operador
  await page.goto('http://localhost:5180/operador');
  await page.waitForURL('**/login');
  console.log('Acceso sin sesión a /operador redirige exitosamente a:', page.url());

  // Intento de acceso sin sesión a /supervisor
  await page.goto('http://localhost:5180/supervisor');
  await page.waitForURL('**/login');
  console.log('Acceso sin sesión a /supervisor redirige exitosamente a:', page.url());

  // Intento de acceso sin sesión a /admin
  await page.goto('http://localhost:5180/admin');
  await page.waitForURL('**/login');
  console.log('Acceso sin sesión a /admin redirige exitosamente a:', page.url());

  // Acceso a ruta no existente
  await page.goto('http://localhost:5180/ruta-inexistente-404');
  const h1 = await page.locator('h1').textContent();
  console.log('Acceso a ruta inexistente muestra H1:', h1?.trim());

  await browser.close();
  console.log('--- Verificación de rutas completada con éxito ---');
}

verificar().catch((err) => {
  console.error('Error durante la verificación:', err);
  process.exit(1);
});
