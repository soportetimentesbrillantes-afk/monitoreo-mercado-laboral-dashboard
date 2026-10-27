# Bitácora de cambios

Qué se cambió, cuándo y por qué. Lo más reciente arriba.

El historial de commits dice *qué línea* cambió; esta bitácora dice *qué problema
se estaba resolviendo*, que es lo que no se recupera leyendo un diff seis meses
después.

**Cómo agregar una entrada:** fecha, título corto, y debajo lo que cambió. Si se
corrigió un error, describe también cómo se detectó — eso es lo que evita
repetirlo.

## 2026-10-26 — Proceso Ágora: fases 4 a 10, el proceso completo

Gael pidió hacer de una vez todas las fases que faltaban para revisarlas
juntas. Cada una es un archivo en `agora/` (`fase4-estilo.js` …
`fase10-resumen.js`) que se registra en `window.FASES_AGORA` y usa las piezas
comunes que le da `agora.html` (objeto `AG`: leer las fases anteriores,
guardar, completar, avisar qué falta, mandar al expediente). Ninguna escribe en
el navegador ni manda nada por su cuenta. Ninguna pide un cuestionario nuevo:
se arman con lo que la persona ya contestó y lo dicen.

- **4 Estilo de trabajo.** Orientación frente a la tarea con los cuadrantes de
  la presentación de Ágora (D tareas, I ideas, S procesos, C información) y
  las descripciones de Ágora de su estilo. La persona marca solo lo que le
  describe (mínimo 3) y lo cuenta con un ejemplo.
- **5 Forma de relacionamiento.** Recomendaciones de Ágora para relacionarse:
  lo que le funciona y lo que no, su papel real en un equipo (el de su perfil
  se sugiere) y con qué estilo le cuesta más trabajar.
- **6 Crecimiento personal.** Frente a frente lo que espera desarrollar y lo
  que su perfil sugiere (áreas de crecimiento de Ágora y debilidades de su
  FODA); marca coincidencias y pide una primera prioridad. Cursos solo del
  catálogo del Club.
- **7 Escenarios de vida.** 5, 10 y 15 años (Construcción, Consolidación,
  Expansión, como el informe de ejemplo) en cuatro áreas, con una propuesta
  armada con sus datos que puede usar o cambiar. Mínimo dos áreas por
  horizonte.
- **8 Ruta profesional.** Mapa con las carreras que considera (prellenado con
  lo que escribió en la fase 1) y afines: afinidad con su estilo (alta, media,
  baja), si está en un sector que marcó y lo que el monitoreo del Club ve en
  el sector relacionado. Ella elige ruta principal y explica por qué. La lista
  de carreras (`agora/carreras.js`, 55) y sus estilos afines son **de trabajo,
  por revisar con Ágora**.
- **9 Plan de acción 30-60-90.** Acciones de educación, experiencia y conexión
  sugeridas desde las fases anteriores (siguiente paso del FODA, prioridad,
  ruta, habilidad que más pide el sector, curso del catálogo) más las suyas.
  Mínimo una por plazo.
- **10 Resumen ejecutivo.** El documento ejecutivo integral con la estructura
  del ejemplo de Ágora, solo con lo que se sostiene; lo que falta sale como
  pendiente y "Principal reto" y "Conclusiones" quedan con renglones para el
  orientador. Se imprime o guarda como PDF (solo el documento). "Terminar mi
  proceso" se habilita con las nueve fases completas.

**Envío a madre, padre o tutor (fases 6 y 10).** La página no manda correos.
La persona lo manda desde su propio correo (se abre con el mensaje listo), y
el orientador desde la hoja: menú **Proceso Ágora → Mandar resultados al tutor
(fila seleccionada)** en *Expediente Ágora*, que confirma antes, no manda a un
menor sin autorización del tutor y anota la fecha. Así el URL público sigue sin
poder hacer nada más que escribir, y no se puede usar para mandar correos a
terceros.

