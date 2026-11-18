# Prompts de imágenes para Gemini — PeajeSys

Creado el 2026-11-18. Paleta vial: amarillo de señal preventiva `#FFC20E`, naranja de obra `#F07D00` y negro asfalto `#1A1A1A`.

Guarda lo que genere Gemini en `docs/diseno/imagenes-gemini/` con el nombre que indica cada prompt. Los fondos blancos se quitan después con `rembg`.

## 1. Logo (`logo-horizontal.png` y `logo-isotipo.png`)

```text
Diseña el logotipo de "PeajeSys", un software de control y recaudo de peajes en Colombia.
Isotipo: la pluma (brazo) de una barrera de peaje vista de frente, levantada en diagonal a unos 30 grados, con franjas diagonales alternas amarillo #FFC20E y negro #1A1A1A, apoyada en un poste corto y sólido color naranja #F07D00.
Logotipo: la palabra "PeajeSys" a la derecha del isotipo, en una sans serif geométrica gruesa, color negro #1A1A1A; "Peaje" en peso extra negrita y "Sys" en peso regular.
Estilo: vector plano, formas geométricas simples, sin degradados, sin sombras, sin 3D, sin brillos, sin texto adicional ni eslogan.
Fondo blanco liso. Formato horizontal 3:1, el conjunto centrado con margen amplio.
Genera además una segunda versión solo con el isotipo, en formato cuadrado 1:1, para usarlo como ícono de la app y favicon.
```

## 2. Siluetas de categorías vehiculares (`cat-1.png` a `cat-7.png`)

Pega primero el bloque de estilo y luego una línea por imagen. Las siete deben compartir escala y línea de suelo para que en la terminal de cobro se vean como un set.

```text
Estilo común para todas: silueta lateral de un vehículo, vista de perfil perfecta mirando a la derecha, relleno sólido negro #1A1A1A, sin detalles interiores salvo las ventanas en blanco. Cada eje se marca con una rueda circular rellena de naranja #F07D00 para que se puedan contar los ejes de un vistazo. Vector plano, sin sombras, sin degradados, sin suelo dibujado, sin texto, sin marcas ni logos de fabricantes, sin personas. Fondo blanco liso, formato cuadrado 1:1, el vehículo apoyado sobre la misma línea horizontal imaginaria a un 75 % de la altura y ocupando el mismo ancho relativo que su tamaño real respecto a un tractocamión de 6 ejes.
```

```text
cat-1: automóvil sedán compacto de 2 ejes (categoría I: automóviles, camperos y camionetas).
cat-2: bus intermunicipal de 2 ejes (categoría II: buses y busetas).
cat-3: camión pequeño de 2 ejes con furgón corto, tipo turbo (categoría III: camiones de 2 ejes pequeños).
cat-4: camión grande de 2 ejes con furgón largo, ruedas traseras dobles (categoría IV: C2).
cat-5: camión rígido de 3 ejes con volco (categoría V: C3-C4).
cat-6: tractocamión con semirremolque, 5 ejes en total (categoría VI: C5).
cat-7: tractocamión con semirremolque largo, 6 ejes en total (categoría VII: C6 o más).
```

## 3. Foto para la pantalla de inicio de sesión (`login-estacion.jpg`)

```text
Fotografía realista de una estación de peaje en una carretera de la costa caribe colombiana al atardecer.
Encuadre frontal a nivel de la vía, con varias casetas de cobro bajo una cubierta amplia, carriles marcados con líneas amarillas, una barrera de peaje con franjas amarillas y negras y conos naranjas de tránsito en primer plano.
Luz cálida de hora dorada con tonos amarillos y naranjas, cielo despejado degradándose a azul oscuro arriba, luces de sodio encendidas en la cubierta.
Algunos vehículos borrosos en movimiento atravesando los carriles.
Sin personas reconocibles, sin placas legibles, sin nombres de concesiones, marcas ni texto visible.
Formato vertical 4:5, alta resolución, la parte superior más despejada para poder poner texto encima.
```
