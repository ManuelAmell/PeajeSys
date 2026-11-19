#!/usr/bin/env node
/**
 * Generador reproducible de la semilla de MSW para PeajeSys.
 *
 * Lee la seccion 1 de database/02_DML_Datos_PeajeSys.sql (los INSERT de las 11
 * tablas) y escribe frontend/src/mocks/semilla.ts. Despues aplica, como pasos
 * explicitos, los dos casos DML con COMMIT que cambian datos (CASO 1 y CASO 3).
 *
 * Uso desde la raiz del worktree:
 *   node frontend/scripts/generar-semilla.mjs
 *   node frontend/scripts/generar-semilla.mjs <ruta-de-salida>
 *
 * Sin dependencias: solo Node. El nucleo de generacion es puro y se puede
 * importar desde las pruebas; el acceso a disco ocurre solo en el CLI.
 */

const MARCADOR_SECCION_2 = '-- 2. OPERACIONES DML TRANSACCIONALES';

// El DDL declara estas columnas con DEFAULT NOW(); el DML no trae su valor.
const FECHA_CREADA_ESTACION = '2026-01-01T00:00:00-05:00';
// El CASO 1 inserta la transaccion sin fecha_hora (el DML usa NOW()). La carga
// del DML es del 18/11/2026 y el prototipo del supervisor muestra esa fecha.
const FECHA_CASO_1 = '2026-11-18T12:00:00-05:00';

/**
 * Metadatos de las 11 tablas en orden de dependencias referenciales.
 * Cada columna se declara en el orden del DDL (igual al de los tipos de
 * src/types/ddl.ts). `ausentes` describe las columnas que el INSERT no trae.
 */
const TABLAS = [
  {
    tabla: 'ESTACION_PEAJE',
    clave: 'estaciones',
    columnas: [
      ['id_estacion', 'serial'], ['nombre', 'texto'],
      ['codigo_estacion', 'texto'], ['ubicacion_geografica', 'texto'],
      ['sentido_via', 'texto'], ['estado', 'texto'],
      ['created_at', 'timestamptz'],
    ],
    ausentes: { created_at: { valor: FECHA_CREADA_ESTACION } },
  },
  {
    tabla: 'CASETA',
    clave: 'casetas',
    columnas: [
      ['id_caseta', 'serial'], ['id_estacion', 'numero'],
      ['numero_carril', 'numero'], ['tipo_carril', 'texto'],
      ['estado', 'texto'],
    ],
  },
  {
    tabla: 'OPERADOR',
    clave: 'operadores',
    columnas: [
      ['id_operador', 'serial'], ['numero_documento', 'texto'],
      ['nombres', 'texto'], ['apellidos', 'texto'],
      ['codigo_empleado', 'texto'], ['rol', 'texto'], ['estado', 'texto'],
    ],
  },
  {
    tabla: 'CATEGORIA_VEHICULO',
    clave: 'categorias',
    columnas: [
      ['id_categoria', 'serial'], ['codigo', 'texto'],
      ['descripcion', 'texto'], ['numero_ejes_min', 'numero'],
      ['numero_ejes_max', 'numero'], ['peso_maximo_ton', 'numero'],
      ['activo', 'booleano'],
    ],
  },
  {
    tabla: 'TARIFA',
    clave: 'tarifas',
    columnas: [
      ['id_tarifa', 'serial'], ['id_estacion', 'numero'],
      ['id_categoria', 'numero'], ['monto', 'numero'],
      ['resolucion_legal', 'texto'], ['fecha_inicio_vigencia', 'fecha'],
      ['fecha_fin_vigencia', 'fecha'], ['activa', 'booleano'],
    ],
    ausentes: { fecha_fin_vigencia: { valor: null } },
  },
  {
    tabla: 'VEHICULO',
    clave: 'vehiculos',
    columnas: [
      ['placa', 'texto'], ['id_categoria', 'numero'],
      ['marca', 'texto'], ['modelo', 'texto'], ['color', 'texto'],
    ],
  },
  {
    tabla: 'CUENTA_TELEPEAJE',
    clave: 'cuentas_telepeaje',
    columnas: [
      ['id_cuenta', 'serial'], ['placa_vehiculo', 'texto'],
      ['tag_rfid_serial', 'texto'], ['saldo_disponible', 'numero'],
      ['estado_cuenta', 'texto'],
    ],
  },
  {
    tabla: 'TURNO',
    clave: 'turnos',
    columnas: [
      ['id_turno', 'serial'], ['id_caseta', 'numero'],
      ['id_operador', 'numero'], ['fecha', 'fecha'],
      ['diurno', 'booleano'], ['fondo_inicial_caja', 'numero'],
      ['total_recaudado_efectivo', 'numero'],
      ['total_declarado_cierre', 'numero'],
      ['diferencia_descuadre', 'numero'], ['estado', 'texto'],
    ],
  },
  {
    tabla: 'TRANSACCION_PEAJE',
    clave: 'transacciones',
    columnas: [
      ['id_transaccion', 'serial'], ['id_turno', 'numero'],
      ['id_tarifa', 'numero'], ['id_categoria', 'numero'],
      ['placa_detectada', 'texto'], ['monto_tarifa', 'numero'],
      ['metodo_pago', 'texto'], ['numero_ticket', 'texto'],
      ['fecha_hora', 'timestamptz'], ['estado_paso', 'texto'],
    ],
  },
  {
    tabla: 'DETALLE_PAGO_TELEPEAJE',
    clave: 'detalles_telepeaje',
    columnas: [
      ['id_detalle_telepeaje', 'serial'], ['id_transaccion', 'numero'],
      ['id_cuenta', 'numero'], ['saldo_anterior', 'numero'],
      ['saldo_posterior', 'numero'], ['antena_lectora_id', 'texto'],
    ],
  },
  {
    tabla: 'AUDITORIA_TRANSACCION',
    clave: 'auditorias',
    columnas: [
      ['id_auditoria', 'serial'], ['id_transaccion', 'numero'],
      ['tipo_operacion', 'texto'], ['usuario_sistema', 'texto'],
      ['fecha_hora_evento', 'timestamptz'], ['motivo', 'texto'],
    ],
    ausentes: { fecha_hora_evento: { derivarDeTransaccion: true } },
  },
];

