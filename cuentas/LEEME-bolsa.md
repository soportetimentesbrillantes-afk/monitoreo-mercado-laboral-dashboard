# Bolsa de trabajo del Club

Dos páginas y un Apps Script:

| Archivo | Qué es |
|---|---|
| `vacantes.html` | Para postulantes: vacantes abiertas, postulación con CV y datos. |
| `empleador.html` + `empleador.js` | Para empresas: entran con su clave, crean vacantes con el flujo de Comparación de CVs y reciben las postulaciones con su Perfil DISC. |
| `postulacion-disc.js` | En `disc-agora.html?postulacion=<token>`: dice para qué vacante es el DISC y lo manda a la postulación con «Enviar a la empresa». |
| `bolsa.js` | Conexión con el Apps Script (constante `URL_BOLSA`). |
| `cuentas/apps-script-bolsa.gs` | El Apps Script, ligado a una hoja propia. |
| `cuentas/pruebas/test_bolsa.mjs` | 8 pruebas: el script en una hoja falsa y las tres páginas en navegador. |

## El DISC es solo informativo

El estilo DISC de cada postulante se muestra junto a su CV, en el filtro ATS
y en el ranking, y la IA lo comenta en el reporte («Estilo de trabajo»).
**No entra a los duelos ni al filtro, y no cambia el ranking.** Así lo
decidió Gael el 2026-11-27: la investigación del documento de método y los
propios creadores del DiSC desaconsejan usarlo para elegir.

## Instalación (una vez, con la cuenta del Club)

1. Crea una hoja de Google: «Bolsa de trabajo del Club (uso interno)».
2. Extensiones → Apps Script. Pega `cuentas/apps-script-bolsa.gs` y guarda.
3. Ejecuta `instalar()` y autoriza (hoja, correo y caché). Crea las pestañas
   Léeme, Empresas, Vacantes y Postulaciones, y la propiedad `PIMIENTA`.
4. Implementar → Nueva implementación → Aplicación web. Ejecutar como: yo.
   Acceso: cualquier persona. Copia la URL `.../exec` en `bolsa.js`
   (`URL_BOLSA`) y súbelo.
5. Recarga la hoja: aparece el menú **Bolsa del Club**. Con **Dar de alta una
   empresa** se crea cada empresa; la clave se muestra una sola vez. Entrégala
   por un canal privado.
6. La comparación con IA usa el Worker `cmb-ia`: vuelve a pegar `worker-ia.js`
   (ya trae el comentario de estilo en el reporte).

## Qué guarda y quién lo ve

- **Empresas:** nombre, correo de contacto y el hash de la clave (nunca la clave).
- **Vacantes:** lo público (ciudad, modalidad, sueldo, descripción,
  requisitos, cierre) y la configuración (rúbrica y filtro ATS), que el
  postulante no ve.
- **Postulaciones:** nombre, correo, teléfono, ciudad, texto del CV, token del
  DISC, resultado del DISC y cuándo la empresa vio el contacto.
- La empresa recibe el CV con el nombre solo para ocultarlo en su navegador;
  correo y teléfono no viajan hasta que toca «Ver contacto», y eso queda en la
  columna «Contacto visto».
- Cada empresa ve solo sus vacantes y postulaciones. 20 claves equivocadas
  seguidas bloquean el acceso 10 minutos.

## Límites

- Correos: 100 al día con una cuenta Gmail, compartidos con todo lo que manda
  esa cuenta. Si se agotan, la postulación se guarda igual y la página le da
  al postulante el botón para hacer su DISC ahí mismo.
- La rúbrica, el filtro y las comparaciones de cada vacante viven en el
  navegador de la empresa; al tocar «Guardar cambios» la rúbrica y el filtro
  también quedan en la hoja. Los duelos ya hechos no se copian a otro equipo.
