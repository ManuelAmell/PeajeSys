-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Integrantes:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO MAESTRO: 00_Master_PeajeSys.sql
-- DESCRIPCIÓN: Reconstrucción integral e inmediata de la base de datos de inicio a fin.
--              Permite levantar todo el proyecto de manera secuencial y sin errores:
--                1. Creación del esquema físico y restricciones (DDL)
--                2. Carga de datos de prueba y casos transaccionales ACID (DML)
--                3. Implementación de objetos avanzados (Vistas, Secuencia, Índice)
--                4. Ejecución y validación de las 10 Consultas de Negocio
--
-- GUÍA DE EJECUCIÓN:
--   Opción A (Recomendada en psql por consola):
--     psql -U postgres -d peajesys -f 00_Master_PeajeSys.sql
--     (O ejecutar secuencialmente: 01_DDL -> 02_DML_Datos -> 04_Objetos -> 03_Consultas)
--
--   Opción B (En pgAdmin 4 / DBeaver / DataGrip):
--     Abrir este archivo 00_Master_PeajeSys.sql en el Query Tool y presionar "Execute" (F5).
-- =============================================================================


-- #############################################################################
-- FASE 1: CREACIÓN FÍSICA DEL ESQUEMA Y RESTRICCIONES (DDL)
-- #############################################################################

-- Limpieza preventiva en orden inverso de dependencias
DROP VIEW IF EXISTS vw_resumen_diario_estacion CASCADE;
DROP VIEW IF EXISTS vw_estado_cuentas_telepeaje CASCADE;
DROP SEQUENCE IF EXISTS seq_numero_ticket CASCADE;

DROP TABLE IF EXISTS AUDITORIA_TRANSACCION CASCADE;
DROP TABLE IF EXISTS DETALLE_PAGO_TELEPEAJE CASCADE;
DROP TABLE IF EXISTS TRANSACCION_PEAJE CASCADE;
DROP TABLE IF EXISTS CUENTA_TELEPEAJE CASCADE;
DROP TABLE IF EXISTS VEHICULO CASCADE;
DROP TABLE IF EXISTS TARIFA CASCADE;
DROP TABLE IF EXISTS CATEGORIA_VEHICULO CASCADE;
DROP TABLE IF EXISTS TURNO CASCADE;
DROP TABLE IF EXISTS OPERADOR CASCADE;
DROP TABLE IF EXISTS CASETA CASCADE;
DROP TABLE IF EXISTS ESTACION_PEAJE CASCADE;

-- 1. TABLA: ESTACION_PEAJE
CREATE TABLE ESTACION_PEAJE (
    id_estacion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo_estacion VARCHAR(20) NOT NULL UNIQUE,
    ubicacion_geografica VARCHAR(255) NOT NULL,
    sentido_via VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'INACTIVA', 'MANTENIMIENTO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA: CASETA
CREATE TABLE CASETA (
    id_caseta SERIAL PRIMARY KEY,
    id_estacion INT NOT NULL,
    numero_carril INT NOT NULL CHECK (numero_carril > 0),
    tipo_carril VARCHAR(30) NOT NULL CHECK (tipo_carril IN ('MANUAL', 'TELEPEAJE_EXCLUSIVO', 'MIXTO')),
    estado VARCHAR(20) NOT NULL DEFAULT 'OPERATIVA' CHECK (estado IN ('OPERATIVA', 'CERRADA', 'MANTENIMIENTO')),
    CONSTRAINT fk_caseta_estacion FOREIGN KEY (id_estacion) 
        REFERENCES ESTACION_PEAJE (id_estacion) ON DELETE RESTRICT,
    CONSTRAINT uq_caseta_estacion_carril UNIQUE (id_estacion, numero_carril)
);

-- 3. TABLA: OPERADOR
CREATE TABLE OPERADOR (
    id_operador SERIAL PRIMARY KEY,
    numero_documento VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    codigo_empleado VARCHAR(20) NOT NULL UNIQUE,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('RECAUDADOR', 'SUPERVISOR')),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO'))
);

-- 4. TABLA: TURNO
CREATE TABLE TURNO (
    id_turno BIGSERIAL PRIMARY KEY,
    id_caseta INT NOT NULL,
    id_operador INT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    diurno BOOLEAN NOT NULL DEFAULT TRUE,
    fondo_inicial_caja NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (fondo_inicial_caja >= 0),
    total_recaudado_efectivo NUMERIC(12,2) DEFAULT 0.00 CHECK (total_recaudado_efectivo >= 0),
    total_declarado_cierre NUMERIC(12,2) CHECK (total_declarado_cierre >= 0),
    diferencia_descuadre NUMERIC(12,2),
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'CERRADO')),
    CONSTRAINT fk_turno_caseta FOREIGN KEY (id_caseta) 
        REFERENCES CASETA (id_caseta) ON DELETE RESTRICT,
    CONSTRAINT fk_turno_operador FOREIGN KEY (id_operador) 
        REFERENCES OPERADOR (id_operador) ON DELETE RESTRICT
);

