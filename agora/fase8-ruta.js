/* =====================================================================
   Proceso Ágora — Fase 8: Ruta profesional
   =====================================================================

   Hoja de Ágora: "Desarrolla mapa profesional para encontrar compatibilidad
   con carreras profesionales ofertadas"; información: "carreras
   consideradas"; resultado: "ruta profesional personalizada".

   El mapa cruza tres cosas, y dice de dónde sale cada una:
   1. Afinidad con su estilo: si el día a día de la carrera se parece a su
      forma de trabajar (estilos de agora/carreras.js, lista por revisar con
      Ágora). Alta, media o baja. NO dice si puede o no estudiarla.
   2. Interés: si la carrera está en un sector que marcó en la fase 1, o si la
      mencionó en lo que le gustaría estudiar.
   3. Mercado: lo que el monitoreo semanal del Club ve hoy en el sector
      relacionado (vacantes verificadas, salario mediano, habilidades que
      piden). Es el sector, no la carrera: se dice así.
   La persona elige su ruta principal y explica por qué. La página no elige
   por ella.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const GENERICAS = new Set(['ingenieria','ciencias','ciencia','tecnico','tecnologias','carrera','administracion','sistemas'].map(norm));
const MAX_CONSIDERADAS = 5;

function carreras(){ return window.CARRERAS_AGORA || []; }
function buscar(nombre){ const n = norm(nombre).trim(); return carreras().find(c => norm(c.n) === n) || null; }

function afinidad(car, disc){
  if(!car || !disc) return null;
  if(disc.plano) return 'media';
  if(car.e[0] === disc.dom) return 'alta';
  if(car.e.includes(disc.dom) || car.e[0] === disc.seg) return 'media';
  return 'baja';
}
/* ¿La mencionó? Busca el nombre completo o una palabra distintiva del nombre
   en lo que escribió que le gustaría estudiar y en su carrera actual. */
function mencionada(car, texto){
  const t = norm(texto);
  if(!t.trim()) return false;
  if(t.includes(norm(car.n))) return true;
  return norm(car.n).split(/[^a-z]+/).filter(w => w.length >= 6 && !GENERICAS.has(w)).some(w => t.includes(w.slice(0, -1)));
}
function evaluar(car, ctx){
  const af = afinidad(car, ctx.disc);
  const sectoresSuyos = car.s.filter(k => ctx.sectoresInteres.includes(k));
  // "Negocios" no es un sector del monitoreo: cuenta para las carreras de esa área.
  const areaSuya = !!ctx.negocios && car.a === 'Administración y negocios';
  const menciona = mencionada(car, ctx.textoInteres);
  const puntaje = ({alta:3, media:2, baja:1}[af] || 0) + (sectoresSuyos.length || areaSuya ? 1 : 0) + (menciona ? 1 : 0);
  return {car, af, sectoresSuyos, areaSuya, menciona, puntaje};
}

const ETQ = {alta:'Alta', media:'Media', baja:'Baja'};
const pesos = n => '$' + Math.round(n).toLocaleString('es-MX');
const vacio = () => ({consideradas:[], principal:'', segunda:'', porque:''});

