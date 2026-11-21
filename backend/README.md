# PeajeSys: Backend Web API (C# .NET)

Solución backend para el Sistema de Control y Recaudo de Peajes PeajeSys, construida con ASP.NET Core Web API, C# 12, .NET 8.0/9.0, Entity Framework Core y PostgreSQL.

---

## 1. Integrantes y Responsabilidades

| Desarrollador | Rol | Responsabilidades Principales |
|---|---|---|
| **Alex Florez** | Backend Developer | Arquitectura de servicios, controladores REST, autenticación JWT, seguridad y gestión de turnos/arqueos. |
| **Samuel Otero** | Backend Developer | Lógica de transacciones de recaudo, validación de telepeaje RFID, Entity Framework Core y repositorios. |
| **Manuel Amell** | Database & Full-Stack | Soporte en DDL/DML PostgreSQL, procedimientos almacenados PL/pgSQL, triggers e integración frontend/backend. |

---

## 2. Requisitos Previos

- **.NET SDK**: Versión 8.0 LTS o superior (`dotnet --version`).
- **PostgreSQL**: Versión 16+ o 18.7 (`psql --version`).
- **IDE**: Visual Studio 2022 (Community o Professional), Visual Studio Code (con C# Dev Kit) o JetBrains Rider.
- **Base de Datos Inicializada**: Ejecutar previamente los scripts de `database/`:
  1. `database/02_SQL/01_DDL_PeajeSys.sql`
  2. `database/02_SQL/02_DML_Datos_PeajeSys.sql`
  3. `database/02_SQL/04_Objetos_PeajeSys.sql`

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

Si tu PostgreSQL usa otros datos, sobrescribe la cadena sin tocar archivos versionados:

```bash
# Linux / macOS
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=peajesys_db;Username=postgres;Password=tu_password_local"
```

```powershell
# Windows (PowerShell, solo la sesión actual)
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=peajesys_db;Username=postgres;Password=tu_password_local"
```

### 4.2 Comandos de Compilación y Ejecución

```bash
# 1. Restaurar dependencias NuGet
dotnet restore

# 2. Compilar la solución en modo Debug
dotnet build

# 3. Ejecutar las pruebas automatizadas
dotnet test

# 4. Iniciar la Web API
cd PeajeSys.Api
dotnet run
```

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

## 5. Documentación de Referencia Obligatoria

Antes de implementar código, leer obligatoriamente:
- [architecture.md](../docs/architecture.md): Arquitectura en capas limpia.
- [design.md](../docs/design.md): Diseño detallado de componentes y flujos.
- [contrato-api-frontend.md](../docs/contrato-api-frontend.md): Contrato estricto de endpoints REST y formato JSON.
- [stack-backend.md](../docs/stack-backend.md): Paquetes y convenciones técnicas.
- [TAREA-BACKEND-GENERAL.md](../docs/backend/TAREA-BACKEND-GENERAL.md): Plan de trabajo y especificaciones por bloque.
