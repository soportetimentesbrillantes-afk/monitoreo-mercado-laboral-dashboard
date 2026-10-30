/* =====================================================================
   DIANA — Acompañar: tu llegada a la industria
   =====================================================================

   contacto_industria       Cómo hacer contactos en ferias, eventos y
                            plataformas, con las empresas y plataformas que ve
                            el monitoreo del Club; su lista personal.
   investiga_industria      Cuestionario guiado (cultura, valores, desarrollo,
                            casos de éxito…) con sugerencias de fuentes y de
                            preguntas para un asistente de IA.
   inscripcion_comunidades  Las comunidades de Nutrir: a cuáles se inscribe,
                            requisitos y qué va a aportar.
   resiliencia              Cuestionario de 12 frases en seis dimensiones y
                            sugerencias para las que salgan más bajas. No es un
                            instrumento clínico.
   plan_nuevo_trabajo       Plan 30-60-90 para empezar en el nuevo trabajo.
   mentoria_final           Lo que le dice su mentor al cerrar el proceso.

   El reporte final lo arma fase10-resumen con la configuración de diana.html.
   Todos se revisan con el mentor.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};
const lineas = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const conTexto = (x, k) => String((x || {})[k] || '').trim().length > 0;
const llenas = (rows, k) => (rows || []).filter(r => conTexto(r, k));
const mapaDe = AG => AG.datos('mapa') || {};
const rolDe = m => m.rol || m.rolOtro || 'tu rol objetivo';
const industriaDe = m => m.industriaNombre || m.industriaOtra || 'tu industria';
const claveDe = m => m.industria && m.industria !== 'otra' ? m.industria : null;

/* =====================================================================
   1. Contacto con la industria
   ===================================================================== */
