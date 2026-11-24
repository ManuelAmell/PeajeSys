# Pendientes: PeajeSys (Avance 3, corte 3 - Entrega Final)

Actualizado el 2026-11-22: todo está integrado en `develop` (PR #1 y #2), con CI en GitHub Actions para Windows y Linux, y `develop` está protegida. **Lo siguiente son las pruebas manuales del equipo (sección 5).** Estado anterior, del 2026-11-21 (secciones 1 a 3: histórico de la revisión del 2026-11-20, commits `dac755e` de Base de Datos y `35afb5c` de Web API .NET; las cifras de pruebas de esas secciones están superadas, los totales actuales están en la sección 4).

---

## 🖥️ 1. Frontend (Completado al 100%)

- [x] Imágenes procesadas en `docs/diseno/procesadas/` (logo, isotipo, favicons, 7 siluetas, foto del login).
- [x] Sistema de diseño con paleta vial y temas claro / oscuro implementado y aprobado.
- [x] Código de la aplicación en `frontend/` (React 18 + Vite 6 + TS, Tailwind CSS + Radix/shadcn, pnpm, MSW).
- [x] Terminal de cobro del operador (cobro en efectivo, telepeaje RFID, excepciones de barrera, atajos de teclado F1-F8).
- [x] Inicio de sesión por rol (Recaudador, Supervisor, Administrador) y control de accesos `RequireRol`.
- [x] Panel del supervisor (arqueo y conciliación de turnos, recaudo diario, auditoría y cuentas de telepeaje).
- [x] Panel del administrador (gestión de tarifas por estación, casetas, categorías vehiculares y personal).
- [x] Pruebas unitarias completas (Vitest: 362/362 PASS) y de integración con MSW.
- [x] Pruebas E2E automatizadas con Playwright (100% funcionales en Windows y Linux, 62 pruebas E2E aprobadas).
- [x] Servidor frontend configurado con `host: true` en puerto 5180 y soporte para túneles remotos (Microsoft Dev Tunnels).

---

## 🗄️ 2. Base de Datos y PL/pgSQL (Completado al 100% - Commit `dac755e`)

Entregables obligatorios de la guía oficial (Sección 4.2 y 4.4) finalizados y documentados en `database/` y `docs/entregas/`:

1. [x] **Versión final consolidada del modelo y scripts SQL**:
   - `database/00_Master_PeajeSys.sql`: script maestro consolidado para reconstrucción total en limpio en PostgreSQL 14+.
   - `database/02_SQL/01_DDL_PeajeSys.sql`: 11 tablas normalizadas en 3FN con PKs, FKs y restricciones de integridad.
   - `database/02_SQL/02_DML_Datos_PeajeSys.sql`: carga masiva de datos (+10 registros por tabla) y pruebas transaccionales ACID con `COMMIT`/`ROLLBACK`.
   - `database/02_SQL/04_Objetos_PeajeSys.sql`: vistas de negocio (`vw_resumen_diario_estacion`, `vw_estado_cuentas_telepeaje`), secuencia `seq_numero_ticket` e índice B-Tree compuesto `idx_transaccion_fecha_turno`.
2. [x] **Bloque PL/pgSQL con cursor y manejo de excepciones**:
   - `database/03_PLSQL/04_Proceso_Cursor_PeajeSys.sql`: proceso batch nocturno `pr_proceso_nocturno_monitoreo_cuentas` que barre cuentas RFID, detecta saldos críticos y gestiona excepciones controladas.
3. [x] **Procedimientos almacenados (3 implementados)** (`database/03_PLSQL/02_Procedimientos_PeajeSys.sql`):
   - `pr_registrar_paso_telepeaje`: cobro atómico por RFID, débito de saldo, emisión de ticket y registro de paso.
   - `pr_cerrar_arqueo_turno`: cierre financiero formal de turno con cálculo de descuadres.
   - `pr_recargar_saldo_telepeaje`: inyección de saldo y reactivación de cuentas suspendidas.
4. [x] **Funciones almacenadas (4 implementadas)** (`database/03_PLSQL/01_Funciones_PeajeSys.sql`):
   - `fn_obtener_tarifa_vigente`: liquidación tarifaria dinámica por categoría y peaje.
   - `fn_validar_aptitud_telepeaje`: validación en tiempo real de cuentas y TAGs RFID.
   - `fn_calcular_descuadre_turno`: comparación de efectivo físico vs recaudo registrado.
   - `fn_estimar_cruces_restantes`: proyección de cruces restantes según saldo disponible.
5. [x] **Triggers del negocio (4 implementados)** (`database/03_PLSQL/03_Triggers_PeajeSys.sql`):
   - `trg_prevenir_saldo_negativo`: validación a nivel de motor contra saldos negativos.
   - `trg_auditar_transacciones_sensibles`: registro automático e inmutable de evasiones y exentos.
   - `trg_acumular_recaudo_efectivo`: sincronización en tiempo real del recaudo del turno.
   - `trg_auditoria_inmutable`: protección de bitácora legal (append-only estricto).
6. [x] **Manejo de excepciones**:
   - Bloques con `EXCEPTION WHEN OTHERS`, códigos SQLSTATE personalizados y mensajes descriptivos en todos los SPs y funciones.
7. [x] **Matriz de pruebas**:
   - `database/03_PLSQL/05_Matriz_Pruebas_PeajeSys.sql`: 11 casos de prueba automatizados con verificación de casos normales, de borde y fallos esperados.
8. [x] **Documentación formal de entrega**:
   - `docs/entregas/Diccionario_Datos_PeajeSys.pdf` (diccionario completo de las 11 tablas).
   - `docs/entregas/Esquema Relacional y E-R.html` (diagrama DER y relacional interactivo).
   - `docs/entregas/Guia Ejecucion BD PeajeSys.pdf` (guía paso a paso para PostgreSQL/pgAdmin).
   - `docs/entregas/PeajeSys_Avance_Final.pdf` (informe consolidado final para sustentación).
   - `docs/entregas/README.md` (resumen normativo conforme a la guía de la asignatura).

---

## ⚙️ 3. Backend C# / .NET (Completado al 100% - Commit `35afb5c`)

Solución modular implementada en `backend/PeajeSys.sln` con arquitectura limpia:

- [x] **PeajeSys.Core**:
  - Modelos de dominio y entidades (`PeajeEntities.cs`).
  - DTOs de autenticación, cobro, supervisor y administración (`AuthDTOs.cs`, `CobroDTOs.cs`, `SupervisorDTOs.cs`, `AdminDTOs.cs`).
  - Interfaces de servicios y repositorios (`IAuthInterfaces.cs`, `ICobroInterfaces.cs`, `ISupervisorInterfaces.cs`, `IAdminInterfaces.cs`).
  - Servicio de seguridad JWT y hashing (`JwtTokenService.cs`, `PasswordHasher.cs`).
  - Excepciones de dominio tipadas (`AppExceptions.cs`).
- [x] **PeajeSys.Data**:
  - Contexto de base de datos Entity Framework Core (`PeajeSysDbContext.cs`) mapeado a PostgreSQL con Npgsql.
  - Configuraciones de mapeo Fluent API (`PeajeConfigurations.cs`).
  - Implementación de patrones genéricos `Repository<T>` y `UnitOfWork`.
- [x] **PeajeSys.Api**:
  - Controladores REST: `AuthController`, `TurnosController`, `RecaudoController`, `TelepeajeController`, `VehiculosController`, `TarifasController`, `CategoriasController`, `EstacionesController`, `CasetasController`, `OperadoresController`, `AuditoriaController`.
  - Middlewares de autenticación JWT y manejo global de excepciones (`GlobalExceptionMiddleware.cs`, `JwtAuthenticationMiddleware.cs`).
  - Servicios de aplicación: `AuthService`, `TurnoService`, `CobroService`, `VehiculoService`, `SupervisorServices`, `AdminServices`, `PlpgsqlServices`.
- [x] **PeajeSys.Tests**:
  - Suite de 166 pruebas unitarias e integración con xUnit, Moq y FluentAssertions (**166/166 PASS**, cobertura generada en `coverage.cobertura.xml`).
  - Compatible con SDK .NET 11 y .NET 8 LTS mediante `Directory.Build.props` (`RollForward=Major`).
- [x] **Clases de dominio complementarias**:
  - Clases base en `backend/PeajeSys.Dominio/` (`peaje/`, `user/`, `operacion/`, `telePeaje/`, `reportes/`).
  - El proyecto `PeajeSys.Dominio` forma parte de `PeajeSys.sln`.

---

## 🎯 4. Cierre técnico y pendientes finales

### Hecho

- [x] **Seguridad y JWT**:
  - [x] Clave JWT de producción fuera del repositorio (se exige `JwtSettings__SecretKey`; en desarrollo hay una clave versionada en `appsettings.Development.json`) y validación de configuración al arrancar.
  - [x] Validación estricta del token (`exp` obligatorio, `nbf`, `iss`, `aud`, `alg`), una sola validación por petición y errores de arranque no silenciados.
  - [x] Usuarios del equipo en la base de datos con contraseña BCrypt; sin usuarios ni contraseñas fijos en el código.
  - [x] Políticas por rol, propiedad del turno (`403 TURNO_AJENO`) y sobre de error estándar.
- [x] **Integración de punta a punta**: frontend, API y PostgreSQL funcionan juntos con los 3 roles (login a través del proxy de Vite, cobro, turnos, supervisión y administración).
- [x] **Ejecución desde el repo** (clonar y correr): `docker-compose.yml` con PostgreSQL 16 que carga el script maestro, comandos de la raíz (`pnpm install`, `pnpm db`, `pnpm dev`, `pnpm dev:mocks`, `pnpm test`), `.env.development` y `.env.mocks` versionados, y README con "Inicio rápido" para PowerShell y bash.
- [x] **Correcciones del code-review** de la PR #1:
  - cobro atómico y seguro (turno ajeno, tarifa validada, doble gasto, ticket);
  - login sin enumeración de cuentas y acceso revocado al desactivar o degradar a un operador;
  - tarifas con fechas cruzadas;
  - casetas no operativas;
  - índices únicos parciales de turnos abiertos;
  - monitoreo sin `catch` silenciosos.
- [x] **CI en GitHub Actions** (`.github/workflows/ci.yml`), con 6 jobs: backend y frontend en Ubuntu y Windows, backend con PostgreSQL 16 (maestro, matriz y concurrencia) y E2E. `develop` está protegida: se fusiona solo por PR y con el CI en verde.
- [x] **Totales de pruebas** (CI del 2026-11-22 sobre `develop`):
  - Backend (`dotnet test`): **449** pruebas, incluidas las de concurrencia contra PostgreSQL.
  - Frontend (Vitest): **465** pruebas.
  - E2E (Playwright, modo mocks): **70** pruebas.
- [x] Documentación de limitaciones: [docs/limitaciones-conocidas.md](docs/limitaciones-conocidas.md).

### Pendientes abiertos

- [x] Regenerar `Diccionario_Datos_PeajeSys.pdf` (en `database/01_Modelado` y `docs/entregas`) con la columna `OPERADOR.password_hash`, el rol `ADMINISTRADOR` y los índices únicos parciales de turnos abiertos (`uq_turno_caseta_abierto` y `uq_turno_operador_abierto`).
  Hecho el 2026-11-23: diccionario v2 desde `database/01_Modelado/fuentes/Diccionario_Datos_PeajeSys.html`, `password_hash` en las dos figuras del DER y anexo de 3 páginas en `PeajeSys_Avance_Final.pdf` (cambios del esquema, matriz con resultado esperado y obtenido, protocolo 5.1 corregido).
- [ ] Preparar la sustentación final:
  - Revisar las diapositivas basadas en `docs/entregas/PeajeSys_Avance_Final.pdf`.
  - Demostración en vivo de los 3 roles en el frontend y de la ejecución de los triggers y funciones en PostgreSQL.
- [ ] Decidir sobre las decisiones a revisar de [limitaciones conocidas](docs/limitaciones-conocidas.md) (en especial, si `GET /api/tarifas` debe exigir autenticación, y la auditoría de los exentos con `postgres`).
- [ ] Opcional: un commit de formato con Prettier para los archivos antiguos del frontend que hoy no pasan `pnpm format`.

---

## 🧪 5. Pruebas manuales del equipo (antes de la sustentación)

La guía completa, con los pasos y el resultado esperado de cada prueba, está en **[docs/pruebas-manuales.md](docs/pruebas-manuales.md)**. Las pruebas se hacen con la base de datos real (`pnpm db` y `pnpm dev`). Antes de cada bloque, ejecuta `pnpm db:reset`.

**Cómo reportar:** abre un issue en GitHub con la plantilla **"Prueba manual"**, indicando el número de la prueba, una captura y tu sistema. Cuando termines un bloque, marca aquí tu casilla.

- [ ] **Alex** (`REC-001`): bloque 1, Recaudador (R1 a R16), y bloque 4, Seguridad (X1 a X7).
- [ ] **Camilo** (`REC-002`): bloque 1, Recaudador, con atención especial a R16 (móvil, ~390 px); bloque 4, Seguridad; y revisión de textos, ortografía y tema claro y oscuro.
- [ ] **Samuel** (`SUP-001`): bloque 2, Supervisor (S1 a S9), y bloque 4, Seguridad. Debe comprobar que los totales cuadran con lo cobrado en el bloque 1.
- [ ] **Manuel** (`ADM-001`): bloque 3, Administrador (A1 a A10); bloque 4, Seguridad; coordinar la prueba X5 (dos personas abriendo turno a la vez) y revisar los issues.
- [ ] **Quien use Windows**: ejecutar la [checklist de verificación en Windows](docs/verificacion-windows.md). El CI ya cubre la compilación y las pruebas; la checklist comprueba Docker Desktop, `pnpm dev` en el navegador y `pnpm capturar`.
- [ ] **Sesión conjunta**: los bloques 1 y 2 a la misma hora. Los recaudadores cobran y anulan, y el supervisor revisa en vivo el arqueo, el recaudo y la auditoría.
- [ ] Corregir los issues que salgan, cada uno en su rama con PR hacia `develop`, y repetir las pruebas afectadas.
