# Frontend de PeajeSys

Frontend para la operación, supervisión y administración de las estaciones de peaje Gambote y La Ceballos.
Desarrollado en React 18, Vite, TypeScript estricto, Tailwind CSS y componentes shadcn/ui accesibles basados en Radix UI.

## 0. Arranque rápido

Requisitos: Node 20 o superior y `corepack enable` (pnpm 10.33.2). La guía completa, con la base de datos y la solución de problemas, está en el [README raíz](../README.md#-inicio-r%C3%A1pido).

Desde la **raíz** del repositorio, igual en Windows (cmd/PowerShell) y Linux, sin crear ningún `.env`:

```bash
pnpm install
pnpm db           # PostgreSQL en Docker; esperar a "healthy" (docker compose ps)
pnpm dev          # API (.NET, 5080) + frontend (Vite, 5180) conectados
pnpm dev:mocks    # solo el frontend con datos simulados (MSW), sin backend
```

- `pnpm dev` usa `frontend/.env.development` (`VITE_USAR_MOCKS=false`): el frontend llama a `/api` y Vite lo reenvía a la API real mediante un proxy. Necesita la base de datos (`pnpm db`); sin ella, la API responde pero las consultas fallan.
- `pnpm dev:mocks` usa `frontend/.env.mocks` (`VITE_USAR_MOCKS=true`) y no necesita backend ni BD.
- Ya no hace falta un `.env`. Si quieres sobrescribir algo, crea `frontend/.env.local` (no se versiona); `frontend/.env.example` muestra las variables.
- `VITE_API_PROXY_TARGET` cambia el destino del proxy (por defecto `http://localhost:5080`).

## 1. Comandos principales

Todos los comandos se ejecutan dentro del directorio `frontend/`:

```bash
# Desarrollo local contra la API real (puerto 5180 con --strictPort).
# Necesita la API en el 5080: lo más simple es `pnpm dev` desde la raíz,
# que arranca API y web juntas.
pnpm dev

# Desarrollo local solo con mocks (sin backend)
pnpm dev:mocks

# Compilación de producción (TypeScript + Vite)
pnpm build

# Compilación en modo mocks (la usan los E2E)
pnpm build:mocks

# Servidor de vista previa de la compilación
pnpm preview

# Verificación de tipos TypeScript
pnpm typecheck

# Linting con ESLint (configuración plana estricta)
pnpm lint

# Verificación de formato con Prettier
pnpm format

# Corrección de formato automática
pnpm format:fix

# Pruebas unitarias con Vitest
pnpm test

# Pruebas unitarias con reporte de cobertura v8 (umbral ≥ 80%)
pnpm test:cov

# Pruebas de extremo a extremo (E2E) con Playwright
# Compila solo en modo mocks (`pnpm build:mocks`), no depende de ningún .env
# ni del backend. 70 pruebas.
# Si no hay Chromium del sistema (/usr/bin/chromium o PLAYWRIGHT_CHROMIUM_PATH),
# instálalo una vez (Windows y Linux):
#   pnpm exec playwright install chromium
pnpm e2e

# Generación automatizada de capturas en claro/oscuro y escritorio/móvil
pnpm capturar -- --ruta <ruta> --rol <rol> --espera <selector> --salida <carpeta>
```

## 2. Ejecutar tareas pesadas

**Para todos** (Windows, Linux, macOS): ejecuta la tarea en primer plano, una a la vez:

```bash
pnpm <tarea>      # install, test:cov, build, e2e, capturar...
```

Antes de arrancar un servidor comprueba que el puerto está libre, y al terminar que quedó libre:

```bash
# Linux / macOS
ss -ltnp | grep <puerto>
```

```powershell
# Windows (PowerShell o cmd)
netstat -ano | findstr :<puerto>
```

### Solo para la máquina Linux del orquestador

Esta sección aplica únicamente a la máquina Linux con poca RAM (~7 GB, ~1,5 GB libres) compartida entre varios agentes de trabajo. Usa `flock`, `nice`, `free` y `ss`, que no existen en Windows. Nadie más necesita seguirla.

1. **Verificar memoria antes de tareas pesadas**:

   ```bash
   free -m
   ```

   Si la memoria disponible es inferior a 1 GB, esperar a que el sistema libere recursos.

2. **Ejecutar tareas pesadas en primer plano bajo candado y prioridad baja**:

   ```bash
   flock /tmp/peajesys-pesado.lock nice -n 10 pnpm <tarea>
   ```

   Aplica a: `pnpm install`, `pnpm test:cov`, `pnpm build`, `pnpm e2e` y `pnpm capturar`.
   **Nunca** lanzar instalaciones o builds en segundo plano ni en paralelo.

3. **Límites de paralelismo para control de RAM** (ya están en la configuración y no estorban en otras máquinas):
   - **Vitest (`vitest.config.ts`)**: pool `'forks'` limitado a un máximo de 2 procesos. Aplica a `pnpm test` y `pnpm test:cov`.
   - **Playwright (`playwright.config.ts`)**: `workers: 1` y `fullyParallel: false` (un único Chromium, pruebas secuenciales). Aplica a `pnpm e2e`.

## 3. Puertos asignados por bloque

Cada bloque tiene un puerto único asignado para evitar colisiones:

| Bloque          | Función                                | Puerto   |
| --------------- | -------------------------------------- | -------- |
| **B0**          | Esqueleto base y diseño compartido     | **5180** |
| **B1a**         | API tipada, Zod y TanStack Query       | **5181** |
| **B1b**         | Semilla de datos y mocks MSW           | **5182** |
| **B2**          | Inicio de sesión                       | **5183** |
| **B3**          | Terminal de operador y cierre de turno | **5184** |
| **B4**          | Supervisión y arqueos                  | **5185** |
| **B5**          | Administración                         | **5186** |
| **B6**          | Pruebas E2E completas                  | **5187** |
| **Integración** | Fusión en develop                      | **5188** |

Siempre usar `--strictPort` en `vite dev` o `vite preview`. Al terminar cualquier servidor, verificar que el puerto quedó libre (`ss -ltnp | grep <puerto>` en Linux, `netstat -ano | findstr :<puerto>` en Windows). Esta tabla es histórica: el desarrollo normal usa siempre el 5180.

## 4. Estructura de carpetas

```text
frontend/
├── public/
│   └── img/                 # Logos, favicons y siluetas vehiculares procesadas
├── src/
│   ├── api/                 # Capa de cliente de API (propiedad de B1a)
│   ├── app/                 # Configuración raíz de la app
│   │   ├── proveedores.tsx  # Proveedores: QueryClient, Tema, Sesion, Router, Sonner
│   │   └── router.tsx       # Enrutador central y registro perezoso de features
│   ├── components/
│   │   ├── feedback/        # Estados de datos: EstadoVacio, EstadoCargando, EstadoError, EstadoDatos
│   │   ├── layout/          # Cabecera, Franja, BotonTema, LayoutApp
│   │   └── ui/              # Componentes de diseño shadcn/ui accesibles (Radix UI)
│   ├── features/
│   │   ├── admin/           # Feature de Administración (B5) -> routes.tsx
│   │   ├── auth/            # Feature de Inicio de sesión (B2) -> routes.tsx
│   │   ├── operador/        # Feature de Operador de caseta (B3) -> routes.tsx
│   │   └── supervisor/      # Feature de Supervisor (B4) -> routes.tsx
│   ├── lib/
│   │   ├── formato.ts       # Utilidades de moneda (pesos colombianos) y fechas
│   │   ├── roles.ts         # Tipos Rol ('RECAUDADOR' | 'SUPERVISOR' | 'ADMIN') y Usuario
│   │   ├── sesion.tsx       # SesionProvider, useSesion, RequireRol (sessionStorage)
│   │   ├── tema.tsx         # TemaProvider, useTema (claro/oscuro, localStorage)
│   │   └── utils.ts         # Utilidad cn() para clases Tailwind
│   ├── mocks/               # Handlers y navegador de MSW (propiedad de B1a y B1b)
│   ├── test/                # Setup de pruebas vitest y renderConProveedores()
│   ├── types/               # Tipos TypeScript compartidos del dominio (propiedad de B1a)
│   ├── index.css            # Tokens de diseño, variables CSS y utilidades
│   └── main.tsx             # Punto de entrada de la aplicación
├── scripts/
│   └── capturar.ts          # Herramienta automatizada de capturas Playwright
└── e2e/
    └── humo.spec.ts         # Prueba de humo inicial
```

## 5. Cómo registrar una feature

Los bloques B2 a B5 **solo deben trabajar dentro de su carpeta** `src/features/<nombre>/`:

1. Crear o reemplazar `src/features/<nombre>/routes.tsx`.
2. El archivo debe tener un `export default` con el componente de vista.
3. El enrutador central `src/app/router.tsx` ya contiene la carga perezosa (`React.lazy`) y las guardias de rol (`RequireRol`):
   - `/login` -> `src/features/auth/routes.tsx`
   - `/operador` -> `src/features/operador/routes.tsx` (requiere rol `RECAUDADOR`)
   - `/supervisor` -> `src/features/supervisor/routes.tsx` (requiere rol `SUPERVISOR`)
   - `/admin` -> `src/features/admin/routes.tsx` (requiere rol `ADMIN`)
4. **No es necesario modificar `src/app/router.tsx`** para implementar tu bloque.

## 6. Cómo usar la utilidad de pruebas `renderConProveedores`

Para escribir pruebas unitarias de componentes que utilicen TanStack Query, temas, rutas o sesión:

```tsx
import { renderConProveedores, screen } from '@/test/render';
import { MiComponente } from './MiComponente';

test('renderiza con usuario autenticado', () => {
  renderConProveedores(<MiComponente />, {
    initialEntries: ['/operador'],
    usuarioInicial: {
      id: 'EMP-001',
      nombre: 'María López',
      rol: 'RECAUDADOR',
    },
    temaInicial: 'claro',
  });

  expect(screen.getByText('...')).toBeInTheDocument();
});
```

## 7. Cómo generar capturas de pantalla de tu bloque

Cada bloque debe generar capturas en claro y oscuro, a 1280 px y a 390 px:

```bash
pnpm capturar -- --ruta /operador --rol RECAUDADOR --espera h1 --salida ./capturas/B3/
```

(En la máquina Linux del orquestador se antepone `flock /tmp/peajesys-pesado.lock nice -n 10`; los `\` de fin de línea de los ejemplos largos son solo de bash: en PowerShell escríbelos en una sola línea o usa el acento grave `` ` ``.)

La carpeta `capturas/` no se versiona (esta en `.gitignore`).

Opciones de interacción (para capturar estados que requieren acciones, por ejemplo errores de formulario o interacción con diálogos y modales):

- `--llenar '<selector>=<valor>'`: rellena un campo (repetible). El valor puede contener `=`.
- `--clic '<selector>'`: hace clic en un elemento (repetible).
- Las acciones `--llenar` y `--clic` se ejecutan secuencialmente en el **orden de aparición** en la línea de comandos, permitiendo abrir un diálogo (`--clic`) y luego diligenciar sus campos (`--llenar`). Se mantiene total retrocompatibilidad con invocaciones previas (llenar primero y clic después).
- `--espera-despues '<selector>'`: elemento a esperar tras las acciones, antes de capturar.

Ejemplo: rellenar el formulario del login con un usuario INACTIVO de la semilla, enviar y esperar el mensaje de error:

```bash
pnpm capturar -- \
  --ruta /login \
  --rol ninguno \
  --espera 'h1:has-text("Inicia sesión")' \
  --llenar '#lg-codigo=EMP-009' \
  --llenar '#lg-clave=prueba' \
  --clic 'button[type="submit"]' \
  --espera-despues '#lg-error' \
  --salida ./capturas/B2/ \
  --nombre login-inactivo \
  --puerto 5183
```

Requisitos del script:

- Genera 4 imágenes PNG por pantalla (claro y oscuro, 1280 px y 390 px).
- Cada imagen debe pesar **≥ 30 KB** (si pesa menos, la captura falla).
- Falla si se detecta cualquier error de consola durante la navegación. Las entradas automáticas de Chromium por respuestas simuladas de MSW (`Failed to load resource: … 403/409/500`) se listan aparte como «red simulada esperada» y no invalidan la captura.
- Verifica que la ruta final tras la navegación e interacción coincide con `--ruta`.
- Imprime la tabla resumen de archivos, tamaños y errores, con hashes MD5 únicos por lote.