F.ruta = {
  afinidad, evaluar,
  pintar(cont, AG){
    const req = AG.requiere(['disc']);
    if(req){ cont.innerHTML = req; return; }
    const disc = AG.disc();
    const info = AG.info();
    const NOM = DISC.FACTORES;
    const guardado = AG.datos('ruta');
    const d = Object.assign(vacio(), guardado || {});
    const ctx = {disc, sectoresInteres: [], negocios: (info.sectores || []).includes('Negocios'), textoInteres: [info.aspiracion, info.carrera, info.sectorOtro].join(' ')};
    let nombresSector = {};

    // Primera vez: se proponen como consideradas las que ya mencionó.
    if(!guardado){
      d.consideradas = carreras().filter(c => mencionada(c, ctx.textoInteres)).slice(0, 3).map(c => c.n);
      if(!d.consideradas.length && (info.carrera || '').trim()) d.consideradas = [info.carrera.trim()];
    }

    cont.innerHTML =
      '<div class="card">' +
        '<h3>Las carreras que estás considerando</h3>' +
        '<p class="note" style="margin-top:0;">Escribe hasta ' + MAX_CONSIDERADAS + '. Si una no está en la lista, escríbela igual: tu orientador la revisa contigo.</p>' +
        '<datalist id="listaCarreras">' + carreras().map(c => '<option value="' + AG.esc(c.n) + '">').join('') + '</datalist>' +
        '<div class="grid" id="rut_consideradas"></div>' +
      '</div>' +

      '<div class="card">' +
        '<h3>Tu mapa profesional</h3>' +
        '<p class="note" style="margin-top:0;"><strong>Afinidad con tu estilo</strong>: qué tanto el día a día de esa carrera se parece a tu forma de trabajar (' + NOM[disc.dom].nombre + ' con ' + NOM[disc.seg].nombre + '). Es una referencia, no un requisito: hay buenos profesionistas de todos los estilos en todas las carreras. <strong>Mercado</strong>: lo que el monitoreo semanal del Club ve hoy en el sector relacionado.</p>' +
        '<div style="overflow-x:auto;"><table class="tabla tarjetas" id="rut_mapa"></table></div>' +
        '<h3>Afines que podrías revisar</h3>' +
        '<div style="overflow-x:auto;"><table class="tabla tarjetas" id="rut_afines"></table></div>' +
      '</div>' +

      '<div class="card">' +
        '<h3>Tu ruta</h3>' +
        '<div class="grid dos">' +
          '<div class="campo"><label for="f_rut_principal">Ruta principal <span class="req">*</span></label><select id="f_rut_principal"></select></div>' +
          '<div class="campo"><label for="f_rut_segunda">Segunda ruta (opcional)</label><select id="f_rut_segunda"></select></div>' +
          '<div class="campo ancho"><label for="f_rut_porque">¿Por qué esta ruta? <span class="req">*</span></label><textarea id="f_rut_porque" rows="3" placeholder="Qué te atrae, qué de tu perfil encaja, qué te preocupa">' + AG.esc(d.porque) + '</textarea></div>' +
        '</div>' +
        '<div id="rut_mercado"></div>' +
        AG.boton('ruta', AG.completa('ruta')) +
      '</div>';

    const caja = cont.querySelector('#rut_consideradas');
    function pintarConsideradas(lista){
      const filas = lista.slice(0, MAX_CONSIDERADAS);
      while(filas.length < Math.min(MAX_CONSIDERADAS, Math.max(3, lista.length + 1))) filas.push('');
      caja.innerHTML = filas.map((v, i) =>
        '<div class="campo"><label for="f_rut_c' + i + '">Carrera ' + (i + 1) + '</label><input id="f_rut_c' + i + '" data-considerada list="listaCarreras" value="' + AG.esc(v) + '" autocomplete="off"></div>').join('');
    }
    const leerConsideradas = () => [...cont.querySelectorAll('[data-considerada]')].map(x => x.value.trim()).filter(Boolean)
      .filter((v, i, a) => a.findIndex(y => norm(y) === norm(v)) === i);
    const leer = () => ({
      consideradas: leerConsideradas(),
      principal: cont.querySelector('#f_rut_principal').value, segunda: cont.querySelector('#f_rut_segunda').value,
      porque: cont.querySelector('#f_rut_porque').value
    });

    function celdaMercado(car){
      if(!car || !car.s.length) return '<span class="note">El monitoreo del Club no cubre este sector</span>';
      const k = car.s[0];
      return '<span data-mercado="' + k + '">' + AG.esc(nombresSector[k] || k) + '…</span>';
    }
    function fila(ev, boton){
      const c = ev.car;
      const porque = [];
      if(ev.af) porque.push('Afinidad ' + ETQ[ev.af].toLowerCase() + ': se apoya en ' + c.e.map(k => NOM[k].nombre).join(' y '));
      if(ev.sectoresSuyos.length) porque.push('Está en un sector que marcaste: ' + ev.sectoresSuyos.map(k => nombresSector[k] || k).join(', '));
      if(ev.areaSuya) porque.push('Es del área de negocios, que marcaste');
      if(ev.menciona) porque.push('Se parece a lo que escribiste que te gustaría');
      return '<tr><td><strong>' + AG.esc(c.n) + '</strong><br><span class="note" style="margin:0;">' + AG.esc(c.a) + ' · ' + AG.esc(c.d) + '</span></td>' +
        '<td data-l="Afinidad con tu estilo"><span class="nivel ' + ev.af + '">' + ETQ[ev.af] + '</span></td>' +
        '<td data-l="Mercado del sector">' + celdaMercado(c) + '</td>' +
        '<td class="note" style="margin:0;" data-l="Por qué">' + porque.map(AG.esc).join('. ') + '</td>' +
        (boton ? '<td><button type="button" class="secondary mini" data-agregar="' + AG.esc(c.n) + '">Agregar</button></td>' : '') + '</tr>';
    }
    function pintarMapa(){
      const cons = leerConsideradas();
      const cab = '<tr><th>Carrera</th><th>Afinidad con tu estilo</th><th>Mercado del sector</th><th>Por qué</th>';
      cont.querySelector('#rut_mapa').innerHTML = cons.length
        ? cab + '</tr>' + cons.map(n => {
            const car = buscar(n);
            return car ? fila(evaluar(car, ctx), false)
              : '<tr><td><strong>' + AG.esc(n) + '</strong></td><td colspan="3" class="note">No está en la lista del Club. Revísala con tu orientador.</td></tr>';
          }).join('')
        : '<tr><td class="note">Escribe arriba al menos una carrera que estés considerando.</td></tr>';
      const afines = carreras().filter(c => !cons.some(n => norm(n) === norm(c.n)))
        .map(c => evaluar(c, ctx)).sort((a, b) => b.puntaje - a.puntaje || (b.car.s.length ? 1 : 0) - (a.car.s.length ? 1 : 0)).slice(0, 6);
      cont.querySelector('#rut_afines').innerHTML = cab + '<th></th></tr>' + afines.map(ev => fila(ev, true)).join('');
      cont.querySelectorAll('[data-agregar]').forEach(b => {
        b.onclick = () => {
          const lista = leerConsideradas();
          if(lista.length >= MAX_CONSIDERADAS){ AG.faltan(['quitar una carrera antes de agregar otra (máximo ' + MAX_CONSIDERADAS + ')']); return; }
          pintarConsideradas(lista.concat([b.dataset.agregar])); refrescar();
        };
      });
      llenarMercado();
      // Opciones para elegir la ruta: las consideradas y las afines.
      const opciones = cons.concat(afines.map(a => a.car.n));
      [['#f_rut_principal', d.principal, 'Elige…'], ['#f_rut_segunda', d.segunda, 'Ninguna']].forEach(([sel, actual, vacia]) => {
        const el = cont.querySelector(sel); const v = el.value || actual;
        el.innerHTML = '<option value="">' + vacia + '</option>' + opciones.map(o => '<option' + (o === v ? ' selected' : '') + '>' + AG.esc(o) + '</option>').join('');
      });
    }
    function llenarMercado(){
      cont.querySelectorAll('[data-mercado]').forEach(el => {
        AG.sector(el.dataset.mercado).then(s => {
          if(!s){ el.textContent = 'Sin dato'; return; }
          el.innerHTML = '<strong>' + AG.esc(s.nombre) + '</strong>: ' + (s.vacantes_verificadas || 0).toLocaleString('es-MX') + ' vacantes' +
            (s.salario && s.salario.mediana_mensual_mxn ? ' · mediana ' + pesos(s.salario.mediana_mensual_mxn) + ' al mes' : '');
        });
      });
    }
    /* La estrategia de vida para la ruta elegida: su presupuesto (fase 8)
       frente a los salarios del sector relacionado. */
    async function calcularEstrategia(){
      const P = window.FASES_AGORA.presupuesto;
      const costo = P ? P.costo(AG) : 0;
      const nombre = cont.querySelector('#f_rut_principal').value;
      if(!costo || !nombre) return null;
      const car = buscar(nombre);
      const s = car && car.s.length ? await AG.sector(car.s[0]) : null;
      return P.estrategia(costo, s && s.salario, s ? s.nombre : 'este sector');
    }
    function cajaEstrategia(e){
      if(!e) return AG.completa('presupuesto') ? '' :
        '<div class="mercado"><strong>Tu presupuesto frente a esta ruta</strong><p style="margin:4px 0 0;">Completa tu presupuesto para ver si lo que paga esta profesión alcanza para la vida que imaginas.</p>' +
        '<button type="button" class="secondary mini" data-abrir="presupuesto" style="margin-top:8px;">Ir a Tu presupuesto</button></div>';
      const P = window.FASES_AGORA.presupuesto;
      return '<div class="mercado"><strong>Tu presupuesto frente a esta ruta</strong>' +
        (e.mediana ? '<div class="cifras"><div><b>' + P.pesos(e.costo) + '</b>tu costo de vida al mes</div><div><b>' + P.pesos(e.p25) + '</b>sueldos de entrada (el 25% más bajo)</div><div><b>' + P.pesos(e.mediana) + '</b>sueldo típico del sector</div></div>' : '') +
        '<p style="margin:6px 0 0;"><strong>Estrategia de vida sugerida: ' + AG.esc(e.titulo) + '.</strong> ' + AG.esc(e.texto) + '</p>' +
        '<p class="note" style="margin:6px 0 0;">Los sueldos son de las vacantes que publica hoy el sector, no una promesa. Revísalo con tu orientador.</p></div>';
    }
    async function pintarPanel(){
      const caja2 = cont.querySelector('#rut_mercado');
      const car = buscar(cont.querySelector('#f_rut_principal').value);
      const e = await calcularEstrategia();
      const presupuesto = cont.querySelector('#f_rut_principal').value ? cajaEstrategia(e) : '';
      if(!car || !car.s.length){ caja2.innerHTML = presupuesto; AG.conectar(caja2); return; }
      const [m, s] = await Promise.all([AG.manifest(), AG.sector(car.s[0])]);
      if(!s){ caja2.innerHTML = presupuesto; AG.conectar(caja2); return; }
      const est = info.estado && s.cobertura_geografica ? (s.cobertura_geografica.top_estados || []).find(x => x.estado === info.estado) : null;
      const top = (arr, n) => (arr || []).slice(0, n).map(x => x.skill);
      caja2.innerHTML = '<div class="mercado"><strong>Lo que pide hoy el mercado en ' + AG.esc(s.nombre) + '</strong>' +
        '<span class="note" style="display:block;margin:0;">Monitoreo semanal del Club' + (m && m.meta && m.meta.corrida ? ', corrida del ' + AG.esc(AG.fechaLegible(m.meta.corrida + 'T12:00:00')) : '') + '. Es el sector relacionado con ' + AG.esc(car.n) + ', no solo esa carrera.</span>' +
        '<div class="cifras"><div><b>' + (s.vacantes_verificadas || 0).toLocaleString('es-MX') + '</b>vacantes verificadas</div>' +
        (s.salario && s.salario.mediana_mensual_mxn ? '<div><b>' + pesos(s.salario.mediana_mensual_mxn) + '</b>salario mediano al mes</div>' : '') +
        (est ? '<div><b>' + est.vacantes.toLocaleString('es-MX') + '</b>en ' + AG.esc(info.estado) + '</div>' : '') + '</div>' +
        (top(s.habilidades_tecnicas, 5).length ? '<p style="margin:6px 0 0;"><strong>Habilidades técnicas que más piden:</strong> ' + top(s.habilidades_tecnicas, 5).map(AG.esc).join(', ') + '.</p>' : '') +
        (top(s.habilidades_blandas, 4).length ? '<p style="margin:4px 0 0;"><strong>Habilidades blandas:</strong> ' + top(s.habilidades_blandas, 4).map(AG.esc).join(', ') + '.</p>' : '') +
        '</div>' + presupuesto;
      AG.conectar(caja2);
    }
    function refrescar(){ pintarMapa(); pintarPanel(); AG.guardadoTxt(AG.fijar('ruta', leer())); }

    pintarConsideradas(d.consideradas);
    AG.manifest().then(m => {
      (m && m.sectores || []).forEach(s => { nombresSector[s.key] = s.nombre; });
      ctx.sectoresInteres = (m && m.sectores || []).filter(s => (info.sectores || []).includes(s.nombre)).map(s => s.key);
      pintarMapa(); pintarPanel();
    });
    pintarMapa(); pintarPanel();

    let espera = null;
    cont.addEventListener('input', ev => {
      if(ev.target.matches('[data-considerada]')){ clearTimeout(espera); espera = setTimeout(refrescar, 350); }
      else AG.guardadoTxt(AG.fijar('ruta', leer()));
    });
    cont.addEventListener('change', ev => {
      if(ev.target.matches('[data-considerada]')){
        clearTimeout(espera);
        const lista = leerConsideradas(); if(lista.length === cont.querySelectorAll('[data-considerada]').length && lista.length < MAX_CONSIDERADAS) pintarConsideradas(lista);
        refrescar();
      }
      else if(ev.target.id === 'f_rut_principal' || ev.target.id === 'f_rut_segunda'){ pintarPanel(); AG.guardadoTxt(AG.fijar('ruta', leer())); }
    });

    cont.querySelector('#btnCompletar').onclick = async () => {
      const x = leer(), f = [];
      if(!x.consideradas.length) f.push('escribir al menos una carrera que estés considerando');
      if(!x.principal) f.push('elegir tu ruta principal');
      if(x.principal && x.segunda === x.principal) f.push('que la segunda ruta sea distinta de la principal');
      if(x.porque.trim().length < 10) f.push('contar por qué elegiste esa ruta');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar('ruta', x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      const linea = n => { const car = buscar(n); const ev = car ? evaluar(car, ctx) : null;
        return n + (ev ? ' — afinidad ' + ETQ[ev.af].toLowerCase() + (ev.sectoresSuyos.length ? ', sector que le interesa' : '') : ' — fuera de la lista del Club'); };
      const afines = carreras().filter(c => !x.consideradas.some(n => norm(n) === norm(c.n))).map(c => evaluar(c, ctx))
        .sort((a, b) => b.puntaje - a.puntaje).slice(0, 4).map(e => e.car.n);
      const eval1 = buscar(x.principal) ? evaluar(buscar(x.principal), ctx) : null;
      const est = await calcularEstrategia();
      const P = window.FASES_AGORA.presupuesto;
      AG.terminar('ruta', Object.assign({}, x, {
        afinidadPrincipal: eval1 ? eval1.af : null, sectorPrincipal: eval1 && eval1.car.s[0] || null, estrategia: est,
        hoja: {
          'Carreras consideradas': AG.vinetas(x.consideradas), 'Compatibilidad': x.consideradas.map(linea).join('\n'),
          'Carreras afines sugeridas': AG.vinetas(afines), 'Ruta principal': x.principal, 'Segunda ruta': x.segunda, 'Por qué': x.porque.trim(),
          'Costo de vida vs salario': est && est.mediana ? 'Costo de vida ' + P.pesos(est.costo) + ' al mes; sueldo de entrada ' + P.pesos(est.p25) + ', típico ' + P.pesos(est.mediana) + ' (' + est.sector + ')' : '',
          'Estrategia de vida': est ? est.titulo : ''
        }
      }));
    };
  }
};
})();
