/**
 * Ruta /orientacion-vocacional — Cloudflare Worker
 * Club de Mentes Brillantes · Asistente de orientación vocacional (Ágora y DIANA)
 *
 * Se engancha al Worker que ya existe (cv-analisis), igual que
 * worker-calificar.js. En el fetch() principal:
 *
 *   import { manejarOrientacion } from './worker-orientacion.js';
 *   const o = await manejarOrientacion(request, env);
 *   if (o) return o;
 *
 * QUÉ HACE
 *   Recibe el perfil de una persona YA SIN IDENTIDAD (sin nombre, correo,
 *   teléfono ni tutor) con lo que contestó en su proceso y lo que la página ya
 *   calculó con reglas fijas: el mapa de afinidades y el índice de coherencia.
 *   Le pide a Claude que escriba, solo con esos datos:
 *     - una narrativa personalizada,
 *     - tres micro escenarios de futuro,
 *     - una versión para su madre, padre o tutor,
 *     - una versión para su orientador.
 *   La IA no calcula números ni elige por la persona. No se guarda nada.
 *
 * SECRETOS Y VARIABLES (los mismos que /calificar-candidato)
 *   ANTHROPIC_API_KEY   la llave que ya usa el worker
 *   MODELO_ORIENTACION  opcional; por omisión MODELO_POR_DEFECTO
 *   ORIGENES            opcional; orígenes permitidos separados por coma
 *
 * LÍMITES
 *   Perfil hasta 24,000 caracteres; 10 peticiones por minuto por IP (en
 *   memoria del worker: es un freno, no una garantía).
 */

const RUTA = '/orientacion-vocacional';
const MODELO_POR_DEFECTO = 'claude-sonnet-5-5';
const ORIGENES_POR_DEFECTO = ['https://soportetimentesbrillantes-afk.github.io'];
const LLAVE = (env) => env.ANTHROPIC_API_KEY;
const POR_MINUTO = 10;
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

const corto = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
const parrafos = (v, n) => String(v == null ? '' : v).replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);

function instrucciones(proceso) {
  const quien = proceso === 'diana' ? 'una persona universitaria o recién egresada' : 'una persona de secundaria o bachillerato';
  return 'Eres orientador vocacional del Club de Mentes Brillantes (México). Escribes para ' + quien + ' a partir de su perfil. ' +
    'Reglas: usa SOLO los datos del perfil; si algo no está, no lo inventes ni lo supongas. ' +
    'No calcules ni cambies números: el mapa de afinidades y el índice de coherencia ya vienen calculados; puedes citarlos. ' +
    'No decides por la persona ni le dices qué estudiar: muestras opciones y lo que implica cada una. ' +
    'No uses etiquetas psicológicas ni diagnósticos; el DISC describe preferencias de estilo, no capacidades. ' +
    'No prometas sueldos, empleos ni éxito; los salarios del monitoreo son del sector, no de la carrera, y así se dicen. ' +
    'No menciones género, edad, origen, religión, salud ni ningún dato personal aunque aparezca. ' +
    'Español de México, claro, cálido y concreto, sin jerga. ' +
    'Responde SOLO con JSON válido, sin texto antes ni después.';
}

function mensaje(perfil) {
  return 'Perfil (JSON):\n' + JSON.stringify(perfil) + '\n\n' +
    'Escribe:\n' +
    '1. "narrativa": 3 o 4 párrafos en segunda persona (tú) que cuenten quién es según sus resultados, qué lo mueve, qué tan coherente es su elección con su perfil (cita el índice y su componente más alto y más bajo) y qué vale la pena explorar. Termina con una pregunta para que la piense.\n' +
    '2. "escenarios": exactamente 3 micro escenarios de futuro, uno por cada opción de "opciones_escenario" en ese orden. Cada uno: "titulo" (corto), "ruta" (la opción), "a1", "a3", "a5" (una o dos frases de cómo se ve su vida a 1, 3 y 5 años si sigue esa opción, usando su presupuesto y el mercado del sector cuando estén), "que_necesita" (lo que tendría que hacer o reforzar) y "senal" (la señal de que no es para él o ella).\n' +
    '3. "padres": 2 o 3 párrafos para su madre, padre o tutor, en usted, sin jerga: qué descubrió, qué opciones considera y cómo pueden acompañarle sin decidir por él o ella.\n' +
    '4. "orientador": objeto con "resumen" (2 o 3 frases), "fortalezas" (lista de 3 a 5), "tensiones" (lista de 2 a 4 incoherencias o dudas que se ven en los datos) y "preguntas" (lista de 3 a 5 preguntas para la próxima sesión).\n' +
    'Formato: {"narrativa":"…","escenarios":[{"titulo":"…","ruta":"…","a1":"…","a3":"…","a5":"…","que_necesita":"…","senal":"…"}],"padres":"…","orientador":{"resumen":"…","fortalezas":["…"],"tensiones":["…"],"preguntas":["…"]}}';
}

