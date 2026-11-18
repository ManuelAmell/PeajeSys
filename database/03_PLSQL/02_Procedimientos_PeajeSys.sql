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