-- 5. TABLA: CATEGORIA_VEHICULO
CREATE TABLE CATEGORIA_VEHICULO (
    id_categoria SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NOT NULL,
    numero_ejes_min INT NOT NULL CHECK (numero_ejes_min >= 1),
    numero_ejes_max INT NOT NULL,
    peso_maximo_ton NUMERIC(6,2) CHECK (peso_maximo_ton > 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_ejes_valido CHECK (numero_ejes_max >= numero_ejes_min)
);

-- 6. TABLA: TARIFA
CREATE TABLE TARIFA (
    id_tarifa SERIAL PRIMARY KEY,
    id_estacion INT NOT NULL,
    id_categoria INT NOT NULL,
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    resolucion_legal VARCHAR(100),
    fecha_inicio_vigencia DATE NOT NULL,
    fecha_fin_vigencia DATE,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_tarifa_estacion FOREIGN KEY (id_estacion) 
        REFERENCES ESTACION_PEAJE (id_estacion) ON DELETE RESTRICT,
    CONSTRAINT fk_tarifa_categoria FOREIGN KEY (id_categoria) 
        REFERENCES CATEGORIA_VEHICULO (id_categoria) ON DELETE RESTRICT,
    CONSTRAINT chk_fechas_vigencia CHECK (
        fecha_fin_vigencia IS NULL OR fecha_fin_vigencia >= fecha_inicio_vigencia
    )
);

-- 7. TABLA: VEHICULO
CREATE TABLE VEHICULO (
    placa VARCHAR(10) PRIMARY KEY,
    id_categoria INT NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    color VARCHAR(30),
    CONSTRAINT fk_vehiculo_categoria FOREIGN KEY (id_categoria) 
        REFERENCES CATEGORIA_VEHICULO (id_categoria) ON DELETE RESTRICT
);

-- 8. TABLA: CUENTA_TELEPEAJE
CREATE TABLE CUENTA_TELEPEAJE (
    id_cuenta BIGSERIAL PRIMARY KEY,
    placa_vehiculo VARCHAR(10) NOT NULL UNIQUE,
    tag_rfid_serial VARCHAR(64) NOT NULL UNIQUE,
    saldo_disponible NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (saldo_disponible >= 0),
    estado_cuenta VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado_cuenta IN ('ACTIVA', 'SUSPENDIDA')),
    CONSTRAINT fk_cuenta_vehiculo FOREIGN KEY (placa_vehiculo) 
        REFERENCES VEHICULO (placa) ON DELETE RESTRICT
);

-- 9. TABLA: TRANSACCION_PEAJE
CREATE TABLE TRANSACCION_PEAJE (
    id_transaccion BIGSERIAL PRIMARY KEY,
    id_turno BIGINT NOT NULL,
    id_tarifa INT NOT NULL,
    id_categoria INT NOT NULL,
    placa_detectada VARCHAR(10),
    monto_tarifa NUMERIC(10,2) NOT NULL CHECK (monto_tarifa >= 0),
    metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'TELEPEAJE', 'EXENTO')),
    numero_ticket VARCHAR(40) NOT NULL UNIQUE,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado_paso VARCHAR(20) NOT NULL DEFAULT 'APROBADO' CHECK (estado_paso IN ('APROBADO', 'EVASION', 'EXENTO')),
    CONSTRAINT fk_transaccion_turno FOREIGN KEY (id_turno) 
        REFERENCES TURNO (id_turno) ON DELETE RESTRICT,
    CONSTRAINT fk_transaccion_tarifa FOREIGN KEY (id_tarifa) 
        REFERENCES TARIFA (id_tarifa) ON DELETE RESTRICT,
    CONSTRAINT fk_transaccion_categoria FOREIGN KEY (id_categoria) 
        REFERENCES CATEGORIA_VEHICULO (id_categoria) ON DELETE RESTRICT
);

-- 10. TABLA: DETALLE_PAGO_TELEPEAJE
CREATE TABLE DETALLE_PAGO_TELEPEAJE (
    id_detalle_telepeaje BIGSERIAL PRIMARY KEY,
    id_transaccion BIGINT NOT NULL UNIQUE,
    id_cuenta BIGINT NOT NULL,
    saldo_anterior NUMERIC(12,2) NOT NULL CHECK (saldo_anterior >= 0),
    saldo_posterior NUMERIC(12,2) NOT NULL CHECK (saldo_posterior >= 0),
    antena_lectora_id VARCHAR(30),
    CONSTRAINT fk_detalle_transaccion FOREIGN KEY (id_transaccion) 
        REFERENCES TRANSACCION_PEAJE (id_transaccion) ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_cuenta FOREIGN KEY (id_cuenta) 
        REFERENCES CUENTA_TELEPEAJE (id_cuenta) ON DELETE RESTRICT
);

