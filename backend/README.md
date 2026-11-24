# PeajeSys: Backend Web API (C# .NET)

Solución backend para el Sistema de Control y Recaudo de Peajes PeajeSys, construida con ASP.NET Core Web API, C# 12, .NET 8 (target `net8.0`), Entity Framework Core y PostgreSQL.

---

## 1. Integrantes y Responsabilidades

| Desarrollador | Rol | Responsabilidades Principales |
|---|---|---|
| **Alex Florez** | Backend Developer | Arquitectura de servicios, controladores REST, autenticación JWT, seguridad y gestión de turnos/arqueos. |
| **Samuel Otero** | Backend Developer | Lógica de transacciones de recaudo, validación de telepeaje RFID, Entity Framework Core y repositorios. |
| **Manuel Amell** | Database & Full-Stack | Soporte en DDL/DML PostgreSQL, procedimientos almacenados PL/pgSQL, triggers e integración frontend/backend. |

---

## 2. Requisitos Previos

- **.NET SDK**: 8.0 o superior (`dotnet --version`). Todos los proyectos apuntan a `net8.0`; con un SDK más nuevo compila igual gracias a `RollForward=Major` (`backend/Directory.Build.props`).
- **PostgreSQL**: 14 o superior (la imagen de `docker compose` usa la 16).
- **IDE**: Visual Studio 2022 (Community o Professional), Visual Studio Code (con C# Dev Kit) o JetBrains Rider.
- **Base de datos inicializada**: la forma más simple es `pnpm db` desde la raíz del repo (Docker; carga `database/00_Master_PeajeSys.sql`). Sin Docker, carga ese mismo script maestro con `psql` según [database/README.md](../database/README.md).
- **Inicio rápido de todo el proyecto**: sección «Inicio rápido» del [README raíz](../README.md#-inicio-r%C3%A1pido).

---

## 3. Estructura de la Solución

```text
backend/
├── PeajeSys.sln
├── PeajeSys.Api/                  # Web API REST (Controladores, Middlewares, DI, Program.cs)
├── PeajeSys.Core/                 # Dominio (Entidades, Enums, DTOs, Interfaces, Servicios)
├── PeajeSys.Data/                 # Infraestructura (DbContext, Fluent Mappings, Repositorios)
├── PeajeSys.Dominio/              # Clases de dominio complementarias (peaje, user, operacion, telePeaje, reportes)
└── PeajeSys.Tests/                # Pruebas Unitarias y de Integracion (xUnit, FluentAssertions)
```

---

## 4. Configuración Inicial y Puesta en Marcha

### 4.1 Cadena de Conexión
No hay que crear ningún archivo: `backend/PeajeSys.Api/appsettings.Development.json` ya está en el repositorio. La cadena de conexión por defecto (`appsettings.json`) apunta a `localhost:5432/peajesys_db` con usuario `postgres` y contraseña `postgres`, lo que coincide con la base que levanta `docker compose up -d` desde la raíz del repo.

Si usas otro puerto (por ejemplo `PEAJESYS_DB_PORT=5433 pnpm db`) o tu PostgreSQL usa otros datos, sobrescribe la cadena sin tocar archivos versionados:

```bash
# Linux / macOS
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=peajesys_db;Username=postgres;Password=tu_password_local"
```

```powershell
# Windows (PowerShell, solo la sesión actual)
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=peajesys_db;Username=postgres;Password=tu_password_local"
```

### 4.2 Comandos de Compilación y Ejecución

Desde `backend/` (`dotnet build` y `dotnet test` funcionan sin argumentos, igual en bash y PowerShell):

```bash
dotnet restore     # opcional: build ya restaura
dotnet build
dotnet test
cd PeajeSys.Api
dotnet run         # API en http://localhost:5080
```

En PowerShell 5 ejecuta cada línea por separado (no existe `&&`). Desde la raíz del repo, `pnpm api` y `pnpm test:api` hacen lo mismo.

Una vez iniciada la API:
- **Swagger UI (Documentación interactiva)**: `http://localhost:5080/swagger`.
- **Health Check**: `http://localhost:5080/health`.

> Ejecuta siempre `dotnet run` desde `backend/PeajeSys.Api` (no con `--project` desde otra carpeta): así se cargan `appsettings.json` y el perfil de `Properties/launchSettings.json`, que fija el entorno `Development` y el puerto `5080`.

> Los usuarios de prueba viven en la base de datos con su contraseña cifrada (hash BCrypt hecho con `BCrypt.Net-Next`, BCrypt estándar compatible con pgcrypto). El login valida solo contra la tabla `operador`: consulta la sección «Usuarios de prueba» del [README raíz](../README.md#-usuarios-de-prueba).

### 4.3 Configuración de la clave JWT

**Desarrollo: no hay que hacer nada.** La clave de desarrollo está versionada en `backend/PeajeSys.Api/appsettings.Development.json` y se usa solo con `dotnet run` (entorno `Development`). Es una clave pública del repositorio: nunca debe usarse fuera de desarrollo.

**Producción u otros entornos: es obligatorio definir `JwtSettings__SecretKey`** (mínimo 32 bytes en UTF-8). La clave de producción no está en el repositorio.

```bash
# Linux / macOS
export JwtSettings__SecretKey="$(openssl rand -base64 48)"
```

```powershell
# Windows (PowerShell, solo la sesión actual)
$env:JwtSettings__SecretKey = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

**Opcional: tu propia clave local con user-secrets** (sobrescribe la de `appsettings.Development.json`):

```bash
# Linux / macOS
cd backend/PeajeSys.Api
dotnet user-secrets set "JwtSettings:SecretKey" "$(openssl rand -base64 48)"
```

```powershell
# Windows (PowerShell)
cd backend\PeajeSys.Api
dotnet user-secrets set "JwtSettings:SecretKey" ([Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48)))
```

Si la clave falta, es más corta de 32 bytes, o `Issuer`, `Audience` o `ExpirationHours` son inválidos, la API **no arranca** y muestra un `OptionsValidationException`, por ejemplo: `JwtSettings:SecretKey no esta configurada. Definala con user-secrets o la variable de entorno JwtSettings__SecretKey.` El mensaje nunca incluye el valor de la clave.

---

## 5. Seguridad

- **JWT HS256 validado**: se comprueban `alg` (solo HS256), `exp` (obligatorio), `nbf`, `iss` y `aud`.
- **Contraseñas con BCrypt estándar** (BCrypt.Net-Next, coste 12), compatible con `crypt()` de pgcrypto. El login valida solo contra la tabla `operador`.
- **Clave por entorno**: la de desarrollo está versionada en `appsettings.Development.json`; en Production es obligatorio `JwtSettings__SecretKey` (ver 4.3) y la API no arranca sin ella.
- **Políticas por rol**: `Recaudador`, `Supervisor` y `Administrador` (`[Authorize(Policy = ...)]` en los controladores).
- **Propiedad del turno**: un recaudador solo opera sobre sus propios turnos; si usa el de otro recibe `403` con código `TURNO_AJENO`.
- **Sobre de error estándar**: todo error 4xx/5xx responde `{ "error": { "codigo", "mensaje", "campos"? } }` (ver [contrato-api-frontend.md](../docs/contrato-api-frontend.md)).
- Puntos a revisar y límites del diseño: [limitaciones conocidas](../docs/limitaciones-conocidas.md).

---

## 6. Documentación de Referencia Obligatoria

Antes de implementar código, leer obligatoriamente:
- [architecture.md](../docs/architecture.md): Arquitectura en capas limpia.
- [design.md](../docs/design.md): Diseño detallado de componentes y flujos.
- [contrato-api-frontend.md](../docs/contrato-api-frontend.md): Contrato estricto de endpoints REST y formato JSON.
- [stack-backend.md](../docs/stack-backend.md): Paquetes y convenciones técnicas.
- [TAREA-BACKEND-GENERAL.md](../docs/backend/TAREA-BACKEND-GENERAL.md): Plan de trabajo y especificaciones por bloque.
- [limitaciones-conocidas.md](../docs/limitaciones-conocidas.md): Decisiones y límites conocidos.
