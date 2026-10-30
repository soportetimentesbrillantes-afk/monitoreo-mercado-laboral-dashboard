/* =====================================================================
   DIANA — Nutrir: tu formación
   =====================================================================

   seleccion_cursos    Prioriza cursos según las brechas de Alinear. Los
                       cursos salen solo del catálogo propio del Club y de los
                       que la persona ya anotó; nunca de plataformas externas.
   aprender            Aprender a aprender: 10 preguntas sobre cómo prefiere
                       aprender y 10 recomendaciones.
   certificaciones     Qué es una certificación y una microcredencial
                       (CONOCER, de la industria) y su lista de posibles
                       certificaciones. Guía y captura: no hay lista curada.
   comunidades         Qué son las comunidades de aprendizaje y las redes
                       profesionales, y su lista con requisitos para unirse.
   plan_entrenamiento  El plan que acuerda con su mentor: qué, cuándo y
                       cuántas horas, con lo que eligió en los pasos anteriores.

   El séptimo paso, el reporte, lo arma fase10-resumen con la configuración
   de diana.html. Todos se revisan con el mentor.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lineas = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const nuevoId = () => Math.random().toString(36).slice(2, 9);
const conTexto = (x, k) => String((x || {})[k] || '').trim().length > 0;

/* ---- Captura en renglones: una lista de fichas con los mismos campos ----
   La usan certificaciones, comunidades, el plan de entrenamiento y los pasos
   de Acompañar. Guarda en `filas` y avisa con alCambiar. */
function filas(caja, AG, cfg, datos, alCambiar){
  let rows = (datos && datos.length ? datos : [cfg.vacia()]).map(r => Object.assign(cfg.vacia(), r));
  const campo = (c, r, i) => {
    const id = 'f_' + cfg.id + '_' + c.k + '_' + i, v = r[c.k] == null ? '' : r[c.k];
    const ctl = c.ops ? '<select id="' + id + '" data-k="' + c.k + '" data-i="' + i + '"><option value="">—</option>' + c.ops.map(o => '<option' + (o === v ? ' selected' : '') + '>' + AG.esc(o) + '</option>').join('') + '</select>'
      : '<input id="' + id + '" data-k="' + c.k + '" data-i="' + i + '"' + (c.tipo ? ' type="' + c.tipo + '"' : '') + ' value="' + AG.esc(v) + '" placeholder="' + AG.esc(c.ph || '') + '">';
    return '<div class="campo' + (c.ancho ? ' ancho' : '') + '"><label for="' + id + '">' + AG.esc(c.t) + '</label>' + ctl + '</div>';
  };
  function pintar(){
    caja.innerHTML = rows.map((r, i) => '<div class="fila-captura">' + cfg.campos.map(c => campo(c, r, i)).join('') +
      '<button type="button" class="quitar" data-quitar-fila="' + i + '">Quitar</button></div>').join('') +
      '<button type="button" class="secondary mini" data-agregar-fila>' + AG.esc(cfg.agregar || 'Agregar otra') + '</button>';
  }
  const leerCampo = ev => {
    const t = ev.target; if(!t.dataset || t.dataset.k == null || t.dataset.i == null) return;
    const r = rows[Number(t.dataset.i)]; if(r) r[t.dataset.k] = t.value;
  };
  caja.addEventListener('input', leerCampo);
  caja.addEventListener('change', leerCampo);
  caja.addEventListener('click', ev => {
    const t = ev.target;
    if(t.dataset && t.dataset.quitarFila != null){ rows.splice(Number(t.dataset.quitarFila), 1); if(!rows.length) rows.push(cfg.vacia()); pintar(); alCambiar(); }
    else if(t.dataset && t.dataset.agregarFila != null){ rows.push(cfg.vacia()); pintar(); alCambiar(); }
  });
  pintar();
  return {
    leer: () => rows.map(r => Object.assign({}, r)),
    agregar(r){ const vac = rows.length === 1 && cfg.campos.every(c => !conTexto(rows[0], c.k)); if(vac) rows = []; rows.push(Object.assign(cfg.vacia(), r)); pintar(); alCambiar(); }
  };
}
F.filas = filas;
const llenas = (rows, k) => (rows || []).filter(r => conTexto(r, k));
const mapaDe = AG => AG.datos('mapa') || {};
const rolDe = m => m.rol || m.rolOtro || 'tu rol objetivo';
const industriaDe = m => m.industriaNombre || m.industriaOtra || 'tu industria';
const claveDe = m => m.industria && m.industria !== 'otra' ? m.industria : null;

/* =====================================================================
   1. Selección de cursos
   ===================================================================== */