const LLAVES_FORANEAS = [
  ['casetas', 'id_estacion', 'estaciones', 'id_estacion'],
  ['tarifas', 'id_estacion', 'estaciones', 'id_estacion'],
  ['tarifas', 'id_categoria', 'categorias', 'id_categoria'],
  ['vehiculos', 'id_categoria', 'categorias', 'id_categoria'],
  ['cuentas_telepeaje', 'placa_vehiculo', 'vehiculos', 'placa'],
  ['turnos', 'id_caseta', 'casetas', 'id_caseta'],
  ['turnos', 'id_operador', 'operadores', 'id_operador'],
  ['transacciones', 'id_turno', 'turnos', 'id_turno'],
  ['transacciones', 'id_tarifa', 'tarifas', 'id_tarifa'],
  ['transacciones', 'id_categoria', 'categorias', 'id_categoria'],
  ['detalles_telepeaje', 'id_transaccion', 'transacciones', 'id_transaccion'],
  ['detalles_telepeaje', 'id_cuenta', 'cuentas_telepeaje', 'id_cuenta'],
  ['auditorias', 'id_transaccion', 'transacciones', 'id_transaccion'],
];

function recortarSeccion1(textoDml) {
  const indice = textoDml.indexOf(MARCADOR_SECCION_2);
  if (indice < 0) {
    throw new Error(
      `No se encontro el marcador "${MARCADOR_SECCION_2}" en el DML.`,
    );
  }
  return textoDml.slice(0, indice);
}

/** Devuelve las tuplas de un bloque VALUES ya separadas en campos crudos. */
function analizarValores(textoValores) {
  const filas = [];
  let campos = null;
  let campo = '';
  let profundidad = 0;
  let enCadena = false;

  const cerrarCampo = () => {
    campos.push(campo.trim());
    campo = '';
  };

  for (let i = 0; i < textoValores.length; i += 1) {
    const caracter = textoValores[i];

    if (enCadena) {
      if (caracter === "'") {
        if (textoValores[i + 1] === "'") {
          campo += "''";
          i += 1;
        } else {
          enCadena = false;
          campo += caracter;
        }
      } else {
        campo += caracter;
      }
      continue;
    }

    if (caracter === "'") {
      if (campos === null) {
        throw new Error('Se encontro una comilla fuera de una tupla de VALUES.');
      }
      enCadena = true;
      campo += caracter;
      continue;
    }

    if (caracter === '(') {
      if (profundidad === 0) {
        campos = [];
        campo = '';
      } else {
        campo += caracter;
      }
      profundidad += 1;
      continue;
    }

    if (caracter === ')') {
      profundidad -= 1;
      if (profundidad === 0) {
        cerrarCampo();
        filas.push(campos);
        campos = null;
      } else {
        campo += caracter;
      }
      continue;
    }

    if (campos !== null) {
      if (caracter === ',') {
        cerrarCampo();
      } else {
        campo += caracter;
      }
    }
  }

  if (enCadena) {
    throw new Error('El DML tiene una cadena sin cerrar en VALUES.');
  }
  if (profundidad !== 0) {
    throw new Error('El DML tiene parentesis sin cerrar en VALUES.');
  }
  return filas;
}