-- 11. TABLA: AUDITORIA_TRANSACCION
CREATE TABLE AUDITORIA_TRANSACCION (
    id_auditoria BIGSERIAL PRIMARY KEY,
    id_transaccion BIGINT NOT NULL,
    tipo_operacion VARCHAR(20) NOT NULL CHECK (tipo_operacion IN ('INSERT', 'UPDATE', 'VOID')),
    usuario_sistema VARCHAR(50) NOT NULL,
    fecha_hora_evento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    motivo VARCHAR(255),
    CONSTRAINT fk_auditoria_transaccion FOREIGN KEY (id_transaccion) 
        REFERENCES TRANSACCION_PEAJE (id_transaccion) ON DELETE RESTRICT
);

-- Disparador inmutable para la tabla de auditoría (Append-Only)
CREATE OR REPLACE FUNCTION fn_prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operación denegada: La tabla AUDITORIA_TRANSACCION es estrictamente de solo lectura/inserción (append-only) para garantizar trazabilidad legal.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_inmutable
BEFORE UPDATE OR DELETE ON AUDITORIA_TRANSACCION
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_audit_modification();


-- #############################################################################
-- FASE 2: CARGA DE DATOS DE PRUEBA Y CASOS TRANSACCIONALES DML
-- #############################################################################

-- 1. ESTACION_PEAJE
INSERT INTO ESTACION_PEAJE (nombre, codigo_estacion, ubicacion_geografica, sentido_via, estado) VALUES
('Estación Gambote', 'PEA-GAM-01', 'Km 25 Vía Ruta del Sol - Tramo Gambote', 'BOGOTA-CARTAGENA', 'ACTIVA'),
('Estación La Ceballos', 'PEA-CEB-02', 'Km 12 Variante Mamonal', 'CARTAGENA-BARRANQUILLA', 'ACTIVA');

-- 2. CASETA
INSERT INTO CASETA (id_estacion, numero_carril, tipo_carril, estado) VALUES
(1, 1, 'MANUAL', 'OPERATIVA'),
(1, 2, 'MANUAL', 'OPERATIVA'),
(1, 3, 'TELEPEAJE_EXCLUSIVO', 'OPERATIVA'),
(1, 4, 'MIXTO', 'OPERATIVA'),
(2, 1, 'MANUAL', 'OPERATIVA'),
(2, 2, 'TELEPEAJE_EXCLUSIVO', 'OPERATIVA');

-- 3. OPERADOR
INSERT INTO OPERADOR (numero_documento, nombres, apellidos, codigo_empleado, rol, estado) VALUES
('1047123456', 'Carlos Alberto', 'Gómez Pérez', 'EMP-001', 'RECAUDADOR', 'ACTIVO'),
('1047654321', 'María Fernanda', 'López Martínez', 'EMP-002', 'RECAUDADOR', 'ACTIVO'),
('1047987654', 'Juan David', 'Rodríguez Silva', 'EMP-003', 'SUPERVISOR', 'ACTIVO'),
('1047111222', 'Ana Milena', 'Castro Ramos', 'EMP-004', 'RECAUDADOR', 'ACTIVO'),
('1047333444', 'Luis Eduardo', 'Mendoza Torres', 'EMP-005', 'RECAUDADOR', 'ACTIVO'),
('1047555666', 'Laura Patricia', 'Díaz Morales', 'EMP-006', 'RECAUDADOR', 'ACTIVO'),
('1047777888', 'Andrés Felipe', 'Herrera Vega', 'EMP-007', 'SUPERVISOR', 'ACTIVO'),
('1047999000', 'Diana Marcela', 'Suárez Ruiz', 'EMP-008', 'RECAUDADOR', 'ACTIVO'),
('1047123987', 'Jorge Luis', 'Vargas Romero', 'EMP-009', 'RECAUDADOR', 'INACTIVO'),
('1047456123', 'Claudia Patricia', 'Gutiérrez Polo', 'EMP-010', 'RECAUDADOR', 'ACTIVO');

