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