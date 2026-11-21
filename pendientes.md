# Pendientes: PeajeSys (Avance 3, corte 3 - Entrega Final)

Actualizado el 2026-11-20 tras la revisión del historial de commits (`dac755e` de Base de Datos y `35afb5c` de Web API .NET).

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

## 🎯 4. Próximos pasos finales / Sustentación

- [x] **Revisión de Seguridad y JWT**:
  - [x] Clave JWT fuera del repositorio (user-secrets / `JwtSettings__SecretKey`) y validación de configuración al arrancar.
  - [x] Validación estricta del token (`exp` obligatorio, `nbf`, `iss`, `aud`, `alg`).
  - [x] Retirar la sobrecarga sin uso de `GenerateToken`.
  - [x] Una sola validación del token por petición (handler de autenticación).
  - [x] Los errores de arranque de la API ya no se silencian (código de salida distinto de 0).
  - [x] Usuarios semilla solo en entorno Development.
- [ ] **Prueba de integración End-to-End**:
  - Levantar la base de datos ejecutando `00_Master_PeajeSys.sql` en PostgreSQL local.
  - Configurar la clave JWT (ver `backend/README.md`, sección 4.3) e iniciar la Web API desde su carpeta (`cd backend/PeajeSys.Api && dotnet run`, entorno Development y puerto 5080).
  - Cambiar `VITE_USAR_MOCKS=false` en `frontend/.env` para validar la comunicación real Frontend $\leftrightarrow$ Backend $\leftrightarrow$ PostgreSQL.
- [ ] **Preparación de la sustentación final**:
  - Revisar diapositivas de presentación basadas en `docs/entregas/PeajeSys_Avance_Final.pdf`.
  - Demostración en vivo de los 3 roles en el frontend y la ejecución de los triggers / funciones en PostgreSQL.