const TIPOS_EV = ['Feria de empleo', 'Evento o congreso de la industria', 'Plataforma de reclutamiento', 'Bolsa de trabajo de mi escuela', 'Visita o evento de una empresa', 'Otro'];
F.contacto_industria = {
  titulo: 'Eventos, ferias y plataformas',
  seccion(AG, d){
    const r = llenas(d.filas, 'nombre');
    return (r.length ? '<table class="tabla"><tr><th>Nombre</th><th>Tipo</th><th>Cuándo</th><th>Dónde o enlace</th></tr>' +
      r.map(x => '<tr><td>' + AG.esc(x.nombre) + '</td><td>' + AG.esc(x.tipo || '—') + '</td><td>' + AG.esc(x.fecha || '—') + '</td><td>' + AG.esc(x.donde || '—') + '</td></tr>').join('') + '</table>' : '') +
      ((d.empresas || []).length ? '<p><strong>Empresas a las que quiere acercarse:</strong> ' + AG.esc(d.empresas.join(', ')) + '</p>' : '');
  },
  pintar(cont, AG, paso){
    const mapa = mapaDe(AG), pres = AG.datos('presentacion') || {};
    const d = Object.assign({filas: [], empresas: [], empresasOtras: ''}, AG.datos(paso.id) || {});
    cont.innerHTML =
      '<div class="card"><h3>Cómo hacer contactos</h3>' +
        '<ul style="margin-top:0;">' +
          '<li><strong>Antes:</strong> revisa qué empresas van a estar, elige tres que te interesen y lleva tu CV' + (pres.elevator ? ' y tu elevator speech (ya lo tienes del paso Presentación efectiva)' : ' y una presentación de un minuto') + '.</li>' +
          '<li><strong>Durante:</strong> preséntate, pregunta qué buscan y cómo es trabajar ahí, y pide un dato de contacto o cómo seguir el proceso. Escucha más de lo que hablas.</li>' +
          '<li><strong>Después:</strong> en menos de 48 horas manda un mensaje corto a quien conociste: recuérdale de qué platicaron y agradécele.</li>' +
          '<li><strong>Plataformas de reclutamiento:</strong> ten tu perfil completo y alineado a tu CV, activa las alertas con el nombre de tu rol tal como aparece en las vacantes y postúlate pronto: las primeras postulaciones se revisan primero.</li>' +
        '</ul><div id="ci_datos"></div></div>' +
      '<div class="card"><h3>Empresas a las que te quieres acercar</h3><div id="ci_emp"></div>' +
        '<div class="campo" style="margin-top:8px;"><label for="f_ci_otras">Otras empresas, una por renglón</label><textarea id="f_ci_otras" rows="2">' + AG.esc(d.empresasOtras) + '</textarea></div></div>' +
      '<div class="card"><h3>Tu lista de eventos, ferias y plataformas</h3>' +
        '<p class="note" style="margin-top:0;">Búscalos en las páginas de tu escuela, de las cámaras y asociaciones de tu industria, del servicio de empleo de tu estado y en las redes de las empresas que elegiste.</p>' +
        '<div id="ci_filas"></div>' + AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const leer = () => ({filas: ed.leer(), empresas: AG.marcados(cont, 'ci_emp'), empresasOtras: cont.querySelector('#f_ci_otras').value});
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    const ed = F.filas(cont.querySelector('#ci_filas'), AG, {id: 'ci', agregar: 'Agregar otro', vacia: () => ({nombre: '', tipo: '', fecha: '', donde: ''}),
      campos: [{k: 'nombre', t: 'Nombre', ancho: true}, {k: 'tipo', t: 'Tipo', ops: TIPOS_EV}, {k: 'fecha', t: 'Cuándo', tipo: 'date'}, {k: 'donde', t: 'Dónde o enlace'}]}, d.filas, guardar);
    const clave = claveDe(mapa);
    (clave ? AG.sector(clave) : Promise.resolve(null)).then(s => {
      const emp = s ? (s.top_empresas || []).slice(0, 10) : [];
      cont.querySelector('#ci_emp').innerHTML = emp.length
        ? '<p class="note" style="margin-top:0;">Las que más vacantes publican en ' + AG.esc(industriaDe(mapa)) + ' según el monitoreo del Club. Marca las que te interesan.</p>' + AG.checks('ci_emp', emp.map(e => ({texto: e.empresa, nota: e.vacantes + ' vacantes'})), d.empresas)
        : '<p class="note" style="margin-top:0;">El monitoreo del Club no cubre esta industria: escribe abajo las empresas que te interesan.</p>';
      if(s){
        const fuentes = Object.entries(s.fuentes || {}).sort((a, b) => b[1] - a[1]).map(x => x[0]);
        const estados = ((s.cobertura_geografica || {}).top_estados || []).slice(0, 3).map(x => x.estado);
        cont.querySelector('#ci_datos').innerHTML = '<div class="mercado">' + (fuentes.length ? 'El monitoreo encuentra las vacantes de ' + AG.esc(industriaDe(mapa)) + ' sobre todo en: <strong>' + AG.esc(fuentes.join(', ')) + '</strong>. ' : '') +
          (estados.length ? 'Donde más se publican: ' + AG.esc(estados.join(', ')) + '.' : '') + '</div>';
      }
    });
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), r = llenas(x.filas, 'nombre'), f = [];
      if(r.length < 3) f.push('al menos tres eventos, ferias o plataformas (llevas ' + r.length + ')');
      if(!r.some(e => e.tipo === 'Plataforma de reclutamiento')) f.push('al menos una plataforma de reclutamiento');
      if(f.length){ AG.faltan(f); return; }
      const y = Object.assign({}, x, {filas: r}), emp = x.empresas.concat(lineas(x.empresasOtras));
      AG.fijar(paso.id, y);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, y, {hoja: {'Eventos y ferias': AG.vinetas(r.filter(e => e.tipo !== 'Plataforma de reclutamiento').map(e => e.nombre + (e.fecha ? ' · ' + e.fecha : ''))),
        'Plataformas': AG.vinetas(r.filter(e => e.tipo === 'Plataforma de reclutamiento').map(e => e.nombre)), 'Empresas objetivo': emp.join(', ')}}));
    };
  }
};

/* =====================================================================
   2. Investiga tu industria
   ===================================================================== */
