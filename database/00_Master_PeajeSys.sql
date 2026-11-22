-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Asignatura: Bases de Datos (2026-2) - Docente: Víctor Valdelamar
-- PROYECTO FINAL INTEGRADO: PeajeSys (ENTREGA FINAL - CORTE 3)
-- Integrantes:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO MAESTRO CONSOLIDADO: 00_Master_PeajeSys.sql
-- DESCRIPCIÓN: Reconstrucción integral e inmediata de la base de datos de inicio a fin.
--              Permite levantar todo el proyecto de manera secuencial y sin errores:
--                1. Creación del esquema físico y restricciones (DDL)
--                2. Carga de datos de prueba y casos transaccionales ACID (DML)
--                3. Implementación de objetos avanzados (Vistas, Secuencia, Índice)
--                4. Capa procedimental PL/pgSQL (Funciones, Procedimientos, Triggers, Cursores)
--                5. Ejecución y validación de las 10 Consultas de Negocio
--                6. Ejecución de la Matriz de Pruebas (10+ casos verificables)
--
-- GUÍA DE EJECUCIÓN:
--   Opción A (Recomendada en psql por consola):
--     psql -U postgres -d peajesys_db -f 00_Master_PeajeSys.sql
--   Opcion Docker (desde la raiz del repo): docker compose up -d   (carga este script automaticamente)
--
--   Opción B (En pgAdmin 4 / DBeaver / DataGrip):
--     Abrir este archivo 00_Master_PeajeSys.sql en el Query Tool y presionar "Execute" (F5).
-- =============================================================================


-- #############################################################################
-- FASE 1: CREACIÓN FÍSICA DEL ESQUEMA Y RESTRICCIONES (DDL)
-- #############################################################################

-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Integrantes:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 01_DDL_PeajeSys.sql
-- DESCRIPCIÓN: Creación física del esquema relacional, definición de tipos de datos,
--              claves primarias, foráneas, restricciones de unicidad, dominio (CHECK)
--              y disparador de inmutabilidad para auditoría.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- LIMPIEZA PREVENTIVA DE OBJETOS PREEXISTENTES (Orden inverso de dependencias)
-- -----------------------------------------------------------------------------
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

-- =============================================================================
-- 1. MÓDULO DE INFRAESTRUCTURA Y OPERACIÓN
-- =============================================================================

-- TABLA 1: ESTACION_PEAJE
CREATE TABLE ESTACION_PEAJE (
    id_estacion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo_estacion VARCHAR(20) NOT NULL UNIQUE,
    ubicacion_geografica VARCHAR(255) NOT NULL,
    sentido_via VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'INACTIVA', 'MANTENIMIENTO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLA 2: CASETA
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

-- TABLA 3: OPERADOR
CREATE TABLE OPERADOR (
    id_operador SERIAL PRIMARY KEY,
    numero_documento VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    codigo_empleado VARCHAR(20) NOT NULL UNIQUE,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('RECAUDADOR', 'SUPERVISOR', 'ADMINISTRADOR')),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    -- Hash BCrypt de la contrasena. NULL significa que el operador no puede iniciar sesion.
    password_hash VARCHAR(100) NULL
);

-- TABLA 4: TURNO
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

-- =============================================================================
-- 2. MÓDULO DE VEHÍCULOS, CATEGORÍAS Y TARIFAS
-- =============================================================================

-- TABLA 5: CATEGORIA_VEHICULO
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

-- TABLA 6: TARIFA
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

-- TABLA 7: VEHICULO
CREATE TABLE VEHICULO (
    placa VARCHAR(10) PRIMARY KEY,
    id_categoria INT NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    color VARCHAR(30),
    CONSTRAINT fk_vehiculo_categoria FOREIGN KEY (id_categoria) 
        REFERENCES CATEGORIA_VEHICULO (id_categoria) ON DELETE RESTRICT
);

-- TABLA 8: CUENTA_TELEPEAJE
CREATE TABLE CUENTA_TELEPEAJE (
    id_cuenta BIGSERIAL PRIMARY KEY,
    placa_vehiculo VARCHAR(10) NOT NULL UNIQUE,
    tag_rfid_serial VARCHAR(64) NOT NULL UNIQUE,
    saldo_disponible NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (saldo_disponible >= 0),
    estado_cuenta VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado_cuenta IN ('ACTIVA', 'SUSPENDIDA')),
    CONSTRAINT fk_cuenta_vehiculo FOREIGN KEY (placa_vehiculo) 
        REFERENCES VEHICULO (placa) ON DELETE RESTRICT
);

-- =============================================================================
-- 3. MÓDULO TRANSACCIONAL Y AUDITORÍA
-- =============================================================================

-- TABLA 9: TRANSACCION_PEAJE
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

-- TABLA 10: DETALLE_PAGO_TELEPEAJE
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

-- TABLA 11: AUDITORIA_TRANSACCION
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

-- (Nota: La inmutabilidad de AUDITORIA_TRANSACCION mediante triggers se implementa
-- en la fase procedimental: Fase 4.2 / 03_PLSQL/03_Triggers_PeajeSys.sql)


-- #############################################################################
-- FASE 2: CARGA DE DATOS Y TRANSACCIONES DML
-- #############################################################################

-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Integrantes:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 02_DML_Datos_PeajeSys.sql
-- DESCRIPCIÓN: Carga masiva de datos de prueba coherentes para las 11 tablas del modelo
--              (cumpliendo cuota de >= 10 registros por tabla principal) y casos de
--              prueba para operaciones DML (INSERT, UPDATE, DELETE) con control
--              transaccional (COMMIT / ROLLBACK).
-- =============================================================================

-- =============================================================================
-- 1. CARGA DE DATOS DE PRUEBA EN ORDEN DE DEPENDENCIAS REFERENCIALES
-- =============================================================================

-- 1. TABLA: ESTACION_PEAJE (Catálogo de infraestructura vial - 2 estaciones)
INSERT INTO ESTACION_PEAJE (nombre, codigo_estacion, ubicacion_geografica, sentido_via, estado) VALUES
('Estación Gambote', 'PEA-GAM-01', 'Km 25 Vía Ruta del Sol - Tramo Gambote', 'BOGOTA-CARTAGENA', 'ACTIVA'),
('Estación La Ceballos', 'PEA-CEB-02', 'Km 12 Variante Mamonal', 'CARTAGENA-BARRANQUILLA', 'ACTIVA');

-- 2. TABLA: CASETA (Infraestructura física de carriles - 6 registros)
INSERT INTO CASETA (id_estacion, numero_carril, tipo_carril, estado) VALUES
(1, 1, 'MANUAL', 'OPERATIVA'),
(1, 2, 'MANUAL', 'OPERATIVA'),
(1, 3, 'TELEPEAJE_EXCLUSIVO', 'OPERATIVA'),
(1, 4, 'MIXTO', 'OPERATIVA'),
(2, 1, 'MANUAL', 'OPERATIVA'),
(2, 2, 'TELEPEAJE_EXCLUSIVO', 'OPERATIVA');

-- 3. TABLA: OPERADOR (Personal operativo y de supervisión - 10 registros)
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

-- 3.1 Usuarios del equipo (con acceso al sistema). password_hash es BCrypt (coste 12);
-- las contrasenas de prueba estan documentadas en el README raiz (seccion "Usuarios de prueba").
-- EMP-001 a EMP-010 son datos historicos sin contrasena (password_hash NULL): no pueden iniciar sesion.
INSERT INTO OPERADOR (numero_documento, nombres, apellidos, codigo_empleado, rol, estado, password_hash) VALUES
('1000000001', 'Manuel', 'Amell', 'ADM-001', 'ADMINISTRADOR', 'ACTIVO', '$2a$12$2UMb0Tq2fZdus2W5SMD9NeTIOQMZ.Ajjz8haPu9pSEExPx8AahdPy'),
('1000000002', 'Samuel', 'Otero', 'SUP-001', 'SUPERVISOR', 'ACTIVO', '$2a$12$lPx4Ahvqf1beuXGikrcp/.cfGgyhaT7SPNwQ1epnhlmlerIULWmca'),
('1000000003', 'Alex', 'Florez', 'REC-001', 'RECAUDADOR', 'ACTIVO', '$2a$12$RrFlJM6LMAkJMpbUqwUl4uNLRn2YWRcwN3QxtIXsCdYFiFC2XRZh6'),
('1000000004', 'Camilo', 'Guzmán', 'REC-002', 'RECAUDADOR', 'ACTIVO', '$2a$12$mvbqdoO3JMq427rfQzQ5Cu1SLNdlYh4rFX56k0aRSzB9kdbmtJfg.');

-- 4. TABLA: CATEGORIA_VEHICULO (Clasificación oficial colombiana Mintransporte - 7 registros)
INSERT INTO CATEGORIA_VEHICULO (codigo, descripcion, numero_ejes_min, numero_ejes_max, peso_maximo_ton, activo) VALUES
('CAT_I', 'Automóviles, camperos y camionetas', 2, 2, 3.50, TRUE),
('CAT_II', 'Buses y busetas', 2, 2, 8.00, TRUE),
('CAT_III', 'Camiones de 2 ejes pequeños', 2, 2, 10.00, TRUE),
('CAT_IV', 'Camiones de 2 ejes grandes (C2)', 2, 2, 16.00, TRUE),
('CAT_V', 'Camiones de 3 y 4 ejes (C3-C4)', 3, 4, 28.00, TRUE),
('CAT_VI', 'Camiones de 5 ejes (C5)', 5, 5, 40.00, TRUE),
('CAT_VII', 'Camiones de 6 o más ejes (C6)', 6, 10, 52.00, TRUE);

-- 5. TABLA: TARIFA (Cuadro tarifario vigente por estación y categoría - 10 registros)
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

-- 6. TABLA: VEHICULO (Parque automotor registrado - 10 registros)
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

-- 7. TABLA: CUENTA_TELEPEAJE (Tags RFID y saldos prepago - 10 registros)
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

-- 8. TABLA: TURNO (Jornadas operativas en caseta - 10 registros)
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

-- 9. TABLA: TRANSACCION_PEAJE (Pasos vehiculares y cobros - 18 registros)
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

-- 10. TABLA: DETALLE_PAGO_TELEPEAJE (Conciliación financiera por débito RFID - 10 registros)
-- Vinculadas 1-a-1 con las transacciones de telepeaje 4, 5, 9, 12, 13, 14, 15, 16, 17, 18
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

-- 11. TABLA: AUDITORIA_TRANSACCION (Bitácora de seguridad inmutable - 12 registros)
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