const PRIORIDADES = ['Alta', 'Media', 'Baja', 'No por ahora'];
const PESO = {Alta: 3, Media: 2, Baja: 1};
F.seleccion_cursos = {
  titulo: 'Cursos seleccionados',
  seleccionados: d => (d.cursos || []).filter(c => PESO[c.prioridad] >= 2).sort((a, b) => PESO[b.prioridad] - PESO[a.prioridad]),
  seccion(AG, d){
    const s = F.seleccion_cursos.seleccionados(d);
    return s.length ? '<table class="tabla"><tr><th>Curso</th><th>Prioridad</th><th>Brecha que cierra</th></tr>' +
      s.map(c => '<tr><td>' + AG.esc(c.nombre) + '</td><td>' + AG.esc(c.prioridad) + '</td><td>' + AG.esc((c.cubre || []).join(', ') || '—') + '</td></tr>').join('') + '</table>' : '<p class="vacio">—</p>';
  },
  pintar(cont, AG, paso){
    const req = AG.requiere(['brechas_competencias']);
    if(req){ cont.innerHTML = req; return; }
    const mapa = mapaDe(AG), bc = AG.datos('brechas_competencias') || {}, form = AG.datos('formacion') || {}, bo = AG.datos('brechas_ofertas') || {};
    const d = Object.assign({cursos: [], propio: ''}, AG.datos(paso.id) || {});
    const brechas = (bc.tecnicas || []).concat(lineas(bc.tecnicasOtras)).map(t => ({t, tipo: 'técnica'}))
      .concat((bc.blandas || []).concat(lineas(bc.blandasOtras)).map(t => ({t, tipo: 'no técnica'})));
    const cubre = (texto, habs) => brechas.filter(b => {
      const nb = norm(b.t); const h = (habs || []).map(norm).concat(norm(texto));
      return h.some(x => x && (x.includes(nb) || (nb.length > 3 && nb.includes(x) && x.length > 3)));
    }).map(b => b.t);
    cont.innerHTML =
      '<div class="card"><h3>Tus brechas</h3>' +
        '<p class="note" style="margin-top:0;">Salen de Alinear. Un curso vale la pena si cierra alguna de estas.' + ((bo.repetidas || []).length ? ' En las vacantes que revisaste lo que más se repetía era: ' + AG.esc(bo.repetidas.join(', ')) + '.' : '') + '</p>' +
        '<div class="dos-col"><div class="bloque"><h3>Técnicas</h3>' + (AG.lista(brechas.filter(b => b.tipo === 'técnica').map(b => b.t)) || '<p class="vacio">—</p>') + '</div>' +
        '<div class="bloque"><h3>No técnicas</h3>' + (AG.lista(brechas.filter(b => b.tipo === 'no técnica').map(b => b.t)) || '<p class="vacio">—</p>') + '</div></div></div>' +
      '<div class="card"><h3>Prioriza tus cursos</h3>' +
        '<p class="note" style="margin-top:0;">Los cursos salen del catálogo del Club y de los que anotaste en tu plan de formación. Dale prioridad <strong>alta</strong> a los que cierran una brecha que piden muchas vacantes.</p>' +
        '<div id="sc_lista"><p class="note">Cargando…</p></div>' +
        '<div class="campo" style="margin-top:10px;"><label for="f_sc_propio">¿Otro curso que quieras considerar? Escríbelo y agrégalo</label><input id="f_sc_propio" placeholder="Nombre del curso"></div>' +
        '<div class="acciones"><button type="button" class="secondary mini" id="sc_agregar">Agregar a la lista</button></div>' +
        AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    let cursos = d.cursos.slice();
    const caja = cont.querySelector('#sc_lista');
    const pintarLista = () => {
      caja.innerHTML = cursos.length ? cursos.map((c, i) => '<div class="vacante"><strong>' + AG.esc(c.nombre) + '</strong>' +
        '<small class="note" style="display:block;">' + AG.esc([c.origen, c.cubre && c.cubre.length ? 'cierra: ' + c.cubre.join(', ') : 'no coincide con tus brechas'].filter(Boolean).join(' · ')) + '</small>' +
        AG.radios('sc_pri_' + i, PRIORIDADES, c.prioridad) + '</div>').join('')
        : '<p class="note">Todavía no hay cursos para tu industria en el catálogo del Club. Agrega abajo los que conozcas.</p>';
    };
    const leer = () => {
      cursos.forEach((c, i) => { c.prioridad = AG.radio(cont, 'sc_pri_' + i) || c.prioridad || ''; });
      return {cursos: cursos.map(c => Object.assign({}, c))};
    };
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    AG.manifest().then(m => {
      const cat = (m && m.COURSES && m.COURSES.cursos) || {};
      const clave = claveDe(mapa);
      const ya = new Set(cursos.map(c => norm(c.nombre)));
      const add = (nombre, origen, habs) => { if(!nombre || ya.has(norm(nombre))) return; ya.add(norm(nombre)); cursos.push({id: nuevoId(), nombre, origen, cubre: cubre(nombre, habs), prioridad: ''}); };
      const delSector = clave && cat[clave] ? cat[clave] : [];
      (form.cursos || []).forEach(n => { const c = delSector.find(x => n.startsWith(x.nombre)); add(n.split(' — ')[0], 'De tu plan de formación', c && c.habilidades); });
      delSector.filter(c => cubre(c.nombre, c.habilidades).length).forEach(c => add(c.nombre, 'Catálogo del Club · ' + (c.modalidad || ''), c.habilidades));
      // Las brechas no técnicas se trabajan igual en cualquier industria.
      const blandas = brechas.filter(b => b.tipo === 'no técnica');
      if(blandas.length) Object.keys(cat).filter(k => k !== clave).forEach(k => cat[k].filter(c => cubre(c.nombre, c.habilidades).some(x => blandas.some(b => b.t === x))).slice(0, 4)
        .forEach(c => add(c.nombre, 'Catálogo del Club', c.habilidades)));
      lineas(form.otros).forEach(n => add(n, 'Lo anotaste en tu plan de formación', []));
      if(cont.isConnected){ pintarLista(); guardar(); }
    });
    cont.querySelector('#sc_agregar').onclick = () => {
      const inp = cont.querySelector('#f_sc_propio'), n = inp.value.trim();
      if(!n){ inp.focus(); return; }
      leer();
      if(!cursos.some(c => norm(c.nombre) === norm(n))) cursos.push({id: nuevoId(), nombre: n, origen: 'Lo agregaste tú', cubre: cubre(n, []), prioridad: 'Media'});
      inp.value = ''; pintarLista(); guardar();
    };
    cont.addEventListener('change', guardar);
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), sel = F.seleccion_cursos.seleccionados(x), f = [];
      if(x.cursos.some(c => !c.prioridad)) f.push('ponerle prioridad a cada curso de la lista (aunque sea "No por ahora")');
      if(sel.length < 2) f.push('al menos dos cursos con prioridad alta o media (llevas ' + sel.length + ')');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {
        'Prioridad alta': AG.vinetas(sel.filter(c => c.prioridad === 'Alta').map(c => c.nombre)),
        'Prioridad media': AG.vinetas(sel.filter(c => c.prioridad === 'Media').map(c => c.nombre)),
        'Brechas que cubren': [...new Set([].concat(...sel.map(c => c.cubre || [])))].join(', ')
      }}));
    };
  }
};

