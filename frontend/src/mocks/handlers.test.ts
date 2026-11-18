import { describe, expect, it } from 'vitest';

describe('Servidor simulado MSW (src/mocks/handlers/)', () => {
  const getUrl = (path: string) => `${window.location.origin}${path}`;

  describe('1. Autenticación (POST /api/auth/login)', () => {
    it('valida código requerido con mensaje del prototipo', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: '', clave: '123' }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.codigo).toBe('CODIGO_REQUERIDO');
      expect(data.error.mensaje).toBe('Escribe tu código de empleado.');
    });

    it('valida contraseña requerida con mensaje del prototipo', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: 'EMP-002', clave: '' }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.codigo).toBe('CLAVE_REQUERIDA');
      expect(data.error.mensaje).toBe('Escribe tu contraseña.');
    });

    it('permite acceso al usuario exclusivo de frontend ADMIN-01 con rol ADMIN', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: 'ADMIN-01', clave: 'cualquiera' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.usuario.codigo).toBe('ADMIN-01');
      expect(data.usuario.rol).toBe('ADMIN');
      expect(data.usuario.rolTxt).toBe('Administrador');
    });

    it('rechaza empleado inexistente con HTTP 404', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: 'EMP-999', clave: 'prueba' }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.codigo).toBe('EMPLEADO_NO_ENCONTRADO');
      expect(data.error.mensaje).toBe('No existe un empleado con el código EMP-999.');
    });

    it('rechaza empleado inactivo (EMP-009) con HTTP 403', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: 'EMP-009', clave: 'prueba' }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.codigo).toBe('EMPLEADO_INACTIVO');
      expect(data.error.mensaje).toBe('El usuario EMP-009 está INACTIVO. Pide a un administrador que lo active.');
    });

    it('rechaza recaudador sin turno abierto con HTTP 409 (EMP-005)', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: 'EMP-005', clave: 'prueba' }),
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error.codigo).toBe('SIN_TURNO_ABIERTO');
      expect(data.error.mensaje).toContain('no tiene un turno abierto. El supervisor debe asignarle una caseta');
    });

    it('permite recaudador con turno abierto (EMP-002: turno 9) e incluye caseta y carril', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: 'EMP-002', clave: 'prueba' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.usuario.rol).toBe('RECAUDADOR');
      expect(data.turno_abierto).toBeDefined();
      expect(data.turno_abierto.id_turno).toBe(9);
      expect(data.turno_abierto.numero_carril).toBe(2);
      expect(data.turno_abierto.tipo_carril).toBe('MANUAL');
    });

    it('permite supervisor (EMP-003) sin requerir turno abierto', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: 'EMP-003', clave: 'prueba' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.usuario.rol).toBe('SUPERVISOR');
      expect(data.usuario.rolTxt).toBe('Supervisor');
    });
  });

  describe('2. Estaciones y Casetas (GET /api/estaciones, GET /api/casetas)', () => {
    it('GET /api/estaciones retorna las 2 estaciones del DML', async () => {
      const res = await fetch(`http://localhost:3000/api/estaciones`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(2);
      expect(data[0].codigo_estacion).toBe('PEA-GAM-01');
      expect(data[1].codigo_estacion).toBe('PEA-CEB-02');
    });

    it('GET /api/casetas retorna 6 casetas o filtra por estacion', async () => {
      const resTodas = await fetch(`http://localhost:3000/api/casetas`);
      const todas = await resTodas.json();
      expect(todas.length).toBe(6);

      const resEst1 = await fetch(`http://localhost:3000/api/casetas?estacion=1`);
      const est1 = await resEst1.json();
      expect(est1.length).toBe(4);
    });
  });

  describe('3. Operadores (GET/POST/PATCH /api/operadores)', () => {
    it('GET /api/operadores filtra por rol y estado', async () => {
      const resRecaudadores = await fetch(`http://localhost:3000/api/operadores?rol=RECAUDADOR&estado=ACTIVO`);
      const data = await resRecaudadores.json();
      expect(data.every((o: { rol: string; estado: string }) => o.rol === 'RECAUDADOR' && o.estado === 'ACTIVO')).toBe(true);
    });

    it('POST /api/operadores crea un operador válido o detecta duplicados', async () => {
      const res = await fetch(`http://localhost:3000/api/operadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_documento: '1099887766',
          nombres: 'Nuevo',
          apellidos: 'Operador',
          codigo_empleado: 'EMP-099',
          rol: 'RECAUDADOR',
        }),
      });
      expect(res.status).toBe(201);
      const creado = await res.json();
      expect(creado.id_operador).toBeGreaterThan(10);

      // Duplicado
      const resDup = await fetch(`http://localhost:3000/api/operadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_documento: '1099887766',
          nombres: 'Otro',
          apellidos: 'Operador',
          codigo_empleado: 'EMP-100',
          rol: 'RECAUDADOR',
        }),
      });
      expect(resDup.status).toBe(409);
    });

    it('PATCH /api/operadores/:id actualiza el estado', async () => {
      const res = await fetch(`http://localhost:3000/api/operadores/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'INACTIVO' }),
      });
      expect(res.status).toBe(200);
      const modificado = await res.json();
      expect(modificado.estado).toBe('INACTIVO');
    });
  });

  describe('4. Categorías (GET/POST/PATCH /api/categorias)', () => {
    it('GET /api/categorias devuelve las 7 categorías Mintransporte', async () => {
      const res = await fetch(`http://localhost:3000/api/categorias`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(7);
      expect(data[0].codigo).toBe('CAT_I');
    });

    it('POST /api/categorias valida numero_ejes_max >= numero_ejes_min', async () => {
      const resInvalido = await fetch(`http://localhost:3000/api/categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: 'CAT_TEST',
          descripcion: 'Invalida',
          numero_ejes_min: 5,
          numero_ejes_max: 3,
        }),
      });
      expect(resInvalido.status).toBe(422);
    });
  });

  describe('5. Tarifas (GET/POST/PATCH /api/tarifas)', () => {
    it('GET /api/tarifas filtra por estación y vigencia', async () => {
      const res = await fetch(`http://localhost:3000/api/tarifas?estacion=1&vigente=true`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(7);
    });

    it('POST /api/tarifas crea tarifa nueva cerrando la previa activa', async () => {
      const res = await fetch(`http://localhost:3000/api/tarifas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_estacion: 1,
          id_categoria: 1,
          monto: 11500,
          resolucion_legal: 'Res. 0100/2026',
          fecha_inicio_vigencia: '2026-12-01',
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.monto).toBe(11500);

      // Verificar que la tarifa anterior quedó cerrada
      const resTodas = await fetch(`http://localhost:3000/api/tarifas?estacion=1&categoria=1`);
      const tarifasCat1 = await resTodas.json();
      expect(tarifasCat1.length).toBe(2);
      const vieja = tarifasCat1.find((t: { id_tarifa: number }) => t.id_tarifa === 1);
      expect(vieja.activa).toBe(false);
      expect(vieja.fecha_fin_vigencia).toBe('2026-12-01');
    });
  });

  describe('6. Vehículos (GET /api/vehiculos/:placa)', () => {
    it('GET /api/vehiculos/:placa devuelve vehículo y cuenta asociada', async () => {
      const res = await fetch(`http://localhost:3000/api/vehiculos/HKL123`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.vehiculo.placa).toBe('HKL123');
      expect(data.cuenta).toBeDefined();
      expect(data.cuenta.tag_rfid_serial).toBe('TAG-COL-9900112233');
    });

    it('GET /api/vehiculos/:placa devuelve 404 para placa no existente', async () => {
      const res = await fetch(`http://localhost:3000/api/vehiculos/ZZZ999`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.codigo).toBe('VEHICULO_NO_ENCONTRADO');
    });
  });

  describe('7. Cuentas de Telepeaje (GET /api/cuentas-telepeaje)', () => {
    it('GET /api/cuentas-telepeaje permite buscar por placa o tag', async () => {
      const res = await fetch(`http://localhost:3000/api/cuentas-telepeaje?q=QWE321`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].saldo_disponible).toBe(8000);
    });

    it('GET /api/cuentas-telepeaje/por-placa/:placa devuelve cuenta exacta', async () => {
      const res = await fetch(`http://localhost:3000/api/cuentas-telepeaje/por-placa/ZXC987`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.estado_cuenta).toBe('SUSPENDIDA');
      expect(data.saldo_disponible).toBe(0);
    });
  });

  describe('8. Turnos (GET/POST /api/turnos)', () => {
    it('GET /api/turnos filtra por estado y operador', async () => {
      const res = await fetch(`http://localhost:3000/api/turnos?estado=ABIERTO&operador=EMP-002`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].id_turno).toBe(9);
    });

    it('GET /api/turnos/:id/transacciones lista las transacciones del turno', async () => {
      const res = await fetch(`http://localhost:3000/api/turnos/1/transacciones`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(2);
    });

    it('POST /api/turnos/:id/cierre cierra turno y rechaza cierre doble con 409', async () => {
      const res = await fetch(`http://localhost:3000/api/turnos/9/cierre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_declarado_cierre: 10000 }),
      });
      expect(res.status).toBe(200);
      const cerrado = await res.json();
      expect(cerrado.estado).toBe('CERRADO');
      expect(cerrado.diferencia_descuadre).toBe(-500);

      // Cierre repetido -> 409
      const resDoble = await fetch(`http://localhost:3000/api/turnos/9/cierre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_declarado_cierre: 10000 }),
      });
      expect(resDoble.status).toBe(409);
    });
  });

  describe('9. Transacciones (POST /api/transacciones)', () => {
    it('registra cobro en efectivo exitoso y devuelve ticket y cambio', async () => {
      const res = await fetch(`http://localhost:3000/api/transacciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_turno: 8,
          id_tarifa: 1,
          id_categoria: 1,
          placa_detectada: 'HKL123',
          monto_tarifa: 10500,
          metodo_pago: 'EFECTIVO',
          recibido: 20000,
          numero_ticket: 'TCK-TEST-001',
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.transaccion.numero_ticket).toContain('TCK-');
      expect(data.cambio).toBe(9500);
    });

    it('rechaza cobro en efectivo si dinero recibido es insuficiente', async () => {
      const res = await fetch(`http://localhost:3000/api/transacciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_turno: 8,
          id_tarifa: 1,
          id_categoria: 1,
          placa_detectada: 'HKL123',
          monto_tarifa: 10500,
          metodo_pago: 'EFECTIVO',
          recibido: 5000,
          numero_ticket: 'TCK-TEST-002',
        }),
      });
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error.codigo).toBe('EFECTIVO_INSUFICIENTE');
    });

    it('registra cobro en telepeaje debitando saldo y creando detalle', async () => {
      const res = await fetch(`http://localhost:3000/api/transacciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_turno: 10,
          id_tarifa: 1,
          id_categoria: 1,
          placa_detectada: 'HKL123',
          monto_tarifa: 10500,
          metodo_pago: 'TELEPEAJE',
          numero_ticket: 'TCK-TEST-003',
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.saldo_posterior).toBe(139500);
      expect(data.detalle_telepeaje).toBeDefined();
    });

    it('POST /api/transacciones/:id/anulacion genera evento VOID en auditoría', async () => {
      const res = await fetch(`http://localhost:3000/api/transacciones/1/anulacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_sistema: 'supervisor_test',
          motivo: 'Ticket emitido por equivocación',
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.auditoria.tipo_operacion).toBe('VOID');
      expect(data.auditoria.motivo).toBe('Ticket emitido por equivocación');
    });
  });

  describe('10. Auditoría y Recaudo (GET /api/auditoria, GET /api/recaudo)', () => {
    it('GET /api/auditoria retorna registros y filtra por tipo', async () => {
      const res = await fetch(`http://localhost:3000/api/auditoria?tipo=INSERT`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.every((a: { tipo_operacion: string }) => a.tipo_operacion === 'INSERT')).toBe(true);
    });

    it('GET /api/recaudo devuelve totales y desglose por carriles y días', async () => {
      const res = await fetch(`http://localhost:3000/api/recaudo`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total_general).toBeGreaterThan(0);
      expect(Array.isArray(data.dias)).toBe(true);
      expect(Array.isArray(data.carriles)).toBe(true);
    });
  });
});
