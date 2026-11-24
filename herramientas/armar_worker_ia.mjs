/**
 * Arma worker-ia.js: UN solo archivo con las tres rutas de IA del Club,
 * listo para pegar completo en un Worker nuevo de Cloudflare ("cmb-ia").
 *
 *   node herramientas/armar_worker_ia.mjs
 *
 * Toma worker-calificar.js, worker-orientacion.js y worker-comparar.js tal
 * cual y mete cada uno en su propio bloque para que sus nombres internos
 * (RUTA, responder, limitar…) no choquen. Si cambias alguno de los tres,
 * vuelve a correr este script.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const RAIZ = new URL('../', import.meta.url).pathname;
const RUTAS = [
  ['worker-calificar.js', 'manejarCalificar', '/calificar-candidato'],
  ['worker-orientacion.js', 'manejarOrientacion', '/orientacion-vocacional'],
  ['worker-comparar.js', 'manejarComparar', '/comparar-cvs'],
];
const bloques = RUTAS.map(([f, fn, ruta]) => {
  let s = readFileSync(join(RAIZ, f), 'utf8');
  const n = (s.match(/^export /gm) || []).length;
  if (n !== 1 || !s.includes('export async function ' + fn + '(')) throw new Error(f + ': se esperaba un solo export, ' + fn);
  s = s.replace(/^export /m, '');
  return '// ===================================================================\n// ' + ruta + '  (de ' + f + ')\n// ===================================================================\n' +
    'const ' + fn + ' = (() => {\n' + s.trim() + '\nreturn ' + fn + ';\n})();\n';
});
const salida = `/**
 * Worker "cmb-ia" — Club de Mentes Brillantes
 * Las tres rutas de IA del sitio en un solo archivo:
${RUTAS.map(([f, , r]) => ' *   ' + r.padEnd(26) + ' (' + f + ')').join('\n')}
 *
 * CÓMO SE INSTALA: se pega COMPLETO en un Worker nuevo y se le agrega el
 * secreto ANTHROPIC_API_KEY. Ver INSTALAR-WORKER-IA.txt.
 *
 * No edites aquí: este archivo lo arma herramientas/armar_worker_ia.mjs a
 * partir de los tres archivos de arriba.
 */

${bloques.join('\n')}
const MANEJADORES = [${RUTAS.map(([, fn]) => fn).join(', ')}];

export default {
  async fetch(request, env, ctx) {
    for (const manejar of MANEJADORES) {
      const r = await manejar(request, env);
      if (r) return r;
    }
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') {
      return new Response('Worker de IA del Club de Mentes Brillantes. Rutas: ${RUTAS.map(([, , r]) => r).join(', ')}', { headers: { 'content-type': 'text/plain;charset=utf-8' } });
    }
    return new Response(JSON.stringify({ ok: false, error: 'Ruta no encontrada.' }), { status: 404, headers: { 'content-type': 'application/json;charset=utf-8' } });
  },
};
`;
writeFileSync(join(RAIZ, 'worker-ia.js'), salida);
console.log('worker-ia.js: ' + salida.length + ' caracteres, ' + RUTAS.length + ' rutas');
