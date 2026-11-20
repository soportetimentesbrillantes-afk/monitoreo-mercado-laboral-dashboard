/* =====================================================================
   Asistente de orientación vocacional con IA (Ágora y DIANA)
   =====================================================================

   Lee lo que la persona ya hizo en su proceso (DISC, FODA, test vocacional,
   crecimiento, escenarios, presupuesto, ruta o mapa de carrera) y entrega
   cinco salidas:

   1. Mapa de afinidades        calculado aquí, con reglas fijas
   2. Índice de coherencia      calculado aquí, con reglas fijas
   3. Narrativa personalizada   la escribe la IA
   4. Micro escenarios          la IA, tres opciones a 1, 3 y 5 años
   5. Versión para padres y para el orientador   la IA

   Lo calculado nunca lo toca la IA: ella solo lo cita. Así ningún número es
   inventado. La IA es Claude por el worker del Club (worker-orientacion.js,
   ruta /orientacion-vocacional); solo recibe el perfil SIN nombre, correo,
   teléfono ni datos del tutor, y solo si la persona marca la casilla. Si la
   ruta no está activa, la fase se completa con lo calculado y los textos
   quedan pendientes.

   Mapa de afinidades, por carrera (de la lista del Club, agora/carreras.js):
     Intereses, Aptitudes, Motivos  del test vocacional (0 a 100)
     Estilo                         afinidad del DISC con la carrera (alta 100,
                                    media 60, baja 25), la misma de la Ruta
     Mercado                        vacantes y salario mediano del SECTOR
   Índice de coherencia de la opción principal (ruta principal en Ágora; rol
   objetivo o carrera en DIANA): promedio de los componentes que hay datos
   para calcular — intereses, aptitudes, motivos, estilo y, en Ágora,
   presupuesto frente al salario del sector. Con menos de dos, pendiente.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};

const URL_IA = 'https://cv-analisis.soportetimentesbrillantes.workers.dev/orientacion-vocacional';
const LOCAL = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const IA = () => window.__CMB_ORIENTACION_PRUEBA || (LOCAL ? '' : URL_IA);

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const carreras = () => window.CARRERAS_AGORA || [];
const buscar = n => carreras().find(c => norm(c.n) === norm(n)) || null;
const pesos = n => '$' + Math.round(n).toLocaleString('es-MX');
const ESTILO_PTS = {alta: 100, media: 60, baja: 25};
const ETQ = {alta: 'Alta', media: 'Media', baja: 'Baja'};

function afinidadEstilo(car, disc){
  if(!car || !disc) return null;
  if(disc.plano) return 'media';
  if(car.e[0] === disc.dom) return 'alta';
  if(car.e.includes(disc.dom) || car.e[0] === disc.seg) return 'media';
  return 'baja';
}

/* Todo lo que la fase necesita saber de las anteriores. */
function contexto(AG){
  const D = id => AG.enProceso(id) && AG.completa(id) ? (AG.datos(id) || {}) : null;
  const info = AG.info();
  const ruta = D('ruta'), mapa = D('mapa');
  const voc = AG.vocacional ? AG.vocacional() : null;
  const costo = F.presupuesto && AG.enProceso('presupuesto') ? F.presupuesto.costo(AG) : 0;
  const proceso = AG.PROCESO.tipo === 'diana' ? 'diana' : 'agora';
  // La opción principal que se mide en el índice.
  let principal = null, principalTxt = '';
  if(ruta && ruta.principal){ principal = buscar(ruta.principal); principalTxt = ruta.principal; }
  else if(mapa && mapa.rol){ principalTxt = mapa.rol + (mapa.industriaNombre ? ' (' + mapa.industriaNombre + ')' : ''); principal = buscar(info.carrera); }
  else if(info.carrera){ principal = buscar(info.carrera); principalTxt = info.carrera; }
  return {info, ruta, mapa, voc, costo, proceso, principal, principalTxt, disc: AG.disc(), foda: AG.foda(),
    crecimiento: D('crecimiento'), escenarios: D('escenarios'), estilo: D('estilo')};
}