**Apps Script.** Una pestaña por fase (`Ágora · Estilo de trabajo` …
`Ágora · Resumen`) con el ID del expediente; solo se aceptan columnas
conocidas. El expediente suma *Proceso terminado* y *Resultados enviados al
tutor*. `revisarPestanas` crea todas.

**Detalles.** En teléfono el mapa de carreras se lee como tarjetas; las
tablas anchas se desplazan dentro de su caja en vez de sacar la página de la
pantalla. Al imprimir el reporte, carta a dos columnas y la sección del
orientador en hoja aparte.

Pruebas nuevas: `cuentas/pruebas/test_fases_agora.mjs`, 15 (11 de la página,
incluido el proceso completo de punta a punta, y 4 del Apps Script con el
correo al tutor). Todas las suites pasan.

## 2026-10-26 — Proceso Ágora: fases 2 (Perfil DISC) y 3 (Análisis FODA)

Gael aprobó la fase 1 y pidió seguir. Las fases 2 y 3 son herramientas que ya
existían, así que se pasaron juntas.

**Cómo entran al proceso.** `agora.html` abre `disc-agora.html` y `foda.html`
dentro de un marco, con `?en=agora`. Son las mismas páginas que funcionan
solas: con ese parámetro, `agora-embebido.js` esconde su encabezado, sus
enlaces a otras herramientas y su tarjeta de "Compartir con el Club" (en el
proceso, lo que llega al Club es el expediente de Ágora), y le avisa a
`agora.html` su alto, cuándo hay avance, cuándo se termina y cuándo se borra.
Así hay un solo código por herramienta y lo probado antes sigue valiendo.
Los enlaces entre herramientas (por ejemplo "Seguir con mi FODA") abren la
fase correspondiente en vez de salir del proceso.

**Perfil DISC.** Se usa el cuestionario de Ágora (5 secciones), no la versión
de 24 bloques, que en el proceso ya no se ofrece. La fase queda completa al
ver el resultado. Siguen pendientes de confirmar con Ágora los tres supuestos
de la clave (secciones a, c y d).

**Análisis FODA.** La fase queda completa con al menos una idea en cada uno de
los cuatro cuadros, con el botón "Completar mi FODA"; si falta algo, dice qué
cuadro. El nombre se toma de la fase 1. Borrar el FODA regresa la fase a
pendiente.

**Expediente.** Con la casilla aceptada, el DISC y el FODA se escriben en sus
pestañas de siempre (DISC, FODA) con el **mismo ID** del expediente, y el
expediente suma la fase. Ninguna fase se manda antes de completar la
información inicial (ahí están la edad y la autorización del tutor): se
guardan como pendientes y se mandan al completar la fase 1. El Apps Script
también lo revisa y rechaza una fase sin expediente.

**Otros cambios.** `agora.html#disc` abre directo esa fase. Las notas de
afinidad de las vacantes en la página principal ahora llevan ahí, en vez de a
`disc.html`. Al reabrir el proceso se abre la primera fase sin terminar.

Pruebas: `test_proceso_agora.mjs` pasa de 12 a 18 (las fases dentro del marco,
el envío pendiente, el FODA incompleto, las páginas sueltas sin cambios y el
Apps Script de DISC y FODA). `test_disc.mjs` revisa el enlace nuevo de la
afinidad. Todas las suites pasan.

## 2026-10-26 — Nueva página: Tu proceso Ágora (fase 1, Información inicial)

Gael compartió el documento "herramientas Ágora y DIANA" con los dos procesos
de orientación. Pidió sacar las herramientas sueltas de la página principal y
reunirlas en una sola página, por fases y mostrando el avance, construyendo una
herramienta a la vez para darle el visto bueno, y que el expediente de cada
persona se guarde en la hoja interna del Club.

Primero se construyó como proceso DIANA (Descubrir, Iniciar, 14 pasos). Gael
aclaró que el proceso es **Ágora**: la página se renombró de `diana.html` a
`agora.html` y la ruta pasó a las 10 fases de la hoja "Proceso Agora". DIANA y
su fase Alinear no se trabajan por ahora. Nada de DIANA se llegó a publicar.

