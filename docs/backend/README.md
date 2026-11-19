# Documentación de Trabajo: Equipo Backend PeajeSys

Índice central de documentación, especificaciones técnicas y planes de trabajo para el desarrollo del backend en C# y .NET de PeajeSys.

---

## 1. Documentos de Arquitectura y Diseño

- [architecture.md](../architecture.md): Arquitectura en Capas Limpia (Clean Architecture), responsabilidades de proyectos y seguridad.
- [design.md](../design.md): Diseño de componentes, modelo de dominio, flujos transaccionales y mapeo de endpoints.
- [stack-backend.md](../stack-backend.md): Matriz de versiones (.NET 8/9, EF Core, Npgsql), paquetes NuGet y convenciones.
- [contrato-api-frontend.md](../contrato-api-frontend.md): Contrato técnico oficial de los 24 endpoints REST consumidos por el frontend.

---

## 2. Hoja de Ruta y Tareas por Bloques (Sprints)

- [TAREA-BACKEND-GENERAL.md](./TAREA-BACKEND-GENERAL.md): Plan maestro de trabajo, reparto entre Alex y Samuel, criterios de aceptación y DoD.
- [TAREA-BK-00-SETUP.md](./TAREA-BK-00-SETUP.md): Bloque BK-00: Inicialización de la solución `PeajeSys.sln`, inyección de dependencias, middlewares y Swagger.
- [TAREA-BK-01-DATOS.md](./TAREA-BK-01-DATOS.md): Bloque BK-01: Mapeo de entidades EF Core con PostgreSQL, DbContext, Fluent API y repositorios.
- [TAREA-BK-02-AUTH.md](./TAREA-BK-02-AUTH.md): Bloque BK-02: Módulo de Autenticación, JWT Bearer, hashing BCrypt, roles y endpoint de sesión.
- [TAREA-BK-03-COBRO.md](./TAREA-BK-03-COBRO.md): Bloque BK-03: Módulo de Recaudo en Taquilla (cobro efectivo, cambio, telepeaje RFID, tiquete fiscal y turnos).
- [TAREA-BK-04-SUPERVISOR.md](./TAREA-BK-04-SUPERVISOR.md): Bloque BK-04: Módulo de Supervisión (Arqueo y conciliación, cálculo de faltantes/sobrantes, resumen diario y auditoría).
- [TAREA-BK-05-ADMIN.md](./TAREA-BK-05-ADMIN.md): Bloque BK-05: Módulo de Administración (Tarifas con vigencia histórica, operadores, casetas y categorías).
- [TAREA-BK-06-PLPGSQL-TESTS.md](./TAREA-BK-06-PLPGSQL-TESTS.md): Bloque BK-06: Integración con procedimientos y triggers PL/pgSQL, matriz de pruebas automatizadas y verificación E2E con el frontend.
