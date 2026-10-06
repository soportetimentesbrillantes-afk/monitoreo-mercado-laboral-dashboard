# Boletín semanal

Genera la edición del boletín a partir de los datos que ya consume el sitio.

```sh
python3 newsletter_cmb/generar_newsletter.py --repo . --fecha 2026-10-03
```

Escribe `boletines/newsletter-<fecha>.html`, el PDF, y agrega la edición a
`boletines.json`. Si algo no valida, **no escribe nada** y dice qué falló.

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `newsletter-plantilla.html` | El molde, con huecos entre dobles llaves. Trae el diseño y los logos incrustados. |
| `generar_newsletter.py` | Llena el molde, valida y arma el PDF y el índice. |
| `a_pdf.mjs` | Convierte a PDF con el navegador y cuenta las páginas. |

Este generador se reconstruyó el 3 de octubre de 2026 a partir de la edición
publicada del 24 de septiembre, porque el original vivía fuera del repositorio
y se perdió. Por eso ahora está versionado aquí: para que no vuelva a pasar.

## Opciones

| Opción | Para qué |
|---|---|
| `--fecha` | Fecha de la edición. Por omisión, hoy. |
| `--periodo` | Texto del periodo. Por omisión, la semana de lunes a domingo de esa fecha. |
| `--patron` | La frase de lectura transversal. Por omisión se deriva de los datos. |
| `--dias-frescura` | A partir de cuántos días de antigüedad se imprime el aviso de datos viejos. Por omisión 10. |
| `--sin-indice` | No tocar `boletines.json`. Útil para probar. |

## Qué valida, y por qué cada cosa

**Dos páginas exactas.** Las hojas tienen alto fijo con `overflow:hidden`, así
que un desbordamiento no empuja una tercera página: recorta el contenido en
silencio. Por eso el conteo se hace sobre el PDF renderizado y no sobre el HTML.

**La cifra global contra la suma por sector.** Una vez se publicó una edición
hecha con datos clonados que marcaba 1,907 vacantes en vez de 6,281, y se
detectó extrayendo el texto del PDF ya publicado. Ahora el generador no deja
llegar hasta ahí.

**Cero lenguaje interno a la vista del lector.** Nada de "pipeline", "corrida",
"manifiesto", ni fechas en formato `AAAA-MM-DD`.

**Todas las fuentes que aportaron vacantes van en el pie.** Antes solo se
listaban las que encabezaban algún sector, así que OCC no aparecía pese a
aportar más de mil vacantes.

**Huecos sin llenar.** Si un `{{CAMPO}}` quedó sin sustituir, falla.

## El aviso de datos viejos

Si la vacante más reciente tiene más días que `--dias-frescura`, el boletín
imprime arriba un recuadro que lo dice, con la fecha real de los datos y cuántos
días llevan publicadas las plazas.

Esto no es decoración. El sitio retira las vacantes por recencia —Adzuna a los
10 días, Indeed a los 15, OCC a los 20— justo porque dejan de ser postulables.
Un boletín que reparte vacantes de hace tres semanas sin decirlo manda a un
recién egresado a postularse a plazas que ya se cerraron. Si no hay datos
nuevos, se dice; no se maquilla.

El resumen que va a `boletines.json` también lo antepone, para que se note desde
el índice del sitio.

## El PDF

`a_pdf.mjs` usa el navegador (Playwright, `npm install -g playwright`). Se hizo
así porque weasyprint no se puede instalar en todos los entornos.

Si en tu máquina tienes weasyprint, el resultado es equivalente y respeta mejor
la tipografía: el HTML pide Oswald a Google Fonts, y sin red el navegador usa
una alternativa, lo que cambia un poco el aspecto del PDF —no el del HTML, que
es el que se publica—.

Si no hay navegador disponible, el generador escribe el HTML, **avisa que el
largo no quedó validado** y no inventa que todo salió bien.

## Antes de publicar

1. Abre el HTML y revisa que la cifra global cuadre con lo que esperabas.
2. Comprueba en el sitio en vivo después de publicar, no solo en el repositorio:
   GitHub Pages tarda en desplegar y es fácil verificar contra una versión vieja.
3. Los binarios (el PDF) no se pueden subir por el editor web de GitHub: van con
   *Add file → Upload files*.
