# Contexto del proyecto

Monitoreo del mercado laboral — Club de Mentes Brillantes.

Este archivo existe para que cualquiera (persona o asistente) entienda el estado
del proyecto sin rebuscar en conversaciones pasadas. Si algo aquí ya no es
cierto, corrígelo: un contexto desactualizado es peor que no tenerlo.

**Última revisión:** 18 de septiembre de 2026

---

## 1. Qué es esto

Un sistema que revisa cada semana las vacantes publicadas en nueve sectores del
mercado laboral mexicano, las verifica, y publica los resultados en un sitio
estático. Está dirigido a recién egresados que buscan su primer empleo.

El sitio se sirve con GitHub Pages desde este repositorio:

- Repo: `soportetimentesbrillantes-afk/monitoreo-mercado-laboral-dashboard`
- Sitio: https://soportetimentesbrillantes-afk.github.io/monitoreo-mercado-laboral-dashboard/

## 2. Las páginas del sitio

| Archivo | Qué es |
|---|---|
| `index.html` | Tu CV frente al mercado laboral. Diagnostica un CV, recomienda vacantes y cursos. |
| `cv-builder.html` | Arma tu CV. Constructor guiado paso a paso. |
| `comparativo.html` | Dashboard que cruza indicadores entre los nueve sectores. |
| `boletines.html` | Índice de boletines publicados, con buscador por fecha y por texto. |

Todas son archivos HTML autocontenidos: la lógica, los estilos y el marcado van
en el mismo archivo. No hay compilación ni empaquetador. Lo que está en el repo
es exactamente lo que corre en el navegador.

## 3. Los datos

| Archivo | Qué contiene |
|---|---|
| `manifest.json` | Lista de sectores, metadatos de la corrida y el catálogo de cursos del Club. |
| `data/sector_<clave>.json` | Un archivo por sector: vacantes verificadas, categorías, habilidades, fuentes. |
| `boletines.json` | Índice de ediciones del boletín. Lo actualiza el generador, no se edita a mano. |
| `boletines/` | Cada edición publicada, en HTML y PDF. |

Las nueve claves de sector son: `automotriz`, `turismo`, `gestion`, `ventas`,
`finanzas`, `logistica`, `legal`, `metalmecanica`, `ti`.

Las páginas leen la lista de sectores del manifiesto, nunca la traen escrita.
Agregar un sector al manifiesto lo hace aparecer solo en todas las páginas.

## 4. El backend

Un Cloudflare Worker **en la cuenta del Club de Mentes Brillantes**, en `https://cv-analisis.soportetimentesbrillantes.workers.dev` con cinco
endpoints: `/recomendar-empleos`, `/recomendar-cursos`, `/mejorar-cv`,
`/revisar-cv` y `/extraer-cv`. Usa un modelo de Claude. La clave de API vive
como secreto en Cloudflare, nunca en este repo.

El código fuente del Worker **no está versionado en este repositorio**. Se
mantiene aparte y se despliega por separado. Eso es una deuda pendiente.

## 5. Decisiones que no se deben romper

Estas son restricciones de diseño, no preferencias de estilo. Si vas a cambiar
alguna, que sea a propósito y no por descuido.

**Nada inventado sobre el candidato.** Ninguna función de IA puede atribuirle a
una persona experiencia, habilidades, cifras o certificaciones que no haya
declarado. Cuando falta un dato medible, el sistema pregunta por él; nunca lo
sugiere. Aplica a `/revisar-cv`, `/mejorar-cv` y `/extraer-cv`.

**Cursos solo del catálogo propio.** Las recomendaciones de cursos salen
únicamente del catálogo del Club que vive en `manifest.json`. Está prohibido
sugerir plataformas externas. Hay dos candados independientes: uno en el Worker
y otro en el navegador, ambos validando que el id del curso exista en el
catálogo. Si un sector no tiene cursos, se dice honestamente en vez de rellenar.

**Los datos pendientes se dicen, no se estiman.** Un dato que no está confirmado
se imprime como "dato pendiente". Nunca se completa con una suposición
razonable.

**El boletín cabe en exactamente dos páginas.** El generador lo valida y falla
si no se cumple. Las hojas tienen alto fijo con `overflow:hidden` para que un
desbordamiento se note en lugar de empujar una tercera página en silencio.

**Cero lenguaje interno en lo que ve el lector.** Nada de "pipeline",
"manifest", "corrida de datos" ni fechas en formato `AAAA-MM-DD` en el boletín.

## 6. Cómo se publica

El sitio se edita desde la interfaz web de GitHub. Para archivos grandes, el
contenido se envía comprimido en trozos, se reconstruye en el navegador, se
verifica su hash SHA-256 contra el archivo local y solo entonces se escribe en
el editor.

Dos reglas aprendidas a golpes:

- **Verificar el hash antes de confirmar el commit.** Una vez se publicó un
  `index.html` duplicado (dos veces el documento completo) y solo se detectó por
  esta comprobación.
- **Comprobar en el sitio en vivo después de publicar**, no solo en el repo.
  GitHub Pages tarda en desplegar y es fácil verificar contra una versión vieja.

Los binarios (PDF, imágenes) no se pueden subir por este camino: el editor web
solo acepta texto. Se suben a mano con *Add file → Upload files*.

## 7. El boletín semanal

El generador vive fuera del repo, en la carpeta de trabajo `newsletter_cmb/`:

- `newsletter-plantilla.html` — el molde, con huecos entre dobles llaves.
- `generar_newsletter.py` — llena la plantilla, arma el PDF y actualiza el índice.
- `LEEME.md` — cómo correrlo y qué valida.

Produce una edición en HTML y otra en PDF. La copia HTML que se publica es
autocontenida: los logos van incrustados y la tipografía se pide a Google Fonts,
así el repo no necesita binarios de apoyo. El PDF usa la fuente local porque
weasyprint no descarga nada de internet.

## 8. Tareas programadas

| Tarea | Cuándo |
|---|---|
| `busqueda-vacantes-semanal` | Lunes 8:00 |
| `actualizar-dashboard-web` | Lunes 9:03 |
| `tendencias-mensuales-sector` | Día 1 de cada mes |

La tarea semanal copia el catálogo de cursos tal cual desde el manifiesto
publicado, así que el catálogo real sobrevive a cada corrida.

## 9. Pendientes conocidos

- **La cuenta de Anthropic sigue siendo personal.** El Worker ya vive en Cloudflare
  del Club, pero el consumo de IA se cobra a la cuenta personal de Gael porque se
  conservó la API key actual. Ver `migrar_worker_a_cloudflare_del_club.md`.
- El código del Worker no está versionado en este repo.
- El catálogo de cursos casi no trae duración ni nivel.
- El vocabulario de habilidades de turismo ya no coincide bien con el catálogo.
- Falta el logo de Ágora Internacional; hoy se dibuja como texto.
- Ninguna de las herramientas se ha probado con usuarios finales fuera del equipo.

## 10. Dónde está el resto de la documentación

En la carpeta de Drive del proyecto: los Entregables 1 a 5, la "Documentación de
creación de CV" (detalle técnico de Arma tu CV) y los prompts ejecutables de
cada etapa del pipeline.