**`agora.html`.** A la izquierda, la ruta: avance general (fases completas de
10) y las 10 fases con su estado (Completo, En curso, Pendiente,
Próximamente). En teléfono la lista se pliega para que la herramienta quede a
la vista. A la derecha, la herramienta de la fase abierta. Solo se pueden abrir
las que ya están construidas; hoy es una. El documento repite el número 8
(Crecimiento personal y Ruta profesional); aquí se numeran del 1 al 10 en el
orden en que aparecen. El avance se guarda en el navegador (`cmb_agora`) con
cada cambio.

**Fase 1 — Información inicial.** Datos personales, estudios actuales,
experiencia (empleo, prácticas, servicio social, voluntariado, proyecto
escolar, negocio propio), cursos y certificaciones, idiomas y sectores de
interés. Condición de cumplimiento del documento: "información personal
completa". El botón no da la fase por completa con huecos: lista qué falta y
marca los campos. Experiencia y cursos aceptan "todavía no tengo", porque a un
estudiante no se le puede exigir lo que no tiene.

**Menores de edad.** Ágora envía a los padres por correo los resultados de
Crecimiento personal y el reporte final. Si la edad es menor de 18 se piden
nombre y correo de la madre, padre o tutor, y para guardar el expediente hace
falta además que esa persona esté de acuerdo. El Apps Script lo vuelve a
revisar y rechaza al menor sin esa autorización. El envío a los padres se
construye con las fases 6 y 10.

**Expediente.** Al inicio hay una casilla, sin marcar, para que el Club guarde
el expediente. Con ella, cada fase completa se envía (`tipo: "agora"`) y el
Apps Script escribe dos pestañas nuevas en la hoja interna: **Expediente
Ágora**, una fila por persona con avance y fases completas (el tablero del
orientador), y **Ágora · Información inicial**, con los datos de la fase. Sin
la casilla, nada sale del navegador. Mientras el script no esté publicado, la
página funciona igual y no envía.

**La página principal** ya no enlaza DISC, FODA e informe en la barra de
arriba: ahora hay un solo enlace, "Tu proceso Ágora". `disc.html`, `foda.html`,
`informe.html` y `disc-agora.html` siguen existiendo hasta que cada uno se pase
a Ágora como su fase. La nota de afinidad de las vacantes todavía manda a
`disc.html`; cambia cuando el DISC sea la fase 2.

Aviso de privacidad: se agregó un párrafo sobre el expediente Ágora, los
menores y el envío de resultados a los padres. Igual que el anterior, conviene
que lo revise quien lleve lo legal.

Pruebas nuevas: `cuentas/pruebas/test_proceso_agora.mjs`, 12 (9 de la página y
3 del Apps Script). Las demás suites siguen en verde.

## 2026-10-16 — Corrida de la semana del 9 al 16 de octubre, con boletín

Primera corrida desde el 2026-09-14. Las cuatro semanas intermedias no tienen
datos: faltaban las credenciales de Adzuna y la tarea programada se detenía al
inicio (correctamente). Gael pegó las claves el 2026-10-16, pero en un Google Doc
nuevo en "Mi unidad" en vez de en el `.md` de la carpeta raíz. Se movió a la
carpeta raíz y la tarea semanal ahora apunta a ese Doc (id
`1v9jxdr-MvRROC3xNEk6wEMef4CHLQk0v7eVsp5rJInw`). Las llaves nunca se escribieron
en el chat, en el repositorio ni en los archivos de la corrida.

**Resultado:** 3,252 vacantes verificadas en los 9 sectores, de 22,923
entregadas por la Etapa 1 (Adzuna 22,232 · OCC 691 · Indeed 0).

