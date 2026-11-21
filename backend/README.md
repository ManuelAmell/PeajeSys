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
└── PeajeSys.Tests/                # Pruebas Unitarias y de Integracion (xUnit, FluentAssertions)
```

---

## 4. Configuración Inicial y Puesta en Marcha

### 4.1 Configurar la Cadena de Conexión
Crear o editar `backend/PeajeSys.Api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=peajesys_db;Username=postgres;Password=tu_password_local"
  },
  "JwtSettings": {
    "Secret": "PeajeSys_Super_Secret_Key_Segura_2026_Minimo_256_Bits_HMAC_SHA256",
    "Issuer": "PeajeSys.Backend",
    "Audience": "PeajeSys.Frontend",
    "ExpirationHours": 8
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  }
}
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

> Con `dotnet run` (perfil de `launchSettings.json`, entorno `Development`) los usuarios semilla EMP-001…EMP-010 y ADM-001 entran con la contraseña de demo `Turno123*` (`Security:DefaultDevPassword`). En cualquier otro entorno quedan deshabilitados.

### 4.3 Configuración de la clave JWT

La clave secreta del JWT **no está en el repositorio**. Debes definirla en tu máquina antes de iniciar la API (mínimo 32 bytes en UTF-8).

**Opción A: user-secrets (recomendada, solo en entorno Development)**

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

**Opción B: variable de entorno** (útil en servidores o CI)

```bash
# Linux / macOS
export JwtSettings__SecretKey="$(openssl rand -base64 48)"
```

```powershell
# Windows (PowerShell, solo la sesión actual)
$env:JwtSettings__SecretKey = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
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
