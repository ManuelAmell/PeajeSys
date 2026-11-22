# Pruebas manuales del equipo

Guía para que cada integrante pruebe PeajeSys **a mano**, con la base de datos real, antes de la sustentación. Las pruebas automáticas (CI: 449 de backend, 465 de Vitest y 70 E2E) ya están en verde. Esta guía busca lo que una máquina no detecta: flujos confusos, textos raros, pantallas que se ven mal y errores con datos reales.

## 0. Preparación (todos, una sola vez)

1. Clona el repo o actualízalo, en la rama `develop`:
   ```bash
   git clone https://github.com/ManuelAmell/PeajeSys.git
   cd PeajeSys
   git checkout develop
   git pull
   ```
2. Sigue el **"Inicio rápido"** del [README](../README.md):
   ```bash
   pnpm install
   pnpm db
   docker compose ps       # espera a que el servicio db diga "healthy"
   pnpm dev
   ```
3. Abre `http://localhost:5180`.
4. Para empezar desde cero en cualquier momento: `pnpm db:reset`. **Hazlo antes de cada bloque de pruebas.**

> Si algo de la preparación falla, eso ya es un hallazgo: repórtalo (ver la sección 6).

**Usuarios** (los datos completos están en el README, sección "Usuarios de prueba"):

| Usuario | Contraseña | Rol | Panel |
|---|---|---|---|
| `ADM-001` | `Manuel2026*` | Administrador | `/admin` |
| `SUP-001` | `Samuel2026*` | Supervisor | `/supervisor` |
| `REC-001` | `Alex2026*` | Recaudador | `/operador` |
| `REC-002` | `Camilo2026*` | Recaudador | `/operador` |

**Datos de prueba útiles** (vienen en la semilla):

| Placa | Para qué sirve |
|---|---|
| `KJN456`, `HKL123` | Telepeaje con saldo suficiente |
| `QWE321` | Telepeaje con saldo bajo (8.000): debe dar **saldo insuficiente** |
| `UYT890`, `ZXC987` | Cuenta **SUSPENDIDA**: debe rechazar el paso |
| `ZZZ999` | Placa no registrada: hay que elegir la categoría a mano |

## 1. Recaudador: terminal de cobro (Alex con `REC-001` y Camilo con `REC-002`)

| # | Pasos | Resultado esperado | ✔/✘ |
|---|---|---|---|
| R1 | Inicia sesión **sin tener turno abierto** | Te lleva a **"Abrir turno"**, con la primera caseta libre ya seleccionada | |
| R2 | Abre un turno: elige caseta, fondo de $50.000 y Diurno | Pasas a la terminal de cobro, con la caseta y el fondo correctos | |
| R3 | Intenta abrir turno en una caseta que ya tiene otro compañero | Aviso **"caseta ocupada"**; no se abre | |
| R4 | Cobro en **efectivo** (F1): placa `ZZZ999`, categoría I y paga con $20.000 | Ticket emitido, el **cambio** es correcto y el total de caja sube una vez | |
| R5 | Cobro en efectivo pagando **menos** de la tarifa | Error de efectivo insuficiente; no se registra | |
| R6 | Cobro con **telepeaje** (F2) a `KJN456` | Aprobado; el saldo baja exactamente el valor de la tarifa | |
| R7 | Telepeaje a `QWE321` | Rechazado por **saldo insuficiente** | |
| R8 | Telepeaje a `UYT890` | Rechazado: **cuenta suspendida** | |
| R9 | Paso **exento** (F3) | Registrado con $0; el efectivo de la caja **no** cambia | |
| R10 | Abre **"Transacciones del turno"** y **anula** un cobro en efectivo con un motivo | La fila queda **"Anulada"** (tachada), el total de caja baja y "Últimos pasos" la marca como anulada | |
| R11 | Intenta anular la misma transacción otra vez | No hay botón, o aparece el aviso "ya anulada" | |
| R12 | Anula un cobro de telepeaje | El saldo de la cuenta vuelve a su valor anterior | |
| R13 | Recarga la página (F5) en medio del turno | Sigues en tu terminal con tu turno, sin volver a iniciar sesión | |
| R14 | **Cierra el turno** declarando el efectivo exacto | Cierre con descuadre $0 | |
| R15 | Abre otro turno y ciérralo declarando $1.000 de menos | Cierre con **faltante** de $1.000 | |
| R16 | Prueba la pantalla en el **móvil** o con la ventana estrecha (~390 px) | Nada se corta ni se sale de la pantalla | |

## 2. Supervisor (Samuel con `SUP-001`)

Haz esto **después** de que un recaudador haya cobrado y anulado algo, para que haya datos.