const PUNTOS = [
  {id: 'cultura', t: 'Cultura', q: '¿Cómo se trabaja en esta industria? Horarios, ritmo, formalidad, trabajo en equipo o individual.'},
  {id: 'valores', t: 'Valores', q: '¿Qué valoran las empresas líderes? Busca su misión y valores y compáralos con los tuyos.'},
  {id: 'desarrollo', t: 'Desarrollo profesional', q: '¿Cómo se crece? Puestos de entrada, a qué se llega en 3 y en 5 años, qué estudios o certificaciones abren puertas.'},
  {id: 'casos', t: 'Casos de éxito', q: 'Una persona o empresa de la industria cuya trayectoria te inspire. ¿Qué hizo y qué puedes aprender de ahí?'},
  {id: 'retos', t: 'Retos y cambios', q: '¿Qué está cambiando? Tecnología, regulación, nuevas formas de trabajar, lo que preocupa a la industria.'},
  {id: 'empresas', t: 'Empresas clave', q: '¿Quiénes son los líderes, los que más contratan y los que más crecen?'}
];
const FUENTES = ['Páginas y reportes anuales de las empresas', 'Cámaras y asociaciones de la industria', 'Datos públicos (INEGI, secretarías, el monitoreo del Club)', 'Noticias y revistas especializadas', 'Libros o podcasts del tema', 'Entrevistas con personas que trabajan ahí', 'Perfiles de personas de la industria en redes profesionales', 'Un asistente de IA (verificando lo que dice)'];
F.investiga_industria = {
  titulo: 'Resumen de la industria',
  seccion(AG, d){
    return PUNTOS.map(p => d[p.id] ? '<h3>' + p.t + '</h3><p>' + AG.esc(d[p.id]) + '</p>' : '').join('') +
      ((d.fuentes || []).length ? '<p class="note">Fuentes: ' + AG.esc(d.fuentes.join('; ')) + (d.fuentesOtras ? '; ' + AG.esc(d.fuentesOtras) : '') + '.</p>' : '');
  },
  pintar(cont, AG, paso){
    const mapa = mapaDe(AG), cre = AG.datos('crecimiento') || {}, ci = AG.datos('contacto_industria') || {};
    const d = Object.assign({fuentes: [], fuentesOtras: '', conclusion: ''}, AG.datos(paso.id) || {});
    const ind = industriaDe(mapa), rol = rolDe(mapa);
    const prompts = [
      'Describe la cultura de trabajo típica de la industria de ' + ind + ' en México y cómo cambia entre empresas grandes y pequeñas.',
      '¿Cuál es la ruta de crecimiento habitual para alguien que empieza como ' + rol + '? Dame los puestos típicos a 3 y 5 años.',
      '¿Qué tendencias y retos enfrenta hoy la industria de ' + ind + ' en México? Incluye tus fuentes.'
    ];
    cont.innerHTML =
      '<div class="card"><h3>Cómo investigar</h3>' +
        '<p style="margin-top:0;">Contesta cada punto con lo que encuentres. No copies: escribe con tus palabras lo que te sirve para decidir y para tu entrevista.</p>' +
        '<p><strong>Si usas un asistente de IA</strong>, pídele fuentes y verifícalas: a veces inventa datos. Preguntas que te pueden servir (cópialas):</p>' +
        '<ul class="prompts">' + prompts.map(p => '<li><code>' + AG.esc(p) + '</code></li>').join('') + '</ul>' +
        ((ci.empresas || []).length ? '<p class="note">Empieza por las empresas que elegiste: ' + AG.esc(ci.empresas.join(', ')) + '.</p>' : '') +
      '</div>' +
      '<div class="card">' + PUNTOS.map(p => '<div class="campo"><label for="f_ii_' + p.id + '">' + p.t + '</label><p class="note" style="margin:0 0 4px;">' + AG.esc(p.q) +
          (p.id === 'valores' && (cre.valores || []).length ? ' Tus valores: ' + AG.esc(cre.valores.join(', ')) + '.' : '') + '</p>' +
          '<textarea id="f_ii_' + p.id + '" rows="3">' + AG.esc(d[p.id] || '') + '</textarea></div>').join('') +
        '<h3>¿Qué fuentes usaste?</h3>' + AG.checks('ii_fuentes', FUENTES, d.fuentes) +
        '<div class="campo" style="margin-top:8px;"><label for="f_ii_fotras">Fuentes concretas (sitios, libros, personas), una por renglón</label><textarea id="f_ii_fotras" rows="2">' + AG.esc(d.fuentesOtras) + '</textarea></div>' +
        '<div class="campo"><label for="f_ii_concl">Después de investigar, ¿sigues queriendo esta industria? ¿Por qué?</label><textarea id="f_ii_concl" rows="2">' + AG.esc(d.conclusion) + '</textarea></div>' +
        AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const leer = () => Object.assign({fuentes: AG.marcados(cont, 'ii_fuentes'), fuentesOtras: cont.querySelector('#f_ii_fotras').value, conclusion: cont.querySelector('#f_ii_concl').value},
      ...PUNTOS.map(p => ({[p.id]: cont.querySelector('#f_ii_' + p.id).value})));
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      const n = PUNTOS.filter(p => x[p.id].trim().length >= 20).length;
      if(n < 4) f.push('contestar al menos 4 de los 6 puntos con unas líneas (llevas ' + n + ')');
      if(!x.fuentes.length && !lineas(x.fuentesOtras).length) f.push('qué fuentes usaste');
      if(x.conclusion.trim().length < 5) f.push('si sigues queriendo esta industria y por qué');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      const hoja = {}; PUNTOS.forEach(p => { hoja[p.t] = x[p.id].trim(); });
      hoja['Fuentes'] = AG.vinetas(x.fuentes.concat(lineas(x.fuentesOtras))); hoja['Conclusión'] = x.conclusion.trim();
      AG.terminar(paso.id, Object.assign({}, x, {hoja}));
    };
  }
};

