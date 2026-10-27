# Compartir DISC y FODA con el Club

Las páginas `disc.html`, `disc-agora.html` y `foda.html` funcionan completas en
el navegador de la persona. Al final ofrecen una opción: **compartir el
resultado con el Club** para que un orientador le dé seguimiento. Lo que se
comparte llega a la hoja interna
[Autoconocimiento DISC y FODA (uso interno)](https://docs.google.com/spreadsheets/d/1QRybfvknJWvmEgQWd5bBdl5jvr48aezxmZS90h2_GTU/edit),
en la carpeta raíz del proyecto en Drive.

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `../compartir-club.js` | La tarjeta de compartir que usan las tres páginas. Aquí va la URL del Apps Script. |
| `apps-script-autoconocimiento.gs` | El script que recibe los envíos y escribe en la hoja. Se pega en la hoja. |
| `pruebas/test_compartir.mjs` | Las páginas: nada sale sin casilla y botón; lo que llega es lo que se dice. |
| `pruebas/test_apps_script_autoconocimiento.mjs` | El script, sin Google: validación, filas sin duplicar, fórmulas desactivadas. |

## Reglas que no se rompen

- **La casilla empieza sin marcar.** Nada se envía si la persona no la marca y
  toca "Enviar al Club". No hay envío al terminar el cuestionario ni al escribir
  en el FODA. Hay una prueba para cada una de esas dos cosas.
- **Quien no comparte usa la herramienta igual.** La tarjeta lo dice.
- **Se dice qué se manda, a quién, para qué y cómo pedir que se borre.** Y el
  [Aviso de Privacidad](../aviso-privacidad.html) lo dice en su sección 2.

## Instalación (una vez, desde la cuenta de Google del Club)

1. Abre la hoja *Autoconocimiento DISC y FODA (uso interno)*.
2. **Extensiones → Apps Script.** Borra lo que haya en el editor y pega todo
   `apps-script-autoconocimiento.gs`. Guarda (ícono de disco).
3. Arriba, en el selector de funciones, elige **`revisarPestanas`** y dale
   **Ejecutar**. Google pide permisos la primera vez: *Revisar permisos* → tu
   cuenta → *Configuración avanzada* → *Ir a… (no seguro)* → *Permitir*. Es tu
   propio script; el aviso sale porque Google no lo ha revisado. Debe terminar
   sin error.
4. **Implementar → Nueva implementación.** En el engrane, tipo **Aplicación
   web**. *Ejecutar como:* **Yo**. *Quién tiene acceso:* **Cualquier usuario**.
   *Implementar*.
5. Copia la **URL de la aplicación web** (termina en `/exec`).
6. Abre `compartir-club.js` y pégala aquí:

   ```js
   const COMPARTIR_ENDPOINT = (typeof window !== 'undefined' && window.__CMB_ENDPOINT_PRUEBA) || 'https://script.google.com/macros/s/.../exec';
   ```

   Es decir, cambia las dos comillas vacías `''` del final por la URL entre
   comillas. Sube `compartir-club.js` al repositorio.
7. Prueba en el sitio en vivo: contesta el FODA con un dato de prueba,
   comparte con tu correo y revisa que aparezca la fila en la pestaña FODA.
   Borra esa fila después.

**Mientras la URL esté vacía, la tarjeta no aparece** y las páginas se
comportan exactamente como antes. Por eso se puede subir todo el código hoy y
activarlo cuando el script esté publicado.

Si algún día cambias el script: *Implementar → Gestionar implementaciones* →
lápiz → *Versión: nueva versión* → *Implementar*. Así la URL no cambia. Si en
vez de eso haces una implementación nueva, cambia la URL y hay que pegarla otra
vez en `compartir-club.js`.

## Qué llega a la hoja

**DISC** — una fila por cuestionario terminado. Si la persona toca "Enviar"
dos veces sobre el mismo resultado, se actualiza la misma fila; si vuelve a
contestar, es una fila nueva. Trae los cuatro puntajes, estilo dominante y
segundo, la lectura (dominante claro, empate o parejo), el instrumento, y las
**respuestas crudas**.

Las respuestas crudas están a propósito. La clave de colores del cuestionario
de Ágora tiene tres supuestos por confirmar (secciones a, c y d; ver `CLAVE`
en `disc-agora.html`). Si Ágora confirma otra cosa, con esa columna se puede
volver a puntuar a todos sin pedirles que contesten de nuevo. La columna
*Versión de la clave* dice con qué clave se calculó cada fila.

**FODA** — una fila por persona y dispositivo. Si lo corrige y lo vuelve a
compartir, se actualiza la misma fila: *Último envío* cambia, *Primer envío* se
conserva. Si borra su FODA y escribe otro, es otra fila.

Puedes agregar columnas tuyas a la derecha (notas del orientador, fecha de
seguimiento). El script busca las columnas por nombre: no renombres ni borres
las originales.

## Proceso Ágora

`agora.html` usa el mismo script y la misma URL. Con la casilla del expediente
marcada, cada fase completa llega con `tipo: "agora"` y el script escribe en dos
pestañas que crea solo la primera vez: **Expediente Ágora** (una fila por
persona, con su avance de 10 fases) y **Ágora · Información inicial**. Si ya
publicaste el script antes de este cambio, pega la versión nueva y haz
*Gestionar implementaciones → editar → Versión nueva* para que la URL no cambie.

El Perfil DISC (fase 2) y el FODA (fase 3) del proceso se escriben en las
pestañas **DISC** y **FODA** de siempre, con el mismo *ID de envío* que el
expediente: así se cruza a la persona entre pestañas. Ninguna fase se acepta
si ese ID no tiene antes su fila en *Expediente Ágora* (la fase 1).

## Cosas que conviene saber

**La clave no es un secreto.** `cmb-autoconocimiento-2026` está escrita en
`compartir-club.js`, que es público. Filtra bots que peguen al URL a ciegas; no
autoriza nada. Lo que protege la hoja es que **el script solo sabe escribir**:
no hay ninguna acción que devuelva datos. Si algún día le agregas una, deja de
ser seguro tenerlo abierto a "cualquier usuario".

**Alguien podría mandar datos falsos.** Cualquiera que lea el código puede
enviar un DISC inventado con el nombre de otra persona. Para orientación eso
no es grave; para cualquier decisión sobre alguien, sí. Es una razón más para
que estos datos nunca se usen para seleccionar o descartar a nadie.

**Borrar una fila no borra el dato del todo.** Google Sheets guarda historial
de versiones y ahí sigue lo borrado. Si alguien ejerce su derecho de
cancelación, además de borrar la fila hay que saberlo: el historial se limpia
haciendo una copia de la hoja (*Archivo → Crear una copia*), que nace sin
historial, y borrando la original.

**Compartir la hoja.** Es un perfil de preferencias de cada persona.
Compártela solo con quien orienta, como lector si no necesita editar.
