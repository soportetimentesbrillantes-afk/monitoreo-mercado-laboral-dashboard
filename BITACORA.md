# Bitácora de cambios

Qué se cambió, cuándo y por qué. Lo más reciente arriba.

El historial de commits dice *qué línea* cambió; esta bitácora dice *qué problema
se estaba resolviendo*, que es lo que no se recupera leyendo un diff seis meses
después.

**Cómo agregar una entrada:** fecha, título corto, y debajo lo que cambió. Si se
corrigió un error, describe también cómo se detectó — eso es lo que evita
repetirlo.

## 2026-10-06 — OCC bloquea los centros de datos, y la búsqueda semanal ahora corre en la máquina de Gael

El filtro de salida de la organización ya permite `api.adzuna.com` y
`www.occ.com.mx`: Adzuna responde `AUTH_FAIL` con llaves falsas, que es
exactamente lo que debe responder cuando sí se le alcanza.

**Pero OCC sigue sin funcionar desde la nube, y no por el filtro.** Devuelve 403
a cualquier petición de un centro de datos — se probó con `curl` y con un
navegador Chromium headless real, y las dos veces 403 antes de servir una sola
tarjeta. Es OCC rechazando la IP, no la política de la organización. Las corridas
anteriores funcionaban porque OCC se abría desde el Chrome de Gael, con su IP
doméstica.

Por eso `busqueda-vacantes-semanal` se rehízo atada a su computadora. Adzuna
sigue corriendo desde la nube, que es donde funciona bien; solo OCC usa el
navegador local. La tarea anterior se borró en vez de modificarse porque una
tarea no puede empezar a requerir una computadora después de creada; estaba
deshabilitada y nunca había corrido, así que no se perdió historial.

**Si la computadora está apagada el lunes, la corrida no se cae:** hace Adzuna
sola y deja escrito "OCC no disponible en esta corrida" en el control de cada
sector y en el reporte. Ese registro es la parte importante. El reporte de
tendencias de septiembre tuvo que descartar medio análisis porque la caída de
Indeed solo estaba anotada en la bitácora y no en los datos, así que el cambio de
mezcla de fuentes se veía como movimiento del mercado. Registrar qué fuentes
aportaron es lo que evita repetirlo.

También se creó `credenciales_adzuna.md` en la carpeta raíz del proyecto en
Drive. Hasta ahora las llaves se pedían a mano en cada corrida, y esa era la
segunda razón por la que la extracción no podía correr sola. **Van en Drive y no
en este repositorio, que es público.**

## 2026-10-03 — Se reconstruyó el generador del boletín, y la edición dice que no hay datos nuevos

El generador vivía en una carpeta de trabajo fuera del repositorio y se perdió
con la sesión que lo tenía. Se reconstruyó desde la edición publicada del 24 de
septiembre —el HTML trae el diseño y los logos incrustados— y ahora vive en
`newsletter_cmb/`, versionado. Esa era la razón de la pérdida y queda cerrada.

**La edición del 3 de octubre imprime un aviso de datos viejos.** No hubo corrida
nueva: la extracción sigue sin poder correr porque la política de egress bloquea
`api.adzuna.com` y `www.occ.com.mx`, y las credenciales de Adzuna no existen en
Drive. La vacante más reciente de los datos publicados es del 17 de septiembre,
16 días antes de la edición. Como el sitio retira las vacantes por recencia a
los 10, 15 y 20 días según la fuente, repartirlas hoy sin decirlo mandaría a la
gente a postularse a plazas ya cerradas. El generador lo detecta solo y lo
imprime arriba del boletín, y lo antepone también al resumen del índice.

**Lo que valida el generador, con su motivo:** dos páginas exactas contadas
sobre el PDF renderizado (las hojas tienen alto fijo con `overflow:hidden`, así
que un desbordamiento recorta en silencio en vez de agregar página); la cifra
global contra la suma por sector (por la edición de septiembre que marcó 1,907
en vez de 6,281); cero lenguaje interno y cero fechas `AAAA-MM-DD` a la vista;
todas las fuentes que aportaron vacantes en el pie; y ningún `{{hueco}}` sin
llenar. Si algo falla no escribe el archivo.

