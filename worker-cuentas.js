/**
 * Módulo de cuentas — Cloudflare Worker
 * Club de Mentes Brillantes · monitoreo del mercado laboral
 *
 * Se engancha al Worker que ya existe (cv-analisis). No lo reemplaza: en el
 * fetch() principal se llama primero a manejarCuentas(); si devuelve null, la
 * petición no era de cuentas y sigue su camino normal.
 *
 *   import { manejarCuentas } from './worker-cuentas.js';
 *
 *   export default {
 *     async fetch(request, env, ctx) {
 *       const r = await manejarCuentas(request, env);
 *       if (r) return r;
 *       ...los endpoints que ya existen...
 *     }
 *   };
 *
 * QUIÉN GUARDA QUÉ
 *   El Worker no tiene base de datos. Los datos de la persona viven en la hoja
 *   de Google del Club, detrás de un Apps Script (ver apps-script-cuentas.gs).
 *   Lo que el Worker sí hace, y la hoja no debe hacer, es la seguridad:
 *
 *   - La sesión es un token firmado con HMAC. NO se guarda en ningún lado: se
 *     verifica con la firma. Así no hay una tabla de sesiones que alguien con
 *     acceso al Drive pueda leer para suplantar a una persona.
 *   - Del código de acceso, la hoja solo guarda un hash con sal. Aunque alguien
 *     lea la hoja, no puede iniciar sesión con lo que ve.
 *
 * SECRETOS (wrangler secret put ...)
 *   SESION_SECRETO  Firma los tokens de sesión. Cadena larga y aleatoria.
 *                   Cambiarlo cierra la sesión de todo el mundo.
 *   HOJA_SECRETO    Autentica al Worker frente al Apps Script. NUNCA va en el
 *                   HTML del sitio: si se publica, cualquiera puede escribir en
 *                   la hoja del Club.
 *   HOJA_URL        URL del Apps Script publicado (.../exec).
 *   ORIGENES        Opcional. Orígenes permitidos separados por coma.
 */

const ORIGENES_POR_DEFECTO = [
  'https://soportetimentesbrillantes-afk.github.io',
];

const DURACION_SESION_DIAS = 60;
const VIGENCIA_CODIGO_MIN = 10;
const INTENTOS_POR_CODIGO = 3;
const CODIGOS_POR_HORA = 3;

// ─────────────────────────────── utilidades ───────────────────────────────

const cod = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deB64url(texto) {
  const s = texto.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function firmar(mensaje, secreto) {
  const llave = await crypto.subtle.importKey(
    'raw', cod.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', llave, cod.encode(mensaje)));
}

/** Comparación en tiempo constante: comparar con === filtra información por
 *  el tiempo que tarda en fallar, y con firmas eso se puede explotar. */
function igualesEnTiempoConstante(a, b) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
  return dif === 0;
}

async function sha256Hex(texto) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', cod.encode(texto)));
  return Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Correo normalizado. Solo espacios y mayúsculas: no se quitan puntos ni
 *  sufijos +etiqueta, que son convenciones de Gmail y no de todos. */
function normalizarCorreo(valor) {
  return String(valor || '').trim().toLowerCase();
}

function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);
}

/** Código de 6 dígitos sin sesgo de módulo: se descartan los valores del
 *  último tramo incompleto en vez de doblarlos sobre el rango. */
function generarCodigo() {
  const tope = Math.floor(0xffffffff / 1000000) * 1000000;
  const buf = new Uint32Array(1);
  let n;
  do { crypto.getRandomValues(buf); n = buf[0]; } while (n >= tope);
  return String(n % 1000000).padStart(6, '0');
}

function sal() {
  return b64url(crypto.getRandomValues(new Uint8Array(16)));
}

// ──────────────────────────────── sesión ────────────────────────────────

async function emitirToken(usuario, env) {
  const ahora = Math.floor(Date.now() / 1000);
  const carga = {
    uid: usuario.id,
    correo: usuario.correo,
    iat: ahora,
    exp: ahora + DURACION_SESION_DIAS * 86400,
  };
  const cuerpo = b64url(cod.encode(JSON.stringify(carga)));
  const firma = b64url(await firmar(cuerpo, env.SESION_SECRETO));
  return `${cuerpo}.${firma}`;
}

/** Devuelve la carga del token, o null si la firma no cuadra o ya expiró.
 *  Nunca lanza: un token malformado es una sesión inválida, no un error 500. */
