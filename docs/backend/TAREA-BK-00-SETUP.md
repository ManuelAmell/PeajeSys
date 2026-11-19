# TAREA BK-00: CONFIGURACION BASE, ARQUITECTURA Y PIPELINE HTTP

- **Responsable**: Alex Florez
- **Revisor**: Samuel Otero
- **Proyecto Principal**: `PeajeSys.Api`, `PeajeSys.sln`
- **Depende de**: Nada (Punto de inicio)

---

## 1. Objetivo

Crear y configurar la estructura de la solución .NET, la inyección de dependencias, el pipeline de middlewares HTTP, la serialización JSON en snake_case, el manejo global de excepciones y la documentación Swagger OpenAPI.

---

## 2. Entregables Obligatorios

1. **Estructura de Proyectos**:
   - `PeajeSys.sln` configurado en `backend/`.
   - Proyectos creados:
     - `PeajeSys.Api` (Microsoft.NET.Sdk.Web, `net8.0` LTS o `net9.0`)
     - `PeajeSys.Core` (Microsoft.NET.Sdk, `net8.0` LTS o `net9.0`)
     - `PeajeSys.Data` (Microsoft.NET.Sdk, `net8.0` LTS o `net9.0`)
     - `PeajeSys.Tests` (Microsoft.NET.Sdk, xUnit, `net8.0` LTS o `net9.0`)
   - *Nota de compatibilidad*: Usar estrictamente `<TargetFramework>net8.0</TargetFramework>` (versión LTS oficial recomendada) o `net9.0`. No configurar targets no estándar o inexistentes como `net11.0`.
   - Referencias de proyectos enlazadas según la arquitectura limpia:
     - `Api` referencia a `Core` y `Data`.
     - `Data` referencia a `Core`.
     - `Core` no tiene dependencias hacia afuera.
     - `Tests` referencia a `Api`, `Core` y `Data`.

2. **Pipeline de Middlewares en `Program.cs`**:
   - **Manejo Global de Excepciones**: Implementar `GlobalExceptionMiddleware` que capture:
     - `DomainException`: retorna HTTP 422 o 400.
     - `NotFoundException`: retorna HTTP 404.
     - `ConflictException`: retorna HTTP 409.
     - `UnauthorizedAccessException`: retorna HTTP 401 / 403.
     - `Exception` genérica: retorna HTTP 500 con código `INTERNAL_SERVER_ERROR`.
     - Estructura devuelta estricta:
       ```json
       {
         "error": {
           "codigo": "CODIGO_ERROR",
           "mensaje": "Descripcion legible en espanol.",
           "campos": {}
         }
       }
       ```
   - **Serialización JSON**: Configurar `JsonNamingPolicy.SnakeCaseLower` en `AddControllers().AddJsonOptions(...)`.
   - **CORS**: Habilitar política `PermitirFrontend` para permitir `http://localhost:5180` con cualquier método y encabezado.
   - **Swagger / OpenAPI**: Configurar Swashbuckle con esquema de seguridad JWT Bearer (`Bearer <token>`).
   - **Health Checks**: Endpoint `/health` que devuelva `{ "status": "Healthy" }`.
   - **Logging**: Configurar Serilog con consola estructurada y archivo rotativo en `logs/peajesys-.log`.

---

## 3. Criterios de Aceptación y Pruebas

- [ ] `dotnet build` compila con 0 errores y 0 advertencias.
- [ ] Al iniciar la aplicación y navegar a `/swagger` se muestra la interfaz interactiva.
- [ ] Al invocar `/health` se obtiene HTTP 200 `{ "status": "Healthy" }`.
- [ ] Una excepción forzada de prueba retorna HTTP con el esquema JSON esperado `{ "error": { ... } }`.
- [ ] Cero rayas largas en el código o comentarios.

---

## 4. Documentos Relacionados
- [architecture.md](../architecture.md): Arquitectura en capas y componentes del sistema.
- [TAREA-BACKEND-GENERAL.md](./TAREA-BACKEND-GENERAL.md): Hoja de ruta general del equipo backend.