function convertir(bruto, tabla, campo) {
  const valor = bruto.trim();
  if (valor === 'NULL') {
    return null;
  }
  if (valor === 'TRUE') {
    return true;
  }
  if (valor === 'FALSE') {
    return false;
  }
  if (valor.startsWith("'") && valor.endsWith("'")) {
    return valor.slice(1, -1).replace(/''/g, "'");
  }
  if (/^-?\d+(?:\.\d+)?$/.test(valor)) {
    return Number(valor);
  }
  throw new Error(`${tabla}.${campo}: valor no reconocido (${valor}).`);
}

function aIso(valor, tabla, campo) {
  const coincidencia =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})([+-]\d{2})(?::?(\d{2}))?$/.exec(
      valor,
    );
  if (!coincidencia) {
    throw new Error(`${tabla}.${campo}: fecha y hora no reconocida (${valor}).`);
  }
  const [, fecha, hora, zona, minutos] = coincidencia;
  return `${fecha}T${hora}${zona}:${minutos ?? '00'}`;
}

function normalizarValor(valor, tipo, tabla, campo) {
  if (valor === null) {
    return null;
  }
  const invalido = () => {
    throw new Error(
      `${tabla}.${campo}: valor incompatible con el tipo ${tipo} (${String(valor)}).`,
    );
  };

  if (tipo === 'texto') return typeof valor === 'string' ? valor : invalido();
  if (tipo === 'numero') return typeof valor === 'number' ? valor : invalido();
  if (tipo === 'serial') return Number.isInteger(valor) && valor > 0 ? valor : invalido();
  if (tipo === 'booleano') return typeof valor === 'boolean' ? valor : invalido();
  if (tipo === 'fecha') return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : invalido();
  if (tipo === 'timestamptz') return typeof valor === 'string' ? aIso(valor, tabla, campo) : invalido();
  throw new Error(`${tabla}.${campo}: tipo desconocido (${tipo}).`);
}

function valorTipado(meta, campo, bruto) {
  const columna = meta.columnas.find(([nombre]) => nombre === campo);
  if (!columna) {
    throw new Error(`${meta.tabla}: columna desconocida (${campo}).`);
  }
  return normalizarValor(convertir(bruto, meta.tabla, campo), columna[1], meta.tabla, campo);
}

function extraerInserts(texto) {
  const patron =
    /INSERT\s+INTO\s+([A-Z_]+)\s*\(([\s\S]*?)\)\s*VALUES\s*([\s\S]*?);/g;
  const inserts = new Map();

  for (const coincidencia of texto.matchAll(patron)) {
    const tabla = coincidencia[1];
    const columnas = coincidencia[2]
      .split(',')
      .map((columna) => columna.trim())
      .filter((columna) => columna.length > 0);
    const filas = analizarValores(coincidencia[3]);

    if (inserts.has(tabla)) {
      throw new Error(`El DML trae mas de un INSERT para ${tabla}.`);
    }
    inserts.set(tabla, { tabla, columnas, filas });
  }

  return inserts;
}