async function detalleError(r) {
  try { const e = (await r.json()).error || {}; return ' (' + String(e.type || '').slice(0, 40) + ': ' + String(e.message || '').slice(0, 160) + ')'; } catch (x) { return ''; }
}

function extraerJSON(texto) {
  const i = texto.indexOf('{'), j = texto.lastIndexOf('}');
  if (i < 0 || j < i) return null;
  try { return JSON.parse(texto.slice(i, j + 1)); } catch (e) { return null; }
}
const listaCorta = (v, n, m) => (Array.isArray(v) ? v : []).map((x) => corto(x, m)).filter(Boolean).slice(0, n);

/* Lo que vuelve a la página: solo los campos esperados, recortados. */
function limpiarSalida(j, opciones) {
  const esc = (Array.isArray(j.escenarios) ? j.escenarios : []).slice(0, 3).map((x, i) => ({
    titulo: corto(x && x.titulo, 120), ruta: corto((x && x.ruta) || opciones[i] || '', 160),
    a1: corto(x && x.a1, 500), a3: corto(x && x.a3, 500), a5: corto(x && x.a5, 500),
    que_necesita: corto(x && x.que_necesita, 600), senal: corto(x && x.senal, 400),
  })).filter((x) => x.a1 || x.a3 || x.a5);
  const o = j.orientador || {};
  return {
    narrativa: parrafos(j.narrativa, 4000),
    escenarios: esc,
    padres: parrafos(j.padres, 3000),
    orientador: {
      resumen: corto(o.resumen, 800),
      fortalezas: listaCorta(o.fortalezas, 6, 300),
      tensiones: listaCorta(o.tensiones, 5, 400),
      preguntas: listaCorta(o.preguntas, 6, 300),
    },
  };
}

export async function manejarOrientacion(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== RUTA) return null;
  if (request.method === 'OPTIONS') return responder({ ok: true }, request, env, 204);
  if (request.method !== 'POST') return responder({ ok: false, error: 'Usa POST.' }, request, env, 405);
  if (!LLAVE(env)) return responder({ ok: false, error: 'Falta configurar la llave de la IA.' }, request, env, 500);
  if (!limitar(request)) return responder({ ok: false, error: 'Demasiadas solicitudes. Espera un minuto.' }, request, env, 429);

  let d;
  try { d = await request.json(); } catch (e) { return responder({ ok: false, error: 'Formato inválido.' }, request, env, 400); }
  const perfil = d && typeof d.perfil === 'object' && d.perfil ? d.perfil : null;
  const crudo = perfil ? JSON.stringify(perfil) : '';
  if (!perfil || crudo.length < 50) return responder({ ok: false, error: 'Falta el perfil.' }, request, env, 400);
  if (crudo.length > 24000) return responder({ ok: false, error: 'El perfil es demasiado largo.' }, request, env, 413);
  // Por si acaso: el perfil no debe traer identidad. La página ya la quita.
  ['nombre', 'correo', 'telefono', 'tutor', 'correoTutor'].forEach((k) => { delete perfil[k]; });
  const proceso = perfil.proceso === 'diana' ? 'diana' : 'agora';
  const opciones = (Array.isArray(perfil.opciones_escenario) ? perfil.opciones_escenario : []).map((x) => corto(x, 160)).slice(0, 3);

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': LLAVE(env), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: env.MODELO_ORIENTACION || MODELO_POR_DEFECTO,
        max_tokens: 4000,
        temperature: 0.4,
        system: instrucciones(proceso),
        messages: [{ role: 'user', content: mensaje(perfil) }],
      }),
    });
  } catch (e) {
    return responder({ ok: false, error: 'No hubo conexión con la IA.' }, request, env, 502);
  }
  if (!r.ok) return responder({ ok: false, error: 'La IA respondió con error ' + r.status + (await detalleError(r)) + '.' }, request, env, 502);
  const respuesta = await r.json();
  const texto = ((respuesta.content || []).find((b) => b.type === 'text') || {}).text || '';
  const j = extraerJSON(texto);
  if (!j || !j.narrativa) return responder({ ok: false, error: 'La IA no devolvió el formato esperado.' }, request, env, 502);
  return responder(Object.assign({ ok: true }, limpiarSalida(j, opciones)), request, env);
}