/* =====================================================================
   3. Inscripción a comunidades
   ===================================================================== */
const ESTADOS_INS = ['Ya me inscribí', 'En proceso', 'Pendiente', 'Ya no me interesa'];
F.inscripcion_comunidades = {
  titulo: 'Comunidades a las que se inscribe',
  activas: d => (d.filas || []).filter(r => r.estado === 'Ya me inscribí' || r.estado === 'En proceso'),
  seccion(AG, d){
    const r = llenas(d.filas, 'nombre');
    return r.length ? '<table class="tabla"><tr><th>Comunidad</th><th>Estado</th><th>Requisitos</th><th>Qué va a aportar</th></tr>' +
      r.map(x => '<tr><td>' + AG.esc(x.nombre) + '</td><td>' + AG.esc(x.estado || '—') + (x.fecha ? '<br><small>' + AG.esc(x.fecha) + '</small>' : '') + '</td><td>' + AG.esc(x.requisitos || '—') + '</td><td>' + AG.esc(x.aporte || '—') + '</td></tr>').join('') + '</table>' : '<p class="vacio">—</p>';
  },
  pintar(cont, AG, paso){
    const req = AG.requiere(['comunidades']);
    if(req){ cont.innerHTML = req; return; }
    const com = AG.datos('comunidades') || {};
    const guardadas = AG.datos(paso.id);
    const d = Object.assign({filas: []}, guardadas || {});
    // La primera vez arranca con las comunidades que eligió en Nutrir.
    const iniciales = guardadas ? d.filas : llenas(com.filas, 'nombre').map(c => ({nombre: c.nombre, requisitos: c.requisitos || '', estado: '', fecha: '', aporte: ''}));
    cont.innerHTML =
      '<div class="card"><h3>Inscríbete y participa</h3>' +
        '<p class="note" style="margin-top:0;">Aquí están las comunidades que elegiste en Nutrir. Una comunidad sirve cuando participas: haz preguntas, comparte lo que aprendes, ayuda a alguien que va empezando, ve a los eventos. Anota en cuáles ya estás y qué vas a aportar.</p>' +
        '<div id="ins_filas"></div>' + AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const leer = () => ({filas: ed.leer()});
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    const ed = F.filas(cont.querySelector('#ins_filas'), AG, {id: 'ins', agregar: 'Agregar otra comunidad', vacia: () => ({nombre: '', requisitos: '', estado: '', fecha: '', aporte: ''}),
      campos: [{k: 'nombre', t: 'Comunidad', ancho: true}, {k: 'estado', t: 'Estado', ops: ESTADOS_INS}, {k: 'fecha', t: 'Fecha', tipo: 'date'}, {k: 'requisitos', t: 'Requisitos (y si ya los cumples)', ancho: true}, {k: 'aporte', t: 'Qué vas a aportar o compartir', ancho: true}]},
      iniciales, guardar);
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    cont.querySelector('#btnCompletar').onclick = () => {
      const r = llenas(ed.leer(), 'nombre'), f = [];
      if(r.some(c => !c.estado)) f.push('el estado de cada comunidad');
      if(!F.inscripcion_comunidades.activas({filas: r}).length) f.push('inscribirte (o empezar a hacerlo) en al menos una comunidad');
      if(F.inscripcion_comunidades.activas({filas: r}).some(c => !conTexto(c, 'aporte'))) f.push('qué vas a aportar en las comunidades donde ya estás');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, {filas: r});
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, {filas: r, hoja: {'Comunidades': AG.vinetas(r.map(c => c.nombre + ' — ' + c.estado + (c.fecha ? ' (' + c.fecha + ')' : ''))),
        'Requisitos': AG.vinetas(r.filter(c => c.requisitos).map(c => c.nombre + ': ' + c.requisitos)), 'Qué aportaré': AG.vinetas(r.filter(c => c.aporte).map(c => c.nombre + ': ' + c.aporte))}});
    };
  }
};

