# Frontend de PeajeSys

Frontend para la operación, supervisión y administración de las estaciones de peaje Gambote y La Ceballos.
Desarrollado en React 18, Vite, TypeScript estricto, Tailwind CSS y componentes shadcn/ui accesibles basados en Radix UI.

## 1. Comandos principales

Todos los comandos se ejecutan dentro del directorio `frontend/`:

```bash
# Desarrollo local (puerto 5180 con --strictPort)
pnpm dev

# Compilación de producción (TypeScript + Vite)
pnpm build

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

# Pruebas de extremo a extremo (E2E) con Playwright y Chromium del sistema
pnpm e2e

# Generación automatizada de capturas en claro/oscuro y escritorio/móvil
pnpm capturar -- --ruta <ruta> --rol <rol> --espera <selector> --salida <carpeta>
```

## 2. Regla de oro: Candado común (`flock`) y entorno

En esta máquina (memoria RAM limitada de ~7 GB con ~1,5 GB libres):

1. **Verificar memoria antes de tareas pesadas**:
   ```bash
   free -m
   ```
   Si la memoria disponible es inferior a 1 GB, esperar a que el sistema libere recursos.

2. **Ejecutar tareas pesadas en primer plano bajo candado y prioridad baja**:
   ```bash
   flock /tmp/peajesys-pesado.lock nice -n 10 pnpm <tarea>
   ```
   Aplica obligatoriamente a: `pnpm install`, `pnpm test:cov`, `pnpm build`, `pnpm e2e` y `pnpm capturar`.
   **Nunca** lanzar instalaciones o builds en segundo plano ni en paralelo.

3. **Límites de paralelismo para control de RAM**:
   Dado que este entorno cuenta con ~6,9 GB de RAM compartidos entre múltiples agentes de trabajo, el paralelismo está estrictamente limitado en las herramientas de prueba:
   - **Vitest (`vitest.config.ts`)**: Se utiliza el pool `'forks'` limitado a un máximo de 2 procesos (`maxWorkers: 2`, `minWorkers: 1`, `poolOptions.forks: { maxForks: 2, minForks: 1 }`). Esto previene el sobrecosto de memoria (evitando abrir ~10 forks simultáneos de ~700 MB). Aplica a `pnpm test` y `pnpm test:cov`.
   - **Playwright (`playwright.config.ts`)**: Configurado con `workers: 1` y `fullyParallel: false` para ejecutar las pruebas E2E secuencialmente en un único proceso Chromium controlado. Aplica a `pnpm e2e`.

## 3. Puertos asignados por bloque

Cada bloque tiene un puerto único asignado para evitar colisiones:

| Bloque | Función | Puerto |
| --- | --- | --- |
| **B0** | Esqueleto base y diseño compartido | **5180** |
| **B1a** | API tipada, Zod y TanStack Query | **5181** |
| **B1b** | Semilla de datos y mocks MSW | **5182** |
| **B2** | Inicio de sesión | **5183** |
| **B3** | Terminal de operador y cierre de turno | **5184** |
| **B4** | Supervisión y arqueos | **5185** |
| **B5** | Administración | **5186** |
| **B6** | Pruebas E2E completas | **5187** |
| **Integración** | Fusión en develop | **5188** |

Siempre usar `--strictPort` en `vite dev` o `vite preview`. Al terminar cualquier servidor, verificar que el puerto quedó libre:
```bash
ss -ltnp | grep <puerto>
```

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
flock /tmp/peajesys-pesado.lock nice -n 10 pnpm capturar -- \
  --ruta /operador \
  --rol RECAUDADOR \
  --espera h1 \
  --salida /home/amell/orca/reportes/capturas/B3/
```

Opciones de interacción (para capturar estados que requieren acciones, por ejemplo errores de formulario):

- `--llenar '<selector>=<valor>'`: rellena un campo (repetible). El valor puede contener `=`.
- `--clic '<selector>'`: hace clic en un elemento (repetible). Los clics se ejecutan en orden, después de todos los `--llenar`.
- `--espera-despues '<selector>'`: elemento a esperar tras las acciones, antes de capturar.

Ejemplo: rellenar el formulario del login con un usuario INACTIVO de la semilla, enviar y esperar el mensaje de error:

```bash
flock /tmp/peajesys-pesado.lock nice -n 10 pnpm capturar -- \
  --ruta /login \
  --rol ninguno \
  --espera 'h1:has-text("Inicia sesión")' \
  --llenar '#lg-codigo=EMP-009' \
  --llenar '#lg-clave=prueba' \
  --clic 'button[type="submit"]' \
  --espera-despues '#lg-error' \
  --salida /home/amell/orca/reportes/capturas/B2/ \
  --nombre login-inactivo \
  --puerto 5183
```

Requisitos del script:
- Genera 4 imágenes PNG por pantalla (claro y oscuro, 1280 px y 390 px).
- Cada imagen debe pesar **≥ 30 KB** (si pesa menos, la captura falla).
- Falla si se detecta cualquier error de consola durante la navegación. Las entradas automáticas de Chromium por respuestas simuladas de MSW (`Failed to load resource: … 403/409/500`) se listan aparte como «red simulada esperada» y no invalidan la captura.
- Verifica que la ruta final tras la navegación e interacción coincide con `--ruta`.
- Imprime la tabla resumen de archivos, tamaños y errores, con hashes MD5 únicos por lote.