function construirFilas(meta, insert) {
  const columnasValidas = new Set(meta.columnas.map(([campo]) => campo));
  for (const columna of insert.columnas) {
    if (!columnasValidas.has(columna)) {
      throw new Error(`${meta.tabla}: el INSERT trae una columna desconocida (${columna}).`);
    }
  }

  return insert.filas.map((campos, indice) => {
    if (campos.length !== insert.columnas.length) {
      throw new Error(
        `${meta.tabla}: la fila ${indice + 1} tiene ${campos.length} valores para ${insert.columnas.length} columnas.`,
      );
    }
    const crudos = new Map(
      insert.columnas.map((columna, posicion) => [columna, campos[posicion]]),
    );
    const fila = {};

    for (const [campo, tipo] of meta.columnas) {
      if (crudos.has(campo)) {
        fila[campo] = valorTipado(meta, campo, crudos.get(campo));
        continue;
      }
      if (tipo === 'serial') {
        // Las columnas SERIAL/BIGSERIAL se numeran 1, 2, 3... en orden de insercion.
        fila[campo] = indice + 1;
        continue;
      }
      const ausente = meta.ausentes && meta.ausentes[campo];
      if (!ausente) {
        throw new Error(
          `${meta.tabla}: falta la columna ${campo} en el INSERT y no hay valor declarado.`,
        );
      }
      fila[campo] = ausente.derivarDeTransaccion ? null : ausente.valor;
    }

    return fila;
  });
}

function extraerBloqueCaso(textoDml, numero) {
  const marca = `-- CASO ${numero}:`;
  const inicio = textoDml.indexOf(marca);
  if (inicio < 0) {
    throw new Error(`No se encontro "${marca}" en el DML.`);
  }
  const fin = textoDml.indexOf('COMMIT;', inicio);
  if (fin < 0) {
    throw new Error(`No se encontro el COMMIT del CASO ${numero} en el DML.`);
  }
  return textoDml.slice(inicio, fin);
}

function siguienteId(filas, campo) {
  return filas.reduce((maximo, fila) => Math.max(maximo, fila[campo]), 0) + 1;
}

function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

function metaTabla(nombre) {
  const meta = TABLAS.find((fila) => fila.tabla === nombre);
  if (!meta) {
    throw new Error(`No hay metadatos para la tabla ${nombre}.`);
  }
  return meta;
}

/**
 * Construye una fila a partir de un INSERT concreto. Las columnas indicadas en
 * `sobrescrituras` no se leen del INSERT (ids de secuencia, DEFAULT NOW(), etc.).
 */
function construirFilaDesdeInsert(meta, insert, indice, sobrescrituras = {}) {
  const valores = insert.filas[indice];
  if (!valores) {
    throw new Error(`${meta.tabla}: el INSERT no trae la fila ${indice + 1}.`);
  }
  const fila = {};

  for (const [campo, tipo] of meta.columnas) {
    if (Object.prototype.hasOwnProperty.call(sobrescrituras, campo)) {
      fila[campo] = sobrescrituras[campo];
      continue;
    }
    const posicion = insert.columnas.indexOf(campo);
    if (posicion < 0) {
      throw new Error(`${meta.tabla}: el INSERT no trae la columna ${campo}.`);
    }
    fila[campo] = normalizarValor(
      convertir(valores[posicion], meta.tabla, campo),
      tipo,
      meta.tabla,
      campo,
    );
  }

  return fila;
}

/**
 * CASO 1 del DML (INSERT + UPDATE + INSERT de auditoria con COMMIT):
 * cobro manual en efectivo sobre el turno 8. Se leen del propio DML la
 * transaccion, el incremento del turno y la auditoria; solo la fecha de la
 * transaccion es un dato de prueba porque el DML usa NOW().
 */