/* =====================================================================
   2. Aprender a aprender
   Preferencias visual, auditiva, de lectura y escritura, y práctica. Se
   presenta como preferencia, no como etiqueta: se aprende mejor combinando
   modos y con técnicas que sirven a todos (practicar recordando, repasar
   espaciado, explicarle a alguien).
   ===================================================================== */
const ESTILOS = {
  V: {nombre: 'Visual', desc: 'Te ayuda ver la información: diagramas, mapas, esquemas, colores, videos con demostraciones.'},
  A: {nombre: 'Auditivo', desc: 'Te ayuda escuchar y platicar: explicaciones, podcasts, discutir el tema con otros.'},
  L: {nombre: 'Lectura y escritura', desc: 'Te ayuda leer y escribir: textos, listas, apuntes con tus palabras, resúmenes.'},
  K: {nombre: 'Práctico', desc: 'Te ayuda hacer: ejemplos reales, ejercicios, simulaciones, probar y equivocarte.'}
};
const PREGUNTAS_APR = [
  {p: 'Tienes que armar un mueble nuevo. ¿Qué haces primero?', o: {V: 'Veo los dibujos del instructivo', A: 'Le pido a alguien que me explique', L: 'Leo las instrucciones paso a paso', K: 'Empiezo a armarlo y voy viendo'}},
  {p: 'Para llegar a un lugar que no conoces, prefieres…', o: {V: 'Ver el mapa', A: 'Que alguien me diga cómo llegar', L: 'Tener las indicaciones por escrito', K: 'Ir y ubicarme en el camino'}},
  {p: 'En una clase o curso aprendes más cuando…', o: {V: 'Hay diagramas y presentaciones', A: 'El instructor explica y se discute', L: 'Hay lecturas y apuntes', K: 'Hay ejercicios y casos prácticos'}},
  {p: 'Para estudiar un tema difícil…', o: {V: 'Hago un mapa mental o un esquema', A: 'Lo platico o lo explico en voz alta', L: 'Hago resúmenes y releo mis notas', K: 'Resuelvo ejercicios hasta que me sale'}},
  {p: 'Cuando quieres aprender a usar un programa nuevo…', o: {V: 'Veo un video tutorial', A: 'Le pregunto a alguien que ya lo usa', L: 'Leo la guía o la ayuda', K: 'Le pico a todo hasta entenderlo'}},
  {p: 'Lo que más recuerdas de una persona que acabas de conocer es…', o: {V: 'Su cara y cómo vestía', A: 'Su voz y lo que platicamos', L: 'Su nombre escrito (en su gafete o tarjeta)', K: 'Lo que hicimos juntos'}},
  {p: 'Para preparar una presentación…', o: {V: 'Diseño primero las imágenes y gráficas', A: 'La ensayo en voz alta', L: 'Escribo lo que voy a decir', K: 'Hago una prueba completa, como si fuera real'}},
  {p: 'Si te explican algo y no lo entiendes, pides…', o: {V: 'Que me lo dibujen o me muestren un ejemplo', A: 'Que me lo expliquen de otra forma', L: 'Algo para leer con calma', K: 'Que me dejen intentarlo'}},
  {p: 'En tu tiempo libre te atrae más…', o: {V: 'Ver películas, fotos o diseño', A: 'Escuchar música, podcasts o platicar', L: 'Leer o escribir', K: 'Hacer deporte, cocinar o construir algo'}},
  {p: 'Para recordar algo importante…', o: {V: 'Lo imagino o lo marco con colores', A: 'Me lo repito en voz alta', L: 'Lo anoto', K: 'Lo asocio con algo que hice'}}
];
const RECOMENDACIONES = {
  V: ['Convierte cada tema en un esquema o mapa mental de una página.', 'Usa colores con un significado fijo (por ejemplo, definiciones en azul, ejemplos en verde).', 'Busca videos con demostraciones y pausa para dibujar lo que viste.', 'Haz líneas de tiempo y diagramas de flujo para procesos.', 'Pega tus esquemas donde los veas seguido.'],
  A: ['Explica en voz alta lo que acabas de aprender, como si dieras la clase.', 'Estudia con alguien y discutan las dudas.', 'Grábate resumiendo el tema y escúchalo en trayectos.', 'Inventa frases o rimas para lo que tienes que memorizar.', 'Pregunta en clase: hablarlo te ayuda a fijarlo.'],
  L: ['Reescribe tus apuntes con tus propias palabras, no los copies.', 'Haz listas y resúmenes de una cuartilla por tema.', 'Escribe preguntas sobre el tema y contéstalas sin ver tus notas.', 'Lee el material antes de la clase y subraya poco.', 'Lleva una bitácora de lo que aprendiste cada semana.'],
  K: ['Aprende con un proyecto real: aplica cada tema en algo concreto.', 'Haz ejercicios desde el primer día, aunque te equivoques.', 'Estudia en bloques cortos con pausas para moverte.', 'Busca prácticas, simulaciones o voluntariados donde usar lo que aprendes.', 'Arma ejemplos con objetos o casos de tu vida.']
};
const GENERALES = ['Practica recordando: cierra el libro y escribe lo que recuerdas antes de repasar.',
  'Repasa espaciado: un poco hoy, en tres días y en una semana rinde más que todo en una noche.',
  'Mezcla temas y tipos de ejercicio en una misma sesión.',
  'Ponte metas pequeñas y medibles para cada sesión de estudio.',
  'Explícale el tema a alguien: si no puedes, ahí está lo que te falta.'];
