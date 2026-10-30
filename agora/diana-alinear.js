/* =====================================================================
   DIANA — Alinear: tu perfil frente a las vacantes
   =====================================================================

   Seis herramientas (el séptimo paso es el resumen, que arma fase10-resumen):

   brechas_ofertas       Compara su perfil y su CV con las vacantes reales de
                         su rol (monitoreo del Club) y le muestra las diez que
                         más se le parecen, con lo que ya tiene y lo que le falta.
   brechas_competencias  Elige sus cinco brechas técnicas y cinco no técnicas
                         de lo que más piden las vacantes de su industria.
   cv                    Su CV con el constructor del sitio (cv-builder.html) y
                         la relación con su perfil en plataformas profesionales.
   entrevista            Guía de entrevista: temas que salen de sus datos y sus
                         propias preguntas y respuestas (no hay lista curada).
   presentacion          Introducción, elevator speech, experiencia y por qué
                         quiere el rol.
   expectativas          Cuestionario para la mentoría de ajuste de
                         expectativas (salario, plazo, nivel, confianza).

   Todas se revisan con el mentor (el recuadro lo pone proceso.js).
   Nada sale de esta página: el CV se lee del mismo navegador.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lineas = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const leerLS = k => { try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } };
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const palabras = t => String(t || '').split(/\s+/).filter(Boolean).length;
const VACIA = /inferida del t[ií]tulo/i;

/* ¿La habilidad aparece en el texto? "IA / Automatización" cuenta si aparece
   cualquiera de sus partes. */
function enTexto(skill, textoNorm){
  return String(skill || '').split('/').map(x => norm(x).trim()).filter(x => x.length > 1).some(s => {
    const re = new RegExp('(^|[^a-z0-9])' + escRe(s).replace(/\s+/g, '\\s+') + '($|[^a-z0-9])');
    return re.test(' ' + textoNorm + ' ');
  });
}

/* ---- El CV de la persona, en este navegador ---- */
const LS_CV = 'cmb_cv_builder_v1';
function cvBuilder(){ return leerLS(LS_CV); }
function textoCV(st){
  if(!st) return '';
  const L = [st.puestoObjetivo, st.perfil, st.habExtra];
  (st.exp || []).forEach(e => L.push(e.puesto, e.empresa, e.bullets));
  (st.edu || []).forEach(e => L.push(e.carrera, e.inst, e.extra));
  (st.cursos || []).forEach(c => L.push(c.nombre));
  (st.certs || []).forEach(c => L.push(c.nombre));
  (st.idiomas || []).forEach(i => L.push(i.nombre));
  L.push((st.habTec || []).join(', '), (st.habBlandas || []).join(', '));
  return L.filter(Boolean).join('\n');
}
/* Lo que el constructor tiene listo, apartado por apartado. */
function estadoCV(st){
  st = st || {};
  const exp = (st.exp || []).filter(e => e.puesto || e.empresa).length;
  const edu = (st.edu || []).filter(e => e.carrera || e.inst).length;
  const hab = (st.habTec || []).length + (st.habBlandas || []).length + lineas(String(st.habExtra || '').replace(/,/g, '\n')).length;
  return [
    {id:'contacto', txt:'Nombre y un medio de contacto', ok: !!(st.nombre && (st.email || st.tel))},
    {id:'puesto', txt:'Puesto al que aspiras', ok: !!st.puestoObjetivo},
    {id:'perfil', txt:'Perfil profesional', ok: String(st.perfil || '').length >= 80},
    {id:'exp', txt:'Experiencia o educación', ok: exp + edu > 0},
    {id:'hab', txt:'Al menos 5 habilidades', ok: hab >= 5}
  ];
}
/* Todo lo que sabemos de la persona, como texto, para compararlo con las vacantes. */
function perfilTexto(AG, pegado){
  const info = AG.info();
  const L = [textoCV(cvBuilder()), pegado || '', info.carrera, info.aspiracion];
  (info.experiencia || []).forEach(e => L.push(e.rol, e.organizacion, e.descripcion));
  (info.certificaciones || []).forEach(c => L.push(c.nombre));
  (info.idiomas || []).forEach(i => L.push(i.idioma));
  return norm(L.filter(Boolean).join('\n'));
}
const claveIndustria = mapa => mapa && mapa.industria && mapa.industria !== 'otra' ? mapa.industria : null;
const nombreIndustria = mapa => (mapa && (mapa.industriaNombre || mapa.industriaOtra)) || 'tu industria';
const habilidadesVac = v => (v.habilidades_tecnicas || []).concat(v.habilidades_blandas || []).filter(s => s && !VACIA.test(s));
const VACIAS_ROL = new Set(['para', 'con', 'del', 'los', 'las', 'una', 'otro', 'otra', 'jefe', 'mexico']);
const palabrasRol = rol => norm(rol).split(/[^a-z0-9]+/).filter(w => w.length > 3 && !VACIAS_ROL.has(w));

F.alinear = {enTexto, cvBuilder, textoCV, estadoCV, perfilTexto, claveIndustria};

/* =====================================================================
   1. Brechas frente a las vacantes
   ===================================================================== */
function puntuar(vacantes, texto, rol, perfilDisc){
  const pr = palabrasRol(rol);
  return vacantes.map(v => {
    const hs = [...new Set(habilidadesVac(v))];
    const tiene = hs.filter(s => enTexto(s, texto));
    const falta = hs.filter(s => !tiene.includes(s));
    const t = norm(v.titulo);
    const rolHits = pr.filter(w => t.includes(w)).length;
    const af = (perfilDisc && typeof AFINIDAD !== 'undefined') ? AFINIDAD.nivel(AFINIDAD.afinidad(v.titulo, perfilDisc)) : null;
    return {titulo: v.titulo, empresa: v.empresa || '', ubicacion: v.ubicacion || '', url: v.url || '', fecha: v.fecha_publicacion || '',
      tiene, falta, rolHits, afinidad: af, puntos: rolHits * 3 + tiene.length};
  }).sort((a, b) => b.puntos - a.puntos || String(b.fecha).localeCompare(String(a.fecha))).slice(0, 10);
}
const ETQ = {alta:'Alta', media:'Media', baja:'Baja'};
function repetidas(vacs){
  const c = {};
  vacs.forEach(v => v.falta.forEach(s => { c[s] = (c[s] || 0) + 1; }));
  return Object.entries(c).sort((a, b) => b[1] - a[1]).filter(x => x[1] >= 2).slice(0, 8).map(x => x[0] + ' (' + x[1] + ' de ' + vacs.length + ')');
}