/* =====================================================================
   4. La resiliencia
   ===================================================================== */
const ESCALA = ['Nunca', 'Pocas veces', 'A veces', 'Casi siempre', 'Siempre'];
const DIMENSIONES = [
  {id: 'rechazo', t: 'Manejo del rechazo', f: ['Cuando no me eligen para algo, puedo seguir intentándolo sin tomarlo como algo personal.', 'Después de un «no», busco qué puedo aprender de esa experiencia.'],
   s: ['Después de cada entrevista anota una cosa que salió bien y una que mejorarías; así cada «no» deja algo.', 'Pide retroalimentación cuando no te elijan: muchas empresas te la dan si la pides con amabilidad.']},
  {id: 'optimismo', t: 'Optimismo realista', f: ['Confío en que, con esfuerzo, voy a encontrar un buen trabajo.', 'Puedo ver lo que sí está saliendo bien aunque haya cosas que no.'],
   s: ['Lleva un registro semanal de avances: postulaciones, contactos nuevos, cursos. Ver el avance ayuda.', 'Recuerda que buscar trabajo suele tomar meses; compárate con tu plan, no con otras personas.']},
  {id: 'apoyo', t: 'Red de apoyo', f: ['Tengo personas con quienes platicar cuando la búsqueda se pone difícil.', 'Pido ayuda o consejo cuando lo necesito.'],
   s: ['Agenda una plática al mes con tu mentor o alguien de confianza sobre cómo vas.', 'Busca a otras personas que estén buscando trabajo en tus comunidades: compartir el proceso lo aligera.']},
  {id: 'cuidado', t: 'Autocuidado', f: ['Duermo, como y me muevo bien aunque esté presionado o presionada.', 'Separo tiempo para descansar y hacer cosas que disfruto.'],
   s: ['Ponle horario a tu búsqueda (por ejemplo, de 9 a 1) y fuera de él descansa sin culpa.', 'Mantén una actividad física o un pasatiempo aunque estés en plena búsqueda.']},
  {id: 'flexibilidad', t: 'Flexibilidad', f: ['Si un camino no funciona, puedo probar otro sin sentir que fracasé.', 'Me adapto cuando cambian los planes.'],
   s: ['Ten un plan B: un rol parecido, otra ciudad o una práctica que te acerque a tu meta.', 'Cada mes revisa con tu mentor qué ajustar de tu búsqueda: CV, rol, dónde buscas.']},
  {id: 'proposito', t: 'Sentido de propósito', f: ['Tengo claro por qué quiero trabajar en lo que estoy buscando.', 'Lo que hago cada semana me acerca a lo que quiero lograr.'],
   s: ['Relee tu propuesta de valor y tus escenarios de vida cuando te desanimes.', 'Ponte una meta pequeña por semana y celébrala cuando la cumplas.']}
];
function resultadoRes(resp){
  const dims = DIMENSIONES.map(dm => {
    const v = dm.f.map((_, i) => Number((resp || {})[dm.id + '_' + i]) || 0);
    return {id: dm.id, t: dm.t, puntos: v.reduce((a, b) => a + b, 0), max: dm.f.length * 5, completo: v.every(x => x > 0)};
  });
  const total = dims.reduce((s, x) => s + x.puntos, 0), max = dims.reduce((s, x) => s + x.max, 0);
  const pct = max ? total / max : 0;
  const nivel = pct >= 0.75 ? 'Alto' : pct >= 0.55 ? 'Medio' : 'En desarrollo';
  const bajas = dims.slice().sort((a, b) => a.puntos / a.max - b.puntos / b.max).filter(x => x.puntos / x.max < 0.8).slice(0, 3);
  return {dims, total, max, nivel, bajas, completo: dims.every(x => x.completo)};
}
F.resiliencia = {
  titulo: 'Evaluación de resiliencia',
  resultado: resultadoRes,
  seccion(AG, d){
    const r = resultadoRes(d.respuestas);
    return '<p>Nivel de resiliencia: <strong>' + AG.esc(r.nivel) + '</strong> (' + r.total + ' de ' + r.max + ').</p>' +
      '<table class="tabla"><tr><th>Dimensión</th><th>Puntos</th></tr>' + r.dims.map(x => '<tr><td>' + AG.esc(x.t) + '</td><td>' + x.puntos + ' de ' + x.max + '</td></tr>').join('') + '</table>' +
      ((d.aplicar || []).length ? '<h3>Lo que va a hacer</h3>' + AG.lista(d.aplicar) : '');
  },
  pintar(cont, AG, paso){
    const d = Object.assign({respuestas: {}, aplicar: []}, AG.datos(paso.id) || {});
    let n = 0;
    cont.innerHTML = '<div class="card"><h3>¿Cómo llevas la búsqueda?</h3>' +
      '<p class="note" style="margin-top:0;">La resiliencia es la capacidad de recuperarte de los tropiezos y seguir adelante; se puede desarrollar. Contesta qué tan seguido te pasa cada frase. No es un diagnóstico: es para que tú y tu mentor sepan dónde reforzar.</p>' +
      DIMENSIONES.map(dm => dm.f.map((t, i) => '<div class="campo"><label>' + (++n) + '. ' + AG.esc(t) + '</label>' + AG.radios('res_' + dm.id + '_' + i, ESCALA.map(String), ESCALA[(Number(d.respuestas[dm.id + '_' + i]) || 0) - 1]) + '</div>').join('')).join('') +
      '</div><div class="card" id="res_res"></div>';
    const leerResp = () => { const r = {}; DIMENSIONES.forEach(dm => dm.f.forEach((_, i) => { const v = AG.radio(cont, 'res_' + dm.id + '_' + i); if(v) r[dm.id + '_' + i] = ESCALA.indexOf(v) + 1; })); return r; };
    const leer = () => ({respuestas: leerResp(), aplicar: cont.querySelector('[data-grupo="res_aplicar"]') ? AG.marcados(cont, 'res_aplicar') : d.aplicar});
    let firma = '';
    const caja = cont.querySelector('#res_res');
    function pintarRes(){
      const x = leer(), r = resultadoRes(x.respuestas), f = r.completo + ':' + r.bajas.map(b => b.id).join(',');
      if(f === firma) return; firma = f;
      const sug = (r.bajas.length ? r.bajas : r.dims.slice(0, 2)).map(b => DIMENSIONES.find(dm => dm.id === b.id)).reduce((a, dm) => a.concat(dm.s), []);
      caja.innerHTML = !r.completo ? '<p class="note">Contesta las 12 frases y aquí aparece tu resultado con sugerencias.</p>' + AG.boton(paso.id, AG.completa(paso.id)) :
        '<h3>Tu resultado: ' + AG.esc(r.nivel) + '</h3>' +
        '<table class="tabla"><tr><th>Dimensión</th><th>Puntos</th></tr>' + r.dims.map(x => '<tr><td>' + AG.esc(x.t) + '</td><td>' + x.puntos + ' de ' + x.max + '</td></tr>').join('') + '</table>' +
        '<h3>Sugerencias</h3><p class="note" style="margin-top:0;">' + (r.bajas.length ? 'Para lo que salió más bajo: ' + AG.esc(r.bajas.map(b => b.t.toLowerCase()).join(', ')) + '.' : 'Vas muy bien; estas te ayudan a mantenerlo.') + ' Marca las que vas a hacer.</p>' +
        AG.checks('res_aplicar', sug, x.aplicar) +
        (r.nivel === 'En desarrollo' ? '<div class="aviso limites" style="margin-top:10px;">Buscar trabajo cansa y es normal que pese. Platícalo con tu mentor o con alguien de confianza; no tienes que llevarlo solo o sola.</div>' : '') +
        AG.boton(paso.id, AG.completa(paso.id));
      cont.querySelector('#btnCompletar').onclick = completar;
    }
    function completar(){
      const x = leer(), r = resultadoRes(x.respuestas), f = [];
      if(!r.completo) f.push('contestar las 12 frases');
      else if(x.aplicar.length < 2) f.push('marcar al menos 2 sugerencias que vas a hacer');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {nivel: r.nivel, hoja: {'Nivel': r.nivel + ' (' + r.total + ' de ' + r.max + ')',
        'Por dimensión': r.dims.map(x => x.t + ': ' + x.puntos + '/' + x.max).join(', '), 'Lo que haré': AG.vinetas(x.aplicar)}}));
    }
    cont.addEventListener('change', () => { pintarRes(); AG.guardadoTxt(AG.fijar(paso.id, leer())); });
    pintarRes();
  }
};