/* Las carreras del mapa: las que eligió o consideró, su carrera actual y las
   que más se le acercan según el test vocacional. Hasta 8. */
function carrerasDelMapa(c){
  const out = [];
  const add = (n, origen) => { const car = buscar(n); if(!car) return; const x = out.find(o => o.car.n === car.n); if(x){ if(!x.origen.includes(origen)) x.origen.push(origen); } else out.push({car, origen: [origen]}); };
  if(c.ruta){ add(c.ruta.principal, 'Ruta principal'); add(c.ruta.segunda, 'Segunda ruta'); (c.ruta.consideradas || []).forEach(n => add(n, 'Considerada')); }
  add(c.info.carrera, 'Tu carrera');
  if(c.voc && Array.isArray(c.voc.lista)) c.voc.lista.slice(0, 4).forEach(n => add(n, 'Test vocacional'));
  return out.slice(0, 8);
}

function filaMapa(x, c){
  const a = c.voc && c.voc.afin ? c.voc.afin[x.car.n] : null;
  const est = afinidadEstilo(x.car, c.disc);
  const partes = [a ? a[0] : null, est ? ESTILO_PTS[est] : null].filter(v => v !== null);
  const total = partes.length ? Math.round(a && est ? 0.6 * a[0] + 0.4 * ESTILO_PTS[est] : partes[0]) : null;
  return {carrera: x.car.n, area: x.car.a, sector: x.car.s[0] || '', origen: x.origen,
    interes: a ? a[1] : null, aptitudes: a ? a[2] : null, motivos: a ? a[3] : null, estilo: est, total};
}

/* El índice de coherencia de la opción principal. sector: datos del monitoreo, si ya llegaron. */
function coherencia(c, sector){
  const comp = [];
  const car = c.principal;
  const a = car && c.voc && c.voc.afin ? c.voc.afin[car.n] : null;
  if(a){
    comp.push({id: 'intereses', nombre: 'Tus intereses', valor: a[1], nota: 'Qué tanto te atraen las áreas de ' + car.n + ' según tu test vocacional.'});
    comp.push({id: 'aptitudes', nombre: 'Tus aptitudes', valor: a[2], nota: 'Las aptitudes que esas áreas piden, como tú las calificaste.'});
    comp.push({id: 'motivos', nombre: 'Lo que te motiva', valor: a[3], nota: 'Si el día a día de esa carrera da lo que más te mueve.'});
  }
  if(c.disc){
    let v = null, nota = '';
    if(c.proceso === 'diana' && c.mapa && c.mapa.rol && window.AFINIDAD){
      const af = AFINIDAD.afinidad(c.mapa.rol, AFINIDAD.perfilNormalizado(c.disc.p));
      if(af !== null){ v = Math.round(af * 100); nota = 'Qué tanto tu estilo DISC se parece al que suele pedir el rol de ' + c.mapa.rol + '.'; }
    }
    if(v === null && car){ const e = afinidadEstilo(car, c.disc); if(e){ v = ESTILO_PTS[e]; nota = 'Afinidad ' + e + ' de tu estilo DISC con el día a día de ' + car.n + '.'; } }
    if(v !== null) comp.push({id: 'estilo', nombre: 'Tu estilo de trabajo', valor: v, nota});
  }
  if(c.costo && sector && sector.salario && sector.salario.mediana_mensual_mxn){
    const med = sector.salario.mediana_mensual_mxn, r = med / c.costo;
    comp.push({id: 'presupuesto', nombre: 'Tu presupuesto', valor: Math.round(Math.min(1, r) * 100),
      nota: 'El salario mediano del sector ' + sector.nombre + ' (' + pesos(med) + ') cubre ' + Math.round(r * 100) + '% de tu presupuesto de ' + pesos(c.costo) + ' al mes.'});
  }
  if(comp.length < 2) return {indice: null, nivel: '', componentes: comp, de: car ? car.n : c.principalTxt};
  const indice = Math.round(comp.reduce((s, x) => s + x.valor, 0) / comp.length);
  const nivel = indice >= 75 ? 'Alta' : indice >= 55 ? 'Media' : 'Baja';
  return {indice, nivel, componentes: comp, de: car ? car.n : c.principalTxt};
}

