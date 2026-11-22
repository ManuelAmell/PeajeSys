import { describe, expect, it } from 'vitest';
import { tokenFalso } from '@/mocks/token';

describe('Servidor simulado MSW (src/mocks/handlers/)', () => {
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

    it('permite acceso a ADM-001 (administrador de la semilla) con cualquier contraseña no vacía', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: 'ADM-001', clave: 'cualquiera' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.usuario.codigo).toBe('ADM-001');
      expect(data.usuario.rol).toBe('ADMINISTRADOR');
      expect(data.usuario.rol_txt).toBe('Administrador');
      expect(data.usuario.destino_txt).toEqual(expect.any(String));
      expect(data.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    it.each([
      ['SUP-001', 'SUPERVISOR', '/supervisor'],
      ['ADM-001', 'ADMINISTRADOR', '/admin'],
    ])(
      'acepta al usuario del equipo %s con su rol real',
      async (codigo, rol, destino) => {
        const res = await fetch(`http://localhost:3000/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo, clave: 'cualquiera' }),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.usuario.rol).toBe(rol);
        expect(data.usuario.destino).toBe(destino);
      },
    );

    it('rechaza empleado inexistente con HTTP 401 CREDENCIALES_INVALIDAS (no revela que la cuenta no existe)', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: 'EMP-999', clave: 'prueba' }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.codigo).toBe('CREDENCIALES_INVALIDAS');
      expect(data.error.mensaje).toBe('Código de empleado o clave incorrectos.');
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
      expect(data.error.mensaje).toBe(
        'El usuario EMP-009 está INACTIVO. Pide a un administrador que lo active.',
      );
    });

    it('permite recaudador sin turno abierto con HTTP 200 sin turno_abierto (EMP-005: pantalla Abrir turno)', async () => {
      const res = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: 'EMP-005', clave: 'prueba' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.usuario.rol).toBe('RECAUDADOR');
      expect(data.usuario.destino).toBe('/operador/abrir-turno');
      expect(data.turno_abierto).toBeUndefined();
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
      expect(data.usuario.rol_txt).toBe('Supervisor');
    });

    it('con ?mock=error devuelve el 500 del contrato aunque las credenciales sean válidas', async () => {
      const res = await fetch(
        `http://localhost:3000/api/auth/login?mock=error`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo: 'EMP-002', clave: 'prueba' }),
        },
      );
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error.codigo).toBe('ERROR_SIMULADO');
      expect(data.error.mensaje).toBe(
        'Error de servidor simulado mediante parámetro ?mock=error.',
      );
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

      const resEst1 = await fetch(
        `http://localhost:3000/api/casetas?estacion=1`,
      );
      const est1 = await resEst1.json();
      expect(est1.length).toBe(4);
    });
  });

  describe('2b. Ocupación de casetas y listado de turnos acotado por rol', () => {
    const pedirTurnos = async (query: string, sub?: string) => {
      const res = await fetch(`http://localhost:3000/api/turnos${query}`, {
        headers: sub ? { Authorization: `Bearer ${tokenFalso(sub)}` } : {},
      });
      return (await res.json()) as { id_turno: number; id_operador: number }[];
    };

    it('GET /api/casetas devuelve ocupada según haya turno ABIERTO', async () => {
      const casetas = (await (await fetch(`http://localhost:3000/api/casetas`)).json()) as {
        id_caseta: number;
        ocupada: boolean;
      }[];
      const ocupadas = casetas.filter((c) => c.ocupada).map((c) => c.id_caseta);
      expect(ocupadas.sort()).toEqual([2, 3]);
      expect(casetas.find((c) => c.id_caseta === 1)!.ocupada).toBe(false);
    });

    it('GET /api/turnos de un recaudador solo devuelve los suyos, aunque pida operador ajeno', async () => {
      // sub 2 = EMP-002 (RECAUDADOR) con el turno 9 abierto; sub 4 = EMP-004 con el turno 10.
      const propios = await pedirTurnos('?estado=ABIERTO', '2');
      expect(propios.map((t) => t.id_turno)).toEqual([9]);
      const ajeno = await pedirTurnos('?operador=EMP-004', '2');
      expect(ajeno.every((t) => t.id_operador === 2)).toBe(true);
      expect(ajeno.some((t) => t.id_turno === 10)).toBe(false);
    });

    it('GET /api/turnos de un supervisor devuelve todos', async () => {
      // sub 3 = EMP-003 (SUPERVISOR).
      const abiertos = await pedirTurnos('?estado=ABIERTO', '3');
      expect(abiertos.map((t) => t.id_turno).sort((a, b) => a - b)).toEqual([9, 10]);
    });
  });

  describe('3. Operadores (GET/POST/PATCH /api/operadores)', () => {
    it('GET /api/operadores filtra por rol y estado', async () => {
      const resRecaudadores = await fetch(
        `http://localhost:3000/api/operadores?rol=RECAUDADOR&estado=ACTIVO`,
      );
      const data = await resRecaudadores.json();
      expect(
        data.every(
          (o: { rol: string; estado: string }) =>
            o.rol === 'RECAUDADOR' && o.estado === 'ACTIVO',
        ),
      ).toBe(true);
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
          password: 'Clave-prueba-1',
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
          password: 'Clave-prueba-1',
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
      const res = await fetch(
        `http://localhost:3000/api/tarifas?estacion=1&vigente=true`,
      );
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
      const resTodas = await fetch(
        `http://localhost:3000/api/tarifas?estacion=1&categoria=1`,
      );
      const tarifasCat1 = await resTodas.json();
      expect(tarifasCat1.length).toBe(2);
      const vieja = tarifasCat1.find(
        (t: { id_tarifa: number }) => t.id_tarifa === 1,
      );
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
      const res = await fetch(
        `http://localhost:3000/api/cuentas-telepeaje?q=QWE321`,
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].saldo_disponible).toBe(8000);
    });

    it('GET /api/cuentas-telepeaje/por-placa/:placa devuelve cuenta exacta', async () => {
      const res = await fetch(
        `http://localhost:3000/api/cuentas-telepeaje/por-placa/ZXC987`,
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.estado_cuenta).toBe('SUSPENDIDA');
      expect(data.saldo_disponible).toBe(0);
    });
  });

  describe('8. Turnos (GET/POST /api/turnos)', () => {
    it('GET /api/turnos filtra por estado y operador', async () => {
      const res = await fetch(
        `http://localhost:3000/api/turnos?estado=ABIERTO&operador=EMP-002`,
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].id_turno).toBe(9);
    });

    it('GET /api/turnos/:id/transacciones lista las transacciones del turno', async () => {
      const res = await fetch(
        `http://localhost:3000/api/turnos/1/transacciones`,
      );
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
      const resDoble = await fetch(
        `http://localhost:3000/api/turnos/9/cierre`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ total_declarado_cierre: 10000 }),
        },
      );
      expect(resDoble.status).toBe(409);
    });
  });

  describe('9. Transacciones (POST /api/transacciones)', () => {
    it('registra cobro en efectivo exitoso y devuelve ticket y cambio', async () => {
      const res = await fetch(`http://localhost:3000/api/transacciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_turno: 9,
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
          id_turno: 9,
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
      const res = await fetch(
        `http://localhost:3000/api/transacciones/11/anulacion`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_sistema: 'supervisor_test',
            motivo: 'Ticket emitido por equivocación',
          }),
        },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.auditoria.tipo_operacion).toBe('VOID');
      expect(data.auditoria.motivo).toBe('Ticket emitido por equivocación');
    });
  });

  describe('10. Auditoría y Recaudo (GET /api/auditoria, GET /api/recaudo)', () => {
    it('GET /api/auditoria retorna registros y filtra por tipo', async () => {
      const res = await fetch(
        `http://localhost:3000/api/auditoria?tipo=INSERT`,
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(
        data.every(
          (a: { tipo_operacion: string }) => a.tipo_operacion === 'INSERT',
        ),
      ).toBe(true);
    });

    it('GET /api/recaudo devuelve totales y desglose por carriles y días', async () => {
      const res = await fetch(`http://localhost:3000/api/recaudo`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total_general).toBeGreaterThan(0);
      expect(Array.isArray(data.dias)).toBe(true);
      expect(Array.isArray(data.carriles)).toBe(true);
    });

    it('GET /api/recaudo filtra por fecha y por estación', async () => {
      const res = await fetch(
        `http://localhost:3000/api/recaudo?fecha=2026-10-01&estacion=1`,
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.dias.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/auditoria busca por texto libre con q', async () => {
      const res = await fetch(`http://localhost:3000/api/auditoria?q=INSERT`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('11. Cobertura de ramas de error y control de estados', () => {
    it('control de simulación ?mock=vacio y ?mock=error', async () => {
      const resVacio = await fetch(
        `http://localhost:3000/api/estaciones?mock=vacio`,
      );
      expect(resVacio.status).toBe(200);
      expect(await resVacio.json()).toEqual([]);

      const resError = await fetch(
        `http://localhost:3000/api/estaciones?mock=error`,
      );
      expect(resError.status).toBe(500);
      const dataError = await resError.json();
      expect(dataError.error.codigo).toBe('ERROR_SIMULADO');

      const resRecaudoVacio = await fetch(
        `http://localhost:3000/api/recaudo?mock=vacio`,
      );
      expect(resRecaudoVacio.status).toBe(200);
    });

    it('operadores valida duplicados y rechaza modificaciones inválidas', async () => {
      // Documento duplicado
      const resDupDoc = await fetch(`http://localhost:3000/api/operadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_documento: '1047123456', // Doc de EMP-001
          nombres: 'Duplicado',
          apellidos: 'Doc',
          codigo_empleado: 'EMP-NEW',
          rol: 'RECAUDADOR',
          password: 'Clave-prueba-1',
          estado: 'ACTIVO',
        }),
      });
      expect(resDupDoc.status).toBe(409);

      // Código duplicado
      const resDupCod = await fetch(`http://localhost:3000/api/operadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_documento: '9988112233',
          nombres: 'Duplicado',
          apellidos: 'Cod',
          codigo_empleado: 'EMP-001',
          rol: 'RECAUDADOR',
          password: 'Clave-prueba-1',
          estado: 'ACTIVO',
        }),
      });
      expect(resDupCod.status).toBe(409);

      // PATCH 404
      const resPatch404 = await fetch(
        `http://localhost:3000/api/operadores/99999`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'INACTIVO' }),
        },
      );
      expect(resPatch404.status).toBe(404);

      // PATCH estado inválido
      const resEstadoInv = await fetch(
        `http://localhost:3000/api/operadores/1`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'INVALIDO' }),
        },
      );
      expect(resEstadoInv.status).toBe(422);

      // PATCH rol inválido
      const resRolInv = await fetch(`http://localhost:3000/api/operadores/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: 'INVALIDO' }),
      });
      expect(resRolInv.status).toBe(422);

      // Filtros GET rol y q
      const resFiltros = await fetch(
        `http://localhost:3000/api/operadores?rol=SUPERVISOR&estado=ACTIVO&q=Juan`,
      );
      expect(resFiltros.status).toBe(200);
    });

    it('turnos cubre ramas de búsqueda y validación de cierre', async () => {
      const resFiltro = await fetch(
        `http://localhost:3000/api/turnos?fecha=2026-03-01&estacion=1&operador=EMP-001`,
      );
      expect(resFiltro.status).toBe(200);

      const resOpInexistente = await fetch(
        `http://localhost:3000/api/turnos?operador=NO_EXISTE`,
      );
      expect(resOpInexistente.status).toBe(200);
      expect(await resOpInexistente.json()).toEqual([]);

      // Cierre con total negativo
      const resCierreNegativo = await fetch(
        `http://localhost:3000/api/turnos/8/cierre`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ total_declarado_cierre: -500 }),
        },
      );
      expect(resCierreNegativo.status).toBe(422);

      // Cierre turno 404
      const resCierre404 = await fetch(
        `http://localhost:3000/api/turnos/99999/cierre`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ total_declarado_cierre: 1000 }),
        },
      );
      expect(resCierre404.status).toBe(404);
    });

    it('transacciones valida errores de telepeaje y efectivo', async () => {
      // Efectivo insuficiente
      const resEfInsuf = await fetch(
        `http://localhost:3000/api/transacciones`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_turno: 9,
            id_tarifa: 1,
            id_categoria: 1,
            placa_detectada: 'XYZ123',
            monto_tarifa: 10500,
            metodo_pago: 'EFECTIVO',
            numero_ticket: 'TK-FAIL-01',
            recibido: 5000,
          }),
        },
      );
      expect(resEfInsuf.status).toBe(422);

      // Telepeaje placa sin cuenta
      const resSinCuenta = await fetch(
        `http://localhost:3000/api/transacciones`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_turno: 9,
            id_tarifa: 1,
            id_categoria: 1,
            placa_detectada: 'NOEXISTE',
            monto_tarifa: 10500,
            metodo_pago: 'TELEPEAJE',
            numero_ticket: 'TK-FAIL-02',
          }),
        },
      );
      expect(resSinCuenta.status).toBe(404);

      // Telepeaje saldo insuficiente (QWE321 tiene 8000, peaje cuesta 15300)
      const resSaldoInsuf = await fetch(
        `http://localhost:3000/api/transacciones`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_turno: 9,
            id_tarifa: 3,
            id_categoria: 3,
            placa_detectada: 'QWE321',
            monto_tarifa: 15300,
            metodo_pago: 'TELEPEAJE',
            numero_ticket: 'TK-FAIL-03',
          }),
        },
      );
      expect(resSaldoInsuf.status).toBe(422);

      // Turno cerrado (turno 1)
      const resTurnoCerrado = await fetch(
        `http://localhost:3000/api/transacciones`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_turno: 1,
            id_tarifa: 1,
            id_categoria: 1,
            placa_detectada: 'HKL123',
            monto_tarifa: 10500,
            metodo_pago: 'EFECTIVO',
            numero_ticket: 'TK-FAIL-04',
            recibido: 20000,
          }),
        },
      );
      expect(resTurnoCerrado.status).toBe(409);

      // Anulación de transacción inexistente
      const resAnular404 = await fetch(
        `http://localhost:3000/api/transacciones/99999/anulacion`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo: 'Motivo prueba' }),
        },
      );
      expect(resAnular404.status).toBe(404);
    });

    it('telepeaje y vehículos cubren filtros y 404', async () => {
      const resVeh404 = await fetch(
        `http://localhost:3000/api/vehiculos/PLACA_INEXISTENTE`,
      );
      expect(resVeh404.status).toBe(404);

      const resCuentaPlaca404 = await fetch(
        `http://localhost:3000/api/cuentas-telepeaje/por-placa/PLACA_INEXISTENTE`,
      );
      expect(resCuentaPlaca404.status).toBe(404);

      const resCuentasFiltro = await fetch(
        `http://localhost:3000/api/cuentas-telepeaje?estado=ACTIVA&q=TAG-COL`,
      );
      expect(resCuentasFiltro.status).toBe(200);

      const resTarifasFiltro = await fetch(
        `http://localhost:3000/api/tarifas?vigente=false`,
      );
      expect(resTarifasFiltro.status).toBe(200);

      const resTarifa404 = await fetch(
        `http://localhost:3000/api/tarifas/99999`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activa: false }),
        },
      );
      expect(resTarifa404.status).toBe(404);
    });
  });
});