/* =====================================================================
   5. Plan 30-60-90 para el nuevo trabajo
   ===================================================================== */
const ETAPAS_NT = [
  {p: 30, t: 'Aprender', ayuda: 'Conocer a tu equipo, cómo se trabaja, qué se espera de ti y cómo se mide.',
   s: ['Platicar con mi jefe sobre qué espera de mí en 30, 60 y 90 días', 'Conocer a cada persona de mi equipo y qué hace', 'Entender los procesos y herramientas que voy a usar', 'Identificar a quién preguntarle cuando tenga dudas']},
  {p: 60, t: 'Contribuir', ayuda: 'Hacer bien lo que te toca y lograr tus primeros resultados.',
   s: ['Entregar mi primer proyecto o resultado completo', 'Pedir retroalimentación a mi jefe sobre cómo voy', 'Conocer a personas de otras áreas con las que trabajo', 'Detectar algo que se pueda mejorar en mi trabajo']},
  {p: 90, t: 'Proponer', ayuda: 'Aportar ideas, consolidarte y planear lo que sigue.',
   s: ['Proponer una mejora concreta con base en lo que aprendí', 'Revisar con mi jefe mis logros de los primeros tres meses', 'Definir qué quiero aprender o lograr en los siguientes seis meses', 'Retomar mi plan de entrenamiento con lo que pide el puesto']}
];
F.plan_nuevo_trabajo = {
  titulo: 'Plan 30-60-90 del nuevo trabajo',
  seccion(AG, d){
    return (d.puesto || d.empresa ? '<p>' + AG.esc([d.puesto, d.empresa].filter(Boolean).join(' · ')) + '</p>' : '') +
      '<div class="tres-col">' + ETAPAS_NT.map(e => '<div class="columna"><h4>' + e.p + ' días · ' + e.t + '</h4>' + (AG.lista(lineas(d['d' + e.p])) || '<p class="vacio">—</p>') + '</div>').join('') + '</div>';
  },
  pintar(cont, AG, paso){
    const mapa = mapaDe(AG);
    const d = Object.assign({puesto: '', empresa: '', d30: '', d60: '', d90: ''}, AG.datos(paso.id) || {});
    if(!AG.datos(paso.id) && mapa.rol) d.puesto = mapa.rol;
    cont.innerHTML =
      '<div class="card"><p class="note" style="margin-top:0;">Los primeros tres meses en un trabajo marcan cómo te ven. Este plan te sirve para tu primer día y también para la entrevista: muchas empresas preguntan «¿qué harías en tus primeros 90 días?». Si todavía no tienes el trabajo, hazlo para el puesto que buscas.</p>' +
        '<div class="grid dos"><div class="campo"><label for="f_nt_puesto">Puesto</label><input id="f_nt_puesto" value="' + AG.esc(d.puesto) + '"></div>' +
        '<div class="campo"><label for="f_nt_empresa">Empresa (si ya la tienes)</label><input id="f_nt_empresa" value="' + AG.esc(d.empresa) + '"></div></div></div>' +
      '<div class="card"><div class="tres-col">' + ETAPAS_NT.map(e => '<div class="columna"><h4>' + e.p + ' días · ' + e.t + '</h4><p class="note" style="margin-top:0;">' + AG.esc(e.ayuda) + '</p>' +
        e.s.map((s, i) => '<div class="sugerencia"><span>' + AG.esc(s) + '</span><button type="button" class="secondary mini" data-nt="' + e.p + '_' + i + '">Agregar</button></div>').join('') +
        '<div class="campo" style="margin-top:8px;"><label for="f_nt_' + e.p + '">Tus acciones, una por renglón</label><textarea id="f_nt_' + e.p + '" rows="5">' + AG.esc(d['d' + e.p]) + '</textarea></div></div>').join('') + '</div>' +
        AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const leer = () => Object.assign({puesto: cont.querySelector('#f_nt_puesto').value, empresa: cont.querySelector('#f_nt_empresa').value},
      ...ETAPAS_NT.map(e => ({['d' + e.p]: cont.querySelector('#f_nt_' + e.p).value})));
    const marcarUsadas = () => cont.querySelectorAll('[data-nt]').forEach(b => {
      const [p, i] = b.dataset.nt.split('_'), s = ETAPAS_NT.find(e => String(e.p) === p).s[i];
      const ya = lineas(cont.querySelector('#f_nt_' + p).value).includes(s); b.disabled = ya; b.textContent = ya ? 'Agregada' : 'Agregar';
    });
    const guardar = () => { marcarUsadas(); AG.guardadoTxt(AG.fijar(paso.id, leer())); };
    cont.querySelectorAll('[data-nt]').forEach(b => { b.onclick = () => {
      const [p, i] = b.dataset.nt.split('_'), ta = cont.querySelector('#f_nt_' + p), s = ETAPAS_NT.find(e => String(e.p) === p).s[i];
      if(!lineas(ta.value).includes(s)) ta.value = lineas(ta.value).concat(s).join('\n');
      guardar();
    }; });
    cont.addEventListener('input', guardar);
    marcarUsadas();
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      ETAPAS_NT.forEach(e => { if(lineas(x['d' + e.p]).length < 2) f.push('al menos dos acciones para los primeros ' + e.p + ' días'); });
      if(!x.puesto.trim()) f.push('el puesto');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {'Puesto': [x.puesto.trim(), x.empresa.trim()].filter(Boolean).join(' · '),
        '30 días': AG.vinetas(lineas(x.d30)), '60 días': AG.vinetas(lineas(x.d60)), '90 días': AG.vinetas(lineas(x.d90))}}));
    };
  }
};