F.brechas_ofertas = {
  titulo: 'Brechas frente a las vacantes',
  seccion(AG, d){
    const e = AG.esc;
    const vs = d.vacantes || [];
    return (vs.length ? '<table class="tabla"><tr><th>Vacante</th><th>Lo que ya tiene</th><th>Lo que le falta</th></tr>' +
        vs.filter(v => v.interesa).concat(vs.filter(v => !v.interesa)).slice(0, 10).map(v => '<tr><td>' + (v.interesa ? '★ ' : '') + e(v.titulo) + (v.empresa ? '<br><small>' + e(v.empresa) + '</small>' : '') + '</td><td>' + e((v.tiene || []).join(', ') || '—') + '</td><td>' + e((v.falta || []).join(', ') || '—') + '</td></tr>').join('') + '</table>'
        : (d.manual ? '<p>' + e(d.manual) + '</p>' : '')) +
      ((d.repetidas || []).length ? '<p><strong>Lo que más se repite en lo que le falta:</strong> ' + e(d.repetidas.join(', ')) + '</p>' : '') +
      (d.conclusion ? '<p><strong>Su conclusión:</strong> ' + e(d.conclusion) + '</p>' : '');
  },
  pintar(cont, AG, paso){
    const req = AG.requiere(['mapa']);
    if(req){ cont.innerHTML = req; return; }
    const mapa = AG.datos('mapa') || {};
    const d = Object.assign({pegado:'', vacantes:[], manual:'', conclusion:'', repetidas:[]}, AG.datos(paso.id) || {});
    const cv = cvBuilder();
    const puente = (() => { try{ return localStorage.getItem('cmb_cv_texto_puente') || ''; }catch(e){ return ''; } })();
    if(!d.pegado && puente) d.pegado = puente;
    const rol = mapa.rol === '__otro' ? mapa.rolOtro : (mapa.rol || mapa.rolOtro || '');
    const disc = AG.disc();
    const perfilDisc = disc && typeof AFINIDAD !== 'undefined' ? AFINIDAD.perfilNormalizado(disc.p) : null;
    const tieneCV = textoCV(cv).length > 80;

    cont.innerHTML =
      '<div class="card"><h3>Tu CV y tu perfil</h3>' +
        '<p class="note" style="margin-top:0;">Comparamos con las vacantes lo que escribiste en tu información inicial' + (tieneCV ? ' y el CV que tienes en el <a href="cv-builder.html" target="_blank" rel="noopener">constructor de CV</a> de este navegador' : '') + '. ' +
        (tieneCV ? '' : 'Si ya tienes un CV, pega aquí su texto para que la comparación sea más fiel (o ármalo en el paso <a href="#" data-abrir="cv">Crea tu CV</a>).') + ' Nada de esto sale de tu navegador.</p>' +
        '<div class="campo"><label for="f_bo_cv">Texto de tu CV (opcional)</label><textarea id="f_bo_cv" rows="4" placeholder="Pega aquí el texto de tu CV">' + AG.esc(d.pegado) + '</textarea></div>' +
        '<div class="acciones"><button type="button" class="secondary mini" id="bo_comparar">Comparar con las vacantes</button></div>' +
      '</div>' +
      '<div class="card" id="bo_vacantes"><p class="note">Cargando vacantes…</p></div>' +
      '<div class="card"><h3>¿Qué concluyes?</h3>' +
        '<div id="bo_rep"></div>' +
        '<div class="campo"><label for="f_bo_concl">Con lo que viste, ¿qué es lo primero que tienes que cerrar para competir por estas vacantes?</label><textarea id="f_bo_concl" rows="3">' + AG.esc(d.conclusion) + '</textarea></div>' +
        AG.boton(paso.id, AG.completa(paso.id)) + '</div>';

    const caja = cont.querySelector('#bo_vacantes');
    let vacs = d.vacantes || [];
    let hayDatos = false;
    const leer = () => {
      const marc = AG.marcados(cont, 'bo_interesa');
      vacs.forEach((v, i) => { v.interesa = marc.includes(String(i)); });
      const man = cont.querySelector('#f_bo_manual');
      return {pegado: cont.querySelector('#f_bo_cv').value, vacantes: vacs, repetidas: repetidas(vacs),
        manual: man ? man.value : d.manual, conclusion: cont.querySelector('#f_bo_concl').value, rol, industria: nombreIndustria(mapa)};
    };
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    const pintarRep = () => {
      const r = repetidas(vacs);
      cont.querySelector('#bo_rep').innerHTML = r.length ? '<div class="mercado"><strong>Lo que más se repite en lo que te falta:</strong> ' + AG.esc(r.join(', ')) + '.</div>' : '';
    };
    function pintarVacantes(){
      if(!hayDatos){
        caja.innerHTML = '<h3>Vacantes que revisaste</h3><p class="note" style="margin-top:0;">El monitoreo del Club no cubre ' + AG.esc(nombreIndustria(mapa)) + '. Busca diez vacantes de ' + AG.esc(rol || 'tu rol objetivo') +
          ' en bolsas de trabajo y anota aquí, de cada una, qué piden y qué te falta.</p>' +
          '<div class="campo"><textarea id="f_bo_manual" rows="8" placeholder="Vacante — empresa — qué piden — qué me falta">' + AG.esc(d.manual) + '</textarea></div>';
        return;
      }
      const sinCoincidir = vacs.every(v => !v.puntos);
      caja.innerHTML = '<h3>Las diez vacantes de ' + AG.esc(nombreIndustria(mapa)) + ' que más se te parecen</h3>' +
        '<p class="note" style="margin-top:0;">' + (sinCoincidir ? 'No encontramos coincidencias claras con tu perfil, así que te mostramos las más recientes. Pegar tu CV arriba ayuda.' :
          'Ordenadas por cuánto se parece el puesto a tu rol (' + AG.esc(rol || '—') + ') y cuántas de las habilidades que piden aparecen en tu perfil.') +
        ' Marca con ★ las que te interesan.</p>' +
        vacs.map((v, i) => '<div class="vacante">' +
          '<label class="check"><input type="checkbox" data-grupo="bo_interesa" value="' + i + '"' + (v.interesa ? ' checked' : '') + '> <span><strong>' + AG.esc(v.titulo) + '</strong>' +
            '<small>' + AG.esc([v.empresa, v.ubicacion, v.fecha].filter(Boolean).join(' · ')) + (v.afinidad ? ' · afinidad con tu estilo: ' + ETQ[v.afinidad] : '') + '</small></span></label>' +
          '<div class="dos-col"><div><span class="tipo">Ya tienes</span> ' + (v.tiene.length ? AG.esc(v.tiene.join(', ')) : '—') + '</div>' +
          '<div><span class="tipo">Te falta</span> ' + (v.falta.length ? AG.esc(v.falta.join(', ')) : '—') + '</div></div>' +
          (v.url ? '<a href="' + AG.esc(v.url) + '" target="_blank" rel="noopener noreferrer">Ver vacante</a>' : '') +
        '</div>').join('');
    }
    async function comparar(){
      const clave = claveIndustria(mapa);
      const s = clave ? await AG.sector(clave) : null;
      hayDatos = !!(s && (s.vacantes_detalle || []).length);
      if(hayDatos){
        const previas = new Set((vacs || []).filter(v => v.interesa).map(v => v.titulo + '|' + v.empresa));
        vacs = puntuar(s.vacantes_detalle, perfilTexto(AG, cont.querySelector('#f_bo_cv').value), rol, perfilDisc);
        vacs.forEach(v => { v.interesa = previas.has(v.titulo + '|' + v.empresa); });
      }
      if(cont.isConnected){ pintarVacantes(); pintarRep(); guardar(); }
    }
    cont.querySelector('#bo_comparar').onclick = comparar;
    cont.addEventListener('change', ev => { if(ev.target.dataset && ev.target.dataset.grupo === 'bo_interesa') pintarRep(); guardar(); });
    cont.addEventListener('input', guardar);
    comparar();

    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      if(hayDatos && !x.vacantes.some(v => v.interesa)) f.push('marcar con ★ al menos una vacante que te interese');
      if(!hayDatos && lineas(x.manual).length < 3) f.push('anotar al menos tres vacantes que revisaste');
      if(x.conclusion.trim().length < 10) f.push('escribir tu conclusión');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, {rol: x.rol, industria: x.industria, vacantes: x.vacantes.map(v => ({titulo: v.titulo, empresa: v.empresa, tiene: v.tiene, falta: v.falta, interesa: v.interesa})),
        repetidas: x.repetidas, conclusion: x.conclusion, hoja: {
          'Rol e industria': [x.rol, x.industria].filter(Boolean).join(' · '),
          'Vacantes que me interesan': AG.vinetas(x.vacantes.filter(v => v.interesa).map(v => v.titulo + (v.empresa ? ' — ' + v.empresa : ''))) || x.manual,
          'Lo que más me falta': AG.vinetas(x.repetidas), 'Mi conclusión': x.conclusion.trim()
        }});
    };
  }
};

