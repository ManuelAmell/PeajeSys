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

