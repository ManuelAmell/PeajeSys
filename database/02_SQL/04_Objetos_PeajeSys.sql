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
