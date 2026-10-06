# Cuentas de usuario

Deja que una persona cree su cuenta con el correo y el nombre que salieron de
su CV, y guarde su historial de análisis, sus vacantes, sus cursos y si quiere
avisos.

Entra con un **código de 6 dígitos por correo**. No hay contraseñas: no hay que
resguardarlas, restablecerlas ni responder por una filtración, y el mismo paso
sirve para verificar que el correo es suyo — que es justo lo que falta cuando el
correo lo sacó una expresión regular del texto de un CV.

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `worker-cuentas.js` | Módulo para el Worker de Cloudflare. Autenticación y sesión. |
| `apps-script-cuentas.gs` | El Apps Script de la hoja. Reemplaza al actual. |
| `pruebas/test_cuentas.mjs` | 24 pruebas del Worker. `node cuentas/pruebas/test_cuentas.mjs` |
| `pruebas/test_interfaz.mjs` | 11 pruebas de la pantalla, con navegador de verdad. Necesita `npm install -g playwright`. |

La interfaz vive en línea en `index.html`, como el resto del sitio: barra de
sesión en el encabezado, modal para entrar, tarjeta para guardar el análisis,
botón de guardar en cada vacante, avance por curso y el panel "Mi cuenta".

Las pruebas de pantalla sirven el sitio en local y sustituyen al Worker por
respuestas de mentira, así que no tocan Cloudflare ni la hoja del Club. Lo que
comprueban no es que se vea bonito, sino que **la cuenta no se cree sola**, que
los datos sacados del CV se puedan corregir, que la sesión sobreviva a recargar,
que una vacante vencida se diga en vez de esconderse, y que un nombre con
etiquetas HTML no se ejecute.

## Quién guarda qué, y por qué así

Los datos de la persona viven en la hoja de Google, como el resto del proyecto.
Lo que **no** vive en la hoja son los secretos de sesión, y esa separación es
deliberada:

- **La sesión es un token firmado con HMAC** y no se guarda en ningún lado. Un
  token de sesión es una credencial al portador: quien lo tiene, es esa persona.
  Si hubiera una pestaña de sesiones, cualquiera con acceso al Drive del Club
  podría copiar una y entrar como quien quisiera. Al firmarlo, el Worker lo
  verifica con la firma y no hace falta guardarlo.
- **Del código solo se guarda un hash con sal**, y la sal lleva el correo
  dentro. Aunque alguien lea la hoja, no puede entrar con lo que ve, ni usar el
  código de una persona para otra.

## Dos secretos que no son intercambiables

| | Quién lo usa | Dónde vive | Qué abre |
|---|---|---|---|
| `CLAVE_CV` | El navegador | **A la vista en el HTML del sitio** | Solo guardar un CV |
| `SECRETO` | Solo el Worker | Secreto de Cloudflare | Todas las operaciones de cuentas |

`CLAVE_CV` es `cmb-cv-2026` y está escrita en `index.html`, así que cualquiera
que vea el código fuente de la página puede mandar CVs a la hoja. Eso ya era
así antes de esto y no es urgente, pero conviene saberlo: **no es una
credencial, es un filtro de ruido.** Si algún día aparece basura en la pestaña
de CVs, esa es la razón.

`SECRETO` es otra cosa. Nunca lo pongas en el HTML, ni "solo para probar":
publicarlo le da a cualquiera acceso a los datos de todas las personas
registradas.

## Instalación

### 1. Apps Script

1. Abre la hoja del Club → Extensiones → Apps Script.
2. **Anota cómo se llama la pestaña donde hoy se guardan los CV.** Si no es
   `CVs`, cambia `PESTANAS.cv` en `apps-script-cuentas.gs` para que coincida, o
   el script creará una pestaña nueva y los CV viejos se quedarán aparte.
3. Pega el contenido de `apps-script-cuentas.gs`.
4. Configuración del proyecto → Propiedades del script:
   - `SECRETO` — cadena larga y aleatoria. Genera una con
     `openssl rand -base64 32`.
   - `CLAVE_CV` — `cmb-cv-2026`.
   - `HOJA_ID` — opcional, solo si el script no está ligado a la hoja.
   - `CARPETA_CV` — opcional, id de la carpeta de Drive donde guardar los CV.
5. Implementar → Nueva implementación → Aplicación web. Ejecutar como **yo**,
   con acceso para **cualquier usuario**. Copia la URL `.../exec`.
6. Activadores → Añadir activador → `limpiarCodigosVencidos`, diario. Borra los
   códigos vencidos para que no se acumulen hashes viejos.

Las pestañas (`usuarios`, `codigos`, `cv_historial`, `vacantes_guardadas`,
`cursos_usuario`) se crean solas la primera vez que se usan.