-- 4. CATEGORIA_VEHICULO
INSERT INTO CATEGORIA_VEHICULO (codigo, descripcion, numero_ejes_min, numero_ejes_max, peso_maximo_ton, activo) VALUES
('CAT_I', 'Automóviles, camperos y camionetas', 2, 2, 3.50, TRUE),
('CAT_II', 'Buses y busetas', 2, 2, 8.00, TRUE),
('CAT_III', 'Camiones de 2 ejes pequeños', 2, 2, 10.00, TRUE),
('CAT_IV', 'Camiones de 2 ejes grandes (C2)', 2, 2, 16.00, TRUE),
('CAT_V', 'Camiones de 3 y 4 ejes (C3-C4)', 3, 4, 28.00, TRUE),
('CAT_VI', 'Camiones de 5 ejes (C5)', 5, 5, 40.00, TRUE),
('CAT_VII', 'Camiones de 6 o más ejes (C6)', 6, 10, 52.00, TRUE);

-- 5. TARIFA
INSERT INTO TARIFA (id_estacion, id_categoria, monto, resolucion_legal, fecha_inicio_vigencia, activa) VALUES
(1, 1, 10500.00, 'Res. MinTransporte 0045/2026', '2026-01-01', TRUE),
(1, 2, 12800.00, 'Res. MinTransporte 0045/2026', '2026-01-01', TRUE),
(1, 3, 15300.00, 'Res. MinTransporte 0045/2026', '2026-01-01', TRUE),
(1, 4, 22000.00, 'Res. MinTransporte 0045/2026', '2026-01-01', TRUE),
(1, 5, 31500.00, 'Res. MinTransporte 0045/2026', '2026-01-01', TRUE),
(1, 6, 42000.00, 'Res. MinTransporte 0045/2026', '2026-01-01', TRUE),
(1, 7, 48500.00, 'Res. MinTransporte 0045/2026', '2026-01-01', TRUE),
(2, 1, 11000.00, 'Res. MinTransporte 0046/2026', '2026-01-01', TRUE),
(2, 2, 13500.00, 'Res. MinTransporte 0046/2026', '2026-01-01', TRUE),
(2, 3, 16000.00, 'Res. MinTransporte 0046/2026', '2026-01-01', TRUE);

-- 6. VEHICULO
INSERT INTO VEHICULO (placa, id_categoria, marca, modelo, color) VALUES
('HKL123', 1, 'Mazda', 'CX-5', 'Gris'),
('UYT890', 1, 'Chevrolet', 'Onix', 'Blanco'),
('KJN456', 2, 'Mercedes-Benz', 'OF-1721', 'Azul'),
('QWE321', 3, 'Hino', 'Dutro', 'Blanco'),
('RTY654', 4, 'International', 'WorkStar', 'Rojo'),
('ZXC987', 5, 'Kenworth', 'T800', 'Amarillo'),
('BNM741', 6, 'Freightliner', 'Cascadia', 'Negro'),
('OPL852', 7, 'Mack', 'Anthem', 'Plata'),
('ASD159', 1, 'Toyota', 'Prado', 'Negro'),
('GHJ357', 1, 'Renault', 'Duster', 'Rojo');

-- 7. CUENTA_TELEPEAJE
INSERT INTO CUENTA_TELEPEAJE (placa_vehiculo, tag_rfid_serial, saldo_disponible, estado_cuenta) VALUES
('HKL123', 'TAG-COL-9900112233', 150000.00, 'ACTIVA'),
('UYT890', 'TAG-COL-9900112234', 45000.00, 'ACTIVA'),
('KJN456', 'TAG-COL-9900112235', 300000.00, 'ACTIVA'),
('QWE321', 'TAG-COL-9900112236', 8000.00, 'ACTIVA'),
('RTY654', 'TAG-COL-9900112237', 500000.00, 'ACTIVA'),
('ZXC987', 'TAG-COL-9900112238', 0.00, 'SUSPENDIDA'),
('BNM741', 'TAG-COL-9900112239', 250000.00, 'ACTIVA'),
('OPL852', 'TAG-COL-9900112240', 120000.00, 'ACTIVA'),
('ASD159', 'TAG-COL-9900112241', 95000.00, 'ACTIVA'),
('GHJ357', 'TAG-COL-9900112242', 32000.00, 'ACTIVA');