| Sector | Verificadas | Antes (09-14) | Mediana mensual |
|---|---|---|---|
| Ventas | 723 | 324 | $11,500 |
| Finanzas | 583 | 227 | $15,000 |
| Automotriz | 513 | 234 | $13,000 |
| Gestión y Administración | 487 | 130 | $14,000 |
| Logística | 406 | 189 | $13,000 |
| Legal | 229 | 157 | $19,080 |
| TI | 165 | 72 | $17,000 |
| Turismo | 124 | 268 | $12,825 |
| Metalmecánica | 22 | 132 | $17,500 |

**No se puede comparar con el 2026-09-14, y eso quedó escrito en todos lados**
(control de cada sector, `meta.nota_corrida`, boletín, índice de boletines):

- Ventana fija de 7 días (2026-10-09 → 2026-10-16), Adzuna con `max_days_old=7`
  y hasta 50 páginas por término. No se sabe con qué profundidad se extrajo el
  09-14: en Drive sus crudos quedaron truncados a 600 filas.
- Metalmecánica y TI no tienen lista de empresas confiables en Drive, así que
  solo cuentan las empresas del maestro. Metalmecánica cae de 132 a 22 por eso,
  no por el mercado.
- Las listas de confiables de Automotriz, Logística y Legal tienen comas sin
  comillas y `pandas` no las podía leer. Se usó solo la primera columna (el
  nombre), que es la única que el script necesita. Hay que limpiar esos CSV en
  Drive.
- Los diccionarios de categorías y habilidades de Finanzas, Logística, Legal,
  Metalmecánica y TI no existían en ningún lado: el 09-14 se usaron unos que
  nunca se guardaron. Se reconstruyeron con los nombres exactos que publicó esa
  corrida (para que las categorías se llamen igual) y las palabras clave se
  escribieron de nuevo. La inferencia por categoría (`por_categoria`) se sacó de
  las vacantes que publicó el 09-14. Ahora están en `herramientas/` y en
  "05 Scripts pipeline" de Drive.
- Indeed: no hay conector en la sesión. 0 vacantes.

**Arreglo de paso: la mediana de TI del sitio estaba mal.** Lo publicado el 09-14
decía 141,000 MXN al mes. Con esta corrida es 17,000.

**OCC desde el navegador integrado de la app en la Mac de Gael.** Funciona igual
que Chrome: `fetch()` del mismo origen más `DOMParser`. Dos cosas nuevas: el
javascript corta a los 45 segundos (se lanza en segundo plano y se consulta
después), y para sacar los datos conviene devolver un JSON grande de una vez,
porque la herramienta lo guarda en un archivo legible desde el sandbox.

**Dónde quedaron los crudos.** Pesan 6 MB y por el conector de Drive se truncan
(eso pasó el 09-14). Se guardaron comprimidos en `datos/crudos/` del repositorio,
junto con los verificados en `datos/`. En Drive quedaron los controles de cada
sector y los diccionarios.

**Boletín.** Se generó con dos cambios al generador:

1. "Categoría top" y el hallazgo ya no cuentan "Otro". Es lo que el diccionario
   no supo clasificar, no una categoría del mercado. El primer borrador decía
   "en Legal una sola categoría concentra 78%", y era "Otro".
2. El hallazgo deja fuera sectores con menos de 50 vacantes, o con más de la
   mitad sin clasificar. La concentración de una categoría mide el diccionario
   si el diccionario no clasificó casi nada.

También tiene una opción nueva `--aviso-metodo`, que imprime arriba un aviso
para el lector cuando las cifras no se pueden comparar con otras ediciones.

**Pendiente para que esto corra solo:** la tarea `actualizar-dashboard-web` (en
la nube, lunes 9:03) busca los crudos en Drive, y desde esta corrida ya no
están ahí. Ver la propuesta en el reporte de la corrida.

## 2026-10-15 — DISC y FODA se pueden compartir con el Club, a una hoja interna

Pedido de Gael: "que los datos del llenado de DISC y FODA se guarden en un
excel para uso interno". Hasta hoy las tres páginas prometían que nada salía
del navegador, así que guardar implicaba pedir permiso. Gael eligió casilla
para aceptar, sin marcar, y una hoja nueva solo para esto.

