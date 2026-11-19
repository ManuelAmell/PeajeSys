# TAREA BK-06: INTEGRACION PL/PGSQL, MATRIZ DE PRUEBAS Y VALIDACION E2E

- **Responsables**: Alex Florez y Samuel Otero
- **Apoyo y Revisor**: Manuel Amell
- **Proyecto Principal**: `PeajeSys.Tests`, `database/`, Solución completa
- **Depende de**: BK-00 a BK-05

---

## 1. Objetivo

Integrar los procedimientos almacenados, funciones y triggers de PostgreSQL (requerimientos académicos del Avance 3 de la Guía) con la Web API en C#/.NET, construir la suite automatizada de pruebas con xUnit (cobertura >= 80%) con la matriz de 10 casos de prueba y ejecutar la verificación de integración final de extremo a extremo (E2E) con el cliente Frontend React.

---

## 2. Entregables Obligatorios

1. **Integración con Objetos PL/pgSQL de PostgreSQL**:
   - **Bloque PL/pgSQL con Cursor y Excepciones**: Procedimiento de conciliación masiva de turnos diarios o recálculo de acumuladores de caja.
   - **Procedimientos Almacenados (mínimo 2)**:
     - `sp_cerrar_turno_conciliado(p_id_turno INT, p_efectivo_reportado NUMERIC, OUT p_diferencia NUMERIC, OUT p_estado VARCHAR)`: Realiza el arqueo y cierre en una sola transacción en base de datos.
     - `sp_recargar_cuenta_telepeaje(p_placa VARCHAR, p_monto NUMERIC, p_usuario VARCHAR)`: Realiza la recarga y audita el evento.
   - **Funciones Almacenadas (mínimo 2)**:
     - `fn_obtener_tarifa_vigente(p_id_estacion INT, p_id_categoria INT) RETURNS NUMERIC`: Devuelve el monto activo para una fecha dada.
     - `fn_validar_saldo_telepeaje(p_placa VARCHAR, p_monto NUMERIC) RETURNS BOOLEAN`: Comprueba suficiencia de saldo y estado activo.
   - **Triggers (mínimo 2)**:
     - `trg_auditar_cambio_tarifa`: Trigger `AFTER UPDATE OR INSERT ON TARIFA` que registra automáticamente en `AUDITORIA_TRANSACCION`.
     - `trg_actualizar_acumuladores_turno`: Trigger `AFTER INSERT ON TRANSACCION_PEAJE` que incrementa los totales del turno automáticamente.
   - Invocación desde C# utilizando EF Core (`Database.ExecuteSqlInterpolatedAsync` / `FromSqlInterpolated`) y Dapper.

2. **Matriz de Pruebas Automatizadas (Mínimo 10 Casos Obligatorios)**:
   - Implementadas en `PeajeSys.Tests`:
     1. **CP-01 (Normal)**: Inicio de sesión exitoso con credenciales válidas y obtención de token JWT.
     2. **CP-02 (Límite/Error)**: Rechazo de autenticación con contraseña incorrecta (HTTP 401) y usuario inactivo (HTTP 403).
     3. **CP-03 (Normal)**: Apertura de turno exitosa en caseta desocupada por operador habilitado.
     4. **CP-04 (Error)**: Rechazo de apertura de turno cuando la caseta ya tiene un turno abierto (HTTP 409).
     5. **CP-05 (Normal)**: Cobro de peaje en efectivo con entrega de cambio exacto y generación de tiquete.
     6. **CP-06 (Límite/Error)**: Rechazo de cobro en efectivo con monto menor al de la tarifa (HTTP 422).
     7. **CP-07 (Normal)**: Cobro de peaje por telepeaje con débito atómico de saldo y registro de tiquete.
     8. **CP-08 (Error)**: Rechazo de cobro por telepeaje cuando el saldo es insuficiente o cuenta inactiva (HTTP 422).
     9. **CP-09 (Normal)**: Cierre de turno y cálculo exacto de arqueo en los 3 estados: CUADRADO, FALTANTE y SOBRANTE.
     10. **CP-10 (Límite/Error)**: Rechazo de cobro de peaje sobre un turno ya cerrado (HTTP 409).

3. **Verificación de Cobertura de Código**:
   - Ejecutar `dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura`.
   - Garantizar cobertura global mínima del 80% en `PeajeSys.Core` y `PeajeSys.Data`.

4. **Verificación de Integración E2E con el Frontend**:
   - Levantar la Web API en `http://localhost:5000`.
   - Configurar el Frontend en `peajesys-develop` con `VITE_API_BASE_URL=http://localhost:5000/api` y `VITE_USAR_MOCKS=false`.
   - Validar que los 62 tests E2E de Playwright (`pnpm e2e`) corran y pasen en verde directamente contra la API de .NET y PostgreSQL real.

---

## 3. Criterios de Aceptación y Pruebas

- [ ] Los objetos PL/pgSQL están implementados y probados en PostgreSQL.
- [ ] La suite de pruebas de xUnit contiene los 10 casos de prueba y todos pasan (100% PASS).
- [ ] Cobertura de pruebas superior al 80%.
- [ ] La integración con el frontend se ejecuta sin fricción ni fallos de contrato.
- [ ] Cero rayas largas en código o comentarios.

---

## 4. Documentos Relacionados
- [architecture.md](../architecture.md): Arquitectura en capas y componentes del sistema.
- [contrato-api-frontend.md](../contrato-api-frontend.md): Contrato técnico oficial de endpoints y payloads.
- [TAREA-BACKEND-GENERAL.md](./TAREA-BACKEND-GENERAL.md): Hoja de ruta general del equipo backend.