function aplicarCaso1(semilla, bloqueCaso1) {
  const inserts = extraerInserts(bloqueCaso1);
  const insertTransaccion = inserts.get('TRANSACCION_PEAJE');
  const insertAuditoria = inserts.get('AUDITORIA_TRANSACCION');

  if (!insertTransaccion || insertTransaccion.filas.length !== 1) {
    throw new Error('El CASO 1 debe traer exactamente un INSERT de TRANSACCION_PEAJE.');
  }
  if (!insertAuditoria || insertAuditoria.filas.length !== 1) {
    throw new Error('El CASO 1 debe traer exactamente un INSERT de AUDITORIA_TRANSACCION.');
  }

  const actualizacion =
    /UPDATE\s+TURNO\s+SET\s+total_recaudado_efectivo\s*=\s*total_recaudado_efectivo\s*\+\s*([\d.]+)\s+WHERE\s+id_turno\s*=\s*(\d+)/i.exec(
      bloqueCaso1,
    );
  if (!actualizacion) {
    throw new Error('El CASO 1 debe traer el UPDATE de TURNO.total_recaudado_efectivo.');
  }

  const incremento = Number(actualizacion[1]);
  const idTurno = Number(actualizacion[2]);
  const turno = semilla.turnos.find((fila) => fila.id_turno === idTurno);
  if (!turno) {
    throw new Error(`El CASO 1 apunta al turno ${idTurno}, que no existe en la semilla.`);
  }

  const nuevaTransaccion = construirFilaDesdeInsert(
    metaTabla('TRANSACCION_PEAJE'),
    insertTransaccion,
    0,
    {
      id_transaccion: siguienteId(semilla.transacciones, 'id_transaccion'),
      fecha_hora: FECHA_CASO_1,
    },
  );
  semilla.transacciones.push(nuevaTransaccion);
  turno.total_recaudado_efectivo = redondear(
    turno.total_recaudado_efectivo + incremento,
  );

  // El DML usa currval(...) para id_transaccion y DEFAULT NOW() para la fecha
  // del evento: se resuelven con la transaccion recien insertada.
  semilla.auditorias.push(
    construirFilaDesdeInsert(
      metaTabla('AUDITORIA_TRANSACCION'),
      insertAuditoria,
      0,
      {
        id_auditoria: siguienteId(semilla.auditorias, 'id_auditoria'),
        id_transaccion: nuevaTransaccion.id_transaccion,
        fecha_hora_evento: nuevaTransaccion.fecha_hora,
      },
    ),
  );

  return nuevaTransaccion;
}

/**
 * CASO 3 del DML (UPDATE con COMMIT): cierre formal del turno 8. El descuadre
 * se calcula igual que la sentencia: valor base menos el recaudado del turno.
 */
function aplicarCaso3(semilla, bloqueCaso3) {
  const cierre =
    /UPDATE\s+TURNO\s+SET\s+total_declarado_cierre\s*=\s*([\d.]+),\s*diferencia_descuadre\s*=\s*([\d.]+)\s*-\s*total_recaudado_efectivo,\s*estado\s*=\s*'([A-Z]+)'\s+WHERE\s+id_turno\s*=\s*(\d+)\s+AND\s+estado\s*=\s*'([A-Z]+)'/i.exec(
      bloqueCaso3,
    );
  if (!cierre) {
    throw new Error('El CASO 3 debe traer el UPDATE de cierre de TURNO.');
  }

  const declarado = Number(cierre[1]);
  const baseDiferencia = Number(cierre[2]);
  const estadoNuevo = cierre[3];
  const idTurno = Number(cierre[4]);
  const estadoCondicion = cierre[5];
  const turno = semilla.turnos.find((fila) => fila.id_turno === idTurno);

  if (!turno) {
    throw new Error(`El CASO 3 apunta al turno ${idTurno}, que no existe en la semilla.`);
  }
  if (turno.estado !== estadoCondicion) {
    throw new Error(
      `El CASO 3 exige el turno ${idTurno} en estado ${estadoCondicion} y esta en ${turno.estado}.`,
    );
  }

  turno.total_declarado_cierre = declarado;
  turno.diferencia_descuadre = redondear(
    baseDiferencia - turno.total_recaudado_efectivo,
  );
  turno.estado = estadoNuevo;
}

function verificarLlavesForaneas(semilla) {
  for (const [clave, campo, claveDestino, campoDestino] of LLAVES_FORANEAS) {
    const destinos = new Set(
      semilla[claveDestino].map((fila) => fila[campoDestino]),
    );
    for (const fila of semilla[clave]) {
      if (!destinos.has(fila[campo])) {
        throw new Error(
          `Llave foranea rota: ${clave}.${campo} = ${fila[campo]} no existe en ${claveDestino}.${campoDestino}.`,
        );
      }
    }
  }
}