El PDF se arma con el navegador y no con weasyprint porque weasyprint no se
puede instalar en todos los entornos. Si no hay navegador, el generador escribe
el HTML y **avisa que el largo no quedó validado** en vez de darlo por bueno.

**Contexto del mes.** El reporte `tendencias_2026-09.md`, generado el 1 de
octubre, concluye que no se deben publicar comparativos mes contra mes hasta que
haya dos corridas no acumuladas consecutivas con la misma mezcla de fuentes, y
su segunda recomendación es corregir la normalización salarial de OCC y
recalcular los cortes afectados — el mismo arreglo del 29 de septiembre, que
sigue sin publicarse.

## 2026-10-02 — Más columnas en la hoja de CVs, y "Tu estilo de trabajo"

**La hoja ya tenía 20 columnas; el sitio solo llenaba una parte.** `Ciudad`,
`Puesto objetivo` y `Años de experiencia` existían vacías porque `index.html`
nunca las mandaba. Ahora se mandan, y se agregaron al final `Nombre(s)`,
`Apellido paterno`, `Apellido materno`, `Estado`, `Carrera`, `Universidad`,
`Año de egreso`, `Nivel de inglés`, `Datos confirmados` y `Última
actualización`. Las columnas nuevas van al final a propósito: así los
registros viejos siguen cuadrando.

**El `#ERROR!` del teléfono.** El único registro real que había en la hoja
tenía `#ERROR!` en el teléfono. Un número que empieza con `+52` hace que Sheets
lo tome por una fórmula, falle al evaluarla y escriba el error en la celda. Se
corrigió anteponiendo un apóstrofo a cualquier valor que empiece con `=`, `+`,
`-` o `@`; el apóstrofo fuerza texto y no se muestra ni se devuelve al leer.

**La lectura del nombre estaba rota y nadie lo había notado.** La heurística
anterior tomaba la primera línea corta sin dígitos y la llamaba nombre. Probada
contra seis formatos reales de CV acertaba en tres: en los otros devolvía
"CURRICULUM VITAE", "Datos personales" o "Licenciado en Administración". Por eso
la columna `Nombre` estaba vacía. La nueva lectura descarta encabezados de
sección y títulos de puesto, mira también los pedazos de un renglón partido por
`·` o `|`, usa el correo como pista para desempatar, y parte el nombre en
nombres y apellidos con la convención mexicana (los dos últimos bloques son los
apellidos, y las partículas se pegan al que les sigue). Las pruebas están en
`cuentas/pruebas/test_extraccion.mjs` y leen el código directamente de
`index.html`, entre dos marcadores, para que no haya una copia que se
desincronice.

**Se guarda dos veces, no una.** Primero con lo detectado, en cuanto termina el
análisis, y otra vez si la persona corrige algo en el formulario nuevo
"Confirma tus datos". Las dos escrituras llevan el mismo `ID de envío`, así que
la segunda actualiza el renglón en vez de duplicarlo, y la columna `Datos
confirmados` dice cuál de las dos es la buena. Se hizo así y no al revés —pedir
confirmación antes de guardar— para no perder a quien cierra la pestaña sin
llenar el formulario.

**Página nueva: `disc.html`.** Cuestionario de estilo de trabajo, 24 bloques de
elección forzada (la que más y la que menos te describe). Se eligió ese formato
sobre una escala de 1 a 5 porque en una escala casi todo el mundo se califica
alto en todo y los cuatro factores salen empatados.

Los 96 reactivos están escritos desde cero para este sitio. El modelo DISC
(Marston, 1928) es de dominio público, pero los instrumentos comerciales que lo
implementan no lo son, así que no se reprodujo ninguno.

**El resultado se presenta con sus límites dichos, dos veces:** antes de empezar
y en el resultado. Es una herramienta de orientación, no una prueba psicométrica
validada; describe preferencias, no capacidades; no predice desempeño; y no
debe usarse para descartar a nadie de un proceso. Si los cuatro factores salen
parejos, se dice que no hay un estilo dominante en vez de inventar uno.