-- 8. TURNO
INSERT INTO TURNO (id_caseta, id_operador, fecha, diurno, fondo_inicial_caja, total_recaudado_efectivo, total_declarado_cierre, diferencia_descuadre, estado) VALUES
(1, 1, '2026-10-01', TRUE, 100000.00, 315000.00, 315000.00, 0.00, 'CERRADO'),
(2, 2, '2026-10-01', TRUE, 100000.00, 250000.00, 248000.00, -2000.00, 'CERRADO'),
(3, 4, '2026-10-01', TRUE, 0.00, 0.00, 0.00, 0.00, 'CERRADO'),
(4, 5, '2026-10-01', FALSE, 100000.00, 180000.00, 180000.00, 0.00, 'CERRADO'),
(1, 6, '2026-10-02', TRUE, 100000.00, 420000.00, 425000.00, 5000.00, 'CERRADO'),
(2, 8, '2026-10-02', TRUE, 100000.00, 190000.00, 190000.00, 0.00, 'CERRADO'),
(3, 10, '2026-10-02', FALSE, 0.00, 0.00, 0.00, 0.00, 'CERRADO'),
(1, 1, '2026-10-06', TRUE, 100000.00, 42000.00, NULL, NULL, 'ABIERTO'),
(2, 2, '2026-10-06', TRUE, 100000.00, 10500.00, NULL, NULL, 'ABIERTO'),
(3, 4, '2026-10-06', TRUE, 0.00, 0.00, NULL, NULL, 'ABIERTO');

-- 9. TRANSACCION_PEAJE (18 registros, 10 de telepeaje)
INSERT INTO TRANSACCION_PEAJE (id_turno, id_tarifa, id_categoria, placa_detectada, monto_tarifa, metodo_pago, numero_ticket, fecha_hora, estado_paso) VALUES
(1, 1, 1, 'HKL123', 10500.00, 'EFECTIVO', 'TCK-20261001-00001', '2026-10-01 07:15:00-05', 'APROBADO'),
(1, 4, 4, 'RTY654', 22000.00, 'EFECTIVO', 'TCK-20261001-00002', '2026-10-01 08:30:00-05', 'APROBADO'),
(2, 1, 1, 'UYT890', 10500.00, 'EFECTIVO', 'TCK-20261001-00003', '2026-10-01 09:10:00-05', 'APROBADO'),
(3, 1, 1, 'HKL123', 10500.00, 'TELEPEAJE', 'TCK-20261001-00004', '2026-10-01 10:05:00-05', 'APROBADO'),
(3, 5, 5, 'ZXC987', 31500.00, 'TELEPEAJE', 'TCK-20261001-00005', '2026-10-01 11:20:00-05', 'APROBADO'),
(4, 6, 6, 'BNM741', 42000.00, 'EFECTIVO', 'TCK-20261001-00006', '2026-10-01 22:45:00-05', 'APROBADO'),
(5, 7, 7, 'OPL852', 48500.00, 'EFECTIVO', 'TCK-20261002-00007', '2026-10-02 06:50:00-05', 'APROBADO'),
(6, 1, 1, 'ASD159', 0.00, 'EXENTO', 'TCK-20261002-00008', '2026-10-02 08:00:00-05', 'EXENTO'),
(7, 2, 2, 'KJN456', 12800.00, 'TELEPEAJE', 'TCK-20261002-00009', '2026-10-02 14:15:00-05', 'APROBADO'),
(8, 6, 6, 'BNM741', 42000.00, 'EFECTIVO', 'TCK-20261006-00010', '2026-10-06 08:10:00-05', 'APROBADO'),
(9, 1, 1, 'GHJ357', 10500.00, 'EFECTIVO', 'TCK-20261006-00011', '2026-10-06 09:30:00-05', 'APROBADO'),
(10, 1, 1, 'HKL123', 10500.00, 'TELEPEAJE', 'TCK-20261006-00012', '2026-10-06 10:45:00-05', 'APROBADO'),
(3, 1, 1, 'UYT890', 10500.00, 'TELEPEAJE', 'TCK-20261001-00013', '2026-10-01 12:10:00-05', 'APROBADO'),
(4, 4, 4, 'RTY654', 22000.00, 'TELEPEAJE', 'TCK-20261001-00014', '2026-10-01 13:40:00-05', 'APROBADO'),
(7, 6, 6, 'BNM741', 42000.00, 'TELEPEAJE', 'TCK-20261002-00015', '2026-10-02 15:30:00-05', 'APROBADO'),
(7, 7, 7, 'OPL852', 48500.00, 'TELEPEAJE', 'TCK-20261002-00016', '2026-10-02 16:50:00-05', 'APROBADO'),
(10, 1, 1, 'ASD159', 10500.00, 'TELEPEAJE', 'TCK-20261006-00017', '2026-10-06 11:15:00-05', 'APROBADO'),
(10, 1, 1, 'GHJ357', 10500.00, 'TELEPEAJE', 'TCK-20261006-00018', '2026-10-06 11:55:00-05', 'APROBADO');