/* =====================================================================
   6. Mentoría final
   ===================================================================== */
const CAMPOS_MF = [
  {id: 'fortalezas', t: 'Fortalezas que tu mentor vio en ti durante el proceso', req: true},
  {id: 'oportunidad', t: 'Áreas en las que te recomienda seguir trabajando', req: true},
  {id: 'recomendaciones', t: 'Sus recomendaciones para tu búsqueda o tu nuevo trabajo', req: true},
  {id: 'siguiente', t: 'Tu siguiente paso concreto, acordado con tu mentor', req: true},
  {id: 'aprendizaje', t: 'Lo más importante que te llevas del proceso DIANA', req: false}
];
F.mentoria_final = {
  titulo: 'Mentoría final',
  seccion(AG, d){
    return CAMPOS_MF.map(c => d[c.id] ? '<h3>' + c.t + '</h3><p>' + AG.esc(d[c.id]) + '</p>' : '').join('') +
      (d.valoracion ? '<p class="note">Cómo valoró el proceso: ' + AG.esc(d.valoracion) + ' de 5.</p>' : '');
  },
  pintar(cont, AG, paso){
    const d = Object.assign({valoracion: ''}, AG.datos(paso.id) || {});
    const pend = AG.PASOS.filter(p => p.mentor && p.id !== paso.id && AG.faltaMentor(p.id));
    cont.innerHTML = '<div class="card">' +
      (pend.length ? '<div class="aviso limites" style="margin:0 0 12px;">Antes de cerrar, revisen juntos los pasos que todavía esperan al mentor: ' + pend.map(p => '<a href="#" data-abrir="' + p.id + '">' + AG.esc(p.nombre) + '</a>').join(', ') + '.</div>' : '') +
      '<p class="note" style="margin-top:0;">Llena esto en tu última sesión con tu mentor, con sus palabras. Abajo anotan la revisión con su nombre y la fecha.</p>' +
      CAMPOS_MF.map(c => '<div class="campo"><label for="f_mf_' + c.id + '">' + c.t + (c.req ? '' : ' (opcional)') + '</label><textarea id="f_mf_' + c.id + '" rows="3">' + AG.esc(d[c.id] || '') + '</textarea></div>').join('') +
      '<div class="campo"><label>Del 1 al 5, ¿qué tanto te sirvió el proceso DIANA?</label>' + AG.radios('mf_val', ['1', '2', '3', '4', '5'], d.valoracion) + '</div>' +
      AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const leer = () => Object.assign({valoracion: AG.radio(cont, 'mf_val')}, ...CAMPOS_MF.map(c => ({[c.id]: cont.querySelector('#f_mf_' + c.id).value})));
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      CAMPOS_MF.filter(c => c.req && x[c.id].trim().length < 10).forEach(c => f.push(c.t.toLowerCase()));
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {'Fortalezas': x.fortalezas.trim(), 'Áreas de oportunidad': x.oportunidad.trim(), 'Recomendaciones': x.recomendaciones.trim(),
        'Siguiente paso': x.siguiente.trim(), 'Lo que me llevo': x.aprendizaje.trim(), 'Valoración del proceso': x.valoracion}}));
    };
  }
};
})();
