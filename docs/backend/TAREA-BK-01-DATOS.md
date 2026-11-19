# TAREA BK-01: CAPA DE DATOS, MODELADO EF CORE Y MAPEOS DDL

- **Responsable**: Samuel Otero
- **Revisor**: Manuel Amell
- **Proyecto Principal**: `PeajeSys.Core`, `PeajeSys.Data`
- **Depende de**: BK-00

---

## 1. Objetivo

Implementar las entidades del dominio en C# y mapearlas rigurosamente contra las 11 tablas del DDL de PostgreSQL (`database/02_SQL/01_DDL_PeajeSys.sql`), configurando el `PeajeSysDbContext`, las restricciones de integridad mediante Fluent API y los repositorios base.

---

## 2. Entregables Obligatorios

1. **Entidades de Dominio en `PeajeSys.Core.Entities`**:
   - `EstacionPeaje`: id_estacion (PK, SERIAL), nombre (VARCHAR 100), codigo_estacion (UK, VARCHAR 20), ubicacion_geografica (VARCHAR 255), sentido_via (VARCHAR 50), estado (enum: ACTIVA, INACTIVA, MANTENIMIENTO), created_at (TIMESTAMPTZ).
   - `Caseta`: id_caseta (PK, SERIAL), id_estacion (FK), numero_carril (INT > 0), tipo_carril (enum: MANUAL, TELEPEAJE_EXCLUSIVO, MIXTO), estado (enum: OPERATIVA, CERRADA, MANTENIMIENTO).
   - `Operador`: id_operador (PK, SERIAL), numero_documento (UK, VARCHAR 20 — mapear a `string` en C# para preservar ceros a la izquierda y soportar pasaportes o cédulas de extranjería), nombres (VARCHAR 100), apellidos (VARCHAR 100), codigo_empleado (UK, VARCHAR 20), rol (enum: RECAUDADOR, SUPERVISOR), estado (enum: ACTIVO, INACTIVO).
   - `Turno`: id_turno (PK, BIGSERIAL), id_caseta (FK), id_operador (FK), fecha (DATE), diurno (BOOLEAN), fondo_inicial_caja (NUMERIC 12,2), total_recaudado_efectivo (NUMERIC 12,2), total_declarado_cierre (NUMERIC 12,2, nullable), diferencia_descuadre (NUMERIC 12,2, nullable), estado (enum: ABIERTO, CERRADO).
   - `CategoriaVehiculo`: id_categoria (PK, SERIAL), codigo (UK, VARCHAR 10), descripcion (VARCHAR 150), nro_ejes_min (INT >= 2), nro_ejes_max (INT), peso_max_ton (NUMERIC 5,2, nullable), activo (BOOLEAN).
   - `Tarifa`: id_tarifa (PK, SERIAL), id_estacion (FK), id_categoria (FK), monto (NUMERIC 10,2), resolucion_legal (VARCHAR 50), fecha_inicio_vigencia (DATE), fecha_fin_vigencia (DATE, nullable), activa (BOOLEAN).
   - `Vehiculo`: placa (PK, VARCHAR 10), id_categoria (FK), marca (VARCHAR 50, nullable), modelo (VARCHAR 50, nullable), color (VARCHAR 30, nullable).
   - `CuentaTelepeaje`: id_cuenta (PK, BIGSERIAL), placa_vehiculo (FK, UK, VARCHAR 10), tag_rfid_serial (UK, VARCHAR 50), saldo_disponible (NUMERIC 12,2), estado_cuenta (enum: ACTIVA, SUSPENDIDA).
   - `DetallePagoTelepeaje`: id_detalle_telepeaje (PK, BIGSERIAL), id_transaccion (FK, UK), id_cuenta (FK), saldo_anterior (NUMERIC 12,2), saldo_posterior (NUMERIC 12,2), antena_lectora_id (VARCHAR 50).
   - `TransaccionPeaje`: id_transaccion (PK, BIGSERIAL), id_turno (FK), id_tarifa (FK), id_categoria (FK), placa_detectada (VARCHAR 10, nullable), monto_tarifa (NUMERIC 10,2), metodo_pago (enum: EFECTIVO, TELEPEAJE, EXENTO), numero_ticket (UK, VARCHAR 30), fecha_hora (TIMESTAMPTZ), estado_paso (enum: APROBADO, EVASION, EXENTO).
   - `AuditoriaTransaccion`: id_auditoria (PK, BIGSERIAL), id_transaccion (FK, nullable), tipo_operacion (enum: INSERT, UPDATE, VOID), usuario_responsable (VARCHAR 100), fecha_hora (TIMESTAMPTZ), datos_anteriores (JSONB / string, nullable), datos_nuevos (JSONB / string, nullable), motivo_anulacion (VARCHAR 255, nullable).

2. **Entidades para Vistas SQL de Solo Lectura (`Keyless Entity Types`)**:
   - `ResumenDiarioEstacion`: Mapeada a la vista `vw_resumen_diario_estacion`.
   - `EstadoCuentaTelepeaje`: Mapeada a la vista `vw_estado_cuentas_telepeaje`.

3. **Configuraciones Fluent API en `PeajeSys.Data.Configurations`**:
   - Implementar `IEntityTypeConfiguration<T>` para cada una de las 11 entidades.
   - Mapear nombres de tabla y columnas explícitamente en `snake_case` (ej. `.ToTable("TRANSACCION_PEAJE")`, `.Property(x => x.PlacaVehiculo).HasColumnName("placa_vehiculo")`).
   - Mapear claves primarias, claves foráneas, índices únicos (`codigo_empleado`, `numero_ticket`, `tag_rfid_serial`) y restricciones `CHECK`.
   - Configurar la secuencia fiscal `seq_numero_ticket` en el modelo.

4. **PeajeSysDbContext y Repositorio Base**:
   - Registro de `DbSet<T>` para todas las entidades y vistas.
   - Configuración de `Npgsql.EntityFrameworkCore.PostgreSQL` con reintentos (`EnableRetryOnFailure`).
   - Interfaz e implementación de `IRepository<T>` y `IUnitOfWork` para manejo transaccional de operaciones.

---

## 3. Criterios de Aceptación y Pruebas

- [ ] Todas las 11 entidades y 2 vistas están creadas y mapeadas sin discrepancias respecto al script `database/02_SQL/01_DDL_PeajeSys.sql`.
- [ ] La prueba de inicialización del `DbContext` contra una base de prueba en PostgreSQL se ejecuta con éxito.
- [ ] Las consultas de prueba de lectura sobre `OPERADOR`, `TURNO` y `vw_resumen_diario_estacion` devuelven datos válidos.
- [ ] Cero rayas largas en código o comentarios.

---

## 4. Documentos Relacionados
- [architecture.md](../architecture.md): Arquitectura en capas y componentes del sistema.
- [design.md](../design.md): Diseño de componentes y modelo de dominio.
- [TAREA-BACKEND-GENERAL.md](./TAREA-BACKEND-GENERAL.md): Hoja de ruta general del equipo backend.