**La conexión con las vacantes etiqueta, nunca filtra.** Cada vacante
recomendada muestra "afinidad de estilo: alta / media / baja". Ordenar por
afinidad es opcional y lo activa la persona; por omisión manda la coincidencia
de habilidades, que es un dato del mercado, mientras que el estilo es una
preferencia declarada. La correspondencia entre puesto y estilo la escribimos a
mano sobre las categorías del pipeline y no sale de ningún estudio: por eso se
muestra como afinidad y nunca como una probabilidad. Hay una prueba que falla si
alguna vez llega a esconder una vacante.

**Pendiente:** el resultado del DISC vive solo en el navegador. Para que siga a
la persona entre dispositivos haría falta un endpoint en el Worker; se dejó
fuera a propósito de esta entrega.

## 2026-09-29 — Los salarios de OCC ya se convierten a mensual

`etapa4_sector_json.py` normalizaba a MXN mensual solo los salarios de Adzuna.
Los de OCC pasaban intactos e inflaban las medianas: TI publicó ~141,000
MXN/mes y metalmecánica ~77,000, cifras imposibles para vacantes de primer
empleo. Los percentiles lo gritaban: p75 de 442,491 en TI y 211,500 en
automotriz.

**La causa no era una heurística fallida sino una conversión sin deshacer.** El
`control_ultima_corrida.md` de cada sector lo dice: la Etapa 1 multiplica por 12
los salarios de OCC —que el portal publica mensuales— para hacerlos comparables
con Adzuna. La Etapa 4 nunca revertía esa multiplicación.

Por eso la corrección es incondicional, no por umbral. Se comprobó contra el
crudo `vacantes_gestion_occ_2026-09-14.csv`: los valores van de 72,000 a 600,000
y **todos** están anualizados, incluidas las becas. Un umbral de 90,000 habría
dejado sin convertir las vacantes de 72,000 y 84,000, que son 6,000 y 7,000 al
mes. La regla quedó en la constante `FUENTES_ANUALIZADAS`, separada del
`UMBRAL_SALARIO_ANUAL` que sigue aplicando solo a Adzuna, porque son dos
problemas distintos y confundirlos fue el error original.

**Ojo antes de volver a tocarlo:** si algún día la Etapa 1 deja de anualizar OCC,
hay que sacar "OCC" de `FUENTES_ANUALIZADAS` en el mismo cambio. Las dos etapas
están acopladas por esta convención y no hay nada que lo verifique solo.

Queda pendiente decidir si se recalcula la corrida 2026-09-14 ya publicada. Sus
CSV verificados nunca se subieron a Drive, así que rehacerla obliga a repetir la
Etapa 2 desde los crudos.

## 2026-09-24 — Corrida 2026-09-14 publicada y segunda edición del boletín

Se corrieron las Etapas 2 y 4 sobre los crudos de la corrida 2026-09-14 (los
9 sectores, vía Adzuna + OCC; Indeed no estuvo disponible en esta corrida) y
se publicaron los `sector_<clave>.json` resultantes. Se generó y publicó la
edición del 24 de septiembre del boletín con `generar_newsletter.py`.

**Antes de publicar el boletín se investigó una caída aparente de 6,281 a
1,733 vacantes verificadas.** No fue una regresión de esta sesión: los nueve
`sector_<clave>.json` que estaban en línea antes de esta corrida ya traían
`vacantes_detalle` vacío para los nueve sectores, con la nota "Sin vacantes
verificadas vigentes al 2026-09-21" — el mantenimiento semanal ya había
retirado esas vacantes por exceder el umbral de recencia por fuente, y el
sitio estaba esperando la próxima corrida completa. La cifra de
`vacantes_verificadas` que seguía mostrando el sitio (873, 1224, etc.) era un
acumulado histórico que ya no correspondía a ninguna vacante vigente. No hay
CSVs verificados previos con vacantes vigentes contra los cuales acumular
por hash, así que la corrida 2026-09-14 es, en los hechos, la línea base
nueva. **Pendiente:** decidir si se retoma el patrón de acumular entre
corridas consecutivas (como en agosto) o si el sitio pasa a mostrar solo la
corrida más reciente de forma explícita.

Queda pendiente también la validación DENUE/maestro de las ~1,455 empresas
nuevas sin match de esta corrida (no bloqueante) y el bug de normalización
salarial de OCC en `etapa4_sector_json.py` (solo divide entre 12 los salarios
anuales de Adzuna, no los de OCC).

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