/* =====================================================================
   2. Brechas de competencias: 5 técnicas y 5 no técnicas
   ===================================================================== */
const MAX_BRECHAS = 5;
const todasB = (lista, otras) => (lista || []).concat(lineas(otras));
F.brechas_competencias = {
  titulo: 'Brechas de competencias',
  completa: d => todasB(d.tecnicas, d.tecnicasOtras).length >= 3 && todasB(d.blandas, d.blandasOtras).length >= 3,
  seccion(AG, d){
    return '<div class="dos-col"><div class="bloque"><h3>Brechas técnicas</h3>' + (AG.lista(todasB(d.tecnicas, d.tecnicasOtras)) || '<p class="vacio">—</p>') + '</div>' +
      '<div class="bloque"><h3>Brechas no técnicas</h3>' + (AG.lista(todasB(d.blandas, d.blandasOtras)) || '<p class="vacio">—</p>') + '</div></div>' +
      (d.plan ? '<p><strong>Cómo las va a cerrar:</strong> ' + AG.esc(d.plan) + '</p>' : '');
  },
  pintar(cont, AG, paso){
    const req = AG.requiere(['mapa']);
    if(req){ cont.innerHTML = req; return; }
    const mapa = AG.datos('mapa') || {}, bo = AG.datos('brechas_ofertas') || {}, disc = AG.disc();
    const d = Object.assign({tecnicas:[], tecnicasOtras:'', blandas:[], blandasOtras:'', plan:''}, AG.datos(paso.id) || {});
    cont.innerHTML = '<div class="card" id="bc_lista"><p class="note">Cargando…</p></div>' +
      '<div class="card"><h3>Cómo las vas a cerrar</h3>' +
        '<p class="note" style="margin-top:0;">Un curso, un proyecto, una práctica, pedirle a alguien que te enseñe. Lo vas a priorizar en Nutrir.</p>' +
        '<div class="campo"><textarea id="f_bc_plan" rows="3">' + AG.esc(d.plan) + '</textarea></div>' +
        AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const caja = cont.querySelector('#bc_lista');
    const leer = () => ({tecnicas: AG.marcados(cont, 'bc_tec'), tecnicasOtras: (cont.querySelector('#f_bc_totras') || {}).value || d.tecnicasOtras,
      blandas: AG.marcados(cont, 'bc_bla'), blandasOtras: (cont.querySelector('#f_bc_botras') || {}).value || d.blandasOtras, plan: cont.querySelector('#f_bc_plan').value});
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    const clave = claveIndustria(mapa);
    (clave ? AG.sector(clave) : Promise.resolve(null)).then(s => {
      const texto = perfilTexto(AG, bo.pegado || '');
      const item = x => enTexto(x.skill, texto) ? {texto: x.skill, nota: x.menciones + ' menciones · parece que ya la tienes'} : {texto: x.skill, nota: x.menciones + ' menciones en las vacantes'};
      const tec = s ? (s.habilidades_tecnicas || []).filter(x => !VACIA.test(x.skill)).slice(0, 12) : [];
      const bla = s ? (s.habilidades_blandas || []).slice(0, 10) : [];
      // Las de su estilo que menos ejercita, si no vienen ya en la lista del sector.
      const extra = (disc ? DISC.CRECIMIENTO_HABILIDADES[disc.dom] : []).map(h => h.charAt(0).toUpperCase() + h.slice(1)).filter(h => !bla.some(b => norm(b.skill) === norm(h)));
      const rep = (bo.repetidas || []).map(r => r.replace(/ \(\d+ de \d+\)$/, ''));
      caja.innerHTML = '<h3>Competencias técnicas que piden en ' + AG.esc(nombreIndustria(mapa)) + '</h3>' +
        '<p class="note" style="margin-top:0;">Elige hasta ' + MAX_BRECHAS + ' que te falten. ' + (rep.length ? 'En las vacantes que revisaste lo que más te faltaba era: ' + AG.esc(rep.join(', ')) + '.' : '') + '</p>' +
        (tec.length ? AG.checks('bc_tec', tec.map(item), d.tecnicas) : '<p class="note">El monitoreo del Club no cubre esta industria: escríbelas abajo.</p>') +
        '<div class="campo" style="margin-top:8px;"><label for="f_bc_totras">Otras técnicas, una por renglón</label><textarea id="f_bc_totras" rows="2">' + AG.esc(d.tecnicasOtras) + '</textarea></div>' +
        '<h3>Competencias no técnicas</h3>' +
        '<p class="note" style="margin-top:0;">Las que piden las vacantes y las que tu estilo ejercita menos. Elige hasta ' + MAX_BRECHAS + '.</p>' +
        AG.checks('bc_bla', bla.map(item).concat(extra.map(h => ({texto: h, nota: 'tu estilo la ejercita menos'}))), d.blandas) +
        '<div class="campo" style="margin-top:8px;"><label for="f_bc_botras">Otras no técnicas, una por renglón</label><textarea id="f_bc_botras" rows="2">' + AG.esc(d.blandasOtras) + '</textarea></div>';
    });
    cont.addEventListener('change', ev => {
      const g = ev.target.dataset && ev.target.dataset.grupo;
      if((g === 'bc_tec' || g === 'bc_bla') && ev.target.checked && AG.marcados(cont, g).length > MAX_BRECHAS) ev.target.checked = false;
      guardar();
    });
    cont.addEventListener('input', guardar);
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      const nt = todasB(x.tecnicas, x.tecnicasOtras), nb = todasB(x.blandas, x.blandasOtras);
      if(nt.length < 3) f.push('al menos 3 brechas técnicas (llevas ' + nt.length + ')');
      if(nb.length < 3) f.push('al menos 3 brechas no técnicas (llevas ' + nb.length + ')');
      if(nt.length > MAX_BRECHAS) f.push('quedarte con ' + MAX_BRECHAS + ' técnicas como máximo (llevas ' + nt.length + ')');
      if(nb.length > MAX_BRECHAS) f.push('quedarte con ' + MAX_BRECHAS + ' no técnicas como máximo (llevas ' + nb.length + ')');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {'Brechas técnicas': AG.vinetas(nt), 'Brechas no técnicas': AG.vinetas(nb), 'Cómo las cerraré': x.plan.trim()}}));
    };
  }
};