function calcularInconsistencias(semilla) {
  const lineas = [];
  const descuadres = [];

  for (const turno of semilla.turnos) {
    const efectivo = semilla.transacciones
      .filter(
        (fila) =>
          fila.id_turno === turno.id_turno && fila.metodo_pago === 'EFECTIVO',
      )
      .reduce((total, fila) => total + fila.monto_tarifa, 0);
    if (efectivo !== turno.total_recaudado_efectivo) {
      descuadres.push(
        `turno ${turno.id_turno} (${turno.total_recaudado_efectivo} frente a ${efectivo} en efectivo)`,
      );
    }
  }

  if (descuadres.length > 0) {
    lineas.push(
      `- Turnos con total_recaudado_efectivo distinto de la suma de sus transacciones en efectivo: ${descuadres.join('; ')}.`,
    );
  }

  for (const cuenta of semilla.cuentas_telepeaje) {
    const detalles = semilla.detalles_telepeaje.filter(
      (fila) => fila.id_cuenta === cuenta.id_cuenta,
    );
    if (detalles.length === 0) continue;
    const ultimo = detalles.reduce((anterior, fila) =>
      fila.id_detalle_telepeaje > anterior.id_detalle_telepeaje ? fila : anterior,
    );
    if (ultimo.saldo_posterior !== cuenta.saldo_disponible) {
      lineas.push(
        `- Cuenta de telepeaje ${cuenta.id_cuenta} (${cuenta.placa_vehiculo}): saldo_disponible ${cuenta.saldo_disponible}, pero el ultimo detalle (transaccion ${ultimo.id_transaccion}) deja saldo_posterior ${ultimo.saldo_posterior}.`,
      );
    }
  }

  for (const estacion of semilla.estaciones) {
    const tarifas = semilla.tarifas.filter(
      (fila) => fila.id_estacion === estacion.id_estacion,
    );
    if (tarifas.length < semilla.categorias.length) {
      const codigos = tarifas
        .map(
          (fila) =>
            semilla.categorias.find(
              (categoria) => categoria.id_categoria === fila.id_categoria,
            )?.codigo ?? String(fila.id_categoria),
        )
        .join(', ');
      lineas.push(
        `- Estación ${estacion.id_estacion} (${estacion.nombre}): solo tiene ${tarifas.length} tarifas para ${semilla.categorias.length} categorías (${codigos}).`,
      );
    }
  }

  if (!semilla.operadores.some((fila) => fila.rol === 'ADMIN')) {
    lineas.push(
      '- No existe rol administrador en OPERADOR: ADMIN-01 solo existe en el frontend (dato de prueba).',
    );
  }

  return lineas;
}

function serializarValor(valor) {
  if (valor === null) {
    return 'null';
  }
  if (typeof valor === 'string') {
    return `'${valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  if (typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor);
  }
  throw new Error(`No se puede serializar el valor ${String(valor)}.`);
}

function comentarioDeCampo(meta, fila, campo, contexto) {
  if (meta.tabla === 'ESTACION_PEAJE' && campo === 'created_at') {
    return 'dato de prueba (DEFAULT NOW() en el DDL)';
  }
  if (
    meta.tabla === 'AUDITORIA_TRANSACCION' &&
    campo === 'fecha_hora_evento'
  ) {
    return 'dato de prueba (DEFAULT NOW(); se usa la fecha_hora de la transacción)';
  }
  if (
    meta.tabla === 'TRANSACCION_PEAJE' &&
    campo === 'fecha_hora' &&
    fila.id_transaccion === contexto.idTransaccionCaso1
  ) {
    return 'dato de prueba (el DML usa NOW())';
  }
  return null;
}

const PRIMERA_LINEA =
  '// GENERADO por scripts/generar-semilla.mjs desde database/02_DML_Datos_PeajeSys.sql. No editar a mano.';

function serializarSemilla(semilla, contexto) {
  const inconsistencias = calcularInconsistencias(semilla);
  const lineas = [
    PRIMERA_LINEA,
    '//',
    '// Regenerar con: node frontend/scripts/generar-semilla.mjs',
    '//',
    '// Inconsistencias del DML que se conservan a proposito (el panel del supervisor existe para mostrarlas):',
    ...inconsistencias.map((linea) => `// ${linea}`),
    '',
    "import type { Semilla } from './semilla.tipos';",
    '',
    'export const SEMILLA: Semilla = {',
  ];

  for (const meta of TABLAS) {
    lineas.push(`  ${meta.clave}: [`);
    for (const fila of semilla[meta.clave]) {
      lineas.push('    {');
      for (const [campo] of meta.columnas) {
        const comentario = comentarioDeCampo(meta, fila, campo, contexto);
        lineas.push(
          `      ${campo}: ${serializarValor(fila[campo])},${comentario ? ` // ${comentario}` : ''}`,
        );
      }
      lineas.push('    },');
    }
    lineas.push('  ],');
  }

  lineas.push('};', '');
  return lineas.join('\n');
}

