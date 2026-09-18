# Bitácora de cambios

Qué se cambió, cuándo y por qué. Lo más reciente arriba.

El historial de commits dice *qué línea* cambió; esta bitácora dice *qué problema
se estaba resolviendo*, que es lo que no se recupera leyendo un diff seis meses
después.

**Cómo agregar una entrada:** fecha, título corto, y debajo lo que cambió. Si se
corrigió un error, describe también cómo se detectó — eso es lo que evita
repetirlo.

---

## 2026-09-18 — El Worker se mudó a la cuenta de Cloudflare del Club

El backend de IA dejó de vivir en la cuenta personal. Nueva URL:
`https://cv-analisis.soportetimentesbrillantes.workers.dev` (antes
`cv-analisis.gael-ramav.workers.dev`). Se actualizó el endpoint en `index.html`
y `cv-builder.html`.

Con esta migración se cerraron dos pendientes que venían arrastrándose:

- **El arreglo de cursos quedó desplegado.** Hasta hoy el Worker en producción
  todavía podía sugerir plataformas externas; la versión que se subió a la cuenta
  nueva solo elige del catálogo del Club. Verificado en vivo: con un sector sin
  catálogo responde `sin_catalogo` sin llamar a la IA, y con uno que sí tiene
  devuelve únicamente ids del catálogo.
- **El origen CORS por defecto apuntaba al dominio viejo.** `ALLOWED_ORIGINS[0]`
  se usa cuando una petición llega sin origen reconocido, y encabezaba
  `gaelr777.github.io`. Ahora encabeza el dominio actual del sitio.

**Orden que se siguió, por si hay que repetirlo:** desplegar el Worker nuevo,
probarlo aislado mientras el sitio seguía apuntando al viejo, recién entonces
cambiar la URL en el sitio, verificar en vivo, y dejar el viejo encendido como
vuelta atrás. Los pasos completos están en
`migrar_worker_a_cloudflare_del_club.md`.

**Queda pendiente:** la cuenta de Anthropic sigue siendo la personal — se conservó
la API key actual, así que el consumo de IA se cobra a Gael aunque el hospedaje ya
sea del Club. También falta apagar el Worker viejo, que se dejó vivo a propósito
una semana por si algo se rompe sin que nadie lo note de inmediato.

## 2026-09-15 — Buscador en la página de boletines

Se agregó a `boletines.html` un buscador con dos controles: una lista desplegable
con las fechas de publicación, agrupadas por año, y un campo de texto libre que
busca en título, periodo, resumen y fecha.

Detalles de comportamiento que conviene conocer antes de tocarlo:

- El buscador **solo aparece cuando hay dos o más ediciones**. Con una sola no
  hay nada que filtrar y unos controles muertos nada más estorban.
- Con un filtro activo, la tarjeta destacada desaparece y la edición más reciente
  pasa a ser un resultado más. Si no, esa edición quedaría fuera de la búsqueda.
- La comparación ignora acentos y mayúsculas: buscar "logistica" encuentra
  "Logística".

Probado con 60 ediciones simuladas repartidas en dos años, porque con la única
edición real que existe hoy no se puede ver si el filtro sirve. Las pruebas están
en `pruebas/test_filtro.js` (25 casos).

## 2026-09-15 — Este archivo y CONTEXTO.md

Se agregaron `CONTEXTO.md` y `BITACORA.md` para no depender de buscar en
conversaciones pasadas cuál era el estado del proyecto y por qué se tomó cada
decisión.

## 2026-09-11 — Primera edición del boletín publicada

Se publicó la edición del 8 de septiembre (Tercer Trimestre 2026): 6,281 vacantes
verificadas en los nueve sectores, en HTML y PDF, enlazada desde `boletines.json`.

Dos correcciones durante la publicación:

- **Se subió primero la edición equivocada.** El PDF `newsletter-2026-09-07.pdf`
  era una prueba de maquetación hecha con datos clonados (metalmecánica copiaba a
  logística y TI copiaba a gestión), y marcaba 1,907 vacantes en vez de 6,281. Se
  detectó extrayendo el texto del PDF ya publicado y comparando la cifra global.
  Se borró y se subió el correcto. **Lección:** antes de publicar una edición,
  verificar su cifra global contra los datos de origen.
- El pie del boletín listaba como "Fuentes de vacantes" solo las que encabezaban
  algún sector, así que OCC no aparecía pese a aportar más de mil vacantes. Ahora
  lista todas las fuentes de las que salieron vacantes.

## 2026-09-10 — Plantilla y generador del boletín

Se construyó el sistema del boletín semanal: plantilla, generador en Python,
página índice en el sitio y validación automática contra la especificación.

Errores encontrados y corregidos en el camino:

- **El boletín salía en tres páginas.** El comentario de la plantilla contenía
  marcadores de comentario HTML dentro de sí mismo, así que el primero cerraba el
  bloque antes de tiempo y el resto del texto se imprimía como página 1. No
  escribas `<!--` dentro de un comentario.
- "Cobertura: 0%" aparecía en sectores que sí traían decenas de habilidades. Un
  0% ahí significa que el campo no se calculó, no que no haya datos; ahora se
  imprime como "dato pendiente".
- El folio se imprimía como `2026-09-07` en el pie. Lo detectó la propia
  validación, que prohíbe fechas técnicas a la vista del lector.

## 2026-09-08 — Cursos solo del catálogo propio

El sitio recomendaba cursos de plataformas externas y el catálogo que servía era
uno de prueba, etiquetado como ilustrativo. Se reemplazó por el catálogo real del
Club y se pusieron dos candados independientes (uno en el Worker, otro en el
navegador) que descartan cualquier curso cuyo id no exista en el catálogo.

Si un sector no tiene cursos, se muestra una línea honesta en vez de rellenar con
opciones de otras empresas.

**Pendiente desde entonces:** el Worker sigue corriendo la versión anterior. El
sitio está protegido por su propio candado, pero falta el redespliegue.

## 2026-09-08 — "Arma tu CV"

Se renombró el constructor de CVs, antes con un nombre más largo, y se simplificó
su lenguaje técnico. Se agregó el traspaso del CV desde la página de análisis: si
el diagnóstico determina que un CV está flojo, deriva al constructor y le pasa el
texto para no pedirlo dos veces.

## Antes de septiembre de 2026

El pipeline de nueve sectores, el dashboard comparativo, la página de análisis de
CV y el backend en Cloudflare Workers. Ese periodo está documentado en los
Entregables 1 a 5, en la carpeta de Drive del proyecto.