/* =====================================================================
   3. Crea tu CV (con el constructor del sitio)
   ===================================================================== */
const ALINEAR_PERFIL = [
  'El titular de mi perfil dice lo mismo que el puesto al que aspiro en mi CV',
  'Mi sección "Acerca de" cuenta lo mismo que mi perfil profesional, en primera persona',
  'Puestos, empresas y fechas coinciden entre mi CV y mi perfil',
  'Las habilidades de mi perfil son las de mi CV (y las que piden las vacantes)',
  'Tengo una foto profesional y un enlace a mi perfil en mi CV',
  'Pedí al menos una recomendación a alguien con quien trabajé o estudié'
];
F.cv = {
  titulo: 'Tu CV',
  completa: d => !!d.pdf && (d.estado || []).every(x => x.ok),
  seccion(AG, d){
    const e = AG.esc;
    return '<p>' + (d.puesto ? 'Puesto al que aspira: <strong>' + e(d.puesto) + '</strong>. ' : '') + (d.pdf ? 'Ya descargó su CV en PDF.' : 'Todavía no descarga su CV en PDF.') + '</p>' +
      (d.perfil ? '<p><strong>Perfil profesional:</strong> ' + e(d.perfil) + '</p>' : '') +
      ((d.alineado || []).length ? '<h3>Su perfil en plataformas profesionales</h3>' + AG.lista(d.alineado) : '') +
      (d.linkedin ? '<p>Perfil: ' + e(d.linkedin) + '</p>' : '');
  },
  pintar(cont, AG, paso){
    const mapa = AG.datos('mapa') || {}, marca = AG.datos('marca') || {};
    const d = Object.assign({alineado:[], linkedin:'', pdf:false}, AG.datos(paso.id) || {});
    const rol = mapa.rol === '__otro' ? mapa.rolOtro : (mapa.rol || '');
    const frase = F.marca && F.marca.frase ? F.marca.frase(marca) : '';
    cont.innerHTML =
      '<div class="card"><h3>Tu CV, apartado por apartado</h3>' +
        '<p class="note" style="margin-top:0;">El CV se arma en el constructor del sitio, en otra pestaña. Le pasamos lo que ya definiste aquí (tu industria, tu rol objetivo y tu propuesta de valor) en los campos que tengas vacíos. Cuando lo termines y lo descargues, regresa a esta pestaña.</p>' +
        '<div id="cv_estado"></div>' +
        '<div class="acciones"><a class="primary boton" id="cv_abrir" href="cv-builder.html?desde=diana" target="_blank" rel="noopener">Abrir el constructor de CV →</a>' +
        '<button type="button" class="secondary mini" id="cv_refrescar">Ya volví: revisar mi CV</button></div>' +
      '</div>' +
      '<div class="card"><h3>Tu CV y tu perfil en plataformas profesionales</h3>' +
        '<p class="note" style="margin-top:0;">Los reclutadores ven tu CV y luego buscan tu perfil (LinkedIn u otra plataforma de tu industria). Si dicen cosas distintas, pierdes confianza. Marca lo que ya tienes alineado.</p>' +
        AG.checks('cv_alineado', ALINEAR_PERFIL, d.alineado) +
        '<div class="campo" style="margin-top:8px;"><label for="f_cv_link">Enlace a tu perfil profesional (opcional)</label><input id="f_cv_link" value="' + AG.esc(d.linkedin) + '" placeholder="linkedin.com/in/…"></div>' +
        '<label class="check"><input type="checkbox" id="f_cv_pdf"' + (d.pdf ? ' checked' : '') + '> <span>Ya descargué mi CV en PDF.</span></label>' +
        AG.boton(paso.id, AG.completa(paso.id)) +
      '</div>';
    const st = () => cvBuilder() || {};
    const pintarEstado = () => {
      const s = st(), est = estadoCV(s);
      const pdfFecha = (() => { try{ return localStorage.getItem('cmb_cv_pdf') || ''; }catch(e){ return ''; } })();
      cont.querySelector('#cv_estado').innerHTML = (cvBuilder() ? '' : '<p class="note">Todavía no hay un CV en el constructor de este navegador.</p>') +
        '<ul class="estado-cv">' + est.map(x => '<li class="' + (x.ok ? 'ok' : 'falta') + '">' + (x.ok ? '✓ ' : '○ ') + AG.esc(x.txt) + '</li>').join('') + '</ul>' +
        (s.puestoObjetivo && rol && norm(s.puestoObjetivo) !== norm(rol) ? '<p class="note">En tu CV aspiras a «' + AG.esc(s.puestoObjetivo) + '» y tu rol objetivo es «' + AG.esc(rol) + '». Está bien si es a propósito; si no, ajústalo.</p>' : '') +
        (pdfFecha ? '<p class="note">Abriste la descarga en PDF el ' + AG.esc(AG.fechaLegible ? AG.fechaLegible(pdfFecha) : pdfFecha) + '.</p>' : '');
    };
    const leer = () => {
      const s = st();
      return {estado: estadoCV(s), puesto: s.puestoObjetivo || '', perfil: s.perfil || '', experiencias: (s.exp || []).filter(e => e.puesto || e.empresa).length,
        alineado: AG.marcados(cont, 'cv_alineado'), linkedin: cont.querySelector('#f_cv_link').value.trim(), pdf: cont.querySelector('#f_cv_pdf').checked};
    };
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    cont.querySelector('#cv_abrir').addEventListener('click', () => {
      try{ localStorage.setItem('cmb_cv_desde_diana', JSON.stringify({sector: claveIndustria(mapa) || '', puestoObjetivo: rol || '', perfil: frase || ''})); }catch(e){}
    });
    cont.querySelector('#cv_refrescar').onclick = () => { pintarEstado(); guardar(); };
    const alVolver = () => { if(cont.isConnected) pintarEstado(); else window.removeEventListener('focus', alVolver); };
    window.addEventListener('focus', alVolver);
    cont.addEventListener('change', guardar);
    cont.addEventListener('input', guardar);
    pintarEstado();
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      x.estado.filter(e => !e.ok).forEach(e => f.push('en tu CV: ' + e.txt.toLowerCase()));
      if(!x.pdf) f.push('descargar tu CV en PDF y marcar la casilla');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {'Puesto en el CV': x.puesto, 'Perfil profesional': x.perfil, 'Experiencias en el CV': String(x.experiencias),
        'Perfil alineado': AG.vinetas(x.alineado), 'Perfil en línea': x.linkedin}}));
    };
  }
};