-- 10. DETALLE_PAGO_TELEPEAJE (10 registros completos)
INSERT INTO DETALLE_PAGO_TELEPEAJE (id_transaccion, id_cuenta, saldo_anterior, saldo_posterior, antena_lectora_id) VALUES
(4, 1, 160500.00, 150000.00, 'ANT-CAM-03A'),
(5, 6, 31500.00, 0.00, 'ANT-CAM-03A'),
(9, 3, 312800.00, 300000.00, 'ANT-CAM-03A'),
(12, 1, 150000.00, 139500.00, 'ANT-CAM-03A'),
(13, 2, 55500.00, 45000.00, 'ANT-CAM-03A'),
(14, 5, 522000.00, 500000.00, 'ANT-CAM-04A'),
(15, 7, 292000.00, 250000.00, 'ANT-CAM-03A'),
(16, 8, 168500.00, 120000.00, 'ANT-CAM-03A'),
(17, 9, 105500.00, 95000.00, 'ANT-CAM-03A'),
(18, 10, 42500.00, 32000.00, 'ANT-CAM-03A');

-- 11. AUDITORIA_TRANSACCION (12 registros)
INSERT INTO AUDITORIA_TRANSACCION (id_transaccion, tipo_operacion, usuario_sistema, motivo) VALUES
(1, 'INSERT', 'carlos_gomez', 'Paso de vehículo registrado en caja manual'),
(2, 'INSERT', 'carlos_gomez', 'Paso de vehículo registrado en caja manual'),
(3, 'INSERT', 'maria_lopez', 'Paso de vehículo registrado en caja manual'),
(4, 'INSERT', 'sistema_telepeaje', 'Cobro automático por antena RFID'),
(5, 'INSERT', 'sistema_telepeaje', 'Cobro automático por antena RFID - Saldo agotado'),
(5, 'UPDATE', 'juan_rodriguez', 'Ajuste supervisor por revisión de categoría'),
(6, 'INSERT', 'luis_mendoza', 'Paso nocturno en efectivo'),
(7, 'INSERT', 'laura_diaz', 'Paso de vehículo pesado'),
(8, 'INSERT', 'diana_suarez', 'Paso de vehículo institucional exento de pago'),
(9, 'INSERT', 'sistema_telepeaje', 'Cobro automático por antena RFID'),
(13, 'INSERT', 'sistema_telepeaje', 'Débito exitoso tag RFID carril exclusivo'),
(14, 'INSERT', 'sistema_telepeaje', 'Débito exitoso carril mixto');

-- Casos de prueba transaccionales
-- CASO 1: INSERT + UPDATE con COMMIT
BEGIN;
INSERT INTO TRANSACCION_PEAJE (
    id_turno, id_tarifa, id_categoria, placa_detectada, monto_tarifa, metodo_pago, numero_ticket, estado_paso
) VALUES (
    8, 1, 1, 'UYT890', 10500.00, 'EFECTIVO', 'TCK-20261006-00019', 'APROBADO'
);
UPDATE TURNO 
SET total_recaudado_efectivo = total_recaudado_efectivo + 10500.00
WHERE id_turno = 8;
INSERT INTO AUDITORIA_TRANSACCION (
    id_transaccion, tipo_operacion, usuario_sistema, motivo
) VALUES (
    currval('transaccion_peaje_id_transaccion_seq'), 'INSERT', 'carlos_gomez', 'Cobro manual en efectivo exitoso'
);
COMMIT;

-- CASO 2: UPDATE con ROLLBACK
BEGIN;
UPDATE CUENTA_TELEPEAJE
SET saldo_disponible = saldo_disponible - 10500.00
WHERE id_cuenta = 1;
ROLLBACK;

-- CASO 3: UPDATE con COMMIT (Cierre de Turno)
BEGIN;
UPDATE TURNO
SET total_declarado_cierre = 52500.00,
    diferencia_descuadre = 52500.00 - total_recaudado_efectivo,
    estado = 'CERRADO'
WHERE id_turno = 8 AND estado = 'ABIERTO';
COMMIT;

-- CASO 4A: DELETE con ROLLBACK (Reversión de eliminación por validación en patio)
BEGIN;
INSERT INTO VEHICULO (placa, id_categoria, marca, modelo, color) 
VALUES ('TMP111', 1, 'Chevrolet', 'Sail', 'Gris');

DELETE FROM VEHICULO 
WHERE placa = 'TMP111';
ROLLBACK;

-- CASO 4B: DELETE con COMMIT (Eliminación controlada y definitiva de registro de prueba)
BEGIN;
INSERT INTO VEHICULO (placa, id_categoria, marca, modelo, color) 
VALUES ('CAL999', 1, 'Generico', 'Calibrador', 'Blanco');

DELETE FROM VEHICULO 
WHERE placa = 'CAL999';
COMMIT;


-- #############################################################################
-- FASE 3: CREACIÓN DE OBJETOS SQL AVANZADOS (VISTAS, SECUENCIA, ÍNDICE)
-- #############################################################################