function resultadoApr(resp){
  const c = {V: 0, A: 0, L: 0, K: 0};
  Object.values(resp || {}).forEach(k => { if(c[k] != null) c[k]++; });
  const orden = Object.keys(c).sort((a, b) => c[b] - c[a]);
  const dom = orden.filter(k => c[k] === c[orden[0]] && c[k] > 0);
  return {conteo: c, dom, recomendaciones: [].concat(...dom.slice(0, 2).map(k => RECOMENDACIONES[k])).slice(0, 5).concat(GENERALES)};
}
F.aprender = {
  titulo: 'Tu forma de aprender',
  resultado: resultadoApr,
  seccion(AG, d){
    const r = resultadoApr(d.respuestas);
    return '<p>Prefiere aprender de forma <strong>' + AG.esc(r.dom.map(k => ESTILOS[k].nombre.toLowerCase()).join(' y ')) + '</strong> (' +
      Object.keys(r.conteo).map(k => ESTILOS[k].nombre + ' ' + r.conteo[k]).join(', ') + ' de 10).</p>' +
      ((d.aplicar || []).length ? '<h3>Lo que va a aplicar</h3>' + AG.lista(d.aplicar) : '');
  },
  pintar(cont, AG, paso){
    const d = Object.assign({respuestas: {}, aplicar: [], nota: ''}, AG.datos(paso.id) || {});
    cont.innerHTML = '<div class="card"><h3>¿Cómo prefieres aprender?</h3>' +
      '<p class="note" style="margin-top:0;">Diez situaciones. Elige lo que harías tú, no lo que «se debería» hacer. Nadie aprende de una sola forma: esto te dice qué te funciona primero para que lo aproveches y lo combines.</p>' +
      PREGUNTAS_APR.map((q, i) => '<div class="campo"><label>' + (i + 1) + '. ' + AG.esc(q.p) + '</label><div class="radios">' +
        Object.entries(q.o).map(([k, t]) => '<label><input type="radio" name="apr_' + i + '" value="' + k + '"' + (d.respuestas[i] === k ? ' checked' : '') + '> ' + AG.esc(t) + '</label>').join('') + '</div></div>').join('') +
      '</div><div class="card" id="apr_res"></div>';
    const leer = () => {
      const respuestas = {}; PREGUNTAS_APR.forEach((_, i) => { const v = AG.radio(cont, 'apr_' + i); if(v) respuestas[i] = v; });
      const ap = cont.querySelector('#apr_res [data-grupo="apr_aplicar"]') ? AG.marcados(cont, 'apr_aplicar') : d.aplicar;
      const nota = cont.querySelector('#f_apr_nota'); return {respuestas, aplicar: ap, nota: nota ? nota.value : d.nota};
    };
    const res = cont.querySelector('#apr_res');
    let firma = '';
    const pintarRes = () => {
      const x = leer(), n = Object.keys(x.respuestas).length;
      const r = resultadoApr(x.respuestas), f = n + ':' + r.dom.join('');
      if(f === firma) return; firma = f;
      res.innerHTML = n < PREGUNTAS_APR.length ? '<p class="note">Llevas ' + n + ' de 10. Al terminar aparece tu resultado con diez recomendaciones.</p>' + AG.boton(paso.id, AG.completa(paso.id)) :
        '<h3>Tu resultado</h3><p style="margin-top:0;">Prefieres aprender de forma <strong>' + AG.esc(r.dom.map(k => ESTILOS[k].nombre.toLowerCase()).join(' y ')) + '</strong>. ' + AG.esc(r.dom.map(k => ESTILOS[k].desc).join(' ')) + '</p>' +
        '<div class="mercado"><div class="cifras">' + Object.keys(r.conteo).map(k => '<div><b>' + r.conteo[k] + '</b>' + ESTILOS[k].nombre + '</div>').join('') + '</div></div>' +
        '<h3>Diez recomendaciones</h3><p class="note" style="margin-top:0;">Cinco para tu forma de aprender y cinco que le sirven a todos. Marca las que vas a aplicar en tus cursos.</p>' +
        AG.checks('apr_aplicar', r.recomendaciones, x.aplicar) +
        '<div class="campo" style="margin-top:8px;"><label for="f_apr_nota">¿Qué te ha funcionado antes para aprender algo difícil? (opcional)</label><textarea id="f_apr_nota" rows="2">' + AG.esc(x.nota) + '</textarea></div>' +
        AG.boton(paso.id, AG.completa(paso.id));
      conectarBoton();
    };
    const guardar = () => { pintarRes(); AG.guardadoTxt(AG.fijar(paso.id, leer())); };
    function conectarBoton(){
      cont.querySelector('#btnCompletar').onclick = () => {
        const x = leer(), f = [];
        const n = Object.keys(x.respuestas).length;
        if(n < PREGUNTAS_APR.length) f.push('contestar las 10 preguntas (llevas ' + n + ')');
        else if(x.aplicar.length < 2) f.push('marcar al menos 2 recomendaciones que vas a aplicar');
        if(f.length){ AG.faltan(f); return; }
        AG.fijar(paso.id, x);
        cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
        const r = resultadoApr(x.respuestas);
        AG.terminar(paso.id, Object.assign({}, x, {estilo: r.dom, hoja: {
          'Forma de aprender': r.dom.map(k => ESTILOS[k].nombre).join(' y '),
          'Puntaje': Object.keys(r.conteo).map(k => ESTILOS[k].nombre + ': ' + r.conteo[k]).join(', '),
          'Recomendaciones que aplicaré': AG.vinetas(x.aplicar)
        }}));
      };
    }
    cont.addEventListener('change', guardar);
    cont.addEventListener('input', ev => { if(ev.target.id === 'f_apr_nota') AG.guardadoTxt(AG.fijar(paso.id, leer())); });
    pintarRes();
  }
};