/* =====================================================================
   4. Guía de entrevista
   ===================================================================== */
const N_PREG = 5;
const PREPARA = [
  'Investigué a la empresa: qué hace, sus valores y noticias recientes',
  'Releí la vacante y subrayé lo que piden',
  'Tengo mi CV a la mano (impreso o en el teléfono)',
  'Sé cómo llegar o probé la plataforma de la videollamada',
  'Elegí qué ponerme, acorde a la empresa',
  'Practiqué mis respuestas en voz alta'
];
const parCompleto = p => (p.p || '').trim().length >= 5 && (p.r || '').trim().length >= 10;
F.entrevista = {
  titulo: 'Guía de entrevista',
  seccion(AG, d){
    const e = AG.esc;
    const bloque = (t, xs) => (xs || []).filter(parCompleto).length ? '<h3>' + t + '</h3>' + (xs || []).filter(parCompleto).map(p => '<p><strong>' + e(p.p) + '</strong><br>' + e(p.r) + '</p>').join('') : '';
    return bloque('Preguntas técnicas', d.tecnicas) + bloque('Preguntas no técnicas', d.noTecnicas) +
      (lineas(d.mias).length ? '<h3>Lo que va a preguntar al entrevistador</h3>' + AG.lista(lineas(d.mias)) : '');
  },
  pintar(cont, AG, paso){
    const req = AG.requiere(['mapa']);
    if(req){ cont.innerHTML = req; return; }
    const mapa = AG.datos('mapa') || {}, bc = AG.datos('brechas_competencias') || {}, form = AG.datos('formacion') || {}, disc = AG.disc(), foda = AG.foda();
    const vacio = () => Array.from({length: N_PREG}, () => ({p:'', r:''}));
    const d = Object.assign({tecnicas: vacio(), noTecnicas: vacio(), mias:'', prepara:[]}, AG.datos(paso.id) || {});
    const rol = mapa.rol === '__otro' ? mapa.rolOtro : (mapa.rol || 'tu rol');
    const temasTec = [...new Set((form.tecnicas || []).concat(bc.tecnicas || []))].slice(0, 6);
    const temasNo = [...new Set((bc.blandas || []).concat(disc ? DISC.CRECIMIENTO_HABILIDADES[disc.dom] : []))].slice(0, 6);
    const filas = (pref, xs, ph) => xs.map((x, i) => '<div class="par-pregunta">' +
      '<div class="campo"><label for="f_en_' + pref + '_p' + i + '">Pregunta ' + (i + 1) + '</label><input id="f_en_' + pref + '_p' + i + '" value="' + AG.esc(x.p) + '" placeholder="' + AG.esc(ph[i % ph.length]) + '"></div>' +
      '<div class="campo"><label for="f_en_' + pref + '_r' + i + '">Tu respuesta</label><textarea id="f_en_' + pref + '_r' + i + '" rows="2">' + AG.esc(x.r) + '</textarea></div></div>').join('');
    cont.innerHTML =
      '<div class="card"><h3>Cómo prepararte</h3>' +
        '<p style="margin-top:0;">En una entrevista para ' + AG.esc(rol) + ' te van a preguntar dos tipos de cosas:</p>' +
        '<ul><li><strong>Técnicas:</strong> si sabes hacer el trabajo. Salen de lo que pide la vacante.' + (temasTec.length ? ' Por lo que trabajaste en este proceso, prepárate en: ' + AG.esc(temasTec.join(', ')) + '.' : '') + '</li>' +
        '<li><strong>No técnicas:</strong> cómo trabajas con otros, cómo resuelves problemas y por qué quieres el puesto.' + (temasNo.length ? ' Temas que te conviene tener listos: ' + AG.esc(temasNo.join(', ')) + '.' : '') + '</li></ul>' +
        '<p>Para las no técnicas usa el método <strong>STAR</strong>: la <strong>S</strong>ituación, la <strong>T</strong>area que tenías, la <strong>A</strong>cción que tomaste y el <strong>R</strong>esultado (con cifras si puedes).' +
        (foda && lineas(foda.D).length ? ' Si te preguntan por una debilidad, toma una de tu FODA y cuenta qué estás haciendo para mejorarla.' : '') + '</p>' +
        '<p class="note">Las preguntas las escribes tú: búscalas en las vacantes que revisaste, pregúntale a tu mentor y a quien ya trabaje en ' + AG.esc(nombreIndustria(mapa)) + '.</p>' +
      '</div>' +
      '<div class="card"><h3>Preguntas técnicas que esperas</h3>' + filas('t', d.tecnicas, ['¿Cómo harías…?', '¿Qué herramienta usarías para…?', '¿Qué experiencia tienes con…?']) + '</div>' +
      '<div class="card"><h3>Preguntas no técnicas que esperas</h3>' + filas('n', d.noTecnicas, ['Cuéntame de una vez que…', '¿Por qué quieres trabajar aquí?', '¿Cómo manejas…?']) + '</div>' +
      '<div class="card"><h3>Lo que tú vas a preguntar</h3>' +
        '<p class="note" style="margin-top:0;">Al final siempre te preguntan si tienes dudas. Llevar dos o tres preguntas muestra interés. Una por renglón.</p>' +
        '<div class="campo"><textarea id="f_en_mias" rows="3">' + AG.esc(d.mias) + '</textarea></div>' +
        '<h3>Antes de la entrevista</h3>' + AG.checks('en_prepara', PREPARA, d.prepara) +
        AG.boton(paso.id, AG.completa(paso.id)) +
      '</div>';
    const pares = pref => Array.from({length: N_PREG}, (_, i) => ({p: cont.querySelector('#f_en_' + pref + '_p' + i).value, r: cont.querySelector('#f_en_' + pref + '_r' + i).value}));
    const leer = () => ({tecnicas: pares('t'), noTecnicas: pares('n'), mias: cont.querySelector('#f_en_mias').value, prepara: AG.marcados(cont, 'en_prepara')});
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      const nt = x.tecnicas.filter(parCompleto).length, nn = x.noTecnicas.filter(parCompleto).length;
      if(nt < 3) f.push('al menos 3 preguntas técnicas con tu respuesta (llevas ' + nt + ')');
      if(nn < 3) f.push('al menos 3 preguntas no técnicas con tu respuesta (llevas ' + nn + ')');
      if(lineas(x.mias).length < 2) f.push('al menos 2 preguntas tuyas para el entrevistador');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      const col = xs => xs.filter(parCompleto).map(p => '• ' + p.p.trim() + '\n  ' + p.r.trim()).join('\n');
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {'Preguntas técnicas': col(x.tecnicas), 'Preguntas no técnicas': col(x.noTecnicas),
        'Mis preguntas': AG.vinetas(lineas(x.mias)), 'Preparación': AG.vinetas(x.prepara)}}));
    };
  }
};

