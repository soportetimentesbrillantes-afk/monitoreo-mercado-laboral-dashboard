/**
 * Pruebas del módulo de cuentas del Worker.
 *
 *   node cuentas/pruebas/test_cuentas.mjs
 *
 * No tocan Google ni Cloudflare: la hoja se reemplaza por un doble en memoria
 * que imita las acciones de apps-script-cuentas.gs. Lo que se prueba aquí es lo
 * que el Worker sí controla — firma de sesión, hash de códigos, expiración,
 * tope de intentos — porque es donde un error se paga caro y en silencio.
 */
import { manejarCuentas } from '../worker-cuentas.js';

// ──────────────────────────── doble de la hoja ────────────────────────────

const hoja = { codigos: new Map(), usuarios: new Map(), correosEnviados: [], cuota: 100 };

function reiniciarHoja() {
  hoja.codigos.clear();
  hoja.usuarios.clear();
  hoja.correosEnviados.length = 0;
  hoja.cuota = 100;
}

globalThis.fetch = async (_url, opciones) => {
  const d = JSON.parse(opciones.body);
  const ok = (extra = {}) => new Response(JSON.stringify({ ok: true, ...extra }), { status: 200 });

  switch (d.accion) {
    case 'guardar-codigo': {
      const previo = hoja.codigos.get(d.correo);
      const ahora = Date.now();
      let { desde = 0, num = 0 } = previo || {};
      if (ahora - desde > 3600000) { desde = ahora; num = 0; }
      if (num >= d.codigosPorHora) return ok({ limitado: true });
      if (hoja.cuota < 1) return ok({ cuotaAgotada: true });
      hoja.cuota--;
      hoja.codigos.set(d.correo, {
        hash: d.hash, sal: d.sal, expira: d.expira, intentos: d.intentos,
        nombre: d.nombre, desde, num: num + 1,
      });
      hoja.correosEnviados.push({ a: d.correo, codigo: d.codigoParaCorreo });
      return ok();
    }
    case 'leer-codigo': {
      const c = hoja.codigos.get(d.correo);
      return ok({ pendiente: c ? { hash: c.hash, sal: c.sal, expira: c.expira, intentos: c.intentos } : null });
    }
    case 'fallar-intento': {
      const c = hoja.codigos.get(d.correo);
      if (c) c.intentos = Math.max(0, c.intentos - 1);
      return ok();
    }
    case 'confirmar-usuario': {
      let u = hoja.usuarios.get(d.correo);
      if (!u) {
        u = { id: 'uid-' + (hoja.usuarios.size + 1), correo: d.correo, nombre: d.nombre, avisos: d.avisos };
        hoja.usuarios.set(d.correo, u);
      }
      hoja.codigos.delete(d.correo);
      return ok({ usuario: u });
    }
    case 'leer-cuenta':
      return ok({ usuario: { id: d.uid }, historial: [], vacantes: [], cursos: [] });
    default:
      return ok();
  }
};

// ──────────────────────────────── ayudas ────────────────────────────────

const env = {
  SESION_SECRETO: 'secreto-de-sesion-para-pruebas-largo-y-aleatorio',
  HOJA_SECRETO: 'secreto-de-la-hoja',
  HOJA_URL: 'https://example.invalid/exec',
};

const ORIGEN = 'https://soportetimentesbrillantes-afk.github.io';