/* =====================================================================
   3. Valor de las certificaciones
   ===================================================================== */
const TIPOS_CERT = ['Estándar de competencia (CONOCER)', 'Certificación de la industria o de un fabricante', 'Microcredencial o insignia digital', 'Diplomado o constancia', 'Otra'];
const SI_NO = ['Sí', 'No', 'No lo sé'];
const PRIOR = ['Alta', 'Media', 'Baja'];
F.certificaciones = {
  titulo: 'Posibles certificaciones',
  seccion(AG, d){
    const r = llenas(d.filas, 'nombre');
    return r.length ? '<table class="tabla"><tr><th>Certificación</th><th>Tipo</th><th>Quién la otorga</th><th>¿La piden?</th><th>Prioridad</th></tr>' +
      r.map(x => '<tr><td>' + AG.esc(x.nombre) + '</td><td>' + AG.esc(x.tipo || '—') + '</td><td>' + AG.esc(x.otorga || '—') + '</td><td>' + AG.esc(x.piden || '—') + '</td><td>' + AG.esc(x.prioridad || '—') + '</td></tr>').join('') + '</table>' : '<p class="vacio">—</p>';
  },
  pintar(cont, AG, paso){
    const mapa = mapaDe(AG), form = AG.datos('formacion') || {}, info = AG.info();
    const d = Object.assign({filas: []}, AG.datos(paso.id) || {});
    const yaTiene = (info.certificaciones || []).map(c => c.nombre).filter(Boolean);
    const anotadas = lineas(form.otros);
    cont.innerHTML =
      '<div class="card"><h3>¿Qué es una certificación?</h3>' +
        '<ul style="margin-top:0;">' +
          '<li><strong>Certificación de competencia:</strong> un organismo evaluador revisa que <em>sabes hacer</em> una función laboral, no solo que tomaste un curso. En México las emite el sistema <strong>CONOCER</strong> (Consejo Nacional de Normalización y Certificación de Competencias Laborales) con base en «estándares de competencia» que tienen validez oficial.</li>' +
          '<li><strong>Certificación de la industria o de un fabricante:</strong> la otorga una asociación profesional o la empresa dueña de una herramienta (de software, de equipo o de un método) tras un examen.</li>' +
          '<li><strong>Microcredencial o insignia digital:</strong> acredita una habilidad concreta y corta; muchas se pueden mostrar en tu perfil profesional.</li>' +
          '<li><strong>Diplomado o constancia:</strong> dice que tomaste una formación; vale menos como prueba de que dominas algo.</li>' +
        '</ul>' +
        '<h3>Cómo encontrar las de ' + AG.esc(industriaDe(mapa)) + '</h3>' +
        '<ol style="margin-top:0;"><li>Revisa las vacantes de ' + AG.esc(rolDe(mapa)) + ': anota las certificaciones que mencionan como requisito o como «deseable».</li>' +
          '<li>Busca en el Registro Nacional de Estándares de Competencia (RENEC) del <a href="https://conocer.gob.mx" target="_blank" rel="noopener noreferrer">CONOCER</a> con palabras de tu rol.</li>' +
          '<li>Pregunta en las asociaciones o colegios de tu industria qué certificaciones reconocen.</li>' +
          '<li>Pregúntale a tu mentor cuáles le han visto pesar en una contratación.</li></ol>' +
        '<p class="note">Antes de pagar una, revisa quién la otorga, si tiene vigencia y si de verdad la piden en las vacantes.</p>' +
        (yaTiene.length || anotadas.length ? '<div class="mercado">' + (yaTiene.length ? 'Ya tienes: ' + AG.esc(yaTiene.join(', ')) + '. ' : '') + (anotadas.length ? 'En tu plan de formación anotaste: ' + AG.esc(anotadas.join(', ')) + '.' : '') + '</div>' : '') +
      '</div>' +
      '<div class="card"><h3>Tus posibles certificaciones</h3><div id="cer_filas"></div>' + AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, {filas: ed.leer()}));
    const ed = filas(cont.querySelector('#cer_filas'), AG, {id: 'cer', agregar: 'Agregar otra certificación', vacia: () => ({nombre: '', tipo: '', otorga: '', piden: '', costo: '', prioridad: ''}),
      campos: [{k: 'nombre', t: 'Certificación', ancho: true}, {k: 'tipo', t: 'Tipo', ops: TIPOS_CERT}, {k: 'otorga', t: 'Quién la otorga'}, {k: 'piden', t: '¿La piden las vacantes?', ops: SI_NO},
        {k: 'costo', t: 'Costo aproximado', ph: '$'}, {k: 'prioridad', t: 'Prioridad', ops: PRIOR}]},
      d.filas.length ? d.filas : anotadas.map(n => ({nombre: n})), guardar);
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    cont.querySelector('#btnCompletar').onclick = () => {
      const r = llenas(ed.leer(), 'nombre'), f = [];
      if(r.length < 2) f.push('al menos dos posibles certificaciones (llevas ' + r.length + ')');
      if(r.some(x => !conTexto(x, 'otorga'))) f.push('quién otorga cada una');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, {filas: r});
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, {filas: r, hoja: {'Certificaciones': AG.vinetas(r.map(x => x.nombre + ' — ' + x.otorga + (x.tipo ? ' (' + x.tipo + ')' : ''))),
        'Las piden las vacantes': AG.vinetas(r.filter(x => x.piden === 'Sí').map(x => x.nombre)), 'Prioridad alta': AG.vinetas(r.filter(x => x.prioridad === 'Alta').map(x => x.nombre))}});
    };
  }
};