/* =====================================================================
   5. Presentación efectiva
   ===================================================================== */
const PRACTICA = ['La dije en voz alta', 'Me grabé y me escuché', 'Se la presenté a alguien y me dio retroalimentación', 'La ajusté para que dure menos de un minuto'];
const PARTES = [
  {id:'intro', t:'Introducción', ayuda:'Quién eres en dos frases: tu nombre, qué estudiaste o estudias y qué haces hoy.'},
  {id:'elevator', t:'Elevator speech', ayuda:'Lo que dirías si solo tuvieras 30 a 60 segundos: tu propuesta de valor y qué buscas. Entre 75 y 150 palabras.'},
  {id:'experiencia', t:'Tu experiencia relevante', ayuda:'Una o dos experiencias (trabajo, prácticas, proyectos, voluntariado) que se relacionen con el rol, con un resultado concreto.'},
  {id:'porque', t:'Por qué quieres este rol', ayuda:'Qué te atrae del rol y de la industria, y cómo encaja con lo que descubriste de ti.'}
];
F.presentacion = {
  titulo: 'Presentación efectiva',
  seccion(AG, d){
    return PARTES.map(p => d[p.id] ? '<h3>' + p.t + '</h3><p>' + AG.esc(d[p.id]) + '</p>' : '').join('') +
      ((d.practica || []).length ? '<p class="note">Práctica: ' + AG.esc(d.practica.join('; ')) + '.</p>' : '');
  },
  pintar(cont, AG, paso){
    const info = AG.info(), mapa = AG.datos('mapa') || {}, marca = AG.datos('marca') || {}, cre = AG.datos('crecimiento') || {}, disc = AG.disc();
    const d = Object.assign({intro:'', elevator:'', experiencia:'', porque:'', practica:[]}, AG.datos(paso.id) || {});
    const rol = mapa.rol === '__otro' ? mapa.rolOtro : (mapa.rol || '');
    const frase = F.marca && F.marca.frase ? F.marca.frase(marca) : '';
    const pistas = {
      intro: [AG.nombre(), info.carrera, info.institucion].filter(Boolean).length ? 'De tu información inicial: ' + [AG.nombre(), info.carrera, info.institucion].filter(Boolean).join(', ') + '.' : '',
      elevator: frase ? 'Tu propuesta de valor: «' + frase + '»' : '',
      experiencia: (info.experiencia || []).filter(e => e.rol).length ? 'Tus experiencias: ' + info.experiencia.filter(e => e.rol).map(e => e.rol + (e.organizacion ? ' en ' + e.organizacion : '')).join('; ') + '.' : '',
      porque: [rol && 'tu rol objetivo es ' + rol, (cre.valores || []).length && 'tus valores: ' + cre.valores.slice(0, 3).join(', '), disc && 'tu estilo: ' + DISC.FACTORES[disc.dom].nombre].filter(Boolean).join('; ')
    };
    cont.innerHTML = '<div class="card"><p class="note" style="margin-top:0;">Así te presentas al inicio de una entrevista, en una feria de empleo o cuando alguien te pregunta «¿a qué te dedicas?». Escríbelo como lo dirías, no como lo leerías.</p>' +
      PARTES.map(p => '<div class="campo"><label for="f_pr_' + p.id + '">' + p.t + '</label><p class="note" style="margin:0 0 4px;">' + p.ayuda + (pistas[p.id] ? ' <em>' + AG.esc(pistas[p.id]) + '</em>' : '') + '</p>' +
        '<textarea id="f_pr_' + p.id + '" rows="' + (p.id === 'elevator' ? 5 : 3) + '">' + AG.esc(d[p.id]) + '</textarea><small class="contador" data-cuenta="' + p.id + '"></small></div>').join('') +
      '<h3>Practícala</h3>' + AG.checks('pr_practica', PRACTICA, d.practica) +
      AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const leer = () => Object.assign({practica: AG.marcados(cont, 'pr_practica')}, ...PARTES.map(p => ({[p.id]: cont.querySelector('#f_pr_' + p.id).value})));
    const contar = () => PARTES.forEach(p => {
      const n = palabras(cont.querySelector('#f_pr_' + p.id).value);
      cont.querySelector('[data-cuenta="' + p.id + '"]').textContent = n ? n + ' palabras · unos ' + Math.max(5, Math.round(n / 2.5 / 5) * 5) + ' segundos dicho en voz alta' : '';
    });
    const guardar = () => { contar(); AG.guardadoTxt(AG.fijar(paso.id, leer())); };
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    contar();
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      PARTES.forEach(p => { if(x[p.id].trim().length < 20) f.push('escribir tu ' + p.t.toLowerCase()); });
      const ne = palabras(x.elevator);
      if(ne > 200) f.push('recortar tu elevator speech (lleva ' + ne + ' palabras; procura que no pase de 150)');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {'Introducción': x.intro.trim(), 'Elevator speech': x.elevator.trim(), 'Experiencia relevante': x.experiencia.trim(),
        'Por qué quiero el rol': x.porque.trim(), 'Práctica': AG.vinetas(x.practica)}}));
    };
  }
};

