# Stack del Backend: PeajeSys

Especificación del stack tecnológico oficial para la Web API en C# y .NET de PeajeSys.

---

## 1. Decisiones Tecnológicas Principales

| Componente | Tecnología Seleccionada | Justificación Técnica |
|---|---|---|
| Plataforma y Lenguaje | C# 12 / .NET 8.0 LTS (o .NET 9.0) | Alto rendimiento, soporte oficial a largo plazo, tipado estricto y ejecución multiplataforma (Linux / Windows). |
| Tipo de Aplicación | ASP.NET Core Web API | Framework HTTP asíncrono, liviano y con excelente rendimiento para APIs RESTful. |
| ORM Principal | Entity Framework Core 8 / 9 | Mapeo objeto-relacional tipado con Fluent API, seguimiento de cambios y soporte completo para migraciones. |
| Micro-ORM Auxiliar | Dapper | Ejecución de consultas analíticas directas y reportes complejos de alta velocidad (ej. vista `vw_resumen_diario_estacion`). |
| Proveedor de Base de Datos | Npgsql.EntityFrameworkCore.PostgreSQL | Conector nativo de alto rendimiento para PostgreSQL con soporte para tipos JSONB, secuencias e índices compuestos. |
| Motor de Base de Datos | PostgreSQL 18.7 (o 16+ LTS) | RDBMS relacional del proyecto, integridad referencial estricta, triggers PL/pgSQL y procedimientos almacenados. |
| Autenticación y Autorización | JWT Bearer Tokens (Microsoft.AspNetCore.Authentication.JwtBearer) | Desacoplamiento total entre cliente web y API, tokens autocontenidos y seguros con claims de rol. |
| Hashing de Contraseñas | BCrypt.Net-Next (o Argon2id) | Factor de costo configurable (cost 12), protección contra ataques de fuerza bruta y tablas arcoíris. |
| Documentación de API | Swashbuckle.AspNetCore (Swagger / OpenAPI 3.0) | Generación automática de especificación interactiva para pruebas en `/swagger` y contrato con el frontend. |
| Validación de Modelos | FluentValidation.AspNetCore | Reglas de validación desacopladas de las entidades, replicando las restricciones CHECK del DDL. |
| Logging y Telemetría | Serilog (Serilog.AspNetCore + Sinks.Console + Sinks.File) | Registro estructurado en formato JSON con contextualización por identificador de correlación y turno. |
| Suite de Pruebas | xUnit + FluentAssertions + Moq + Testcontainers | Pruebas unitarias aisladas y pruebas de integración con contenedores Docker reales de PostgreSQL. |

---

## 2. Paquetes NuGet por Proyecto

### 2.1 PeajeSys.Api
```xml
<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.*" />
  <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.*" />
  <PackageReference Include="FluentValidation.AspNetCore" Version="11.3.*" />
  <PackageReference Include="Serilog.AspNetCore" Version="8.0.*" />
  <PackageReference Include="Serilog.Sinks.Console" Version="5.0.*" />
  <PackageReference Include="Serilog.Sinks.File" Version="5.0.*" />
</ItemGroup>
```

### 2.2 PeajeSys.Core
```xml
<ItemGroup>
  <!-- Núcleo puro de dominio: sin dependencias pesadas de infraestructura -->
  <PackageReference Include="FluentValidation" Version="11.9.*" />
</ItemGroup>
```

### 2.3 PeajeSys.Data
```xml
<ItemGroup>
  <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.*" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.*" />
  <PackageReference Include="Dapper" Version="2.1.*" />
  <PackageReference Include="BCrypt.Net-Next" Version="4.0.*" />
</ItemGroup>
```

### 2.4 PeajeSys.Tests
```xml
<ItemGroup>
  <PackageReference Include="xunit" Version="2.7.*" />
  <PackageReference Include="xunit.runner.visualstudio" Version="2.5.*" />
  <PackageReference Include="FluentAssertions" Version="6.12.*" />
  <PackageReference Include="Moq" Version="4.20.*" />
  <PackageReference Include="Testcontainers.PostgreSql" Version="3.8.*" />
  <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.*" />
</ItemGroup>
```

---

## 3. Convenciones de Código y Nomenclatura

- **C#**: Nombres de clases, métodos, propiedades y contratos de interfaz en `PascalCase` (ej. `RegistrarCobroAsync`, `PlacaVehiculo`, `ICobroService`).
- **Campos privados**: Notación camelCase con guion bajo inicial (ej. `_context`, `_logger`, `_cobroService`).
- **JSON HTTP en la API**: La serialización en endpoints usa estrictamente `snake_case` mediante `System.Text.Json.JsonNamingPolicy.SnakeCaseLower`, garantizando 100% de compatibilidad con [contrato-api-frontend.md](file:///home/amell/orca/workspaces/PeajeSys/peajesys-develop/docs/contrato-api-frontend.md) y con las columnas del DDL.
- **Base de Datos**: Nombres de tablas en singular/plural según DDL en MAYÚSCULAS o snake_case (`TRANSACCION_PEAJE`, `TURNO`, `OPERADOR`).

---

## 4. Documentos Relacionados
- [architecture.md](file:///home/amell/orca/workspaces/PeajeSys/peajesys-develop/docs/architecture.md): Arquitectura detallada del sistema.
- [design.md](file:///home/amell/orca/workspaces/PeajeSys/peajesys-develop/docs/design.md): Diseño de endpoints, modelos y flujos.
- [contrato-api-frontend.md](file:///home/amell/orca/workspaces/PeajeSys/peajesys-develop/docs/contrato-api-frontend.md): Contrato técnico de integración.