**Cómo quedó.** Al final del DISC (las dos versiones) y del FODA hay una
tarjeta "Compartir con el Club (opcional)" con nombre, correo, la casilla
"Acepto compartir estos datos con el Club…" y el botón "Enviar al Club". Solo
se envía si la casilla está marcada y se toca el botón; terminar el
cuestionario o escribir en el FODA no manda nada, y hay una prueba para cada
caso. La tarjeta dice qué se manda, que no se comparte con empresas, que la
herramienta sirve igual sin compartir y a qué correo pedir el borrado.

Lo recibe un Apps Script nuevo (`cuentas/apps-script-autoconocimiento.gs`)
ligado a la hoja [Autoconocimiento DISC y FODA (uso interno)](https://docs.google.com/spreadsheets/d/1QRybfvknJWvmEgQWd5bBdl5jvr48aezxmZS90h2_GTU/edit),
creada en la carpeta raíz del proyecto con pestañas Léeme, DISC y FODA. Es un
script aparte del de CVs a propósito: así la hoja se puede compartir con
orientadores sin darles los CVs, y un error en uno no tumba al otro.

**Decisiones:**

- **Mismo id, misma fila.** Un DISC terminado tiene su id: reenviarlo actualiza
  la fila; contestarlo otra vez es otra fila. El FODA tiene un id por
  dispositivo: corregirlo y reenviarlo actualiza la fila y conserva "Primer
  envío"; "Borrar todo" suelta el id.
- **Se guardan las respuestas crudas del DISC**, no solo los puntajes. La clave
  de colores de Ágora tiene tres supuestos por confirmar; con las respuestas se
  puede volver a puntuar a todos si cambian. La columna "Versión de la clave"
  dice con cuál se calculó cada fila.
- **El script solo escribe.** La clave está a la vista en `compartir-club.js`
  y no protege nada; lo que protege la hoja es que no hay forma de leerla a
  través del script.
- **Inerte hasta publicar el script.** Con `COMPARTIR_ENDPOINT` vacío la
  tarjeta no aparece. Se puede subir el código hoy y activarlo después.

**Aviso de privacidad.** Se agregó la finalidad secundaria de orientación a
partir de las herramientas de autoconocimiento y un párrafo en la sección 2
que explica que funcionan en el navegador y qué se recibe solo si la persona
lo comparte. Última actualización: octubre de 2026. **Conviene que lo revise
quien lleve lo legal del Club**: lo redacté siguiendo la estructura del aviso
existente, pero no soy abogado.

Pruebas nuevas: `test_compartir.mjs` (10, en navegador, con un servidor falso
que registra todo lo que sale) y `test_apps_script_autoconocimiento.mjs` (9,
el script corriendo en Node con imitaciones de SpreadsheetApp). Las de DISC,
FODA y Ágora siguen en verde.

Pasos de instalación en `cuentas/LEEME-autoconocimiento.md`.

## 2026-10-12 — El DISC se alinea con Ágora: dos cuestionarios, una interpretación y el informe

Gael trajo el material de Ágora Internacional —el cuestionario "DISC As de
Diversidad" (5 secciones, 75 reactivos, puntuación por colores), su documento
de interpretación, el tablero de cuadrantes y un ejemplo de informe
ejecutivo— con ocho cambios de texto puntuales y la instrucción de "considerar
lo de estos documentos". Decidió dos versiones del cuestionario y un informe
"con lo que se sostiene; el resto lo llena el orientador".

**Los ocho cambios de texto** se aplicaron tal cual: el enfoque pasa de "tu
búsqueda de empleo" y "tu próxima entrevista" a "la construcción de tu plan
de vida"; "herramienta de orientación hecha por el Club" pasa a "herramienta
de autoconocimiento"; "no le sacas a decir" a "no evades decir"; y "donde un
curso rinde más" a "dónde puedes fortalecerte más".

**Una sola interpretación, en `disc-interpretacion.js`.** El texto de Ágora
(estilo, descripción, fortalezas, limitaciones potenciales, mayor temor,
motivadores, ambiente ideal, cómo comunicarse y cómo no, áreas de crecimiento)
vive en un archivo compartido que usan `disc.html`, `disc-agora.html` e
`informe.html`. Es la primera excepción a "páginas autocontenidas", y es a
propósito: ese texto es largo y tres copias terminan diciendo cosas distintas.
La redacción se limpió donde el original traía errores de traducción
("jugador de la selección", "dará en lugar de argumentar"); la sustancia no.
Los factores se llaman como en el informe de Ágora —Dominancia, Influencia,
Estabilidad, Cumplimiento— con sus colores rojo, amarillo, verde y azul, para
que la pantalla coincida con el papel. El resultado trae además el "tablero
de cuadrantes y tendencias": una recta por color, un punto por puntuación y
la línea que los une. Hay una prueba que verifica que las dos versiones del
cuestionario pintan exactamente la misma interpretación.

**`disc-agora.html`, el cuestionario de Ágora.** Las cinco secciones con sus
reglas: cuatro veces cada número en la a (el quinto se bloquea), siete
adjetivos y una estrella en la b, orden sin repetir con intercambio en la c,
par forzado en la d, escala TA–TD en la e. Una sección por pantalla. El
progreso se guarda a cada toque (`cmb_disc_agora_progreso`) porque son 20
minutos y cerrar la pestaña a la mitad no debe costar todo. El resultado
imprime la misma tabla "puntuación por sección" que cierra la hoja en papel,
para comparar.

**La clave de colores está en un solo lugar (`CLAVE`) y tiene tres
supuestos que Ágora debe confirmar:**

1. En la sección a, la hoja de puntuación no dice de qué color es cada
   columna. Se asumió el orden de las secciones b y e: Azul = 2, 7, 9, 14;
   Rojo = 3, 4, 12, 15; Amarillo = 5, 6, 10, 13; Verde = 1, 8, 11, 16.
2. En la sección c tampoco: se asumió columna 1 Azul, 2 Rojo, 3 Amarillo,
   4 Verde.
3. En la sección d se asumió un punto por elección.

Las secciones b y e sí traen los colores en la hoja y se transcribieron tal
cual. Si alguno de los tres supuestos está mal, se corrige en `CLAVE` y en
ningún otro lado. En el renglón 42 de la sección c, "Observado" del original
se escribió "Observador".

**`informe.html`, el documento ejecutivo.** Sigue la estructura del ejemplo
de Ágora —resumen, perfil DISC con tabla y tablero, FODA, estilo en el
trabajo, cómo se relaciona, áreas de crecimiento, plan de acción a 60–90
días, ruta profesional y plan de vida— con una diferencia deliberada: **las
secciones que en el ejemplo salen del juicio del orientador no se calculan.**
Carrera con mayor compatibilidad, segunda ruta, principal reto, plan de vida
a 0–5 / 5–10 / 10–15 años y estrategia de autonomía son campos que se
escriben con el orientador; si están vacíos, se imprimen con líneas para
llenar a mano y la leyenda "se trabaja con el orientador". Tampoco se
bautiza el perfil con un nombre ("Estratega Analítico-Relacional"): se dice
"perfil Estabilidad con Cumplimiento" y se listan los adjetivos de Ágora.
Generar esas conclusiones a partir de cuatro números sería inventar sobre la
persona. El plan de acción a 60–90 días (primer, segundo y tercer orden, con
reflexión) sí lo llena la persona en la misma página. Todo vive en el
navegador (`cmb_informe`); nada va a un servidor.

**Pendiente que esto deja:** el aviso de privacidad sigue sin mencionar
cuentas, DISC, FODA ni informe. Con el informe la omisión pesa más, porque
pide nombre, edad y programa. Aunque nada sale del dispositivo, hay que
decirlo ahí.

Suites: `test_disc.mjs` 21, `test_foda.mjs` 10, `test_agora.mjs` 13 (nueva:
puntuación contra un caso calculado a mano, reglas de cada sección, progreso,
misma interpretación en las dos versiones, el informe no inventa).

## 2026-10-08 — Nueva página: Tu FODA

Pedido de Gael: "otra página donde las personas puedan hacer un FODA". Eligió
el formato libre, cuatro cuadros, en vez de uno guiado con preguntas.

`foda.html` son cuatro cajas de texto, una idea por renglón, con los ejes
rotulados (depende de ti / está afuera; suma / hay que atender) y una pregunta
guía debajo de cada cuadro. Todo se guarda en el navegador con cada tecla
(`localStorage`, llave `cmb_foda`) y no sale de ahí: no hay servidor, no hay
cuenta, no hay IA. Se puede imprimir —la hoja impresa se arma aparte, con
listas en vez de cajas de texto, porque un `textarea` impreso recorta sin
avisar—, copiar como texto o descargar como `.txt`. Borrar pide dos toques en
el mismo botón; no se usa el diálogo del navegador.

**La prueba del ejemplo.** La página insiste en que cada idea traiga un caso
concreto ("organicé el evento de fin de curso para 80 personas", no "soy
proactivo"). Es la misma regla que rige el análisis de CV: nada que no se pueda
sostener con un hecho.

**Conexión con el DISC.** Si la persona ya contestó `disc.html`, aparece un
recuadro con dos pistas de su estilo dominante —una para Fortalezas, otra para
Debilidades— con botón "Agregar". Nada se agrega sin que lo toque, y lo que se
agrega es una preferencia que ella misma declaró al contestar, no una
conclusión nuestra. Si no contestó el DISC, el recuadro no existe.

**Lo que NO hace, a propósito.** No sugiere fortalezas ni debilidades a partir
del CV ni de las vacantes: eso sería inventar sobre el candidato. Los cuadros
de Oportunidades y Amenazas quedan en blanco hasta que la persona escriba.

También se enlazó desde `index.html` (barra superior) y desde el resultado de
`disc.html` ("Llevar esto a mi FODA"). De paso se corrigió en `disc.html` el
aviso "Ya contestaste este cuestionario el…", que imprimía la fecha en formato
AAAA-MM-DD; ahora dice "8 de octubre de 2026".

Suite nueva `cuentas/pruebas/test_foda.mjs`, 10 pruebas: lo escrito sobrevive
a recargar, conteo de ideas, exportación con las cuatro secciones, cero fechas
técnicas a la vista, hoja impresa escapa HTML, borrar exige dos toques, pistas
DISC solo con resultado guardado y sin agregar nada solas, y los enlaces desde
las otras páginas.

## 2026-10-08 — El cuestionario DISC muestra un solo bloque por pantalla

Pedido de Gael tras probar el orden del 1 al 4: "que solo aparezca un bloque en
la pantalla y cuando se acabe pase al otro".

Antes los 24 bloques iban en una sola página larga. Ahora se ve uno a la vez,
con "Anterior", "Siguiente" y el contador "Bloque n de 24". Al completar las
cuatro posiciones de un bloque, la página espera 0.65 segundos —lo suficiente
para ver el bloque en verde y corregir si se tocó mal— y pasa sola al siguiente.
Si la persona navega a mano, ese avance automático se cancela para no robarle
el bloque que acaba de pedir. "Anterior" conserva lo contestado.

"Ver mi resultado" aparece solo en el último bloque. Si se llega ahí con huecos,
la página lo dice y lleva al primer bloque incompleto, en lugar de enumerar
números de bloque que en este formato ya no se ven.

Nada cambió en la puntuación ni en los 96 reactivos. La suite pasó a 21 pruebas
con cinco nuevas: solo un bloque visible, avance automático al completar,
"Anterior" conserva respuestas, botón de resultado solo al final, y salto al
primer bloque incompleto.

## 2026-10-08 — El cuestionario DISC ahora se ordena del 1 al 4

Gael probó la versión anterior y reportó dos cosas. La segunda explica a la
primera.

**"No puedo seleccionar más de dos cosas por bloque."** No era un error: dos
marcas —una en Más y una en Menos— eran la respuesta completa. Pero si la
persona que encargó la página creyó que faltaba algo, cualquiera lo va a creer.
El formato no se explicaba solo, y los círculos atenuados de las opciones en
conflicto parecían bloqueados en vez de "ya no aplica".

**"Estaría mejor que hubiera más escala de más a menos."** De ahí salió el
cambio: en vez de marcar solo los dos extremos, ahora se ordenan las cuatro
frases del 1 al 4. Resuelve las dos quejas con un solo cambio — hay gradación,
y se marcan las cuatro filas, así que desaparece la sensación de que falta algo.

**Lo que NO se hizo, y por qué.** Una escala del 1 al 5 por frase, que era la
lectura literal de "más escala". En ese formato casi todo el mundo se califica
alto en todo y los cuatro factores salen empatados; el perfil se aplana y deja
de decir nada. El orden forzado del 1 al 4 da la gradación sin perder la
propiedad que hace que esto funcione: **en cada bloque los cuatro factores se
reparten las cuatro posiciones, así que siempre suman cero y nadie puede salir
alto en todo.** Hay una prueba que falla si esa suma deja de ser cero.

**Puntuación.** Primera posición +2, segunda +1, tercera −1, cuarta −2. Los
extremos pesan el doble porque dicen más que lo de en medio. La escala pasó de
±24 a ±48 y los umbrales de empate se duplicaron en consecuencia.

**Interacción.** Poner un número que ya estaba en otra frase **intercambia** las
dos en vez de borrar una. Eso era el fondo de la queja original: una marca que
desaparece sin explicación se siente como que la página falla. Volver a tocar el
mismo número lo quita. Un bloque completo se marca en verde.

El área para marcar quedó en 40×42 píxeles por botón, contra los 18×18 de la
versión anterior, donde el área sensible era solo el círculo del radio y un clic
al lado no hacía nada.

La suite pasó a 16 pruebas, y las de interacción hacen clic en el navegador en
lugar de llamar a las funciones desde JavaScript. Las anteriores validaban la
lógica y nunca tocaron la interfaz, que es por lo que dejaron pasar algo que
hacía la página inusable.

## 2026-10-06 — Arreglado: en el cuestionario DISC no se podían marcar bien las respuestas

Lo reportó Gael probando la página recién publicada: "no me deja seleccionar
bien las respuestas". Al reproducirlo en navegador, con viewport de escritorio y
de teléfono, resultaron ser dos fallas distintas.

**El área sensible medía 18×18 píxeles**, que es el tamaño del círculo del radio
y nada más. Un clic en la celda junto al círculo, o en el texto de la frase, no
hacía nada. En un teléfono eso se falla más veces de las que se acierta. Ahora
cada opción es una etiqueta que llena la celda: 56×46 píxeles, por encima del
mínimo cómodo para un dedo, y se ilumina al pasar por encima.

**Marcar la misma frase como "Menos" borraba el "Más" en silencio.** La regla
era correcta —una frase no puede ser a la vez la que más y la que menos te
describe— pero aplicarla sin avisar se siente como que la página se descompuso:
pones una marca y se te desaparece otra que ya habías puesto. Ahora la opción en
conflicto se deshabilita y se ve atenuada, así que queda claro que no se puede
en lugar de perder trabajo hecho. La lógica anterior se conservó como red de
seguridad.

Las tres pruebas que cubren esto están en `cuentas/pruebas/test_disc.mjs` y
miden el tamaño real del área sensible en el navegador, hacen clic en la esquina
de la celda, y verifican que forzar el clic sobre la opción bloqueada no borre
lo ya elegido. La suite pasó de 13 a 16.

**Lección:** las pruebas anteriores llamaban a `marcar()` desde JavaScript, así
que validaban la lógica y nunca tocaron la interfaz. Una prueba que no hace clic
donde hace clic una persona no prueba que se pueda usar.

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