-- 1. VISTA 1: Consolidado Diario por Estación
CREATE OR REPLACE VIEW vw_resumen_diario_estacion AS
SELECT 
    e.id_estacion,
    e.nombre AS estacion,
    DATE(tp.fecha_hora) AS fecha,
    COUNT(tp.id_transaccion) AS total_vehiculos,
    SUM(CASE WHEN tp.metodo_pago = 'EFECTIVO' THEN tp.monto_tarifa ELSE 0 END) AS recaudo_efectivo,
    SUM(CASE WHEN tp.metodo_pago = 'TELEPEAJE' THEN tp.monto_tarifa ELSE 0 END) AS recaudo_telepeaje,
    SUM(tp.monto_tarifa) AS recaudo_total
FROM ESTACION_PEAJE e
JOIN CASETA c ON e.id_estacion = c.id_estacion
JOIN TURNO t ON c.id_caseta = t.id_caseta
JOIN TRANSACCION_PEAJE tp ON t.id_turno = tp.id_turno
GROUP BY e.id_estacion, e.nombre, DATE(tp.fecha_hora);

-- 2. VISTA 2: Monitoreo de Cuentas Telepeaje
CREATE OR REPLACE VIEW vw_estado_cuentas_telepeaje AS
SELECT 
    ct.id_cuenta,
    ct.placa_vehiculo,
    cv.codigo AS categoria_vehiculo,
    ct.tag_rfid_serial,
    ct.saldo_disponible,
    ct.estado_cuenta,
    CASE 
        WHEN ct.saldo_disponible = 0 THEN 'SIN SALDO'
        WHEN ct.saldo_disponible < 20000 THEN 'SALDO CRÍTICO'
        ELSE 'SALDO SUFICIENTE'
    END AS condicion_saldo
FROM CUENTA_TELEPEAJE ct
JOIN VEHICULO v ON ct.placa_vehiculo = v.placa
JOIN CATEGORIA_VEHICULO cv ON v.id_categoria = cv.id_categoria;

-- 3. SECUENCIA: Generador Consecutivo de Tickets
CREATE SEQUENCE IF NOT EXISTS seq_numero_ticket
    START WITH 1000
    INCREMENT BY 1
    NO MAXVALUE
    CACHE 10;

-- 4. ÍNDICE ADICIONAL: Optimización Compuesta B-Tree
CREATE INDEX IF NOT EXISTS idx_transaccion_fecha_turno 
ON TRANSACCION_PEAJE (fecha_hora DESC, id_turno);


-- #############################################################################
-- FASE 4: EJECUCIÓN Y VALIDACIÓN DE LAS 10 CONSULTAS DE NEGOCIO
-- #############################################################################

-- CONSULTA 1: Recaudo consolidado por estación, caseta y operador en turnos cerrados (JOIN 4 tablas)
SELECT 
    e.nombre AS estacion,
    c.numero_carril,
    c.tipo_carril,
    o.nombres || ' ' || o.apellidos AS operador,
    t.fecha,
    t.total_recaudado_efectivo
FROM TURNO t
JOIN CASETA c ON t.id_caseta = c.id_caseta
JOIN ESTACION_PEAJE e ON c.id_estacion = e.id_estacion
JOIN OPERADOR o ON t.id_operador = o.id_operador
WHERE t.estado = 'CERRADO'
ORDER BY t.fecha DESC, e.nombre;

-- CONSULTA 2: Cruces por telepeaje y saldo posterior resultante (JOIN 5 tablas)
SELECT 
    tp.numero_ticket,
    tp.fecha_hora,
    v.placa,
    cv.descripcion AS categoria,
    ct.tag_rfid_serial,
    dpt.saldo_anterior,
    dpt.saldo_posterior
FROM DETALLE_PAGO_TELEPEAJE dpt
JOIN TRANSACCION_PEAJE tp ON dpt.id_transaccion = tp.id_transaccion
JOIN CUENTA_TELEPEAJE ct ON dpt.id_cuenta = ct.id_cuenta
JOIN VEHICULO v ON ct.placa_vehiculo = v.placa
JOIN CATEGORIA_VEHICULO cv ON v.id_categoria = cv.id_categoria
ORDER BY tp.fecha_hora DESC;

-- CONSULTA 3: Transacciones exentas o con sospecha de evasión (JOIN 4 tablas)
SELECT 
    tp.id_transaccion,
    tp.numero_ticket,
    tp.fecha_hora,
    tp.estado_paso,
    c.numero_carril,
    o.nombres || ' ' || o.apellidos AS operador_responsable