| # | Pasos | Resultado esperado | ✔/✘ |
|---|---|---|---|
| S1 | Sección 1, **Arqueo y conciliación**: revisa los turnos del día | Aparecen los turnos de los recaudadores con su estado (abierto, cerrado, cuadrado, faltante o sobrante) | |
| S2 | En un turno abierto, pulsa "Ver transacciones" y anula una | Funciona igual que para el recaudador; en los turnos cerrados no hay opción de anular | |
| S3 | Sección 2, **Recaudo diario**: consulta hoy | Los totales **no** incluyen las anuladas; el desglose por carril aparece lleno | |
| S4 | Recaudo de un día de la semilla (por ejemplo `2026-10-06`) | Muestra datos de ese día | |
| S5 | Sección 3, **Auditoría**: usa el filtro rápido "VOID" | Aparecen las anulaciones, cada una con el usuario que la hizo y su motivo | |
| S6 | En la auditoría, busca el paso exento de R9 | Aparece un registro INSERT. Nota: el usuario sale como `postgres`; es una limitación conocida | |
| S7 | Sección 4, **Cuentas de telepeaje**: filtra por estado y por placa | Los filtros funcionan; un filtro sin resultados muestra la lista vacía | |
| S8 | **Recarga** $25.000 a una cuenta | El saldo sube exactamente esa cantidad | |
| S9 | Intenta entrar a `/admin` escribiendo la URL | No te deja: no tienes permiso | |

## 3. Administrador (Manuel con `ADM-001`)

| # | Pasos | Resultado esperado | ✔/✘ |
|---|---|---|---|
| A1 | **Tarifas**: edita el monto de una tarifa | Se guarda y aparece en el historial | |
| A2 | Reedita la misma tarifa con el mismo monto | Aviso "Sin cambios"; no se duplica el historial | |
| A3 | **Categorías**: crea una categoría nueva | Aparece con un icono de marcador, sin imagen rota | |
| A4 | **Personal**: "Nuevo operador" (recaudador), con contraseña y confirmación | Se crea y aparece en la lista | |
| A5 | Cierra sesión y entra con el operador nuevo | Entra y lo lleva a "Abrir turno" | |
| A6 | Vuelve como admin y pulsa "Cambiar contraseña" sobre ese operador | La contraseña anterior deja de funcionar y la nueva sí | |
| A7 | Crea un operador con un **código ya existente** | Aviso de duplicado; no se crea | |
| A8 | **Desactiva** al operador nuevo **mientras** tiene la sesión abierta en otra ventana | En su siguiente acción lo saca al login con el aviso de sesión expirada | |
| A9 | Cambia el rol de un supervisor a recaudador con su sesión abierta | Pierde el acceso al panel del supervisor de inmediato | |
| A10 | **Estaciones y casetas**: pon una caseta en MANTENIMIENTO e intenta abrir un turno en ella como recaudador | No deja abrir el turno | |

## 4. Seguridad y casos raros (todos)

| # | Pasos | Resultado esperado | ✔/✘ |
|---|---|---|---|
| X1 | Login con un código que no existe | "Código de empleado o clave incorrectos" (el mismo mensaje que con una clave mala) | |
| X2 | Login con un usuario existente y clave mala | El mismo mensaje que en X1 | |
| X3 | Login con `EMP-001` / `Turno123*` (usuario antiguo) | No entra | |
| X4 | Como recaudador, escribe a mano `/supervisor` o `/admin` en la URL | No te deja entrar | |
| X5 | Dos compañeros abren turno **a la vez** en la misma caseta | Solo uno lo consigue | |
| X6 | Deja la app abierta y apaga la API (Ctrl+C en `pnpm dev`) | Mensaje claro de error de conexión, sin pantalla en blanco | |
| X7 | Modo sin backend: `pnpm dev:mocks` | La app funciona con datos simulados y cualquier contraseña no vacía | |

## 5. Quién prueba qué

| Integrante | Bloques | Además |
|---|---|---|
| **Alex** | 1 (con `REC-001`) y 4 | Si usa Windows: la [checklist de Windows](verificacion-windows.md) |
| **Camilo** | 1 (con `REC-002`), 4 y R16 (móvil) | Revisar textos, ortografía y que todo se vea bien en tema claro y oscuro |
| **Samuel** | 2 y 4 | Comprobar que los totales del supervisor cuadran con lo cobrado en el bloque 1 |
| **Manuel** | 3 y 4 | Coordinar la prueba X5 (dos personas a la vez) y revisar los reportes |

Lo ideal es hacer los bloques 1 y 2 **juntos y a la misma hora**: los recaudadores cobran y el supervisor revisa en vivo.

## 6. Cómo reportar un fallo

Abre un **issue** en GitHub con la plantilla **"Prueba manual"** (botón *New issue*). Incluye:
- el número de la prueba (por ejemplo `R7`);
- qué esperabas y qué pasó;
- una **captura** de la pantalla;
- tu sistema (Windows, Linux o Mac) y tu navegador;
- si la consola del navegador (F12) muestra un error, cópialo.

Cuando termines tu bloque, marca tus casillas en [`pendientes.md`](../pendientes.md) mediante una PR, o avisa a Manuel.
