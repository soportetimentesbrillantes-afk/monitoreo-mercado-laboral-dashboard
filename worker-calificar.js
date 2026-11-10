/**
 * Ruta /calificar-candidato — Cloudflare Worker
 * Club de Mentes Brillantes · Selección Justa (seleccion.html)
 *
 * Se engancha al Worker que ya existe (cv-analisis), igual que worker-cuentas.js.
 * No lo reemplaza: en el fetch() principal se llama a manejarCalificar(); si
 * devuelve null, la petición no era para esta ruta y sigue su camino normal.
 *
 *   import { manejarCalificar } from './worker-calificar.js';
 *
 *   export default {
 *     async fetch(request, env, ctx) {
 *       const c = await manejarCalificar(request, env);
 *       if (c) return c;
 *       ...lo que ya existe...
 *     }
 *   };
 *
 * QUÉ HACE
 *   Recibe la rúbrica de la vacante y el perfil de UN candidato, ya sin
 *   identidad (la página oculta nombre, edad, género, domicilio… antes de
 *   enviarlo), y le pide a Claude una calificación de 1 a 5 por competencia con
 *   una cita textual del perfil como evidencia. No guarda nada: no hay base de
 *   datos ni registro del perfil.
 *
 * SECRETOS Y VARIABLES
 *   ANTHROPIC_API_KEY  La misma llave que ya usan /revisar-cv y
 *                      /recomendar-empleos. Si en el worker se llama distinto,
 *                      cambia LLAVE() abajo.
 *   MODELO_CALIFICAR   Opcional. El modelo de Claude a usar; por omisión el de
 *                      MODELO_POR_DEFECTO. Conviene usar el mismo que las demás
 *                      rutas del worker.
 *   ORIGENES           Opcional. Orígenes permitidos separados por coma.
 *
 * LÍMITES
 *   Perfil hasta 8,000 caracteres, hasta 8 competencias, 30 peticiones por
 *   minuto por IP (en memoria del worker: es un freno, no una garantía).
 */

const RUTA = '/calificar-candidato';
const MODELO_POR_DEFECTO = 'claude-sonnet-4-5';
const ORIGENES_POR_DEFECTO = ['https://soportetimentesbrillantes-afk.github.io'];
const LLAVE = (env) => env.ANTHROPIC_API_KEY;
const POR_MINUTO = 30;
const ventanas = new Map();

function origenPermitido(request, env) {
  const lista = env.ORIGENES ? env.ORIGENES.split(',').map((o) => o.trim()).filter(Boolean) : ORIGENES_POR_DEFECTO;
  const origen = request.headers.get('Origin') || '';
  return lista.includes(origen) ? origen : lista[0];
}

function responder(cuerpo, request, env, estado = 200) {
  return new Response(estado === 204 ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: {
      'content-type': 'application/json;charset=utf-8',
      'access-control-allow-origin': origenPermitido(request, env),
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'vary': 'Origin',
      'cache-control': 'no-store',
    },
  });
}

function limitar(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'desconocida';
  const ahora = Date.now();
  const v = (ventanas.get(ip) || []).filter((t) => ahora - t < 60000);
  if (v.length >= POR_MINUTO) return false;
  v.push(ahora);
  ventanas.set(ip, v);
  return true;
}

const corto = (v, n) => String(v == null ? '' : v).slice(0, n);

function instrucciones() {
  return 'Eres un evaluador de selección de personal del Club de Mentes Brillantes. ' +
    'Calificas a un candidato SOLO con la evidencia escrita en su perfil y la rúbrica de la vacante. ' +
    'Reglas: no adivines ni uses género, edad, origen, nombre, apariencia, estado civil, religión, ' +
    'escuela de prestigio ni ningún dato personal; si el perfil trae alguno, ignóralo. ' +
    'Si no hay evidencia para una competencia, califica 1 y dilo en la razón. ' +
    'Cada evidencia es una cita textual corta copiada del perfil, o vacía si no hay. ' +
    'Responde SOLO con JSON válido, sin texto antes ni después.';
}

function mensaje(d) {
  return 'Puesto: ' + d.puesto + '\n\nRúbrica (1 a 5):\n' +
    d.competencias.map((k) => '- ' + k.id + ' ' + k.nombre + ': 1 = ' + k.n1 + '; 3 = ' + k.n3 + '; 5 = ' + k.n5).join('\n') +
    '\n\nPerfil:\n"""\n' + d.perfil + '\n"""\n\n' +
    'Formato: {"calificaciones":[{"id":"<id de la competencia>","puntaje":<1 a 5>,"evidencia":"<cita textual o vacío>","razon":"<una frase>"}]} ' +
    'con una entrada por cada competencia de la rúbrica.';
}

function extraerJSON(texto) {
  const i = texto.indexOf('{'), j = texto.lastIndexOf('}');
  if (i < 0 || j < i) return null;
  try { return JSON.parse(texto.slice(i, j + 1)); } catch (e) { return null; }
}

export async function manejarCalificar(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== RUTA) return null;
  if (request.method === 'OPTIONS') return responder({ ok: true }, request, env, 204);
  if (request.method !== 'POST') return responder({ ok: false, error: 'Usa POST.' }, request, env, 405);
  if (!LLAVE(env)) return responder({ ok: false, error: 'Falta configurar la llave de la IA.' }, request, env, 500);
  if (!limitar(request)) return responder({ ok: false, error: 'Demasiadas solicitudes. Espera un minuto.' }, request, env, 429);

  let d;
  try { d = await request.json(); } catch (e) { return responder({ ok: false, error: 'Formato inválido.' }, request, env, 400); }
  const competencias = Array.isArray(d.competencias) ? d.competencias.slice(0, 8).map((k) => ({
    id: corto(k.id, 40).replace(/[^A-Za-z0-9_-]/g, ''), nombre: corto(k.nombre, 120),
    n1: corto(k.n1, 300), n3: corto(k.n3, 300), n5: corto(k.n5, 300),
  })).filter((k) => k.id && k.nombre) : [];
  const perfil = corto(d.perfil, 8000).trim();
  if (!competencias.length || perfil.length < 20) return responder({ ok: false, error: 'Faltan la rúbrica o el perfil.' }, request, env, 400);
  const datos = { puesto: corto(d.puesto, 200), competencias, perfil };

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': LLAVE(env), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: env.MODELO_CALIFICAR || MODELO_POR_DEFECTO,
        max_tokens: 1500,
        temperature: 0,
        system: instrucciones(),
        messages: [{ role: 'user', content: mensaje(datos) }],
      }),
    });
  } catch (e) {
    return responder({ ok: false, error: 'No hubo conexión con la IA.' }, request, env, 502);
  }
  if (!r.ok) return responder({ ok: false, error: 'La IA respondió con error ' + r.status + '.' }, request, env, 502);
  const respuesta = await r.json();
  const texto = ((respuesta.content || []).find((b) => b.type === 'text') || {}).text || '';
  const j = extraerJSON(texto);
  if (!j || !Array.isArray(j.calificaciones)) return responder({ ok: false, error: 'La IA no devolvió el formato esperado.' }, request, env, 502);

  const ids = new Set(competencias.map((k) => k.id));
  const calificaciones = j.calificaciones.filter((x) => x && ids.has(String(x.id))).map((x) => ({
    id: String(x.id),
    puntaje: Math.max(1, Math.min(5, Math.round(Number(x.puntaje) || 1))),
    evidencia: corto(x.evidencia, 400),
    razon: corto(x.razon, 300),
  }));
  return responder({ ok: true, calificaciones }, request, env);
}