/* =====================================================================
   4. Comunidades de aprendizaje
   ===================================================================== */
const TIPOS_COM = ['Colegio o asociación profesional', 'Cámara o asociación de la industria', 'Comunidad en línea o grupo de una red social', 'Grupo de egresados', 'Meetup o grupo local', 'Comunidad de una herramienta o tecnología', 'Otra'];
F.comunidades = {
  titulo: 'Comunidades de aprendizaje',
  seccion(AG, d){
    const r = llenas(d.filas, 'nombre');
    return r.length ? '<table class="tabla"><tr><th>Comunidad</th><th>Tipo</th><th>Requisitos para unirse</th></tr>' +
      r.map(x => '<tr><td>' + AG.esc(x.nombre) + (x.enlace ? '<br><small>' + AG.esc(x.enlace) + '</small>' : '') + '</td><td>' + AG.esc(x.tipo || '—') + '</td><td>' + AG.esc(x.requisitos || '—') + '</td></tr>').join('') + '</table>' : '<p class="vacio">—</p>';
  },
  pintar(cont, AG, paso){
    const mapa = mapaDe(AG), info = AG.info();
    const d = Object.assign({filas: [], para: ''}, AG.datos(paso.id) || {});
    cont.innerHTML =
      '<div class="card"><h3>¿Qué es una comunidad de aprendizaje?</h3>' +
        '<p style="margin-top:0;">Un grupo de personas que aprenden juntas sobre un mismo tema: comparten recursos, dudas, oportunidades y experiencias. Una <strong>red profesional</strong> es parecida, pero su centro es el trabajo: conocer gente de tu industria, enterarte de vacantes y que te conozcan.</p>' +
        '<p>Para ' + AG.esc(rolDe(mapa)) + ' en ' + AG.esc(industriaDe(mapa)) + ' busca:</p>' +
        '<ul><li>El colegio o la asociación de profesionistas de tu carrera' + (info.carrera ? ' (' + AG.esc(info.carrera) + ')' : '') + '.</li>' +
          '<li>Cámaras y asociaciones de la industria: suelen tener comités de jóvenes y eventos abiertos.</li>' +
          '<li>Grupos en redes profesionales y comunidades en línea del tema que quieres dominar.</li>' +
          '<li>La red de egresados de tu escuela' + (info.institucion ? ' (' + AG.esc(info.institucion) + ')' : '') + '.</li>' +
          '<li>Meetups o grupos locales en ' + AG.esc(info.ciudad || info.estado || 'tu ciudad') + '.</li></ul>' +
        '<p class="note">Antes de unirte revisa los requisitos: algunas piden cuota, título o carta de recomendación; otras son abiertas.</p></div>' +
      '<div class="card"><h3>Tus comunidades</h3><div id="com_filas"></div>' +
        '<div class="campo" style="margin-top:10px;"><label for="f_com_para">¿Qué esperas de estas comunidades?</label><textarea id="f_com_para" rows="2">' + AG.esc(d.para) + '</textarea></div>' +
        AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const leer = () => ({filas: ed.leer(), para: cont.querySelector('#f_com_para').value});
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    const ed = filas(cont.querySelector('#com_filas'), AG, {id: 'com', agregar: 'Agregar otra comunidad', vacia: () => ({nombre: '', tipo: '', enlace: '', requisitos: '', costo: ''}),
      campos: [{k: 'nombre', t: 'Comunidad', ancho: true}, {k: 'tipo', t: 'Tipo', ops: TIPOS_COM}, {k: 'enlace', t: 'Enlace o contacto'}, {k: 'requisitos', t: 'Requisitos para unirse', ancho: true}, {k: 'costo', t: 'Costo', ph: 'Gratis, $…'}]},
      d.filas, guardar);
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), r = llenas(x.filas, 'nombre'), f = [];
      if(r.length < 2) f.push('al menos dos comunidades (llevas ' + r.length + ')');
      if(r.some(c => !conTexto(c, 'requisitos'))) f.push('los requisitos para unirte a cada una (si no hay, escribe «abierta»)');
      if(f.length){ AG.faltan(f); return; }
      const y = {filas: r, para: x.para};
      AG.fijar(paso.id, y);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, y, {hoja: {'Comunidades': AG.vinetas(r.map(c => c.nombre + (c.tipo ? ' (' + c.tipo + ')' : ''))),
        'Requisitos': AG.vinetas(r.map(c => c.nombre + ': ' + c.requisitos)), 'Qué espero': x.para.trim()}}));
    };
  }
};