/* =====================================================================
   6. Mentoría de ajuste de expectativas
   ===================================================================== */
const PLAZOS_BUSQUEDA = ['Menos de 1 mes', '1 a 3 meses', '3 a 6 meses', 'Más de 6 meses', 'No lo sé'];
const NIVELES = ['Becario o practicante', 'Puesto de entrada o junior', 'Puesto medio', 'Puesto senior o de coordinación'];
const MODALIDADES = ['Presencial', 'Híbrido', 'Remoto', 'Me da igual'];
const CONFIANZA = ['1', '2', '3', '4', '5'];
const pesos = n => '$' + Math.round(n).toLocaleString('es-MX');
F.expectativas = {
  titulo: 'Ajuste de expectativas',
  seccion(AG, d){
    const e = AG.esc;
    return '<table class="tabla">' +
      [['Salario que espera', d.salario ? pesos(d.salario) + ' al mes' : '—'], ['Plazo para encontrar trabajo', d.plazo], ['Nivel de puesto', d.nivel], ['Modalidad', d.modalidad], ['Dónde', d.donde],
       ['Confianza antes de la mentoría', d.confianzaAntes ? d.confianzaAntes + ' de 5' : '—'], ['Confianza después', d.confianzaDespues ? d.confianzaDespues + ' de 5' : '—']]
        .map(r => '<tr><td>' + r[0] + '</td><td>' + e(r[1] || '—') + '</td></tr>').join('') + '</table>' +
      (d.preocupa ? '<p><strong>Lo que le preocupa:</strong> ' + e(d.preocupa) + '</p>' : '') +
      (d.ajustes ? '<p><strong>Lo que ajustó con su mentor:</strong> ' + e(d.ajustes) + '</p>' : '');
  },
  pintar(cont, AG, paso){
    const mapa = AG.datos('mapa') || {}, pres = AG.datos('presupuesto') || {};
    const d = Object.assign({salario:'', plazo:'', nivel:'', modalidad:'', donde:'', preocupa:'', confianzaAntes:'', ajustes:'', confianzaDespues:''}, AG.datos(paso.id) || {});
    const info = AG.info();
    if(!d.donde && (info.ciudad || info.estado)) d.donde = [info.ciudad, info.estado].filter(Boolean).join(', ');
    cont.innerHTML =
      '<div class="card"><h3>Antes de tu mentoría</h3>' +
        '<p class="note" style="margin-top:0;">Contesta esto antes de verte con tu mentor. No hay respuestas correctas: es para que los dos sepan de dónde partes y ajusten lo que haga falta.</p>' +
        '<div id="ex_mercado"></div>' +
        '<div class="grid dos">' +
          '<div class="campo"><label for="f_ex_sal">¿Cuánto esperas ganar al mes en tu primer trabajo de ' + AG.esc(mapa.rol || 'tu rol') + '? (pesos, antes de impuestos)</label><input id="f_ex_sal" type="number" min="0" step="500" value="' + AG.esc(d.salario) + '"></div>' +
          '<div class="campo"><label for="f_ex_donde">¿Dónde quieres trabajar?</label><input id="f_ex_donde" value="' + AG.esc(d.donde) + '"></div>' +
        '</div>' +
        '<div class="campo"><label>¿En cuánto tiempo crees que vas a encontrar trabajo?</label>' + AG.radios('ex_plazo', PLAZOS_BUSQUEDA, d.plazo) + '</div>' +
        '<div class="campo"><label>¿A qué nivel de puesto vas a aplicar?</label>' + AG.radios('ex_nivel', NIVELES, d.nivel) + '</div>' +
        '<div class="campo"><label>¿En qué modalidad?</label>' + AG.radios('ex_mod', MODALIDADES, d.modalidad) + '</div>' +
        '<div class="campo"><label for="f_ex_preo">¿Qué es lo que más te preocupa de tu búsqueda de trabajo?</label><textarea id="f_ex_preo" rows="3">' + AG.esc(d.preocupa) + '</textarea></div>' +
        '<div class="campo"><label>Del 1 al 5, ¿qué tan seguro o segura te sientes de conseguir el trabajo que buscas?</label>' + AG.radios('ex_conf1', CONFIANZA, d.confianzaAntes) + '</div>' +
      '</div>' +
      '<div class="card"><h3>Después de tu mentoría</h3>' +
        '<div class="campo"><label for="f_ex_aj">¿Qué ajustaste con tu mentor? (salario, plazo, nivel, dónde buscar…)</label><textarea id="f_ex_aj" rows="3">' + AG.esc(d.ajustes) + '</textarea></div>' +
        '<div class="campo"><label>Del 1 al 5, ¿qué tan seguro o segura te sientes ahora?</label>' + AG.radios('ex_conf2', CONFIANZA, d.confianzaDespues) + '</div>' +
        AG.boton(paso.id, AG.completa(paso.id)) +
      '</div>';
    const leer = () => ({salario: cont.querySelector('#f_ex_sal').value, donde: cont.querySelector('#f_ex_donde').value, plazo: AG.radio(cont, 'ex_plazo'), nivel: AG.radio(cont, 'ex_nivel'),
      modalidad: AG.radio(cont, 'ex_mod'), preocupa: cont.querySelector('#f_ex_preo').value, confianzaAntes: AG.radio(cont, 'ex_conf1'),
      ajustes: cont.querySelector('#f_ex_aj').value, confianzaDespues: AG.radio(cont, 'ex_conf2')});
    let sal = null;
    const pintarMercado = () => {
      const x = leer(), caja = cont.querySelector('#ex_mercado');
      if(!sal || !sal.mediana_mensual_mxn){ caja.innerHTML = ''; return; }
      const n = Number(x.salario);
      let cmp = '';
      if(n > 0){
        if(n > sal.p75_mensual_mxn) cmp = ' Lo que esperas está arriba de lo que paga la mayoría de las vacantes: platícalo con tu mentor.';
        else if(n < sal.p25_mensual_mxn) cmp = ' Lo que esperas está abajo de lo que paga la mayoría: puede que te estés vendiendo barato.';
        else cmp = ' Lo que esperas está dentro del rango de la mayoría de las vacantes.';
      }
      const costo = pres && pres.total ? ' Tu presupuesto de vida era de ' + pesos(pres.total) + ' al mes.' : '';
      caja.innerHTML = '<div class="mercado">En ' + AG.esc(nombreIndustria(mapa)) + ' el salario típico es de <strong>' + pesos(sal.mediana_mensual_mxn) + '</strong> al mes; la mitad de las vacantes paga entre ' +
        pesos(sal.p25_mensual_mxn) + ' y ' + pesos(sal.p75_mensual_mxn) + ' (monitoreo del Club, vacantes con salario publicado).' + AG.esc(cmp + costo) + '</div>';
    };
    const clave = claveIndustria(mapa);
    if(clave) AG.sector(clave).then(s => { sal = s && s.salario; if(cont.isConnected) pintarMercado(); });
    const guardar = () => { pintarMercado(); AG.guardadoTxt(AG.fijar(paso.id, leer())); };
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      if(!(Number(x.salario) > 0)) f.push('cuánto esperas ganar');
      if(!x.plazo) f.push('en cuánto tiempo crees encontrar trabajo');
      if(!x.nivel) f.push('a qué nivel vas a aplicar');
      if(!x.modalidad) f.push('la modalidad');
      if(x.preocupa.trim().length < 5) f.push('qué te preocupa');
      if(!x.confianzaAntes) f.push('qué tan seguro o segura te sientes');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {'Salario esperado': x.salario, 'Plazo': x.plazo, 'Nivel': x.nivel, 'Modalidad': x.modalidad, 'Dónde': x.donde.trim(),
        'Lo que me preocupa': x.preocupa.trim(), 'Confianza antes': x.confianzaAntes, 'Ajustes con mi mentor': x.ajustes.trim(), 'Confianza después': x.confianzaDespues}}));
    };
  }
};
})();