export function construirSemilla(textoDml) {
  const inserts = extraerInserts(recortarSeccion1(textoDml));
  const semilla = {
    estaciones: [],
    casetas: [],
    operadores: [],
    categorias: [],
    tarifas: [],
    vehiculos: [],
    cuentas_telepeaje: [],
    turnos: [],
    transacciones: [],
    detalles_telepeaje: [],
    auditorias: [],
  };

  for (const meta of TABLAS) {
    const insert = inserts.get(meta.tabla);
    if (!insert) {
      throw new Error(`No se encontro el INSERT de ${meta.tabla} en la seccion 1 del DML.`);
    }
    semilla[meta.clave] = construirFilas(meta, insert);
  }

  const tablasDesconocidas = [...inserts.keys()].filter(
    (tabla) => !TABLAS.some((meta) => meta.tabla === tabla),
  );
  if (tablasDesconocidas.length > 0) {
    throw new Error(
      `La seccion 1 del DML trae tablas sin metadatos: ${tablasDesconocidas.join(', ')}.`,
    );
  }

  // AUDITORIA_TRANSACCION.fecha_hora_evento tiene DEFAULT NOW() en el DDL y el
  // DML no la trae: se usa la fecha_hora de la transaccion auditada.
  for (const auditoria of semilla.auditorias) {
    const transaccion = semilla.transacciones.find(
      (fila) => fila.id_transaccion === auditoria.id_transaccion,
    );
    if (!transaccion) {
      throw new Error(
        `La auditoria ${auditoria.id_auditoria} apunta a la transaccion ${auditoria.id_transaccion}, que no existe.`,
      );
    }
    auditoria.fecha_hora_evento = transaccion.fecha_hora;
  }

  verificarLlavesForaneas(semilla);

  const transaccionCaso1 = aplicarCaso1(
    semilla,
    extraerBloqueCaso(textoDml, 1),
  );
  aplicarCaso3(semilla, extraerBloqueCaso(textoDml, 3));

  // Los CASOS 2, 4A y 4B no dejan cambios (ROLLBACK o insercion y borrado),
  // asi que no se aplican.

  verificarLlavesForaneas(semilla);

  return {
    semilla,
    idTransaccionCaso1: transaccionCaso1.id_transaccion,
  };
}

export function generarContenido(textoDml) {
  const { semilla, idTransaccionCaso1 } = construirSemilla(textoDml);
  return serializarSemilla(semilla, { idTransaccionCaso1 });
}

async function main() {
  const { existsSync, readFileSync, writeFileSync } = await import('node:fs');
  const { dirname, resolve } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const directorioScript = dirname(fileURLToPath(import.meta.url));
  const raizFrontend = resolve(directorioScript, '..');
  const rutaDmlDirecta = resolve(raizFrontend, '..', 'database', '02_SQL', '02_DML_Datos_PeajeSys.sql');
  const rutaDmlLegacy = resolve(raizFrontend, '..', 'database', '02_DML_Datos_PeajeSys.sql');
  const rutaDml = existsSync(rutaDmlDirecta) ? rutaDmlDirecta : rutaDmlLegacy;
  const rutaSalida = process.argv[2]
    ? resolve(process.argv[2])
    : resolve(raizFrontend, 'src', 'mocks', 'semilla.ts');

  const textoDml = readFileSync(rutaDml, 'utf8');
  const { semilla } = construirSemilla(textoDml);
  writeFileSync(rutaSalida, generarContenido(textoDml), 'utf8');

  const resumen = TABLAS.map((meta) => [meta.tabla, semilla[meta.clave].length]);
  console.log(`DML   : ${rutaDml}`);
  console.log(`Salida: ${rutaSalida}`);
  for (const [tabla, filas] of resumen) {
    console.log(`${tabla.padEnd(26)} ${filas}`);
  }
  console.log(
    `${'TOTAL'.padEnd(26)} ${resumen.reduce((total, [, filas]) => total + filas, 0)}`,
  );
}

const esEjecucionDirecta =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  typeof process.argv[1] === 'string' &&
  process.argv[1].endsWith('generar-semilla.mjs');

if (esEjecucionDirecta) {
  main().catch((error) => {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error(`Error al generar la semilla: ${mensaje}`);
    process.exitCode = 1;
  });
}