/* Opciones para los tres micro escenarios. */
function opcionesEscenario(c, filas){
  const ops = [];
  const add = n => { n = String(n || '').trim(); if(n && !ops.some(o => norm(o) === norm(n))) ops.push(n); };
  if(c.ruta){ add(c.ruta.principal); add(c.ruta.segunda); }
  if(c.mapa){ add(c.mapa.rol ? c.mapa.rol + (c.mapa.industriaNombre ? ' en ' + c.mapa.industriaNombre : '') : ''); add(c.mapa.rol2); }
  add(c.info.carrera);
  filas.filter(f => f.origen.includes('Test vocacional')).forEach(f => add(f.carrera));
  filas.forEach(f => add(f.carrera));
  return ops.slice(0, 3);
}

/* El perfil que se manda a la IA: sin nombre, correo, teléfono ni tutor. */
function perfilIA(AG, c, filas, coh, mercado){
  const partes = String(AG.nombre() || '').split(/\s+/).filter(p => p.length > 2).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = partes.length ? new RegExp('\\b(' + partes.join('|') + ')\\b', 'gi') : null;
  const txt = (v, n) => { let s = String(v || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[correo]').replace(/\+?\d[\d\s-]{7,}\d/g, '[teléfono]'); if(re) s = s.replace(re, '[nombre]'); return s.slice(0, n || 400); };
  const lineas = v => AG.lineas(v).slice(0, 4).map(x => txt(x, 200));
  const esc = c.escenarios || {};
  return {
    proceso: c.proceso,
    etapa: txt(c.info.etapa, 60), nivel_estudios: txt(c.info.nivel, 80), situacion: txt(c.info.situacion, 60),
    carrera_actual: txt(c.info.carrera, 120), aspiracion: txt(c.info.aspiracion, 400),
    sectores_de_interes: (c.info.sectores || []).slice(0, 6),
    experiencia: (c.info.experiencia || []).filter(x => (x.rol || '').trim()).slice(0, 4).map(x => txt(x.rol, 120)),
    disc: c.disc ? {dominante: DISC.FACTORES[c.disc.dom].nombre, segundo: c.disc.seg ? DISC.FACTORES[c.disc.seg].nombre : '', lectura: c.disc.plano ? 'parejo' : c.disc.empate ? 'empate' : 'dominante claro'} : null,
    foda: c.foda ? {fortalezas: lineas(c.foda.F), debilidades: lineas(c.foda.D), oportunidades: lineas(c.foda.O), amenazas: lineas(c.foda.A)} : null,
    test_vocacional: c.voc ? {areas: txt(c.voc.areas, 300), aptitudes: txt(c.voc.aptitudes, 300), habilidades: txt(c.voc.habilidades, 300), lo_que_motiva: txt(c.voc.motiva, 200), carreras_cercanas: txt(c.voc.carreras, 500)} : null,
    crecimiento: c.crecimiento ? {prioridad: txt(c.crecimiento.prioridad, 200), areas: (c.crecimiento.areas || []).slice(0, 4).map(x => txt(x, 120))} : null,
    escenarios_de_vida: c.escenarios ? ['5', '10', '15'].map(h => esc[h] ? h + ' años: ' + Object.values(esc[h]).filter(Boolean).map(x => txt(x, 160)).join('; ') : '').filter(Boolean) : null,
    presupuesto_mensual: c.costo || null,
    ruta: c.ruta ? {principal: txt(c.ruta.principal, 120), segunda: txt(c.ruta.segunda, 120), por_que: txt(c.ruta.porque, 500)} : null,
    rol_objetivo: c.mapa && c.mapa.rol ? {rol: txt(c.mapa.rol, 120), industria: txt(c.mapa.industriaNombre || c.mapa.industria, 120), segundo_rol: txt(c.mapa.rol2, 120)} : null,
    mapa_afinidades: filas.map(f => ({carrera: f.carrera, origen: f.origen, intereses: f.interes, aptitudes: f.aptitudes, motivos: f.motivos, estilo: f.estilo, afinidad: f.total,
      mercado_del_sector: mercado[f.sector] ? {sector: mercado[f.sector].nombre, vacantes_semana: mercado[f.sector].vacantes, salario_mediano_mensual: mercado[f.sector].mediana} : null})),
    coherencia: {de: coh.de, indice: coh.indice, nivel: coh.nivel, componentes: coh.componentes.map(x => ({nombre: x.nombre, valor: x.valor, nota: x.nota}))},
    opciones_escenario: opcionesEscenario(c, filas)
  };
}

async function pedirIA(perfil){
  const r = await fetch(IA(), {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({perfil})});
  if(r.status === 404) throw {code: 'no_activa'};
  if(r.status === 429) throw {code: 'rate_limited'};
  const d = await r.json().catch(() => null);
  if(!r.ok || !d || !d.ok) throw {code: 'error'};
  return {narrativa: d.narrativa || '', escenarios: d.escenarios || [], padres: d.padres || '', orientador: d.orientador || {}};
}

/* ---------------------------- Piezas visuales ---------------------------- */
const CSS = `
.ori-barra{display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:6px;align-items:center}
#ori_mapa{font-size:.86rem}
#ori_mapa th,#ori_mapa td{padding-left:6px;padding-right:6px}
#ori_mapa .ori-barra{min-width:72px}
#ori_mapa td.ori-merc{font-size:.78rem;color:var(--texto-suave);min-width:120px}
.ori-barra .pista{height:8px;background:var(--gris-borde);border-radius:999px;overflow:hidden}
.ori-barra .pista i{display:block;height:100%;background:linear-gradient(90deg,var(--azul),var(--gold-light));border-radius:999px}
.ori-barra b{font-variant-numeric:tabular-nums;font-size:.85rem;text-align:right}
.ori-indice{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin:6px 0 12px}
.ori-indice .num{font-family:var(--font-serif);font-size:3rem;line-height:1;font-weight:700}
.ori-escenarios{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.ori-escenarios .esc{border:1px solid var(--gris-borde);border-radius:12px;padding:12px 14px;background:#fff}
.ori-escenarios .esc h4{margin:0 0 4px;font-family:var(--font-serif);font-size:1.15rem}
.ori-escenarios dt{font-weight:700;font-size:.78rem;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.04em;margin-top:8px}
.ori-escenarios dd{margin:2px 0 0;font-size:.9rem;line-height:1.5}
.ori-texto p{line-height:1.65}
.ori-pend{color:var(--texto-suave);font-style:italic}
@media print{ body.ori-solo-padres > *{display:none!important} body.ori-solo-padres #ori_impresion{display:block!important} }
#ori_impresion{display:none}
`;
function estilos(){ if(document.getElementById('ori-css')) return; const s = document.createElement('style'); s.id = 'ori-css'; s.textContent = CSS; document.head.appendChild(s); }
const barra = v => v === null || v === undefined ? '<span class="ori-pend">—</span>' : '<div class="ori-barra"><span class="pista"><i style="width:' + Math.max(0, Math.min(100, v)) + '%"></i></span><b>' + v + '</b></div>';
const parrafos = (AG, t) => String(t || '').split(/\n{2,}|\n/).map(x => x.trim()).filter(Boolean).map(x => '<p>' + AG.esc(x) + '</p>').join('');

function htmlMapa(AG, filas, mercado){
  if(!filas.length) return '<p class="ori-pend">Todavía no hay carreras para comparar: haz el test vocacional o elige tu ruta.</p>';
  return '<div style="overflow-x:auto"><table class="tabla" id="ori_mapa"><tr><th>Carrera</th><th>Intereses</th><th>Aptitudes</th><th>Motivos</th><th>Estilo DISC</th><th>Mercado del sector</th><th>Afinidad</th></tr>' +
    filas.map(f => { const m = mercado[f.sector];
      return '<tr><td><strong>' + AG.esc(f.carrera) + '</strong><br><span class="note" style="margin:0">' + AG.esc(f.origen.join(' · ')) + '</span></td>' +
        '<td>' + barra(f.interes) + '</td><td>' + barra(f.aptitudes) + '</td><td>' + barra(f.motivos) + '</td>' +
        '<td>' + (f.estilo ? ETQ[f.estilo] : '—') + '</td>' +
        '<td class="ori-merc">' + (m ? AG.esc(m.nombre) + ': ' + (m.vacantes || 0).toLocaleString('es-MX') + ' vacantes' + (m.mediana ? ' · ' + pesos(m.mediana) + ' al mes' : '') : (f.sector ? '…' : 'El monitoreo no cubre este sector')) + '</td>' +
        '<td><strong>' + barra(f.total) + '</strong></td></tr>'; }).join('') + '</table></div>';
}
function htmlCoherencia(AG, coh){
  if(coh.indice === null) return '<p class="ori-pend">Pendiente: hacen falta al menos dos datos (por ejemplo, tu test vocacional y tu Perfil DISC) y una opción principal' + (coh.de ? '' : ' (tu ruta, tu rol objetivo o tu carrera)') + '.</p>';
  return '<div class="ori-indice"><span class="num" id="ori_indice">' + coh.indice + '</span><div><strong>Coherencia ' + coh.nivel.toLowerCase() + '</strong> entre tu perfil y <strong>' + AG.esc(coh.de) + '</strong><br><span class="note" style="margin:0">Promedio de ' + coh.componentes.length + ' componentes, de 0 a 100. No es una calificación: muestra qué tanto se apoyan entre sí tus resultados y tu elección.</span></div></div>' +
    '<table class="tabla">' + coh.componentes.map(x => '<tr><td style="width:30%"><strong>' + AG.esc(x.nombre) + '</strong></td><td style="width:30%">' + barra(x.valor) + '</td><td class="note" style="margin:0">' + AG.esc(x.nota) + '</td></tr>').join('') + '</table>' +
    (coh.nivel === 'Baja' ? '<p class="note">Una coherencia baja no quiere decir que no puedas: quiere decir que vale la pena platicar con tu orientador qué te atrae de esa opción y qué tendrías que reforzar.</p>' : '');
}
function htmlEscenarios(AG, esc){
  if(!esc || !esc.length) return '<p class="ori-pend">Pendiente.</p>';
  return '<div class="ori-escenarios">' + esc.map(x => '<div class="esc"><h4>' + AG.esc(x.titulo || x.ruta) + '</h4><p class="note" style="margin:0">' + AG.esc(x.ruta) + '</p><dl>' +
    '<dt>En 1 año</dt><dd>' + AG.esc(x.a1) + '</dd><dt>En 3 años</dt><dd>' + AG.esc(x.a3) + '</dd><dt>En 5 años</dt><dd>' + AG.esc(x.a5) + '</dd>' +
    '<dt>Qué necesitarías</dt><dd>' + AG.esc(x.que_necesita) + '</dd><dt>Señal de que no es para ti</dt><dd>' + AG.esc(x.senal) + '</dd></dl></div>').join('') + '</div>';
}
function htmlOrientador(AG, o){
  if(!o || !o.resumen) return '<p class="ori-pend">Pendiente.</p>';
  const l = (t, xs) => xs && xs.length ? '<h4 style="margin:10px 0 4px">' + t + '</h4>' + AG.lista(xs) : '';
  return '<p>' + AG.esc(o.resumen) + '</p>' + l('Fortalezas', o.fortalezas) + l('Tensiones que se ven en los datos', o.tensiones) + l('Preguntas para la próxima sesión', o.preguntas);
}

/* ---------------------------- La fase ---------------------------- */
F.orientacion = {
  titulo: 'Asistente de orientación vocacional',
  contexto, carrerasDelMapa, filaMapa, coherencia, opcionesEscenario, perfilIA, afinidadEstilo,
  pintar(cont, AG, paso){
    estilos();
    const id = paso.id;
    const req = AG.requiere(['disc'].filter(x => AG.enProceso(x)).concat(AG.enProceso('vocacional') ? ['vocacional'] : []).concat(AG.enProceso('ruta') ? ['ruta'] : []));
    if(req){ cont.innerHTML = req; return; }
    const c = contexto(AG);
    const filas = carrerasDelMapa(c).map(x => filaMapa(x, c));
    const mercado = {};
    const guardado = AG.datos(id) || {};
    let ia = guardado.ia || null, coh = coherencia(c, null);
    const secPrincipal = c.principal && c.principal.s[0];

    cont.innerHTML =
      (!c.voc ? '<div class="card"><div class="aviso limites" style="margin:0">Tu mapa sale más completo con el <a href="test-vocacional.html">test vocacional</a>' + (AG.enProceso('vocacional') ? '' : ' (es corto; al terminar, vuelve aquí)') + '.</div></div>' : '') +
      '<div class="card"><h3>1. Mapa de afinidades</h3><p class="note" style="margin-top:0">Intereses, aptitudes y motivos salen de tu test vocacional; el estilo, de tu Perfil DISC; el mercado, del monitoreo semanal del Club para el sector de cada carrera (es el sector, no la carrera). La afinidad combina test (60%) y estilo (40%).</p><div id="ori_mapa_caja">' + htmlMapa(AG, filas, mercado) + '</div></div>' +
      '<div class="card"><h3>2. Índice de coherencia</h3><div id="ori_coh">' + htmlCoherencia(AG, coh) + '</div></div>' +
      '<div class="card" id="ori_ia_card"><h3>3. Tu orientación escrita</h3>' +
        '<p class="note" style="margin-top:0">Narrativa, micro escenarios y versiones para tu familia y tu orientador. La escribe la IA del Club (Claude) con tus resultados, sin tu nombre ni tus datos de contacto. No se guarda en el servidor.</p>' +
        '<label class="check"><input type="checkbox" id="ori_acepto"> <span>Acepto que mis resultados, sin mi nombre ni mis datos de contacto, se envíen a la IA del Club para escribir mi orientación.</span></label>' +
        '<div class="acciones" style="margin-top:10px"><button type="button" class="secondary" id="ori_generar" disabled>' + (ia ? 'Volver a generar' : 'Generar mi orientación') + '</button><span class="guardado" id="ori_estado"></span></div>' +
        '<div id="ori_textos"></div></div>' +
      '<div class="card">' + AG.boton(id, AG.completa(id)) + '</div>' +
      '<div id="ori_impresion"></div>';

    const pintarTextos = () => {
      const caja = cont.querySelector('#ori_textos');
      if(!ia){ caja.innerHTML = ''; return; }
      caja.innerHTML = '<h4 style="margin:16px 0 4px">Narrativa personalizada</h4><div class="ori-texto" id="ori_narrativa">' + parrafos(AG, ia.narrativa) + '</div>' +
        '<h4 style="margin:16px 0 8px">Micro escenarios de futuro</h4><div id="ori_escenarios">' + htmlEscenarios(AG, ia.escenarios) + '</div>' +
        '<h4 style="margin:16px 0 4px">Para tu mamá, papá o tutor</h4><div class="ori-texto" id="ori_padres">' + parrafos(AG, ia.padres) + '</div>' +
        '<div class="acciones"><button type="button" class="secondary" id="ori_imprimir">Imprimir la versión para tu familia</button></div>' +
        '<h4 style="margin:16px 0 4px">Para tu orientador</h4><div id="ori_orientador">' + htmlOrientador(AG, ia.orientador) + '</div>' +
        '<p class="note">Es una lectura para conversar, no un veredicto. Revisa con tu orientador lo que no te suene a ti.</p>';
      cont.querySelector('#ori_imprimir').onclick = () => {
        const imp = document.getElementById('ori_impresion');
        imp.innerHTML = '<h1 style="font-family:var(--font-serif)">Orientación vocacional</h1><p class="note">' + AG.esc(AG.nombre()) + ' · ' + AG.esc(AG.fechaLegible()) + '</p>' +
          parrafos(AG, ia.padres) + '<h2 style="font-family:var(--font-serif)">Tres caminos que está considerando</h2>' + htmlEscenarios(AG, ia.escenarios) +
          (coh.indice !== null ? '<p><strong>Coherencia entre su perfil y ' + AG.esc(coh.de) + ':</strong> ' + coh.indice + ' de 100 (' + coh.nivel.toLowerCase() + ').</p>' : '');
        document.body.appendChild(imp);
        document.body.classList.add('ori-solo-padres');
        window.print();
        setTimeout(() => { document.body.classList.remove('ori-solo-padres'); }, 500);
      };
    };
    pintarTextos();

    // Mercado de cada sector: llega después; refresca mapa e índice.
    const sectores = [...new Set(filas.map(f => f.sector).concat(secPrincipal ? [secPrincipal] : []).filter(Boolean))];
    Promise.all(sectores.map(k => AG.sector(k).then(s => { if(s) mercado[k] = {nombre: s.nombre, vacantes: s.vacantes_verificadas, mediana: s.salario && s.salario.mediana_mensual_mxn, salario: s.salario}; }))).then(() => {
      cont.querySelector('#ori_mapa_caja').innerHTML = htmlMapa(AG, filas, mercado);
      coh = coherencia(c, secPrincipal && mercado[secPrincipal] ? {nombre: mercado[secPrincipal].nombre, salario: mercado[secPrincipal].salario} : null);
      cont.querySelector('#ori_coh').innerHTML = htmlCoherencia(AG, coh);
    });

    const chk = cont.querySelector('#ori_acepto'), btn = cont.querySelector('#ori_generar'), est = cont.querySelector('#ori_estado');
    if(!IA()) { btn.disabled = true; est.textContent = 'La IA no está disponible en esta copia de la página.'; }
    chk.onchange = () => { btn.disabled = !chk.checked || !IA(); };
    btn.onclick = async () => {
      if(!chk.checked) return;
      btn.disabled = true; est.textContent = 'Escribiendo tu orientación… puede tardar hasta un minuto.';
      try{
        ia = await pedirIA(perfilIA(AG, c, filas, coh, mercado));
        AG.fijar(id, Object.assign({}, AG.datos(id) || {}, {ia, generadoEn: new Date().toISOString()}));
        est.textContent = 'Listo.'; pintarTextos();
      }catch(e){
        est.textContent = e && e.code === 'no_activa' ? 'La IA todavía no está activa en el servidor del Club. Puedes completar la fase con el mapa y el índice; los textos quedan pendientes.'
          : e && e.code === 'rate_limited' ? 'Demasiadas solicitudes seguidas. Espera un minuto.' : 'No se pudo generar ahora. Intenta de nuevo en un momento.';
      }
      btn.disabled = !chk.checked;
    };

    cont.querySelector('#btnCompletar').onclick = () => {
      if(!filas.length && coh.indice === null){ AG.faltan(['al menos el test vocacional o una ruta elegida, para tener algo que comparar']); return; }
      const calc = {mapa: filas.map(f => Object.assign({}, f, {mercado: mercado[f.sector] ? {nombre: mercado[f.sector].nombre, vacantes: mercado[f.sector].vacantes, mediana: mercado[f.sector].mediana} : null})), coherencia: coh, fecha: new Date().toISOString()};
      const datos = Object.assign({}, AG.datos(id) || {}, {calc, ia});
      AG.fijar(id, datos);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      const n = v => v === null || v === undefined ? '—' : String(v);
      AG.terminar(id, {hoja: {
        'Índice de coherencia': coh.indice === null ? 'Pendiente' : coh.indice + ' (' + coh.nivel + ') · ' + coh.de,
        'Detalle del índice': coh.componentes.map(x => x.nombre + ': ' + x.valor).join('\n'),
        'Mapa de afinidades': calc.mapa.map(f => f.carrera + ' — afinidad ' + n(f.total) + ' (intereses ' + n(f.interes) + ', aptitudes ' + n(f.aptitudes) + ', motivos ' + n(f.motivos) + ', estilo ' + (f.estilo || '—') + ')').join('\n'),
        'Narrativa': ia ? ia.narrativa : 'Pendiente: sin texto de la IA',
        'Micro escenarios': ia ? ia.escenarios.map(x => (x.titulo || x.ruta) + ': 1 año: ' + x.a1 + ' | 3 años: ' + x.a3 + ' | 5 años: ' + x.a5).join('\n') : '',
        'Versión para padres': ia ? ia.padres : '',
        'Versión para orientador': ia && ia.orientador ? [ia.orientador.resumen].concat((ia.orientador.tensiones || []).map(x => 'Tensión: ' + x), (ia.orientador.preguntas || []).map(x => 'Pregunta: ' + x)).join('\n') : ''
      }});
    };
  },
  /* Sección del reporte (Resumen ejecutivo de Ágora y reportes de DIANA). */
  seccion(AG, d){
    estilos();
    const calc = d.calc || {}, coh = calc.coherencia || {indice: null, componentes: []}, ia = d.ia;
    const mapa = calc.mapa || [];
    return (coh.indice !== null ? '<p><strong>Índice de coherencia con ' + AG.esc(coh.de) + ':</strong> ' + coh.indice + ' de 100 (' + AG.esc(coh.nivel.toLowerCase()) + ').</p>' +
      '<table class="tabla">' + coh.componentes.map(x => '<tr><td style="width:30%">' + AG.esc(x.nombre) + '</td><td style="width:12%">' + x.valor + '</td><td>' + AG.esc(x.nota) + '</td></tr>').join('') + '</table>' : '<p class="vacio">Índice de coherencia pendiente.</p>') +
      (mapa.length ? '<h3>Mapa de afinidades</h3><table class="tabla"><tr><th>Carrera</th><th>Intereses</th><th>Aptitudes</th><th>Motivos</th><th>Estilo</th><th>Afinidad</th></tr>' +
        mapa.map(f => '<tr><td>' + AG.esc(f.carrera) + '</td><td>' + (f.interes ?? '—') + '</td><td>' + (f.aptitudes ?? '—') + '</td><td>' + (f.motivos ?? '—') + '</td><td>' + (f.estilo ? ETQ[f.estilo] : '—') + '</td><td><strong>' + (f.total ?? '—') + '</strong></td></tr>').join('') + '</table>' : '') +
      (ia ? '<h3>Narrativa</h3>' + parrafos(AG, ia.narrativa) + '<h3>Micro escenarios</h3>' + htmlEscenarios(AG, ia.escenarios) + '<h3>Para la familia</h3>' + parrafos(AG, ia.padres) + '<h3>Para el orientador</h3>' + htmlOrientador(AG, ia.orientador)
        : '<p class="vacio">Los textos de la IA quedaron pendientes.</p>');
  }
};
})();