FROM TRANSACCION_PEAJE tp
JOIN TURNO t ON tp.id_turno = t.id_turno
JOIN CASETA c ON t.id_caseta = c.id_caseta
JOIN OPERADOR o ON t.id_operador = o.id_operador
WHERE tp.estado_paso IN ('EXENTO', 'EVASION')
ORDER BY tp.fecha_hora DESC;

-- CONSULTA 4: Categorías vehiculares con recaudo > $30,000 COP (GROUP BY / HAVING)
SELECT 
    cv.codigo,
    cv.descripcion,
    COUNT(tp.id_transaccion) AS total_pasos,
    SUM(tp.monto_tarifa) AS recaudo_total
FROM TRANSACCION_PEAJE tp
JOIN CATEGORIA_VEHICULO cv ON tp.id_categoria = cv.id_categoria
GROUP BY cv.codigo, cv.descripcion
HAVING SUM(tp.monto_tarifa) > 30000.00
ORDER BY recaudo_total DESC;

-- CONSULTA 5: Casetas con 2 o más transacciones y tarifa promedio (GROUP BY / HAVING / AVG)
SELECT 
    c.id_caseta,
    c.numero_carril,
    c.tipo_carril,
    COUNT(tp.id_transaccion) AS cantidad_transacciones,
    ROUND(AVG(tp.monto_tarifa), 2) AS tarifa_promedio
FROM CASETA c
JOIN TURNO t ON c.id_caseta = t.id_caseta
JOIN TRANSACCION_PEAJE tp ON t.id_turno = tp.id_turno
GROUP BY c.id_caseta, c.numero_carril, c.tipo_carril
HAVING COUNT(tp.id_transaccion) >= 2
ORDER BY cantidad_transacciones DESC;

-- CONSULTA 6: Cuentas de telepeaje con saldo inferior al promedio general (Subconsulta WHERE)
SELECT 
    id_cuenta,
    placa_vehiculo,
    tag_rfid_serial,
    saldo_disponible,
    estado_cuenta
FROM CUENTA_TELEPEAJE
WHERE saldo_disponible < (
    SELECT AVG(saldo_disponible) 
    FROM CUENTA_TELEPEAJE
)
ORDER BY saldo_disponible ASC;

-- CONSULTA 7: Operadores con turnos que presentaron faltantes de caja (Subconsulta IN)
SELECT 
    id_operador,
    numero_documento,
    nombres,
    apellidos,
    codigo_empleado
FROM OPERADOR
WHERE id_operador IN (
    SELECT id_operador 
    FROM TURNO 
    WHERE diferencia_descuadre < 0
);

-- CONSULTA 8: Formateo de tickets, extracción de día de semana y antigüedad (Funciones Texto/Fecha/CASE)
SELECT 
    UPPER(numero_ticket) AS ticket_formateado,
    TO_CHAR(fecha_hora, 'YYYY-MM-DD HH24:MI:SS') AS fecha_formateada,
    TRIM(TO_CHAR(fecha_hora, 'Day')) AS dia_semana,
    placa_detectada,
    metodo_pago,
    CASE 
        WHEN fecha_hora >= CURRENT_DATE THEN 'Hoy'
        WHEN fecha_hora >= CURRENT_DATE - INTERVAL '7 days' THEN 'Esta semana'
        ELSE 'Anterior'
    END AS clasificacion_antiguedad
FROM TRANSACCION_PEAJE
ORDER BY fecha_hora DESC;

-- CONSULTA 9: Diagnóstico contable de descuadre y arqueo sin nulos (COALESCE / CASE)
SELECT 
    id_turno,
    fecha,
    total_recaudado_efectivo,
    COALESCE(total_declarado_cierre, 0.00) AS declarado,
    COALESCE(diferencia_descuadre, 0.00) AS descuadre,
    CASE 
        WHEN diferencia_descuadre > 0 THEN 'SOBRANTE (+)'
        WHEN diferencia_descuadre < 0 THEN 'FALTANTE (-)'
        WHEN diferencia_descuadre = 0 THEN 'CUADRADO'
        ELSE 'EN PROCESO'
    END AS diagnostico_caja
FROM TURNO
ORDER BY fecha DESC, id_turno;

-- CONSULTA 10: Porcentaje de participación por método de pago (Agregación + Subconsulta Escalar)
SELECT 
    metodo_pago,
    COUNT(*) AS cantidad_pasos,
    SUM(monto_tarifa) AS total_recaudado,
    ROUND(
        (SUM(monto_tarifa) * 100.0) / (SELECT SUM(monto_tarifa) FROM TRANSACCION_PEAJE), 
        2
    ) AS porcentaje_participacion
FROM TRANSACCION_PEAJE
GROUP BY metodo_pago
ORDER BY total_recaudado DESC;