async function leerToken(token, env) {
  try {
    const [cuerpo, firma] = String(token || '').split('.');
    if (!cuerpo || !firma) return null;
    const esperada = await firmar(cuerpo, env.SESION_SECRETO);
    if (!igualesEnTiempoConstante(deB64url(firma), esperada)) return null;
    const carga = JSON.parse(new TextDecoder().decode(deB64url(cuerpo)));
    if (!carga || typeof carga.exp !== 'number') return null;
    if (carga.exp < Math.floor(Date.now() / 1000)) return null;
    return carga;
  } catch {
    return null;
  }
}

// ───────────────────────────── puente a la hoja ─────────────────────────────

async function hoja(env, accion, datos) {
  const r = await fetch(env.HOJA_URL, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion, secreto: env.HOJA_SECRETO, ...datos }),
  });
  if (!r.ok) throw new Error(`La hoja respondió ${r.status}`);
  const d = await r.json();
  if (!d || d.ok !== true) throw new Error((d && d.error) || 'respuesta inesperada de la hoja');
  return d;
}

// ──────────────────────────────── respuestas ────────────────────────────────

function origenPermitido(request, env) {
  const lista = env.ORIGENES
    ? env.ORIGENES.split(',').map((o) => o.trim()).filter(Boolean)
    : ORIGENES_POR_DEFECTO;
  const origen = request.headers.get('Origin') || '';
  return lista.includes(origen) ? origen : lista[0];
}

function responder(cuerpo, request, env, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: {
      'content-type': 'application/json;charset=utf-8',
      'access-control-allow-origin': origenPermitido(request, env),
      'vary': 'Origin',
      'cache-control': 'no-store',
    },
  });
}

function error(mensaje, request, env, estado = 400) {
  return responder({ ok: false, error: mensaje }, request, env, estado);
}

// ───────────────────────────────── rutas ─────────────────────────────────

/**
 * Pide un código de acceso.
 *
 * Responde ok:true pase lo que pase con el correo. Si respondiera distinto
 * cuando la cuenta existe, cualquiera podría averiguar quién está registrado
 * probando correos. Lo único que sí se informa es que la cuota diaria de
 * correos se agotó, porque eso la persona necesita saberlo para no quedarse
 * esperando un correo que no va a llegar.
 */
async function solicitarCodigo(request, env, cuerpo) {
  const correo = normalizarCorreo(cuerpo.correo);
  if (!correoValido(correo)) return error('Ese correo no parece válido.', request, env);

  const nombre = String(cuerpo.nombre || '').trim().slice(0, 80);
  const codigo = generarCodigo();
  const laSal = sal();

  try {
    const r = await hoja(env, 'guardar-codigo', {
      correo,
      nombre,
      hash: await sha256Hex(codigo + laSal + correo),
      sal: laSal,
      expira: Date.now() + VIGENCIA_CODIGO_MIN * 60000,
      intentos: INTENTOS_POR_CODIGO,
      codigosPorHora: CODIGOS_POR_HORA,
      // El código va en claro porque la hoja es quien manda el correo. Lo usa
      // y lo descarta: en la hoja solo queda el hash.
      codigoParaCorreo: codigo,
      vigenciaMin: VIGENCIA_CODIGO_MIN,
    });
    if (r.cuotaAgotada) {
      return responder({
        ok: false,
        cuotaAgotada: true,
        error: 'Hoy ya no podemos enviar más códigos. Inténtalo mañana.',
      }, request, env, 503);
    }
  } catch (e) {
    console.error('solicitar-codigo:', e.message);
    return error('No pudimos enviar el código en este momento.', request, env, 502);
  }

  return responder({ ok: true, vigenciaMin: VIGENCIA_CODIGO_MIN }, request, env);
}