-- =============================================================================
-- 2. OPERACIONES DML TRANSACCIONALES (INSERT, UPDATE, DELETE CON COMMIT/ROLLBACK)
-- Cumplimiento estricto del Numeral 4 de los Entregables Obligatorios de la Guía
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CASO 1: Registro Exitoso de Recaudación en Efectivo (INSERT + UPDATE con COMMIT)
-- Escenario: Un vehículo cancela en efectivo en la caseta 1 durante el turno 8.
--            Se registra el cobro, se actualiza el acumulado del turno y se audita.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- CASO 2: Transacción Abortada por Falla en Comunicación RFID (UPDATE con ROLLBACK)
-- Escenario: Se descuenta preventivamente el saldo en una cuenta de telepeaje,
--            pero la antena detecta una anomalía física en la barrera antes de
--            confirmar el paso. Se ejecuta ROLLBACK para garantizar atomicidad e
--            impedir cobros indebidos.
-- -----------------------------------------------------------------------------
BEGIN;

-- Se simula débito sobre la cuenta 1 (saldo actual: $139,500.00)
UPDATE CUENTA_TELEPEAJE
SET saldo_disponible = saldo_disponible - 10500.00
WHERE id_cuenta = 1;

-- Sensor reporta falla de elevación en barrera: la transacción debe ser cancelada
ROLLBACK;
-- Tras el ROLLBACK, el saldo de la cuenta 1 permanece inalterado en $139,500.00


-- -----------------------------------------------------------------------------
-- CASO 3: Arqueo y Cierre Formal de Turno Operativo (UPDATE con COMMIT)
-- Escenario: El operador entrega turno. El supervisor ingresa el total físico
--            declarado, el sistema calcula el descuadre y sella el turno como 'CERRADO'.
-- -----------------------------------------------------------------------------
BEGIN;

UPDATE TURNO
SET total_declarado_cierre = 52500.00,
    diferencia_descuadre = 52500.00 - total_recaudado_efectivo,
    estado = 'CERRADO'
WHERE id_turno = 8 AND estado = 'ABIERTO';

COMMIT;


-- -----------------------------------------------------------------------------
-- CASO 4A: Intento de Eliminación Abortada por Falla en Validación (DELETE con ROLLBACK)
-- Escenario: Se registra un vehículo de servicio especial temporal ('TMP111') y se
--            intenta una eliminación preliminar que el sistema revierte con ROLLBACK
--            tras fallar la confirmación del operador de patio.
-- -----------------------------------------------------------------------------
BEGIN;

-- 1. Inserción preventiva de vehículo temporal
INSERT INTO VEHICULO (placa, id_categoria, marca, modelo, color) 
VALUES ('TMP111', 1, 'Chevrolet', 'Sail', 'Gris');

-- 2. Se ejecuta DELETE dentro de la transacción activa
DELETE FROM VEHICULO 
WHERE placa = 'TMP111';

-- 3. Se aborta la operación: el ROLLBACK deshará la eliminación y el estado previo
ROLLBACK;


-- -----------------------------------------------------------------------------
-- CASO 4B: Depuración Controlada de Registro Auxiliar Transitorio (DELETE con COMMIT)
-- Escenario: Se registra un vehículo transitorio de calibración ('CAL999') para pruebas
--            de sensores de báscula y se confirma su eliminación física definitiva.
-- -----------------------------------------------------------------------------
BEGIN;

-- 1. Inserción de vehículo transitorio de calibración
INSERT INTO VEHICULO (placa, id_categoria, marca, modelo, color) 
VALUES ('CAL999', 1, 'Generico', 'Calibrador', 'Blanco');

-- 2. Eliminación física confirmada del registro de prueba
DELETE FROM VEHICULO 
WHERE placa = 'CAL999';

-- 3. Confirmación atómica de la eliminación
COMMIT;



-- #############################################################################
-- FASE 3: OBJETOS SQL AVANZADOS (VISTAS, SECUENCIA, ÍNDICE)
-- #############################################################################

-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Integrantes:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 04_Objetos_PeajeSys.sql
-- DESCRIPCIÓN: Implementación de objetos SQL avanzados exigidos por la Guía (Sección 3.2):
--              - Al menos 2 vistas útiles para reportes o simplificación de consultas.
--              - 1 secuencia para generación de identificadores o numeración fiscal.
--              - 1 índice adicional debidamente justificado por patrones de consulta.
-- =============================================================================


-- =============================================================================
-- 1. VISTA 1: Consolidado Diario de Recaudo por Estación y Medio de Pago
-- =============================================================================
-- JUSTIFICACIÓN DE NEGOCIO Y TÉCNICA:
-- En la operación de peajes, la gerencia de concesiones y los auditores requieren
-- cierres diarios consolidados. Sin esta vista, tendrían que ejecutar manualmente un
-- JOIN complejo entre 4 tablas (ESTACION_PEAJE, CASETA, TURNO, TRANSACCION_PEAJE) con
-- múltiples agregaciones condicionales (CASE/SUM).
-- Esta vista encapsula la complejidad, estandariza las fórmulas de cálculo de recaudo
-- (efectivo vs telepeaje) y acelera la generación de reportes gerenciales.
-- -----------------------------------------------------------------------------
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

-- Demostración de consulta sobre la Vista 1:
SELECT * FROM vw_resumen_diario_estacion ORDER BY fecha DESC, estacion;


-- =============================================================================
-- 2. VISTA 2: Monitoreo Operativo de Cuentas RFID y Diagnóstico de Saldo
-- =============================================================================
-- JUSTIFICACIÓN DE NEGOCIO Y TÉCNICA:
-- El centro de control de telepeaje debe supervisar continuamente el estado de las
-- cuentas activas y clasificar su nivel de solvencia ('SIN SALDO', 'SALDO CRÍTICO',
-- 'SALDO SUFICIENTE') para anticipar evasiones o retenciones en las barreras automáticas.
-- Esta vista une las cuentas con los datos del vehículo y su categoría, proveyendo
-- una capa de abstracción desacoplada y lista para el personal de soporte al cliente.
-- -----------------------------------------------------------------------------
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

-- Demostración de consulta sobre la Vista 2:
SELECT * FROM vw_estado_cuentas_telepeaje ORDER BY saldo_disponible ASC;


-- =============================================================================
-- 3. SECUENCIA: Generador Consecutivo de Tiquetes Fiscales de Peaje
-- =============================================================================
-- JUSTIFICACIÓN DE NEGOCIO Y TÉCNICA:
-- La normativa de la DIAN y de la Agencia Nacional de Infraestructura (ANI) exige que
-- los tiquetes impresos o electrónicos de peaje cuenten con un número consecutivo fiscal
-- estrictamente incremental e inmune a fallos concurrentes.
-- Delegar esta generación en una secuencia dedicada de base de datos con CACHE 10
-- garantiza un alto rendimiento en horas pico de congestión vehicular (>60 pasos/minuto),
-- evitando contenciones de bloqueo (table locking) en la tabla TRANSACCION_PEAJE.
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_numero_ticket
    START WITH 1000
    INCREMENT BY 1
    NO MAXVALUE
    CACHE 10;

-- Demostración de uso de la secuencia:
SELECT nextval('seq_numero_ticket') AS ejemplo_consecutivo_fiscal_generado;


-- =============================================================================
-- 4. ÍNDICE ADICIONAL: Optimización Compuesta B-Tree sobre TRANSACCION_PEAJE
-- =============================================================================
-- JUSTIFICACIÓN DE NEGOCIO Y TÉCNICA:
-- La tabla TRANSACCION_PEAJE es la entidad transaccional crítica y de más rápido
-- crecimiento volumétrico en el sistema (cientos de miles de registros al mes).
-- Las operaciones más frecuentes y demandantes son:
--   1. El arqueo de turnos (filtrando por id_turno).
--   2. Las auditorías de paso y facturación (filtrando o agrupando por rangos de fecha_hora).
-- Por defecto, PostgreSQL solo crea índices B-Tree sobre las claves primarias (id_transaccion).
-- La creación del índice compuesto (fecha_hora DESC, id_turno) optimiza radicalmente
-- el plan de ejecución (Index Scan vs Seq Scan) en consultas de series de tiempo y cierres
-- de caja, reduciendo el costo de I/O en disco durante la sustentación y operación en vivo.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transaccion_fecha_turno 
ON TRANSACCION_PEAJE (fecha_hora DESC, id_turno);

-- Demostración conceptual del plan de ejecución optimizado por el índice:
EXPLAIN SELECT id_transaccion, numero_ticket, monto_tarifa 
FROM TRANSACCION_PEAJE 
WHERE fecha_hora >= '2026-10-01' AND id_turno = 1;


-- #############################################################################
-- FASE 4: CAPA PROCEDIMENTAL PL/pgSQL (FUNCIONES, TRIGGERS, PROCEDIMIENTOS, CURSOR)
-- #############################################################################

-- -----------------------------------------------------------------------------
-- 4.1 FUNCIONES ALMACENADAS
-- -----------------------------------------------------------------------------
-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Asignatura: Bases de Datos (2026-2) - Docente: Víctor Valdelamar
-- Equipo de Trabajo:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 03_PLSQL/01_Funciones_PeajeSys.sql
-- DESCRIPCIÓN: Implementación de Funciones Almacenadas (Stored Functions) en PL/pgSQL.
--              Cumple con el Numeral 4.2 de la Guía Oficial:
--              - Al menos 2 funciones almacenadas que retornen resultados útiles
--                para cálculos, validaciones o consultas del negocio.
--              - Manejo estructurado de parámetros, tipos de datos y excepciones.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FUNCIÓN 1: fn_obtener_tarifa_vigente
-- Propósito de Negocio:
--   Calcula el valor monetario exacto de la tarifa que debe pagar un vehículo en
--   una estación de peaje determinada. Para ello, identifica la categoría del
--   vehículo a partir de su placa y busca la tarifa activa y vigente en el catálogo.
-- Parámetros:
--   p_placa        : Placa única del vehículo (VARCHAR)
--   p_id_estacion  : Identificador de la estación de peaje (INT)
-- Retorno:
--   NUMERIC(10,2)  : Monto a liquidar.
-- Excepciones de Negocio:
--   - Si el vehículo no existe en la base de datos.
--   - Si la estación no existe o está inactiva.
--   - Si no existe una tarifa activa vigente para esa estación y categoría.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_obtener_tarifa_vigente(
    p_placa VARCHAR,
    p_id_estacion INT
)
RETURNS NUMERIC(10,2) AS $$
DECLARE
    v_id_categoria INT;
    v_estacion_activa VARCHAR(20);
    v_monto_tarifa NUMERIC(10,2);