### 2. Worker

Sube `worker-cuentas.js` junto al Worker que ya existe y engánchalo al principio
del `fetch`:

```js
import { manejarCuentas } from './worker-cuentas.js';

export default {
  async fetch(request, env, ctx) {
    const r = await manejarCuentas(request, env);
    if (r) return r;            // era una ruta de cuentas
    // ...los endpoints que ya existen...
  }
};
```

Devuelve `null` cuando la ruta no es suya, así que no toca nada de lo que el
Worker ya hace.

Los secretos:

```sh
wrangler secret put SESION_SECRETO   # openssl rand -base64 48
wrangler secret put HOJA_SECRETO     # el mismo SECRETO del Apps Script
wrangler secret put HOJA_URL         # la URL .../exec del paso 1
```

Si falta alguno, el módulo responde 503 y lo dice en el log en vez de arrancar a
medias.

## Endpoints

| Método y ruta | Qué hace |
|---|---|
| `POST /auth/solicitar-codigo` | `{correo, nombre?}` → manda el código |
| `POST /auth/verificar-codigo` | `{correo, codigo}` → `{token, usuario}` |
| `POST /auth/salir` | Cortesía: con token firmado no hay nada que borrar |
| `GET /cuenta` | Perfil, historial, vacantes y cursos |
| `POST /cuenta/cv` | Guarda un análisis en el historial |
| `POST /cuenta/vacante` | Guarda o quita una vacante |
| `POST /cuenta/curso` | Estado de un curso del catálogo |
| `POST /cuenta/preferencias` | Activa o desactiva los avisos |

Todo lo que cuelga de `/cuenta` pide `Authorization: Bearer <token>`.

## Cosas que conviene saber antes de tocarlo

**El token va en `localStorage`, no en una cookie.** El sitio vive en
`github.io` y el Worker en `workers.dev`: son sitios distintos, así que una
cookie de sesión sería de terceros, y Safari y Firefox las bloquean por
omisión. Con cookie, el inicio de sesión simplemente no funcionaría para buena
parte de la gente. A cambio, el token es legible por JavaScript de la página:
por eso importa que el sitio no inserte HTML de terceros en el DOM.

**El techo son 100 correos al día.** Es la cuota de Apps Script para una cuenta
`gmail.com`, compartida con todo lo que mande ese script. Con sesiones de 60
días solo se gasta un correo cuando alguien vuelve a entrar, así que alcanza
para varios cientos de personas activas — pero si un día entran 150 de golpe,
las últimas no reciben su código. Cuando eso empiece a pasar, la salida es
mandar el correo desde el Worker con un servicio de correo en vez de desde
Apps Script.

**Cuando la cuota se agota, se dice.** El endpoint responde `cuotaAgotada` y un
503 en vez de fingir que el correo salió. Dejar a alguien esperando un correo
que nunca va a llegar es peor que decirle que vuelva mañana.

**Las vacantes se guardan con instantánea, no con referencia.** El pipeline
retira las vacantes por recencia cada semana. Si solo guardáramos el id, la
lista de la persona se llenaría de ligas muertas. Lo que expira se marca
`vigente = false` y se dice, igual que el resto del sitio.

**Los datos del CV se prellenan pero se pueden editar.** El correo sale de la
primera coincidencia de una expresión regular sobre el texto del CV, y puede ser
el de una referencia o el de un jefe anterior. El nombre se adivina buscando una
línea corta sin dígitos. Nada de eso es confiable como identidad, así que la
cuenta la crea la persona a propósito, confirmando sus datos. **Nunca
automáticamente al subir el CV.**

**El candado no es opcional.** Toda escritura en la hoja pasa por
`LockService`. Sin él, dos personas guardando a la vez leen el mismo último
renglón y una sobrescribe a la otra. Una hoja no tiene transacciones: el candado
es lo único que hay.

**`CUENTA` se declara con `const`, así que no cuelga de `window`.** Los
`onclick` en línea la ven porque viven en el ámbito léxico global, pero
`window.CUENTA` es `undefined`. Si algún día pruebas algo desde la consola o
desde otro script, usa `CUENTA` a secas.

## Lo que falta

- **El Aviso de Privacidad y los Términos.** Hoy no mencionan cuentas, ni
  registro, ni plazo de conservación. Este código no debería recibir usuarios
  reales hasta que esos textos estén aprobados: guardar un CV con
  consentimiento puntual es una cosa, y abrir cuentas con identidad persistente
  es otra.
- **Ejercer derechos ARCO.** Falta el camino para que alguien pida que se borre
  su cuenta. Ojo: el historial de versiones de Google Sheets conserva lo
  borrado, así que borrar el renglón no es suficiente para decir que el dato se
  suprimió.
