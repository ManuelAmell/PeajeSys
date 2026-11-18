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