BEGIN
    -- 1. Validar que la estación exista y se encuentre ACTIVA
    SELECT estado INTO v_estacion_activa
    FROM ESTACION_PEAJE
    WHERE id_estacion = p_id_estacion;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Error de Negocio: La estación de peaje con ID % no existe en el sistema.', p_id_estacion
            USING ERRCODE = 'P0001';
    ELSIF v_estacion_activa <> 'ACTIVA' THEN
        RAISE EXCEPTION 'Operación rechazada: La estación de peaje ID % se encuentra en estado "%" y no puede liquidar cobros.', 
            p_id_estacion, v_estacion_activa
            USING ERRCODE = 'P0002';
    END IF;

    -- 2. Validar que el vehículo esté registrado y obtener su categoría
    SELECT id_categoria INTO v_id_categoria
    FROM VEHICULO
    WHERE placa = UPPER(TRIM(p_placa));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehículo no identificado: La placa "%" no se encuentra registrada en el padrón vehicular de PeajeSys.', 
            UPPER(TRIM(p_placa))
            USING ERRCODE = 'P0003';
    END IF;

    -- 3. Consultar la tarifa activa y vigente para la estación y categoría
    SELECT monto INTO v_monto_tarifa
    FROM TARIFA
    WHERE id_estacion = p_id_estacion
      AND id_categoria = v_id_categoria
      AND activa = TRUE
      AND CURRENT_DATE >= fecha_inicio_vigencia
      AND (fecha_fin_vigencia IS NULL OR CURRENT_DATE <= fecha_fin_vigencia)
    ORDER BY fecha_inicio_vigencia DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inconsistencia Tarifaria: No existe tarifa activa y vigente para la estación ID % y categoría ID %.', 
            p_id_estacion, v_id_categoria
            USING ERRCODE = 'P0004';
    END IF;

    RETURN v_monto_tarifa;
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------------------------------
-- FUNCIÓN 2: fn_validar_aptitud_telepeaje
-- Propósito de Negocio:
--   Permite a las antenas y subsistemas de telepeaje verificar en tiempo real (<5 ms)
--   si un TAG RFID se encuentra plenamente habilitado para levantar la talanquera.
--   Valida existencia de cuenta, estado operativo ('ACTIVA') y suficiencia de saldo
--   frente al costo del peaje.
-- Parámetros:
--   p_tag_serial       : Número de serie único del TAG RFID instalado en el parabrisas.
--   p_monto_requerido  : Valor monetario de la tarifa a debitar.
-- Retorno:
--   BOOLEAN            : TRUE si el vehículo puede cruzar; FALSE en caso contrario.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_aptitud_telepeaje(
    p_tag_serial VARCHAR,
    p_monto_requerido NUMERIC(10,2)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_saldo NUMERIC(12,2);
    v_estado VARCHAR(20);
BEGIN
    -- Validar parámetros de entrada
    IF p_tag_serial IS NULL OR TRIM(p_tag_serial) = '' THEN
        RETURN FALSE;
    END IF;

    IF p_monto_requerido IS NULL OR p_monto_requerido < 0 THEN
        RETURN FALSE;
    END IF;

    -- Consultar saldo y estado de la cuenta asociada al TAG
    SELECT saldo_disponible, estado_cuenta 
    INTO v_saldo, v_estado
    FROM CUENTA_TELEPEAJE
    WHERE tag_rfid_serial = TRIM(p_tag_serial);

    -- Si la cuenta no existe, o no está activa, o el saldo no cubre la tarifa -> denegar
    IF NOT FOUND THEN
        RETURN FALSE;
    ELSIF v_estado <> 'ACTIVA' THEN
        RETURN FALSE;
    ELSIF v_saldo < p_monto_requerido THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------------------------------
-- FUNCIÓN 3: fn_calcular_descuadre_turno
-- Propósito de Negocio:
--   Función de apoyo financiero y fiscalización. Calcula la diferencia monetaria
--   entre el efectivo físico entregado por el cajero y el recaudo registrado
--   por el sistema en un turno específico.
-- Parámetros:
--   p_id_turno            : Identificador del turno a liquidar (BIGINT).
--   p_efectivo_declarado  : Monto reportado físicamente por el operador (NUMERIC).
-- Retorno:
--   NUMERIC(12,2)         : Valor del descuadre (0 = Exacto, >0 = Sobrante, <0 = Faltante).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcular_descuadre_turno(
    p_id_turno BIGINT,
    p_efectivo_declarado NUMERIC(12,2)
)
RETURNS NUMERIC(12,2) AS $$
DECLARE
    v_recaudo_sistema NUMERIC(12,2);
BEGIN
    -- Validar que el turno exista
    IF NOT EXISTS (SELECT 1 FROM TURNO WHERE id_turno = p_id_turno) THEN
        RAISE EXCEPTION 'El turno ID % no existe en la base de datos.', p_id_turno
            USING ERRCODE = 'P0005';
    END IF;

    -- Calcular la sumatoria real de cobros en efectivo aprobados durante el turno
    SELECT COALESCE(SUM(monto_tarifa), 0.00)
    INTO v_recaudo_sistema
    FROM TRANSACCION_PEAJE
    WHERE id_turno = p_id_turno
      AND metodo_pago = 'EFECTIVO'
      AND estado_paso = 'APROBADO';

    -- Descuadre = Declarado en físico - Recaudo computado en sistema
    RETURN (COALESCE(p_efectivo_declarado, 0.00) - v_recaudo_sistema);
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------------------------------
-- FUNCIÓN 4: fn_estimar_cruces_restantes
-- Propósito de Negocio:
--   Permite a la aplicación móvil o portal de usuario consultar cuántos pasos
--   o cruces por estación le quedan disponibles a un vehículo según su saldo actual.
-- Parámetros:
--   p_placa        : Placa del vehículo.
--   p_id_estacion  : Estación habitual de tránsito.
-- Retorno:
--   INT            : Cantidad entera de cruces que el saldo actual puede costear.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_estimar_cruces_restantes(
    p_placa VARCHAR,
    p_id_estacion INT
)
RETURNS INT AS $$
DECLARE
    v_tarifa NUMERIC(10,2);
    v_saldo NUMERIC(12,2);
BEGIN
    -- Obtener la tarifa correspondiente
    v_tarifa := fn_obtener_tarifa_vigente(p_placa, p_id_estacion);

    -- Si la tarifa es 0 (caso exento), cruces ilimitados
    IF v_tarifa = 0 THEN
        RETURN 9999;
    END IF;

    -- Obtener el saldo de la cuenta de telepeaje
    SELECT saldo_disponible INTO v_saldo
    FROM CUENTA_TELEPEAJE
    WHERE placa_vehiculo = UPPER(TRIM(p_placa));

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    RETURN FLOOR(v_saldo / v_tarifa)::INT;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- CONSULTAS DE DEMOSTRACIÓN DE LAS FUNCIONES ALMACENADAS
-- =============================================================================
-- Ejemplo 1: Liquidar tarifa vigente para el vehículo 'HKL123' en la Estación Gambote (ID: 1)
SELECT 
    'HKL123' AS placa,
    1 AS id_estacion,
    fn_obtener_tarifa_vigente('HKL123', 1) AS tarifa_a_cobrar;

-- Ejemplo 2: Validar si el TAG 'TAG-COL-9900112233' tiene saldo suficiente para $10.500
SELECT 
    'TAG-COL-9900112233' AS tag_serial,
    10500.00 AS tarifa,
    fn_validar_aptitud_telepeaje('TAG-COL-9900112233', 10500.00) AS autorizar_paso;

-- Ejemplo 3: Validar TAG suspendido o sin saldo ('TAG-COL-9900112238')
SELECT 
    'TAG-COL-9900112238' AS tag_serial,
    31500.00 AS tarifa,
    fn_validar_aptitud_telepeaje('TAG-COL-9900112238', 31500.00) AS autorizar_paso;

-- Ejemplo 4: Estimar cruces restantes para vehículo 'HKL123' en la Estación Gambote
SELECT 
    'HKL123' AS placa,
    fn_estimar_cruces_restantes('HKL123', 1) AS cruces_disponibles;


-- -----------------------------------------------------------------------------
-- 4.2 DISPARADORES (TRIGGERS) DE NEGOCIO Y AUDITORÍA
-- -----------------------------------------------------------------------------
-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Asignatura: Bases de Datos (2026-2) - Docente: Víctor Valdelamar
-- Equipo de Trabajo:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 03_PLSQL/03_Triggers_PeajeSys.sql
-- DESCRIPCIÓN: Implementación de Disparadores (Triggers) de Reglas de Negocio,
--              Auditoría Automática y Validación Financiera en PostgreSQL (PL/pgSQL).
--              Cumple con el Numeral 4.2 de la Guía Oficial:
--              - Al menos 2 triggers asociados a reglas reales del negocio,
--                auditoría, validación o actualización automática.
--              - Justificación técnica y de negocio de su ejecución en el SGBD.
-- =============================================================================

-- =============================================================================
-- TRIGGER 1: trg_prevenir_saldo_negativo_telepeaje
-- =============================================================================
-- JUSTIFICACIÓN DE NEGOCIO Y TÉCNICA:
-- En sistemas de recaudo electrónico vial por telepeaje (RFID), las cuentas prepago
-- manejan recursos monetarios reales de usuarios y concesiones. Si se permitiera
-- saldo negativo por desincronización o fallos en aplicaciones externas, la concesión
-- incurriría en pérdidas de cartera difíciles de cobrar.
-- Delegar esta regla en un TRIGGER a nivel de motor de base de datos asegura que
-- NINGUNA instrucción (sea UPDATE manual de un administrador, servicio REST o script batch)
-- pueda vulnerar la restricción financiera de saldo no negativo, garantizando integridad
-- transaccional ACID bajo concurrencia.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_prevenir_saldo_negativo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.saldo_disponible < 0.00 THEN
        RAISE EXCEPTION 'Violación de Regla Financiera: El saldo de la cuenta de telepeaje ID % (Placa %) no puede ser inferior a $0.00 COP. Saldo intentado: $ % COP.',
            NEW.id_cuenta, NEW.placa_vehiculo, NEW.saldo_disponible
            USING ERRCODE = 'P0040';
    END IF;

    -- Si el saldo llega exactamente a cero y la cuenta estaba activa, marcar aviso
    IF NEW.saldo_disponible = 0.00 AND OLD.saldo_disponible > 0.00 THEN
        RAISE NOTICE 'Aviso de Saldo Agotado: La cuenta de telepeaje ID % (Placa %) ha quedado en $0.00 COP.',
            NEW.id_cuenta, NEW.placa_vehiculo;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevenir_saldo_negativo ON CUENTA_TELEPEAJE;
CREATE TRIGGER trg_prevenir_saldo_negativo
BEFORE UPDATE OF saldo_disponible ON CUENTA_TELEPEAJE
FOR EACH ROW
EXECUTE FUNCTION fn_trg_prevenir_saldo_negativo();


-- =============================================================================
-- TRIGGER 2: trg_auditar_transacciones_sensibles
-- =============================================================================
-- JUSTIFICACIÓN DE NEGOCIO Y TÉCNICA:
-- En las concesiones viales, los eventos excepcionales como evasiones de peaje
-- (vehículos que rompen la barrera o cruzan pegados sin pagar) y los pasos exentos
-- (ambulancias, bomberos, caravanas presidenciales) representan riesgos de fuga de
-- capital o fraude.
-- Este trigger audita de manera 100% automática e invisible en la tabla inmutable
-- AUDITORIA_TRANSACCION cada vez que se inserta un evento de evasión o exención,
-- registrando el usuario del sistema, fecha/hora y detalle del incidente para
-- posterior revisión de supervisión y fiscalización legal.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_auditar_transacciones_sensibles()
RETURNS TRIGGER AS $$
BEGIN
    -- Caso A: Registro de una EVASIÓN
    IF NEW.estado_paso = 'EVASION' THEN
        INSERT INTO AUDITORIA_TRANSACCION (
            id_transaccion, tipo_operacion, usuario_sistema, fecha_hora_evento, motivo
        ) VALUES (
            NEW.id_transaccion,
            'INSERT',
            CURRENT_USER,
            NOW(),
            'ALERTA DE EVASIÓN: Vehículo placa "' || COALESCE(NEW.placa_detectada, 'NO_DETECTADA') || 
            '" cruzó el carril del turno ' || NEW.id_turno || ' sin registrar pago.'
        );
    -- Caso B: Registro de un paso EXENTO de pago
    ELSIF NEW.metodo_pago = 'EXENTO' OR NEW.estado_paso = 'EXENTO' THEN
        INSERT INTO AUDITORIA_TRANSACCION (
            id_transaccion, tipo_operacion, usuario_sistema, fecha_hora_evento, motivo
        ) VALUES (
            NEW.id_transaccion,
            'INSERT',
            CURRENT_USER,
            NOW(),
            'Paso Exento Autorizado: Vehículo placa "' || COALESCE(NEW.placa_detectada, 'OFICIAL') || 
            '" exonerado bajo tarifa reglamentaria de $0.00 COP.'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditar_transacciones_sensibles ON TRANSACCION_PEAJE;
CREATE TRIGGER trg_auditar_transacciones_sensibles
AFTER INSERT ON TRANSACCION_PEAJE
FOR EACH ROW
EXECUTE FUNCTION fn_trg_auditar_transacciones_sensibles();


-- =============================================================================
-- TRIGGER 3 (Adicional): trg_acumular_recaudo_efectivo_turno
-- =============================================================================
-- JUSTIFICACIÓN DE NEGOCIO Y TÉCNICA:
-- En una caseta manual de peaje, mantener la sincronización en tiempo real del
-- total de dinero recaudado en efectivo dentro de la tabla TURNO es fundamental.
-- Este disparador actualiza automáticamente el acumulador en la cabecera del turno
-- cada vez que se inserta una transacción en efectivo aprobada, evitando discrepancias
-- de cálculo entre el detalle y la cabecera y liberando a la capa de aplicación
-- de realizar múltiples sentencias UPDATE concurrentes.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_acumular_recaudo_efectivo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.metodo_pago = 'EFECTIVO' AND NEW.estado_paso = 'APROBADO' THEN
        UPDATE TURNO
        SET total_recaudado_efectivo = COALESCE(total_recaudado_efectivo, 0.00) + NEW.monto_tarifa
        WHERE id_turno = NEW.id_turno;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_acumular_recaudo_efectivo ON TRANSACCION_PEAJE;
CREATE TRIGGER trg_acumular_recaudo_efectivo
AFTER INSERT ON TRANSACCION_PEAJE
FOR EACH ROW
EXECUTE FUNCTION fn_trg_acumular_recaudo_efectivo();


-- =============================================================================
-- TRIGGER 4 (Auditoría Inmutable):
-- Garantiza que los registros de AUDITORIA_TRANSACCION no puedan ser alterados
-- ni eliminados por ningún usuario, asegurando valor probatorio forense.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operación denegada: La tabla AUDITORIA_TRANSACCION es estrictamente de solo lectura/inserción (append-only) para garantizar trazabilidad legal y fiscal.'
        USING ERRCODE = 'P0045';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_inmutable ON AUDITORIA_TRANSACCION;
CREATE TRIGGER trg_auditoria_inmutable
BEFORE UPDATE OR DELETE ON AUDITORIA_TRANSACCION
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_audit_modification();


-- -----------------------------------------------------------------------------
-- 4.3 PROCEDIMIENTOS ALMACENADOS (STORED PROCEDURES)
-- -----------------------------------------------------------------------------
-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Asignatura: Bases de Datos (2026-2) - Docente: Víctor Valdelamar
-- Equipo de Trabajo:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 03_PLSQL/02_Procedimientos_PeajeSys.sql
-- DESCRIPCIÓN: Implementación de Procedimientos Almacenados (Stored Procedures)
--              con control transaccional, parámetros IN/INOUT y lógica de negocio.
--              Cumple con el Numeral 4.2 de la Guía Oficial:
--              - Al menos 2 procedimientos con parámetros pertinentes y lógica no trivial.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PROCEDIMIENTO 1: pr_registrar_paso_telepeaje
-- Propósito de Negocio:
--   Orquesta el flujo transaccional atómico y de misión crítica para el cobro
--   por carril automático (Telepeaje RFID) en menos de 300 ms:
--     1. Valida que el turno del carril esté 'ABIERTO' y acepte telepeaje.
--     2. Identifica la cuenta por el serial del TAG RFID y corrobora su vigencia.
--     3. Liquida la tarifa aplicable según la categoría del vehículo y la estación.
--     4. Valida saldo suficiente; si no alcanza, aborta mediante excepción.
--     5. Genera tiquete fiscal único utilizando la secuencia 'seq_numero_ticket'.
--     6. Registra la transacción de peaje ('TRANSACCION_PEAJE').
--     7. Registra el detalle de conciliación RFID ('DETALLE_PAGO_TELEPEAJE').
--     8. Debita el saldo de la cuenta prepago ('CUENTA_TELEPEAJE').
-- Parámetros:
--   IN    p_id_turno         : Turno operativo en el que ocurre el paso.
--   IN    p_tag_serial       : Serial capturado por la antena RFID.
--   IN    p_antena_id        : Identificador físico de la antena de lectura.
--   INOUT p_id_transaccion   : Identificador generado de la transacción (BIGINT).
--   INOUT p_numero_ticket    : Consecutivo fiscal asignado (VARCHAR).
--   INOUT p_monto_cobrado    : Valor debitado (NUMERIC).
--   INOUT p_saldo_restante   : Saldo disponible tras la transacción (NUMERIC).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_registrar_paso_telepeaje(
    IN p_id_turno BIGINT,
    IN p_tag_serial VARCHAR,
    IN p_antena_id VARCHAR,
    INOUT p_id_transaccion BIGINT DEFAULT NULL,
    INOUT p_numero_ticket VARCHAR DEFAULT NULL,
    INOUT p_monto_cobrado NUMERIC(10,2) DEFAULT NULL,
    INOUT p_saldo_restante NUMERIC(12,2) DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_id_estacion INT;
    v_tipo_carril VARCHAR(30);
    v_estado_turno VARCHAR(20);
    v_id_cuenta BIGINT;
    v_placa VARCHAR(10);
    v_saldo_actual NUMERIC(12,2);
    v_estado_cuenta VARCHAR(20);
    v_id_categoria INT;
    v_id_tarifa INT;
    v_monto_tarifa NUMERIC(10,2);
    v_ticket_generado VARCHAR(40);
BEGIN
    -- 1. Validar el estado del turno y el tipo de carril de la caseta
    SELECT t.estado, c.id_estacion, c.tipo_carril
    INTO v_estado_turno, v_id_estacion, v_tipo_carril
    FROM TURNO t
    JOIN CASETA c ON t.id_caseta = c.id_caseta
    WHERE t.id_turno = p_id_turno;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Error de validación: El turno ID % no existe en el sistema.', p_id_turno
            USING ERRCODE = 'P0010';
    ELSIF v_estado_turno <> 'ABIERTO' THEN
        RAISE EXCEPTION 'Operación rechazada: El turno ID % se encuentra en estado "%". Solo se admiten transacciones en turnos ABIERTOS.',
            p_id_turno, v_estado_turno
            USING ERRCODE = 'P0011';
    END IF;

    IF v_tipo_carril NOT IN ('TELEPEAJE_EXCLUSIVO', 'MIXTO') THEN
        RAISE EXCEPTION 'Carril no habilitado: El carril del turno ID % es de tipo "%" y no permite cobros por telepeaje.',
            p_id_turno, v_tipo_carril
            USING ERRCODE = 'P0012';
    END IF;

    -- 2. Consultar la cuenta de telepeaje asociada al TAG
    SELECT id_cuenta, placa_vehiculo, saldo_disponible, estado_cuenta
    INTO v_id_cuenta, v_placa, v_saldo_actual, v_estado_cuenta
    FROM CUENTA_TELEPEAJE
    WHERE tag_rfid_serial = TRIM(p_tag_serial);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TAG no reconocido: El serial RFID "%" no corresponde a ninguna cuenta registrada.', p_tag_serial
            USING ERRCODE = 'P0013';
    ELSIF v_estado_cuenta <> 'ACTIVA' THEN
        RAISE EXCEPTION 'Cuenta no habilitada: La cuenta asociada al TAG "%" se encuentra en estado "%". Paso denegado.',
            p_tag_serial, v_estado_cuenta
            USING ERRCODE = 'P0014';
    END IF;

    -- 3. Identificar vehículo y categoría
    SELECT id_categoria INTO v_id_categoria
    FROM VEHICULO
    WHERE placa = v_placa;

    -- 4. Obtener la tarifa y su ID específico
    SELECT id_tarifa, monto INTO v_id_tarifa, v_monto_tarifa
    FROM TARIFA
    WHERE id_estacion = v_id_estacion
      AND id_categoria = v_id_categoria
      AND activa = TRUE
      AND CURRENT_DATE >= fecha_inicio_vigencia
      AND (fecha_fin_vigencia IS NULL OR CURRENT_DATE <= fecha_fin_vigencia)
    ORDER BY fecha_inicio_vigencia DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inconsistencia tarifaria: No existe tarifa activa para el vehículo placa "%" en la estación ID %.',
            v_placa, v_id_estacion
            USING ERRCODE = 'P0015';
    END IF;

    -- 5. Validar suficiencia de saldo
    IF v_saldo_actual < v_monto_tarifa THEN
        RAISE EXCEPTION 'Saldo insuficiente: La cuenta del TAG "%" cuenta con $ % COP disponibles, pero la tarifa requerida es de $ % COP.',
            p_tag_serial, v_saldo_actual, v_monto_tarifa
            USING ERRCODE = 'P0016';
    END IF;

    -- 6. Generar número de tiquete fiscal único
    v_ticket_generado := 'TCK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('seq_numero_ticket')::TEXT, 6, '0');

    -- 7. Insertar la transacción de peaje aprobada
    INSERT INTO TRANSACCION_PEAJE (
        id_turno, id_tarifa, id_categoria, placa_detectada, monto_tarifa,
        metodo_pago, numero_ticket, fecha_hora, estado_paso
    ) VALUES (
        p_id_turno, v_id_tarifa, v_id_categoria, v_placa, v_monto_tarifa,
        'TELEPEAJE', v_ticket_generado, NOW(), 'APROBADO'
    ) RETURNING id_transaccion INTO p_id_transaccion;

    -- 8. Insertar detalle de conciliación de pago por telepeaje
    INSERT INTO DETALLE_PAGO_TELEPEAJE (
        id_transaccion, id_cuenta, saldo_anterior, saldo_posterior, antena_lectora_id
    ) VALUES (
        p_id_transaccion, v_id_cuenta, v_saldo_actual, (v_saldo_actual - v_monto_tarifa), p_antena_id
    );

    -- 9. Actualizar el saldo de la cuenta de telepeaje
    UPDATE CUENTA_TELEPEAJE
    SET saldo_disponible = saldo_disponible - v_monto_tarifa
    WHERE id_cuenta = v_id_cuenta;

    -- 10. Asignar parámetros de salida para confirmación inmediata
    p_numero_ticket  := v_ticket_generado;
    p_monto_cobrado  := v_monto_tarifa;
    p_saldo_restante := (v_saldo_actual - v_monto_tarifa);

    RAISE NOTICE 'Telepeaje Exitoso: Placa %, Ticket %, Débito: $ %, Nuevo Saldo: $ % COP',
        v_placa, p_numero_ticket, p_monto_cobrado, p_saldo_restante;
END;
$$;


-- -----------------------------------------------------------------------------
-- PROCEDIMIENTO 2: pr_cerrar_arqueo_turno
-- Propósito de Negocio:
--   Efectúa el cierre financiero y liquidación formal de la jornada de un cajero:
--     1. Valida que el turno exista y esté actualmente 'ABIERTO'.
--     2. Calcula la sumatoria real de pagos en efectivo registrados por el sistema.
--     3. Compara dicho monto contra el efectivo físico declarado por el operador.
--     4. Calcula la discrepancia (diferencia_descuadre).
--     5. Actualiza el turno a estado 'CERRADO' y almacena las cifras consolidadas.
--     6. Emite advertencia si existe faltante o sobrante de caja.
-- Parámetros:
--   IN    p_id_turno            : Turno que se procede a cerrar.
--   IN    p_efectivo_declarado  : Monto de billetes y monedas contado en la entrega.
--   INOUT p_diferencia          : Discrepancia resultante (0=Exacto, <0=Faltante, >0=Sobrante).
--   INOUT p_total_sistema       : Total computado por el sistema en transacciones de efectivo.
--   INOUT p_estado_cierre       : Estado final del turno ('CERRADO').
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_cerrar_arqueo_turno(
    IN p_id_turno BIGINT,
    IN p_efectivo_declarado NUMERIC(12,2),
    INOUT p_diferencia NUMERIC(12,2) DEFAULT NULL,
    INOUT p_total_sistema NUMERIC(12,2) DEFAULT NULL,
    INOUT p_estado_cierre VARCHAR(20) DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_estado_actual VARCHAR(20);
    v_operador VARCHAR(200);
BEGIN
    -- 1. Validar que el turno exista y obtener información del operador
    SELECT t.estado, (o.nombres || ' ' || o.apellidos)
    INTO v_estado_actual, v_operador
    FROM TURNO t
    JOIN OPERADOR o ON t.id_operador = o.id_operador
    WHERE t.id_turno = p_id_turno;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El turno ID % no existe en la base de datos.', p_id_turno
            USING ERRCODE = 'P0020';
    ELSIF v_estado_actual = 'CERRADO' THEN
        RAISE EXCEPTION 'Operación denegada: El turno ID % ya fue cerrado previamente.', p_id_turno
            USING ERRCODE = 'P0021';
    END IF;

    -- 2. Validar que el monto declarado no sea negativo
    IF p_efectivo_declarado IS NULL OR p_efectivo_declarado < 0 THEN
        RAISE EXCEPTION 'El efectivo declarado no puede ser nulo ni negativo ($ %).', p_efectivo_declarado
            USING ERRCODE = 'P0022';
    END IF;

    -- 3. Calcular la sumatoria de recaudación en efectivo según el sistema
    SELECT COALESCE(SUM(monto_tarifa), 0.00)
    INTO p_total_sistema
    FROM TRANSACCION_PEAJE
    WHERE id_turno = p_id_turno
      AND metodo_pago = 'EFECTIVO'
      AND estado_paso = 'APROBADO';

    -- 4. Computar la diferencia de descuadre
    p_diferencia := p_efectivo_declarado - p_total_sistema;

    -- 5. Actualizar la tabla TURNO
    UPDATE TURNO
    SET total_recaudado_efectivo = p_total_sistema,
        total_declarado_cierre   = p_efectivo_declarado,
        diferencia_descuadre     = p_diferencia,
        estado                   = 'CERRADO'
    WHERE id_turno = p_id_turno;

    p_estado_cierre := 'CERRADO';

    -- 6. Notificaciones gerenciales según el arqueo
    IF p_diferencia = 0.00 THEN
        RAISE NOTICE 'Arqueo Conforme: Turno ID % cerrado exitosamente. Operador: %. Caja cuadrada al centavo ($ % COP).',
            p_id_turno, v_operador, p_total_sistema;
    ELSIF p_diferencia < 0.00 THEN
        RAISE WARNING 'ALERTA DE CAJA: Turno ID % cerrado con FALTANTE de $ % COP. Declarado: $ %, Esperado: $ % (Operador: %)',
            p_id_turno, ABS(p_diferencia), p_efectivo_declarado, p_total_sistema, v_operador;
    ELSE
        RAISE NOTICE 'INFORMACIÓN: Turno ID % cerrado con SOBRANTE de $ % COP. Declarado: $ %, Esperado: $ % (Operador: %)',
            p_id_turno, p_diferencia, p_efectivo_declarado, p_total_sistema, v_operador;
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- PROCEDIMIENTO 3: pr_recargar_saldo_telepeaje (Bonus)
-- Propósito de Negocio:
--   Permite a la pasarela de pagos o al módulo de recargas inyectar saldo a una
--   cuenta de telepeaje. Si la cuenta se encontraba en estado 'SUSPENDIDA' por
--   falta de saldo, la reactiva automáticamente a estado 'ACTIVA'.
-- Parámetros:
--   IN    p_tag_o_placa     : Placa o TAG del vehículo a recargar.
--   IN    p_monto_recarga   : Valor a sumar al saldo (debe ser > 0).
--   INOUT p_nuevo_saldo     : Saldo final tras la recarga.
--   INOUT p_estado_final    : Estado final de la cuenta.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_recargar_saldo_telepeaje(
    IN p_tag_o_placa VARCHAR,
    IN p_monto_recarga NUMERIC(12,2),
    INOUT p_nuevo_saldo NUMERIC(12,2) DEFAULT NULL,
    INOUT p_estado_final VARCHAR(20) DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_id_cuenta BIGINT;
    v_saldo_actual NUMERIC(12,2);
    v_estado_actual VARCHAR(20);
BEGIN
    -- Validar monto de recarga
    IF p_monto_recarga IS NULL OR p_monto_recarga <= 0 THEN
        RAISE EXCEPTION 'Monto de recarga inválido: Debe ser estrictamente superior a cero ($ %).', p_monto_recarga
            USING ERRCODE = 'P0030';
    END IF;

    -- Localizar la cuenta por placa o por serial RFID
    SELECT id_cuenta, saldo_disponible, estado_cuenta
    INTO v_id_cuenta, v_saldo_actual, v_estado_actual
    FROM CUENTA_TELEPEAJE
    WHERE tag_rfid_serial = TRIM(p_tag_o_placa)
       OR placa_vehiculo   = UPPER(TRIM(p_tag_o_placa));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró ninguna cuenta de telepeaje vinculada al identificador "%".', p_tag_o_placa
            USING ERRCODE = 'P0031';
    END IF;

    -- Actualizar saldo y reactivar cuenta si estaba suspendida
    UPDATE CUENTA_TELEPEAJE
    SET saldo_disponible = saldo_disponible + p_monto_recarga,
        estado_cuenta    = 'ACTIVA'
    WHERE id_cuenta = v_id_cuenta
    RETURNING saldo_disponible, estado_cuenta INTO p_nuevo_saldo, p_estado_final;

    RAISE NOTICE 'Recarga Exitosa: Identificador %, Saldo Anterior: $ %, Recarga: $ %, Nuevo Saldo: $ % COP, Estado: %',
        p_tag_o_placa, v_saldo_actual, p_monto_recarga, p_nuevo_saldo, p_estado_final;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4.4 PROCESO BATCH CON CURSOR EXPLÍCITO Y GESTIÓN DE EXCEPCIONES
-- -----------------------------------------------------------------------------
-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Asignatura: Bases de Datos (2026-2) - Docente: Víctor Valdelamar
-- Equipo de Trabajo:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 03_PLSQL/04_Proceso_Cursor_PeajeSys.sql
-- DESCRIPCIÓN: Proceso Batch con CURSOR Explícito y Manejo Robusto de Excepciones.
--              Cumple con el Numeral 4.2 de la Guía Oficial:
--              - Implementar al menos un proceso que recorra varias filas con CURSOR,
--                aplique lógica de negocio avanzada y gestione errores previsibles.
--              - Demostración mediante Procedimiento Almacenado y Bloque Anónimo (DO).
-- =============================================================================

-- =============================================================================
-- 1. PROCEDIMIENTO ALMACENADO CON CURSOR EXPLÍCITO Y GESTIÓN DE EXCEPCIONES
-- =============================================================================
-- Propósito de Negocio:
--   Proceso de auditoría y conciliación nocturna de la concesión vial.
--   Recorre todas las cuentas de telepeaje RFID activas en el sistema para:
--     1. Detectar cuentas con saldo $0 que sigan activas y suspenderlas preventivamente
--        para evitar evasiones involuntarias en las barreras automáticas.
--     2. Clasificar cuentas en 'SALDO CRÍTICO' (< $20.000 COP) y proyectar los cruces
--        restantes según la tarifa de su categoría vehicular.
--     3. Gestionar errores fila a fila (aislamiento de fallos) de modo que una excepción
--        en un registro no cancele el lote completo.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_proceso_nocturno_monitoreo_cuentas(
    OUT p_total_procesadas INT,
    OUT p_cuentas_optimas INT,
    OUT p_cuentas_criticas INT,
    OUT p_cuentas_suspendidas INT,
    OUT p_errores_capturados INT
)
LANGUAGE plpgsql AS $$
DECLARE
    -- Declaración del Cursor Explícito
    cur_cuentas CURSOR FOR
        SELECT 
            c.id_cuenta,
            c.placa_vehiculo,
            c.tag_rfid_serial,
            c.saldo_disponible,
            c.estado_cuenta,
            v.id_categoria,
            cv.codigo AS categoria_codigo
        FROM CUENTA_TELEPEAJE c
        JOIN VEHICULO v ON c.placa_vehiculo = v.placa
        JOIN CATEGORIA_VEHICULO cv ON v.id_categoria = cv.id_categoria
        ORDER BY c.saldo_disponible ASC, c.id_cuenta ASC;

    -- Registro para capturar la fila del cursor
    rec RECORD;

    -- Variables de trabajo interno
    v_tarifa_referencia NUMERIC(10,2);
    v_cruces_estimados INT;
BEGIN
    -- Inicializar acumuladores y contadores
    p_total_procesadas     := 0;
    p_cuentas_optimas      := 0;
    p_cuentas_criticas     := 0;
    p_cuentas_suspendidas  := 0;
    p_errores_capturados   := 0;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'INICIANDO PROCESO BATCH NOCTURNO: AUDITORÍA Y MONITOREO DE CUENTAS RFID';
    RAISE NOTICE 'Hora de Inicio: %', TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS');
    RAISE NOTICE '=============================================================================';

    -- Apertura y recorrido del Cursor Explícito
    OPEN cur_cuentas;
    LOOP
        FETCH cur_cuentas INTO rec;
        EXIT WHEN NOT FOUND;

        p_total_procesadas := p_total_procesadas + 1;

        -- Bloque interno con manejo de excepciones para aislar fallos por registro
        BEGIN
            -- -----------------------------------------------------------------
            -- REGLA 1: Saldo en Cero y Cuenta Activa -> Suspensión Automática
            -- -----------------------------------------------------------------
            IF rec.saldo_disponible = 0.00 AND rec.estado_cuenta = 'ACTIVA' THEN
                UPDATE CUENTA_TELEPEAJE
                SET estado_cuenta = 'SUSPENDIDA'
                WHERE id_cuenta = rec.id_cuenta;

                p_cuentas_suspendidas := p_cuentas_suspendidas + 1;
                RAISE NOTICE '[SUSPENSIÓN AUTOMÁTICA] Cuenta ID % | Placa: % | TAG: % | Saldo: $0.00 COP -> Estado cambiado a SUSPENDIDA.',
                    rec.id_cuenta, rec.placa_vehiculo, rec.tag_rfid_serial;

            -- -----------------------------------------------------------------
            -- REGLA 2: Saldo Crítico (< $20.000 COP) y Cuenta Activa -> Alerta Temprana
            -- -----------------------------------------------------------------
            ELSIF rec.saldo_disponible > 0.00 AND rec.saldo_disponible < 20000.00 AND rec.estado_cuenta = 'ACTIVA' THEN
                -- Obtener tarifa de referencia para la Estación Gambote (ID: 1)
                SELECT COALESCE(monto, 10500.00) INTO v_tarifa_referencia
                FROM TARIFA
                WHERE id_estacion = 1
                  AND id_categoria = rec.id_categoria
                  AND activa = TRUE
                ORDER BY fecha_inicio_vigencia DESC
                LIMIT 1;

                -- Previsión de excepción: División por cero si la tarifa fuera 0
                IF v_tarifa_referencia = 0.00 THEN
                    RAISE EXCEPTION 'Tarifa calculada en $0 para vehículo comercial placa %.', rec.placa_vehiculo
                        USING ERRCODE = 'P0050';
                END IF;

                v_cruces_estimados := FLOOR(rec.saldo_disponible / v_tarifa_referencia)::INT;
                p_cuentas_criticas := p_cuentas_criticas + 1;

                RAISE NOTICE '[SALDO CRÍTICO] Cuenta ID % | Placa: % | Cat: % | Saldo: $ % COP | Cruces restantes: %',
                    rec.id_cuenta, rec.placa_vehiculo, rec.categoria_codigo, rec.saldo_disponible, v_cruces_estimados;

            -- -----------------------------------------------------------------
            -- REGLA 3: Saldo Saludable y Conforme
            -- -----------------------------------------------------------------
            ELSIF rec.saldo_disponible >= 20000.00 THEN
                p_cuentas_optimas := p_cuentas_optimas + 1;
            END IF;

        EXCEPTION
            -- Captura estructurada de errores previsibles o anomalías de datos
            WHEN division_by_zero THEN
                p_errores_capturados := p_errores_capturados + 1;
                RAISE WARNING '[EXCEPCIÓN CAPTURADA: División por cero] En cuenta ID % (Placa %): Tarifa base nula o inválida.',
                    rec.id_cuenta, rec.placa_vehiculo;
            WHEN OTHERS THEN
                p_errores_capturados := p_errores_capturados + 1;
                RAISE WARNING '[EXCEPCIÓN CAPTURADA: Error no esperado] En cuenta ID % (Placa %): % (SQLSTATE: %)',
                    rec.id_cuenta, rec.placa_vehiculo, SQLERRM, SQLSTATE;
        END;

    END LOOP;
    CLOSE cur_cuentas;

    RAISE NOTICE '-----------------------------------------------------------------------------';
    RAISE NOTICE 'RESUMEN DE EJECUCIÓN DEL LOTE BATCH:';
    RAISE NOTICE '  Total cuentas evaluadas      : %', p_total_procesadas;
    RAISE NOTICE '  Cuentas con saldo óptimo     : %', p_cuentas_optimas;
    RAISE NOTICE '  Cuentas en saldo crítico     : %', p_cuentas_criticas;
    RAISE NOTICE '  Cuentas suspendidas por $0   : %', p_cuentas_suspendidas;
    RAISE NOTICE '  Errores aislados y capturados: %', p_errores_capturados;
    RAISE NOTICE '=============================================================================';
END;
$$;


-- =============================================================================
-- 2. BLOQUE ANÓNIMO PL/pgSQL (DO) CON CURSOR Y EXCEPCIONES PARA DEMOSTRACIÓN EN VIVO
-- =============================================================================
-- Permite al estudiante ejecutar y mostrar en caliente frente al docente
-- el funcionamiento del cursor, la lógica iterativa y la captura de errores.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_total INT;
    v_optimas INT;
    v_criticas INT;
    v_suspendidas INT;
    v_errores INT;
BEGIN
    RAISE NOTICE 'EJECUTANDO DEMOSTRACIÓN EN VIVO DEL PROCESO CON CURSOR...';
    CALL pr_proceso_nocturno_monitoreo_cuentas(v_total, v_optimas, v_criticas, v_suspendidas, v_errores);
END;
$$;


-- #############################################################################
-- FASE 5: CONSULTAS DE NEGOCIO (10 CONSULTAS AVANZADAS)
-- #############################################################################

-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Integrantes:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 03_Consultas_PeajeSys.sql
-- DESCRIPCIÓN: Batería de 10 consultas de negocio de alta relevancia para la gestión
--              y fiscalización del sistema de peajes. Cumple estrictamente con la
--              cobertura técnica exigida por la Guía (Secciones 3.2 y 3.4):
--              - Al menos 3 consultas con JOIN entre varias tablas.
--              - Al menos 2 con funciones de agregación y GROUP BY / HAVING.
--              - Al menos 2 con subconsultas.
--              - Al menos 2 con funciones de texto, fecha, número y CASE / COALESCE.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- CONSULTA 1
-- Cobertura Técnica: JOIN entre 4 tablas (TURNO, CASETA, ESTACION_PEAJE, OPERADOR)
-- Pregunta de Negocio: ¿Cuál es el recaudo consolidado en efectivo por estación,
--                      caseta y operador en los turnos cerrados formalmente?
-- Utilidad Gerencial: Permite a auditoría y finanzas validar la liquidación
--                     operativa de cajeros frente al efectivo entregado.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- CONSULTA 2
-- Cobertura Técnica: JOIN entre 5 tablas (DETALLE_PAGO_TELEPEAJE, TRANSACCION_PEAJE,
--                    CUENTA_TELEPEAJE, VEHICULO, CATEGORIA_VEHICULO)
-- Pregunta de Negocio: ¿Qué vehículos con telepeaje han cruzado por las estaciones,
--                      cuál fue el número de ticket generado y su saldo resultante?
-- Utilidad Gerencial: Trazabilidad directa para la facturación mensual del cliente
--                     corporativo y conciliación de débitos automáticos RFID.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- CONSULTA 3
-- Cobertura Técnica: JOIN entre 4 tablas (TRANSACCION_PEAJE, TURNO, CASETA, OPERADOR)
-- Pregunta de Negocio: ¿Qué transacciones han sido clasificadas como EXENTO o EVASION,
--                      en qué carril se produjeron y qué operador estaba de guardia?
-- Utilidad Gerencial: Detección preventiva de fraude, control de pérdidas y
--                     verificación de autorizaciones de exención institucional.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- CONSULTA 4
-- Cobertura Técnica: Funciones de Agregación (COUNT, SUM) con GROUP BY y HAVING
-- Pregunta de Negocio: ¿Qué categorías vehiculares han generado un recaudo acumulado
--                      total mayor a $30,000 COP y cuántos vehículos aportaron?
-- Utilidad Gerencial: Identificación de los segmentos de tráfico que aportan el
--                     mayor flujo de ingresos a la concesión vial.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- CONSULTA 5
-- Cobertura Técnica: Agregación con funciones estadísticas (COUNT, AVG, ROUND) y HAVING
-- Pregunta de Negocio: ¿Qué casetas han atendido 2 o más transacciones y cuál ha sido
--                      su tarifa media cobrada por vehículo?
-- Utilidad Gerencial: Dimensionamiento del tráfico por carril para balanceo de carga
--                     entre carriles manuales y automáticos.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- CONSULTA 6
-- Cobertura Técnica: Subconsulta no correlacionada en cláusula WHERE
-- Pregunta de Negocio: ¿Qué cuentas de telepeaje poseen un saldo disponible por debajo
--                      del promedio general del sistema?
-- Utilidad Gerencial: Campañas de fidelización, notificación push para recarga
--                     preventiva antes de que el saldo entre en estado crítico.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- CONSULTA 7
-- Cobertura Técnica: Subconsulta correlacionada con operador IN
-- Pregunta de Negocio: ¿Qué operadores han registrado descuadres de caja con faltantes
--                      de dinero (diferencia negativa) en el cierre de turno?
-- Utilidad Gerencial: Monitoreo de riesgos y auditoría de talento humano para
--                     programación de capacitaciones en manejo de efectivo.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- CONSULTA 8
-- Cobertura Técnica: Funciones de Texto (UPPER), Fecha (TO_CHAR, INTERVAL) y CASE
-- Pregunta de Negocio: Listar las transacciones formateando el número de ticket en
--                      mayúsculas, mostrando el día de la semana y clasificando su
--                      antigüedad operativa ('Hoy', 'Esta semana', 'Anterior').
-- Utilidad Gerencial: Reporte amigable para inspección visual de paso en pantalla
--                     de supervisor en tiempo real.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- CONSULTA 9
-- Cobertura Técnica: Funciones numéricas, COALESCE y Expresión condicional CASE
-- Pregunta de Negocio: Emitir un arqueo consolidado de turnos evaluando si el cajero
--                      cerró con saldo 'SOBRANTE (+)', 'FALTANTE (-)' o 'CUADRADO'.
-- Utilidad Gerencial: Control contable diario sin valores nulos para entrega formal
--                     a tesorería y transportadora de valores.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- CONSULTA 10
-- Cobertura Técnica: JOIN + Agregación + Expresión matemática (ROUND, porcentaje)
--                    y Subconsulta escalar integrada
-- Pregunta de Negocio: ¿Cuál es la participación porcentual y monto total de cada
--                      método de pago (EFECTIVO vs TELEPEAJE) sobre el gran total?
-- Utilidad Gerencial: Métrica clave (KPI) para medir el nivel de adopción de la
--                      tecnología de telepeaje frente al uso de efectivo en vía.
-- -----------------------------------------------------------------------------
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


-- #############################################################################
-- FASE 6: MATRIZ DE PRUEBAS DE LA CAPA PROCEDIMENTAL (10+ CASOS)
-- #############################################################################

-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Asignatura: Bases de Datos (2026-2) - Docente: Víctor Valdelamar
-- Equipo de Trabajo:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 03_PLSQL/05_Matriz_Pruebas_PeajeSys.sql
-- DESCRIPCIÓN: Batería y Matriz de Pruebas Automatizadas de la Capa Procedimental.
--              Cumple con los Numerales 4.2 y 4.3 de la Guía Oficial:
--              - Al menos 10 casos de prueba documentados (normales, límites y errores).
--              - Demostración de provocación intencional de errores y manejo controlado.
--              - Verificación de Funciones, Procedimientos, Triggers y Procesos con Cursor.
--              - Pruebas 100% aisladas, idempotentes y re-ejecutables.
-- =============================================================================

DO $$
BEGIN
   RAISE NOTICE '=============================================================================';
   RAISE NOTICE 'INICIANDO BATERÍA Y MATRIZ DE PRUEBAS DE PROCEDIMIENTOS, TRIGGERS Y FUNCIONES';
   RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- PRUEBA 01 [NORMAL / CAMINO FELIZ]: Registro Transaccional de Cobro por Telepeaje
-- Objetivo: Validar que pr_registrar_paso_telepeaje realiza el ciclo completo:
--           generación de ticket, inserción de transacción, detalle RFID y débito.
-- =============================================================================
DO $$
DECLARE
    v_id_transaccion BIGINT;
    v_ticket VARCHAR;
    v_cobrado NUMERIC(10,2);
    v_saldo NUMERIC(12,2);
    v_saldo_inicial NUMERIC(12,2);
BEGIN
    -- Asegurar precondiciones operativas (idempotencia)
    UPDATE TURNO SET estado = 'ABIERTO' WHERE id_turno = 10;
    UPDATE CUENTA_TELEPEAJE 
    SET saldo_disponible = 150000.00, estado_cuenta = 'ACTIVA' 
    WHERE tag_rfid_serial = 'TAG-COL-9900112233';

    SELECT saldo_disponible INTO v_saldo_inicial FROM CUENTA_TELEPEAJE WHERE tag_rfid_serial = 'TAG-COL-9900112233';

    CALL pr_registrar_paso_telepeaje(
        p_id_turno         := 10,
        p_tag_serial       := 'TAG-COL-9900112233',
        p_antena_id        := 'ANT-CAM-03A',
        p_id_transaccion   := v_id_transaccion,
        p_numero_ticket    := v_ticket,
        p_monto_cobrado    := v_cobrado,
        p_saldo_restante   := v_saldo
    );

    IF v_id_transaccion IS NOT NULL AND v_saldo = (v_saldo_inicial - v_cobrado) THEN
        RAISE NOTICE '[PRUEBA 01: EXITOSA] Cobro RFID efectuado. Ticket: %, Cobrado: $ %, Nuevo Saldo: $ % COP.',
            v_ticket, v_cobrado, v_saldo;
    ELSE
        RAISE EXCEPTION '[PRUEBA 01: FALLIDA] No se actualizó correctamente el saldo o transacción.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 02 [ERROR CONTROLADO]: Provocación Intencional de Saldo Insuficiente
-- Objetivo: Demostrar que ante un vehículo con saldo menor a la tarifa, el
--           procedimiento aborta limpiamente sin permitir paso ni alterar saldos.
-- =============================================================================
DO $$
DECLARE
    v_id_tx BIGINT;
    v_tck VARCHAR;
    v_monto NUMERIC(10,2);
    v_saldo NUMERIC(12,2);
    v_error_atrapado BOOLEAN := FALSE;
BEGIN
    -- Asegurar precondición: turno abierto, cuenta activa pero con saldo menor a tarifa ($8.000 vs $15.300)
    UPDATE TURNO SET estado = 'ABIERTO' WHERE id_turno = 10;
    UPDATE CUENTA_TELEPEAJE 
    SET saldo_disponible = 8000.00, estado_cuenta = 'ACTIVA' 
    WHERE tag_rfid_serial = 'TAG-COL-9900112236';

    BEGIN
        CALL pr_registrar_paso_telepeaje(
            p_id_turno       := 10,
            p_tag_serial     := 'TAG-COL-9900112236',
            p_antena_id      := 'ANT-CAM-03A',
            p_id_transaccion := v_id_tx,
            p_numero_ticket  := v_tck,
            p_monto_cobrado  := v_monto,
            p_saldo_restante := v_saldo
        );
    EXCEPTION
        WHEN OTHERS THEN
            v_error_atrapado := TRUE;
            RAISE NOTICE '[PRUEBA 02: EXITOSA - ERROR ATRAPADO] Excepción controlada: "%" (SQLSTATE: %)',
                SQLERRM, SQLSTATE;
    END;

    IF NOT v_error_atrapado THEN
        RAISE EXCEPTION '[PRUEBA 02: FALLIDA] Se permitió el paso a un vehículo con saldo insuficiente.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 03 [ERROR CONTROLADO]: Intento de Cruce con TAG Suspendido o Inactivo
-- Objetivo: Verificar que cuentas suspendidas no puedan realizar cruces.
-- =============================================================================
DO $$
DECLARE
    v_id_tx BIGINT;
    v_tck VARCHAR;
    v_monto NUMERIC(10,2);
    v_saldo NUMERIC(12,2);
    v_error_atrapado BOOLEAN := FALSE;
BEGIN
    -- Asegurar precondición: el turno debe estar ABIERTO y la cuenta estrictamente SUSPENDIDA
    UPDATE TURNO SET estado = 'ABIERTO' WHERE id_turno = 10;
    UPDATE CUENTA_TELEPEAJE 
    SET estado_cuenta = 'SUSPENDIDA' 
    WHERE tag_rfid_serial = 'TAG-COL-9900112238';

    BEGIN
        CALL pr_registrar_paso_telepeaje(
            p_id_turno       := 10,
            p_tag_serial     := 'TAG-COL-9900112238',
            p_antena_id      := 'ANT-CAM-03A',
            p_id_transaccion := v_id_tx,
            p_numero_ticket  := v_tck,
            p_monto_cobrado  := v_monto,
            p_saldo_restante := v_saldo
        );
    EXCEPTION
        WHEN OTHERS THEN
            v_error_atrapado := TRUE;
            RAISE NOTICE '[PRUEBA 03: EXITOSA - ERROR ATRAPADO] Bloqueo efectivo de cuenta suspendida: "%"', SQLERRM;
    END;

    IF NOT v_error_atrapado THEN
        RAISE EXCEPTION '[PRUEBA 03: FALLIDA] Se permitió transaccionar con una cuenta suspendida.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 04 [CASO LÍMITE]: Cobro con Saldo Exactamente Igual a la Tarifa
-- Objetivo: Validar que si el saldo es exactamente igual a la tarifa, se apruebe
--           el paso y el saldo quede exactamente en $0.00 COP.
-- =============================================================================
DO $$
DECLARE
    v_id_tx BIGINT;
    v_tck VARCHAR;
    v_monto NUMERIC(10,2);
    v_saldo NUMERIC(12,2);
BEGIN
    -- Asegurar precondición: cuenta activa con saldo exacto de $10.500 COP (Placa UYT890 - Cat I)
    UPDATE TURNO SET estado = 'ABIERTO' WHERE id_turno = 10;
    UPDATE CUENTA_TELEPEAJE
    SET saldo_disponible = 10500.00, estado_cuenta = 'ACTIVA'
    WHERE tag_rfid_serial = 'TAG-COL-9900112234';

    CALL pr_registrar_paso_telepeaje(
        p_id_turno       := 10,
        p_tag_serial     := 'TAG-COL-9900112234',
        p_antena_id      := 'ANT-CAM-03A',
        p_id_transaccion := v_id_tx,
        p_numero_ticket  := v_tck,
        p_monto_cobrado  := v_monto,
        p_saldo_restante := v_saldo
    );

    IF v_saldo = 0.00 THEN
        RAISE NOTICE '[PRUEBA 04: EXITOSA - CASO LÍMITE] Cobro exacto realizado. Saldo posterior exacto: $0.00 COP.';
    ELSE
        RAISE EXCEPTION '[PRUEBA 04: FALLIDA] El saldo posterior debió ser 0.00 y fue %', v_saldo;
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 05 [TRIGGER DE INTEGRIDAD]: Disparo de trg_prevenir_saldo_negativo
-- Objetivo: Demostrar que un UPDATE directo que intente violar la regla de saldo
--           no negativo es rechazado de inmediato por el disparador.
-- =============================================================================
DO $$
DECLARE
    v_trigger_activo BOOLEAN := FALSE;
BEGIN
    BEGIN
        UPDATE CUENTA_TELEPEAJE
        SET saldo_disponible = -25000.00
        WHERE id_cuenta = 1;
    EXCEPTION
        WHEN OTHERS THEN
            v_trigger_activo := TRUE;
            RAISE NOTICE '[PRUEBA 05: EXITOSA - TRIGGER INTEGRIDAD] trg_prevenir_saldo_negativo bloqueó la operación: "%"', SQLERRM;
    END;

    IF NOT v_trigger_activo THEN
        RAISE EXCEPTION '[PRUEBA 05: FALLIDA] El trigger no impidió asignar saldo negativo a la cuenta.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 06 [TRIGGER AUDITORÍA]: Disparo de trg_auditar_transacciones_sensibles
-- Objetivo: Comprobar que al insertar un evento de EVASIÓN, el disparador genera
--           automáticamente el registro correspondiente en AUDITORIA_TRANSACCION.
-- =============================================================================
DO $$
DECLARE
    v_id_tx BIGINT;
    v_conteo_auditoria INT;
    v_motivo_auditado VARCHAR;
    v_ticket_evasion VARCHAR;
BEGIN
    -- Consecutivo dinámico para evitar colisiones en ejecuciones repetidas
    v_ticket_evasion := 'TCK-EVA-' || LPAD(nextval('seq_numero_ticket')::TEXT, 6, '0');

    -- Insertar un evento de evasión vehicular
    INSERT INTO TRANSACCION_PEAJE (
        id_turno, id_tarifa, id_categoria, placa_detectada, monto_tarifa,
        metodo_pago, numero_ticket, estado_paso
    ) VALUES (
        1, 1, 1, 'EVA999', 10500.00, 'EFECTIVO', v_ticket_evasion, 'EVASION'
    ) RETURNING id_transaccion INTO v_id_tx;

    -- Verificar que el trigger insertó en AUDITORIA_TRANSACCION
    SELECT COUNT(*), MAX(motivo)
    INTO v_conteo_auditoria, v_motivo_auditado
    FROM AUDITORIA_TRANSACCION
    WHERE id_transaccion = v_id_tx;

    IF v_conteo_auditoria = 1 AND v_motivo_auditado LIKE '%ALERTA DE EVASIÓN%' THEN
        RAISE NOTICE '[PRUEBA 06: EXITOSA - TRIGGER AUDITORÍA] Evasión auditada automáticamente. Motivo: "%"', v_motivo_auditado;
    ELSE
        RAISE EXCEPTION '[PRUEBA 06: FALLIDA] No se auditó automáticamente la transacción de evasión.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 07 [TRIGGER INMUTABILIDAD]: Protección Append-Only de Auditoría
-- Objetivo: Validar que trg_auditoria_inmutable prohíbe cualquier borrado forense.
-- =============================================================================
DO $$
DECLARE
    v_inmutable BOOLEAN := FALSE;
BEGIN
    BEGIN
        DELETE FROM AUDITORIA_TRANSACCION WHERE id_auditoria = 1;
    EXCEPTION
        WHEN OTHERS THEN
            v_inmutable := TRUE;
            RAISE NOTICE '[PRUEBA 07: EXITOSA - INMUTABILIDAD] trg_auditoria_inmutable rechazó DELETE: "%"', SQLERRM;
    END;

    IF NOT v_inmutable THEN
        RAISE EXCEPTION '[PRUEBA 07: FALLIDA] Se permitió modificar o eliminar un registro de auditoría legal.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 08 [NORMAL]: Cierre y Arqueo Cuadrado de Turno de Recaudo
-- Objetivo: Liquidar un turno operativo mediante pr_cerrar_arqueo_turno declarando
--           la cifra exacta recaudada en el sistema.
-- =============================================================================
DO $$
DECLARE
    v_id_turno BIGINT;
    v_diferencia NUMERIC(12,2);
    v_total_sistema NUMERIC(12,2);
    v_estado VARCHAR(20);
    v_tck1 VARCHAR;
    v_tck2 VARCHAR;
BEGIN
    v_tck1 := 'TCK-ARQ-' || LPAD(nextval('seq_numero_ticket')::TEXT, 6, '0');
    v_tck2 := 'TCK-ARQ-' || LPAD(nextval('seq_numero_ticket')::TEXT, 6, '0');

    -- Crear un turno temporal para prueba de cierre
    INSERT INTO TURNO (id_caseta, id_operador, fecha, diurno, fondo_inicial_caja, estado)
    VALUES (1, 5, CURRENT_DATE, TRUE, 50000.00, 'ABIERTO')
    RETURNING id_turno INTO v_id_turno;

    -- Simular dos transacciones en efectivo aprobadas en el turno
    INSERT INTO TRANSACCION_PEAJE (id_turno, id_tarifa, id_categoria, placa_detectada, monto_tarifa, metodo_pago, numero_ticket, estado_paso)
    VALUES (v_id_turno, 1, 1, 'HKL123', 10500.00, 'EFECTIVO', v_tck1, 'APROBADO'),
           (v_id_turno, 1, 1, 'UYT890', 10500.00, 'EFECTIVO', v_tck2, 'APROBADO');

    -- Efectuar el cierre declarando exactamente $21.000 COP
    CALL pr_cerrar_arqueo_turno(
        p_id_turno           := v_id_turno,
        p_efectivo_declarado := 21000.00,
        p_diferencia         := v_diferencia,
        p_total_sistema      := v_total_sistema,
        p_estado_cierre      := v_estado
    );

    IF v_estado = 'CERRADO' AND v_diferencia = 0.00 AND v_total_sistema = 21000.00 THEN
        RAISE NOTICE '[PRUEBA 08: EXITOSA - CIERRE CUADRADO] Turno ID % cerrado con diferencia $0.00 COP.', v_id_turno;
    ELSE
        RAISE EXCEPTION '[PRUEBA 08: FALLIDA] Discrepancia en liquidación del turno.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 09 [CASO LÍMITE / DESCUADRE]: Cierre con Faltante de Efectivo
-- Objetivo: Validar que pr_cerrar_arqueo_turno registre correctamente la diferencia
--           negativa (faltante) y actualice el turno.
-- =============================================================================
DO $$
DECLARE
    v_id_turno BIGINT;
    v_diferencia NUMERIC(12,2);
    v_total_sistema NUMERIC(12,2);
    v_estado VARCHAR(20);
    v_tck VARCHAR;
BEGIN
    v_tck := 'TCK-ARQ-' || LPAD(nextval('seq_numero_ticket')::TEXT, 6, '0');

    -- Crear turno temporal
    INSERT INTO TURNO (id_caseta, id_operador, fecha, diurno, fondo_inicial_caja, estado)
    VALUES (2, 6, CURRENT_DATE, TRUE, 50000.00, 'ABIERTO')
    RETURNING id_turno INTO v_id_turno;

    -- Transacción en efectivo por $22.000 COP
    INSERT INTO TRANSACCION_PEAJE (id_turno, id_tarifa, id_categoria, placa_detectada, monto_tarifa, metodo_pago, numero_ticket, estado_paso)
    VALUES (v_id_turno, 4, 4, 'RTY654', 22000.00, 'EFECTIVO', v_tck, 'APROBADO');

    -- El operador entrega en físico solo $20.000 COP (Faltante de $2.000)
    CALL pr_cerrar_arqueo_turno(
        p_id_turno           := v_id_turno,
        p_efectivo_declarado := 20000.00,
        p_diferencia         := v_diferencia,
        p_total_sistema      := v_total_sistema,
        p_estado_cierre      := v_estado
    );

    IF v_estado = 'CERRADO' AND v_diferencia = -2000.00 THEN
        RAISE NOTICE '[PRUEBA 09: EXITOSA - DESCUADRE REGISTRADO] Turno ID % liquidado con Faltante de $ % COP.', v_id_turno, ABS(v_diferencia);
    ELSE
        RAISE EXCEPTION '[PRUEBA 09: FALLIDA] No se registró correctamente el descuadre negativo.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 10 [PROCESO CON CURSOR Y EXCEPCIONES]: Ejecución Batch Nocturna
-- Objetivo: Recorrer todas las cuentas con CURSOR explícito, clasificar saldos
--           críticos y aplicar suspensiones de cuentas en $0.
-- =============================================================================
DO $$
DECLARE
    v_tot INT;
    v_opt INT;
    v_cri INT;
    v_sus INT;
    v_err INT;
BEGIN
    CALL pr_proceso_nocturno_monitoreo_cuentas(v_tot, v_opt, v_cri, v_sus, v_err);

    IF v_tot >= 10 AND v_err = 0 THEN
        RAISE NOTICE '[PRUEBA 10: EXITOSA - CURSOR BATCH] Proceso iteró % cuentas sin errores no controlados.', v_tot;
    ELSE
        RAISE EXCEPTION '[PRUEBA 10: FALLIDA] Falló la ejecución del cursor o no procesó las cuentas esperadas.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 11 [BONUS - FUNCIONES Y RECARGA]: Recarga y Reactivación de Cuenta
-- Objetivo: Validar pr_recargar_saldo_telepeaje y fn_validar_aptitud_telepeaje
-- =============================================================================
DO $$
DECLARE
    v_nuevo_saldo NUMERIC(12,2);
    v_estado VARCHAR(20);
    v_apto BOOLEAN;
BEGIN
    -- Asegurar precondición: cuenta suspendida y con saldo $0
    UPDATE CUENTA_TELEPEAJE
    SET saldo_disponible = 0.00, estado_cuenta = 'SUSPENDIDA'
    WHERE tag_rfid_serial = 'TAG-COL-9900112238';

    -- Recargar $50.000 a la cuenta asociada al TAG-COL-9900112238 (estaba suspendida)
    CALL pr_recargar_saldo_telepeaje(
        p_tag_o_placa   := 'TAG-COL-9900112238',
        p_monto_recarga := 50000.00,
        p_nuevo_saldo   := v_nuevo_saldo,
        p_estado_final  := v_estado
    );

    v_apto := fn_validar_aptitud_telepeaje('TAG-COL-9900112238', 31500.00);

    IF v_estado = 'ACTIVA' AND v_nuevo_saldo >= 50000.00 AND v_apto = TRUE THEN
        RAISE NOTICE '[PRUEBA 11: EXITOSA - RECARGA Y APTITUD] Cuenta reactivada y apta para telepeaje.';
    ELSE
        RAISE EXCEPTION '[PRUEBA 11: FALLIDA] La cuenta no fue reactivada tras la recarga.';
    END IF;

    -- Restaurar estado suspendido original para mantener aislamiento total en futuras ejecuciones
    UPDATE CUENTA_TELEPEAJE
    SET saldo_disponible = 0.00, estado_cuenta = 'SUSPENDIDA'
    WHERE tag_rfid_serial = 'TAG-COL-9900112238';
END;
$$;

DO $$
BEGIN
   RAISE NOTICE '=============================================================================';
   RAISE NOTICE 'TODAS LAS PRUEBAS DE LA MATRIZ FUERON EJECUTADAS CON RESULTADO CONFORME';
   RAISE NOTICE '=============================================================================';
END $$;