function pedir(metodo, ruta, { cuerpo, token, origen = ORIGEN } = {}) {
  const headers = { origin: origen };
  if (cuerpo) headers['content-type'] = 'application/json';
  if (token) headers.authorization = 'Bearer ' + token;
  return new Request('https://worker.invalid' + ruta, {
    method: metodo, headers, body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
}

let pasaron = 0, fallaron = 0;

async function prueba(nombre, fn) {
  try {
    await fn();
    pasaron++;
    console.log('  ok   ' + nombre);
  } catch (e) {
    fallaron++;
    console.log('  FALLA ' + nombre + '\n         ' + e.message);
  }
}

function igual(a, b, msg) {
  if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`);
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }

/** Registra a alguien de cero y devuelve su token de sesión. */
async function entrar(correo, nombre = 'Ana Ruiz') {
  await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo, nombre } }), env);
  const { codigo } = hoja.correosEnviados.at(-1);
  const r = await manejarCuentas(pedir('POST', '/auth/verificar-codigo', { cuerpo: { correo, codigo } }), env);
  return (await r.json()).token;
}

// ──────────────────────────────── pruebas ────────────────────────────────

console.log('\nSesión');

await prueba('un token recién emitido vale', async () => {
  reiniciarHoja();
  const token = await entrar('ana@example.com');
  const r = await manejarCuentas(pedir('GET', '/cuenta', { token }), env);
  igual(r.status, 200);
});

await prueba('un token con la firma alterada no vale', async () => {
  reiniciarHoja();
  const token = await entrar('ana@example.com');
  const [cuerpo] = token.split('.');
  const r = await manejarCuentas(pedir('GET', '/cuenta', { token: cuerpo + '.firmaInventada' }), env);
  igual(r.status, 401);
});

await prueba('un token con la carga alterada no vale', async () => {
  reiniciarHoja();
  const token = await entrar('ana@example.com');
  const [cuerpo, firma] = token.split('.');
  const carga = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
  carga.uid = 'uid-de-alguien-mas';
  const otro = Buffer.from(JSON.stringify(carga)).toString('base64url');
  const r = await manejarCuentas(pedir('GET', '/cuenta', { token: otro + '.' + firma }), env);
  igual(r.status, 401, 'cambiar el uid sin volver a firmar debe rechazarse; devolvió');
});

await prueba('un token firmado con otro secreto no vale', async () => {
  reiniciarHoja();
  const token = await entrar('ana@example.com');
  const r = await manejarCuentas(pedir('GET', '/cuenta', { token }), { ...env, SESION_SECRETO: 'otro-secreto' });
  igual(r.status, 401);
});

await prueba('un token vencido no vale', async () => {
  reiniciarHoja();
  const real = Date.now;
  const token = await entrar('ana@example.com');
  Date.now = () => real() + 61 * 86400 * 1000; // la sesión dura 60 días
  try {
    const r = await manejarCuentas(pedir('GET', '/cuenta', { token }), env);
    igual(r.status, 401);
  } finally { Date.now = real; }
});

await prueba('sin token, /cuenta responde 401 y no 500', async () => {
  reiniciarHoja();
  igual((await manejarCuentas(pedir('GET', '/cuenta'), env)).status, 401);
  igual((await manejarCuentas(pedir('GET', '/cuenta', { token: 'basura' }), env)).status, 401);
  igual((await manejarCuentas(pedir('GET', '/cuenta', { token: 'a.b.c.d' }), env)).status, 401);
});

console.log('\nCódigo de acceso');

await prueba('el código correcto abre la sesión', async () => {
  reiniciarHoja();
  const token = await entrar('ana@example.com');
  cierto(typeof token === 'string' && token.includes('.'), 'no llegó token');
});

await prueba('el código viaja por correo, nunca en la respuesta', async () => {
  reiniciarHoja();
  const r = await manejarCuentas(
    pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'ana@example.com' } }), env);
  const texto = await r.text();
  const { codigo } = hoja.correosEnviados.at(-1);
  cierto(!texto.includes(codigo), 'el código se filtró en la respuesta HTTP');
});

await prueba('en la hoja solo queda el hash, no el código', async () => {
  reiniciarHoja();
  await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'ana@example.com' } }), env);
  const { codigo } = hoja.correosEnviados.at(-1);
  const guardado = JSON.stringify([...hoja.codigos.values()]);
  cierto(!guardado.includes(codigo), 'el código quedó guardado en claro');
});

await prueba('un código equivocado no entra y gasta un intento', async () => {
  reiniciarHoja();
  await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'ana@example.com' } }), env);
  const antes = hoja.codigos.get('ana@example.com').intentos;
  const r = await manejarCuentas(
    pedir('POST', '/auth/verificar-codigo', { cuerpo: { correo: 'ana@example.com', codigo: '000000' } }), env);
  igual(r.status, 401);
  igual(hoja.codigos.get('ana@example.com').intentos, antes - 1, 'el intento no se descontó:');
});

await prueba('tras agotar los intentos, ni el código bueno entra', async () => {
  reiniciarHoja();
  await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'ana@example.com' } }), env);
  const { codigo } = hoja.correosEnviados.at(-1);
  const malo = codigo === '111111' ? '222222' : '111111';
  for (let i = 0; i < 3; i++) {
    await manejarCuentas(
      pedir('POST', '/auth/verificar-codigo', { cuerpo: { correo: 'ana@example.com', codigo: malo } }), env);
  }
  const r = await manejarCuentas(
    pedir('POST', '/auth/verificar-codigo', { cuerpo: { correo: 'ana@example.com', codigo } }), env);
  igual(r.status, 401, 'seis dígitos se adivinan a fuerza bruta si no hay tope; devolvió');
});

await prueba('un código vencido no entra', async () => {
  reiniciarHoja();
  await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'ana@example.com' } }), env);
  const { codigo } = hoja.correosEnviados.at(-1);
  hoja.codigos.get('ana@example.com').expira = Date.now() - 1;
  const r = await manejarCuentas(
    pedir('POST', '/auth/verificar-codigo', { cuerpo: { correo: 'ana@example.com', codigo } }), env);
  igual(r.status, 401);
});

await prueba('el código de una persona no sirve para otra', async () => {
  reiniciarHoja();
  await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'ana@example.com' } }), env);
  await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'beto@example.com' } }), env);
  const deAna = hoja.correosEnviados.find((c) => c.a === 'ana@example.com').codigo;
  const r = await manejarCuentas(
    pedir('POST', '/auth/verificar-codigo', { cuerpo: { correo: 'beto@example.com', codigo: deAna } }), env);
  igual(r.status, 401, 'el hash lleva el correo dentro justo para esto; devolvió');
});

await prueba('el código son 6 dígitos y varía', async () => {
  reiniciarHoja();
  for (let i = 0; i < 40; i++) {
    await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: `p${i}@example.com` } }), env);
  }
  const codigos = hoja.correosEnviados.map((c) => c.codigo);
  cierto(codigos.every((c) => /^\d{6}$/.test(c)), 'algún código no son 6 dígitos');
  cierto(new Set(codigos).size >= 38, 'los códigos se repiten demasiado');
});

console.log('\nFuga de información y cuotas');

await prueba('no revela si un correo ya está registrado', async () => {
  reiniciarHoja();
  await entrar('registrada@example.com');
  const a = await manejarCuentas(
    pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'registrada@example.com' } }), env);
  const b = await manejarCuentas(
    pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'nunca-vista@example.com' } }), env);
  igual(a.status, b.status, 'los códigos de estado difieren:');
  igual(await a.text(), await b.text(), 'los cuerpos difieren:');
});

await prueba('el tope por correo no deja vaciar la cuota del Club', async () => {
  reiniciarHoja();
  for (let i = 0; i < 10; i++) {
    await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'ana@example.com' } }), env);
  }
  igual(hoja.correosEnviados.length, 3, 'se enviaron más correos de los permitidos por hora:');
});

await prueba('con la cuota agotada lo dice, no deja esperando', async () => {
  reiniciarHoja();
  hoja.cuota = 0;
  const r = await manejarCuentas(
    pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'ana@example.com' } }), env);
  igual(r.status, 503);
  cierto((await r.json()).cuotaAgotada === true, 'no vino la marca cuotaAgotada');
});

await prueba('un correo mal formado se rechaza antes de gastar cuota', async () => {
  reiniciarHoja();
  const r = await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'no-es-correo' } }), env);
  igual(r.status, 400);
  igual(hoja.correosEnviados.length, 0);
});

await prueba('el correo se normaliza a minúsculas y sin espacios', async () => {
  reiniciarHoja();
  await manejarCuentas(pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: '  Ana@Example.COM ' } }), env);
  const { codigo } = hoja.correosEnviados.at(-1);
  const r = await manejarCuentas(
    pedir('POST', '/auth/verificar-codigo', { cuerpo: { correo: 'ana@example.com', codigo } }), env);
  igual(r.status, 200, 'escribir el correo con otras mayúsculas debería funcionar; devolvió');
});

console.log('\nConfiguración y CORS');

await prueba('sin secretos configurados responde 503, no arranca a medias', async () => {
  reiniciarHoja();
  const r = await manejarCuentas(
    pedir('POST', '/auth/solicitar-codigo', { cuerpo: { correo: 'ana@example.com' } }),
    { HOJA_URL: 'https://example.invalid/exec' });
  igual(r.status, 503);
});

await prueba('las rutas ajenas se dejan pasar al Worker de siempre', async () => {
  reiniciarHoja();
  igual(await manejarCuentas(pedir('POST', '/recomendar-empleos', { cuerpo: {} }), env), null);
  igual(await manejarCuentas(pedir('POST', '/', { cuerpo: {} }), env), null);
});

await prueba('el preflight permite el origen del sitio y la cabecera del token', async () => {
  reiniciarHoja();
  const r = await manejarCuentas(pedir('OPTIONS', '/auth/solicitar-codigo'), env);
  igual(r.status, 204);
  igual(r.headers.get('access-control-allow-origin'), ORIGEN);
  cierto(r.headers.get('access-control-allow-headers').includes('authorization'), 'falta authorization');
});

await prueba('un origen desconocido no recibe permiso para ese origen', async () => {
  reiniciarHoja();
  const r = await manejarCuentas(pedir('OPTIONS', '/auth/solicitar-codigo', { origen: 'https://sitio-falso.example' }), env);
  cierto(r.headers.get('access-control-allow-origin') !== 'https://sitio-falso.example',
    'se estaría permitiendo un origen arbitrario');
});

await prueba('las respuestas no se guardan en caché', async () => {
  reiniciarHoja();
  const token = await entrar('ana@example.com');
  const r = await manejarCuentas(pedir('GET', '/cuenta', { token }), env);
  igual(r.headers.get('cache-control'), 'no-store');
});

console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