async function verificarCodigo(request, env, cuerpo) {
  const correo = normalizarCorreo(cuerpo.correo);
  const codigo = String(cuerpo.codigo || '').replace(/\D/g, '');
  if (!correoValido(correo) || codigo.length !== 6) {
    return error('Revisa el correo y el código de 6 dígitos.', request, env);
  }

  let r;
  try {
    r = await hoja(env, 'leer-codigo', { correo });
  } catch (e) {
    console.error('leer-codigo:', e.message);
    return error('No pudimos verificar el código en este momento.', request, env, 502);
  }

  const mal = () => error('El código no es correcto o ya venció.', request, env, 401);
  if (!r.pendiente) return mal();
  if (Number(r.pendiente.expira) < Date.now()) return mal();
  if (Number(r.pendiente.intentos) <= 0) return mal();

  const hash = await sha256Hex(codigo + r.pendiente.sal + correo);
  if (!igualesEnTiempoConstante(cod.encode(hash), cod.encode(String(r.pendiente.hash)))) {
    // Descontar el intento importa: sin esto, seis dígitos se adivinan a fuerza
    // bruta en minutos.
    try { await hoja(env, 'fallar-intento', { correo }); } catch (e) { console.error(e.message); }
    return mal();
  }

  let usuario;
  try {
    const alta = await hoja(env, 'confirmar-usuario', {
      correo,
      nombre: String(cuerpo.nombre || '').trim().slice(0, 80),
      avisos: cuerpo.avisos === true,
    });
    usuario = alta.usuario;
  } catch (e) {
    console.error('confirmar-usuario:', e.message);
    return error('No pudimos crear tu cuenta en este momento.', request, env, 502);
  }

  return responder({
    ok: true,
    token: await emitirToken(usuario, env),
    usuario,
    expiraEnDias: DURACION_SESION_DIAS,
  }, request, env);
}

async function conSesion(request, env, fn) {
  const cabecera = request.headers.get('Authorization') || '';
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : '';
  const sesion = await leerToken(token, env);
  if (!sesion) return error('Tu sesión venció. Vuelve a entrar.', request, env, 401);
  try {
    return await fn(sesion);
  } catch (e) {
    console.error('cuenta:', e.message);
    return error('No pudimos completar la operación.', request, env, 502);
  }
}

// ─────────────────────────────── enrutador ───────────────────────────────

export async function manejarCuentas(request, env) {
  const ruta = new URL(request.url).pathname.replace(/\/+$/, '');
  if (!ruta.startsWith('/auth/') && !ruta.startsWith('/cuenta')) return null;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': origenPermitido(request, env),
        'access-control-allow-methods': 'POST, GET, OPTIONS',
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-max-age': '86400',
        'vary': 'Origin',
      },
    });
  }

  if (!env.SESION_SECRETO || !env.HOJA_SECRETO || !env.HOJA_URL) {
    console.error('Faltan secretos: SESION_SECRETO, HOJA_SECRETO u HOJA_URL');
    return error('El servicio de cuentas no está configurado.', request, env, 503);
  }

  let cuerpo = {};
  if (request.method === 'POST') {
    try { cuerpo = await request.json(); } catch { cuerpo = {}; }
  }

  switch (`${request.method} ${ruta}`) {
    case 'POST /auth/solicitar-codigo':
      return solicitarCodigo(request, env, cuerpo);

    case 'POST /auth/verificar-codigo':
      return verificarCodigo(request, env, cuerpo);

    case 'GET /cuenta':
      return conSesion(request, env, async (s) =>
        responder({ ok: true, ...(await hoja(env, 'leer-cuenta', { uid: s.uid })) }, request, env));

    case 'POST /cuenta/cv':
      return conSesion(request, env, async (s) => {
        await hoja(env, 'guardar-cv', { uid: s.uid, analisis: cuerpo.analisis || {} });
        return responder({ ok: true }, request, env);
      });

    // La vacante se guarda con una instantánea de sus datos, no solo su id.
    // Las vacantes se retiran cada semana por recencia; si guardáramos solo la
    // referencia, la lista se llenaría de huecos. Lo que ya no está vigente se
    // marca como tal, no se borra ni se rellena.
    case 'POST /cuenta/vacante':
      return conSesion(request, env, async (s) => {
        await hoja(env, 'guardar-vacante', {
          uid: s.uid,
          quitar: cuerpo.quitar === true,
          vacante: cuerpo.vacante || {},
        });
        return responder({ ok: true }, request, env);
      });

    case 'POST /cuenta/curso':
      return conSesion(request, env, async (s) => {
        await hoja(env, 'guardar-curso', {
          uid: s.uid,
          idCurso: String(cuerpo.idCurso || ''),
          estado: String(cuerpo.estado || ''),
        });
        return responder({ ok: true }, request, env);
      });

    case 'POST /cuenta/preferencias':
      return conSesion(request, env, async (s) => {
        await hoja(env, 'guardar-preferencias', { uid: s.uid, avisos: cuerpo.avisos === true });
        return responder({ ok: true }, request, env);
      });

    // Con token firmado no hay sesión que borrar en el servidor: cerrar sesión
    // es tirar el token en el navegador. Existe el endpoint para que el cliente
    // tenga un lugar al cual llamar y para poder añadir revocación después.
    case 'POST /auth/salir':
      return responder({ ok: true }, request, env);

    default:
      return error('Ruta no encontrada.', request, env, 404);
  }
}