/* =====================================================================
   5. Plan de certificaciones y aprendizaje (con el mentor)
   ===================================================================== */
const TIPOS_PLAN = ['Curso', 'Certificación', 'Comunidad', 'Hábito de aprendizaje', 'Otro'];
F.plan_entrenamiento = {
  titulo: 'Plan de entrenamiento',
  seccion(AG, d){
    const r = llenas(d.filas, 'que').sort((a, b) => String(a.cuando).localeCompare(String(b.cuando)));
    return r.length ? '<table class="tabla"><tr><th>Qué</th><th>Tipo</th><th>Para cuándo</th><th>Horas por semana</th><th>Cómo sabré que lo logré</th></tr>' +
      r.map(x => '<tr><td>' + AG.esc(x.que) + '</td><td>' + AG.esc(x.tipo || '—') + '</td><td>' + AG.esc(x.cuando || '—') + '</td><td>' + AG.esc(x.horas || '—') + '</td><td>' + AG.esc(x.logro || '—') + '</td></tr>').join('') + '</table>' +
      (d.acuerdos ? '<p><strong>Acuerdos con su mentor:</strong> ' + AG.esc(d.acuerdos) + '</p>' : '') : '<p class="vacio">—</p>';
  },
  pintar(cont, AG, paso){
    const sc = AG.datos('seleccion_cursos') || {}, cer = AG.datos('certificaciones') || {}, com = AG.datos('comunidades') || {}, apr = AG.datos('aprender') || {};
    const d = Object.assign({filas: [], horasTotales: '', acuerdos: ''}, AG.datos(paso.id) || {});
    const sug = [].concat(
      F.seleccion_cursos.seleccionados(sc).map(c => ({que: c.nombre, tipo: 'Curso'})),
      llenas(cer.filas, 'nombre').filter(c => c.prioridad !== 'Baja').map(c => ({que: c.nombre, tipo: 'Certificación'})),
      llenas(com.filas, 'nombre').map(c => ({que: 'Unirme a ' + c.nombre, tipo: 'Comunidad'})),
      (apr.aplicar || []).slice(0, 2).map(t => ({que: t, tipo: 'Hábito de aprendizaje'})));
    cont.innerHTML =
      '<div class="card"><h3>Arma tu plan con tu mentor</h3>' +
        '<p class="note" style="margin-top:0;">Esto se trabaja en la sesión con tu mentor. Agrega lo que elegiste en los pasos anteriores, pónganle fecha y horas reales, y anoten lo que acuerden.</p>' +
        '<div id="pe_sug"></div></div>' +
      '<div class="card"><h3>Tu plan de entrenamiento</h3><div id="pe_filas"></div>' +
        '<div class="grid dos" style="margin-top:10px;"><div class="campo"><label for="f_pe_horas">¿Cuántas horas a la semana puedes dedicarle en total?</label><input id="f_pe_horas" type="number" min="0" value="' + AG.esc(d.horasTotales) + '"></div><div class="mercado" id="pe_suma" style="margin:0;"></div></div>' +
        '<div class="campo"><label for="f_pe_acuerdos">Acuerdos con tu mentor</label><textarea id="f_pe_acuerdos" rows="3">' + AG.esc(d.acuerdos) + '</textarea></div>' +
        AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const leer = () => ({filas: ed.leer(), horasTotales: cont.querySelector('#f_pe_horas').value, acuerdos: cont.querySelector('#f_pe_acuerdos').value});
    const pintarSuma = () => {
      const x = leer(), suma = llenas(x.filas, 'que').reduce((s, r) => s + (Number(r.horas) || 0), 0), tot = Number(x.horasTotales) || 0;
      cont.querySelector('#pe_suma').innerHTML = 'Tu plan suma <strong>' + suma + ' horas</strong> a la semana' + (tot && suma > tot ? '. Es más de lo que tienes: platíquenlo y escalónenlo.' : '.');
    };
    const pintarSug = () => {
      const ya = new Set(llenas(ed.leer(), 'que').map(r => norm(r.que)));
      cont.querySelector('#pe_sug').innerHTML = sug.length ? sug.map((s, i) => '<div class="sugerencia"><span><span class="pill" style="margin:0 6px 0 0;">' + AG.esc(s.tipo) + '</span>' + AG.esc(s.que) + '</span>' +
        '<button type="button" class="secondary mini" data-pe-sug="' + i + '"' + (ya.has(norm(s.que)) ? ' disabled>Agregada' : '>Agregar') + '</button></div>').join('')
        : '<p class="note">No hay nada de los pasos anteriores todavía; escribe tu plan directo abajo.</p>';
    };
    const guardar = () => { pintarSuma(); AG.guardadoTxt(AG.fijar(paso.id, leer())); };
    const ed = filas(cont.querySelector('#pe_filas'), AG, {id: 'pe', agregar: 'Agregar otra actividad', vacia: () => ({que: '', tipo: '', cuando: '', horas: '', logro: ''}),
      campos: [{k: 'que', t: 'Qué', ancho: true}, {k: 'tipo', t: 'Tipo', ops: TIPOS_PLAN}, {k: 'cuando', t: 'Para cuándo', tipo: 'month'}, {k: 'horas', t: 'Horas por semana', tipo: 'number'}, {k: 'logro', t: 'Cómo sabré que lo logré', ancho: true}]},
      d.filas, () => { guardar(); pintarSug(); });
    cont.querySelector('#pe_sug').addEventListener('click', ev => { const i = ev.target.dataset && ev.target.dataset.peSug; if(i == null) return; ed.agregar(sug[Number(i)]); });
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    pintarSug(); pintarSuma();
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), r = llenas(x.filas, 'que'), f = [];
      if(r.length < 3) f.push('al menos tres actividades en tu plan (llevas ' + r.length + ')');
      if(r.some(a => !a.cuando)) f.push('para cuándo, en cada actividad');
      if(f.length){ AG.faltan(f); return; }
      const y = Object.assign({}, x, {filas: r});
      AG.fijar(paso.id, y);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, y, {hoja: {'Plan': AG.vinetas(r.slice().sort((a, b) => String(a.cuando).localeCompare(String(b.cuando))).map(a => a.cuando + ' · ' + a.que + (a.horas ? ' (' + a.horas + ' h/sem)' : ''))),
        'Horas por semana': String(r.reduce((s, a) => s + (Number(a.horas) || 0), 0)), 'Acuerdos con mi mentor': x.acuerdos.trim()}}));
    };
  }
};
})();
