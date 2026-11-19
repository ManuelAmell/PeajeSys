# TAREA BK-02: MODULO DE AUTENTICACION, JWT Y GESTION DE ROLES

- **Responsable**: Alex Florez
- **Revisor**: Samuel Otero
- **Proyecto Principal**: `PeajeSys.Api`, `PeajeSys.Core`, `PeajeSys.Data`
- **Depende de**: BK-01

---

## 1. Objetivo

Implementar el sistema de autenticación y autorización basado en JSON Web Tokens (JWT), validación segura de contraseñas con BCrypt, soporte para los roles del sistema (`RECAUDADOR`, `SUPERVISOR`, `ADMINISTRADOR`) y los endpoints `/api/auth/*` definidos en el contrato.

---

## 2. Entregables Obligatorios

1. **Servicio de Seguridad y Hashing (`IPasswordHasher`)**:
   - Implementación con `BCrypt.Net-Next` para hash y verificación de contraseñas con factor de costo 12.
   - Soporte para verificación de usuarios semilla del DML (`EMP-001`, `EMP-002`, `EMP-004`, `EMP-005`, `ADM-001`).
   - *Nota de diseño*: Dado que la tabla física `OPERADOR` del DDL no posee columna `password_hash`, en esta fase de desarrollo se utiliza una clave estándar de desarrollo (ej. `Turno123*` como en el frontend) o un diccionario en memoria / configuración `appsettings.json` para validar las credenciales de los operadores semilla, permitiendo compatibilidad total sin requerir alteraciones al DDL existente.

2. **Servicio de Generación de Tokens JWT (`IJwtTokenService`)**:
   - Generación de token firmado con HMAC-SHA256 (`SecurityAlgorithms.HmacSha256`).
   - Inclusión de claims estándar y de negocio:
     - `ClaimTypes.NameIdentifier` / `sub`: Id del operador.
     - `ClaimTypes.Name`: Nombre completo.
     - `ClaimTypes.Role`: Rol (`RECAUDADOR`, `SUPERVISOR`, `ADMINISTRADOR`).
     - `codigo`: Código de empleado (`EMP-002`, etc.).
   - Tiempo de expiración configurable (8 horas por defecto).

3. **Controlador y Endpoints en `AuthController`**:
   - `POST /api/auth/login`:
     - Recibe: `{ "codigo_empleado": "EMP-002", "password": "..." }`.
     - Valida existencia del operador y estado `ACTIVO`. Si está inactivo, retorna HTTP 403 con código `USUARIO_INACTIVO`.
     - Si la contraseña es inválida, retorna HTTP 401 con código `CREDENCIALES_INVALIDAS`.
     - En éxito, retorna HTTP 200 con `{ "token": "...", "usuario": { "id_operador", "codigo_empleado", "nombre", "apellido", "rol", "estado" } }`.
   - `POST /api/auth/logout`:
     - Requiere autenticación `[Authorize]`. Invalida la sesión o registra traza de desconexión. Retorna HTTP 200.
   - `GET /api/auth/sesion`:
     - Requiere autenticación `[Authorize]`. Extrae el id del operador desde el contexto del token y retorna el perfil del usuario activo (HTTP 200).

4. **Filtros y Políticas de Autorización**:
   - Configuración de políticas de rol:
     - `PoliticaRecaudador`: Roles `RECAUDADOR`, `SUPERVISOR`, `ADMINISTRADOR`.
     - `PoliticaSupervisor`: Roles `SUPERVISOR`, `ADMINISTRADOR`.
     - `PoliticaAdmin`: Rol `ADMINISTRADOR`.

---

## 3. Criterios de Aceptación y Pruebas

- [ ] Pruebas unitarias para `PasswordHasher` (hashing, verificación correcta y rechazo de contraseñas incorrectas).
- [ ] Pruebas de integración para `POST /api/auth/login` con credenciales válidas e inválidas.
- [ ] Validación de rechazo para usuarios con estado `INACTIVO` (HTTP 403).
- [ ] Validación de protección de rutas privadas mediante encabezado `Authorization: Bearer <token>`.
- [ ] Cero rayas largas en código o comentarios.

---

## 4. Documentos Relacionados
- [architecture.md](../architecture.md): Arquitectura en capas y componentes del sistema.
- [contrato-api-frontend.md](../contrato-api-frontend.md): Contrato técnico oficial de endpoints y payloads.
- [TAREA-BACKEND-GENERAL.md](./TAREA-BACKEND-GENERAL.md): Hoja de ruta general del equipo backend.
