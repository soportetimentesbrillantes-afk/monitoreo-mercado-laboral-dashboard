/* =====================================================================
   Proceso Ágora — Fase 6: Crecimiento personal
   =====================================================================

   Hoja de Ágora: "Identifica áreas de crecimiento personal vs expectativas de
   desarrollo"; resultado: "áreas de crecimiento personalizadas / envío de
   resultados a padres por correo".

   Dos columnas frente a frente:
   - lo que la persona ESPERA desarrollar (lo elige ella);
   - lo que su perfil SUGIERE trabajar: las "Áreas de crecimiento personal" de
     la interpretación DISC de Ágora para su estilo y las debilidades que ella
     misma escribió en su FODA.
   Marca dónde coinciden y le pide una primera prioridad.

   El envío a la madre, padre o tutor: aquí la persona lo manda desde su
   propio correo (se abre con el mensaje listo). Si aceptó el expediente, su
   orientador también lo puede mandar desde la hoja interna (menú "Proceso
   Ágora" del Apps Script). La página no manda correos por su cuenta.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};

/* Lo que una persona joven suele esperar desarrollar. `c` son raíces de
   palabras que, si aparecen en un área sugerida por su perfil, cuentan como
   coincidencia. Es una ayuda para leer, no un cálculo. */
const EXPECTATIVAS = [
  {t:'Hablar en público con seguridad', c:['expres', 'direct', 'di lo que']},
  {t:'Expresar lo que pienso y siento', c:['expres', 'direct', 'di lo que', 'reprim']},
  {t:'Escuchar a los demás', c:['escuch', 'oyente', 'ideas de otros', 'opiniones']},
  {t:'Trabajar en equipo', c:['equipo', 'consenso', 'relaciones']},
  {t:'Liderar a otros', c:['iniciativa', 'decisiv', 'consenso', 'apoyo a otros']},
  {t:'Tomar decisiones', c:['decid', 'decisi', 'pros y los contras', 'instinto']},
  {t:'Organizar mi tiempo', c:['tiempo', 'organiza', 'ritmo']},
  {t:'Ser más constante y terminar lo que empiezo', c:['cumpl', 'resultado', 'metas', 'promet']},
  {t:'Manejar mis emociones y el estrés', c:['emocion', 'control', 'crític', 'paciencia']},
  {t:'Adaptarme a los cambios', c:['cambio', 'flexib', 'espontáne']},
  {t:'Cuidar mis relaciones personales', c:['relaciones', 'personales', 'gente', 'amable']},
  {t:'Ser independiente, también económicamente', c:['necesidades', 'iniciativa']},
  {t:'Aprender un idioma', c:[]},
  {t:'Habilidades digitales', c:[]}
];
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function coincidencias(esperas, areas){
  const out = [];
  esperas.forEach(t => {
    const e = EXPECTATIVAS.find(x => x.t === t);
    if(!e) return;
    const con = areas.filter(a => e.c.some(c => norm(a).includes(norm(c))));
    if(con.length) out.push({espera: t, areas: con});
  });
  return out;
}

const vacio = () => ({esperas:[], esperaOtra:'', areas:[], prioridad:'', dom:null});

/* DIANA pide además "un cuestionario para identificar valores, intereses y
   motivaciones" (cfg.valores). Listas del Club, por revisar con Ágora. */
const VALORES = ['Honestidad', 'Responsabilidad', 'Familia', 'Libertad', 'Seguridad', 'Reconocimiento', 'Servicio a los demás',
  'Aprendizaje', 'Creatividad', 'Justicia', 'Lealtad', 'Respeto', 'Salud y bienestar', 'Independencia', 'Éxito económico',
  'Trabajo en equipo', 'Innovación', 'Fe o espiritualidad', 'Cuidado del medio ambiente', 'Equilibrio entre vida y trabajo'];
const INTERESES = [
  {id:'hacer', t:'Hacer cosas con las manos, herramientas o máquinas'},
  {id:'investigar', t:'Investigar, analizar y resolver problemas'},
  {id:'crear', t:'Crear, diseñar y expresarme'},
  {id:'ayudar', t:'Ayudar, enseñar o cuidar a otras personas'},
  {id:'dirigir', t:'Convencer, vender, dirigir o emprender'},
  {id:'organizar', t:'Organizar datos, procesos y recursos'}
];
const MOTIVACIONES = [
  {id:'ingreso', t:'Ganar bien'}, {id:'estabilidad', t:'Tener un trabajo estable'}, {id:'crecer', t:'Crecer y subir de puesto'},
  {id:'aprender', t:'Aprender cosas nuevas'}, {id:'impacto', t:'Que mi trabajo ayude a otros'}, {id:'autonomia', t:'Decidir cómo hago mi trabajo'},
  {id:'reconocimiento', t:'Que reconozcan lo que hago'}, {id:'flexibilidad', t:'Tener horario flexible'},
  {id:'equipo', t:'Un buen ambiente y equipo'}, {id:'reto', t:'Tener retos'}
];
const ESCALA = ['1', '2', '3', '4', '5'];
const completaValores = d => (d.valores || []).length >= 3 &&
  INTERESES.every(x => (d.intereses || {})[x.id]) && MOTIVACIONES.every(x => (d.motivaciones || {})[x.id]);
const top = (obj, lista, n) => lista.filter(x => obj && obj[x.id]).sort((a, b) => obj[b.id] - obj[a.id]).slice(0, n);
function textoValores(d){
  return {
    'Valores': (d.valores || []).join(', '),
    'Intereses': top(d.intereses, INTERESES, 6).map(x => x.t + ': ' + d.intereses[x.id]).join('\n'),
    'Motivaciones': top(d.motivaciones, MOTIVACIONES, 10).map(x => x.t + ': ' + d.motivaciones[x.id]).join('\n')
  };
}

/* Texto para el correo a la familia y para la hoja. */
function textoResultados(AG, x, habilidades){
  const nombre = AG.nombre() || 'Tu hijo o hija';
  return 'Te comparto mis resultados de la fase de Crecimiento personal del proceso Ágora, del Club de Mentes Brillantes.\n\n' +
    'Lo que espero desarrollar:\n' + AG.vinetas(x.esperas.concat(x.esperaOtra.trim() ? [x.esperaOtra.trim()] : [])) + '\n\n' +
    'Áreas en las que voy a trabajar:\n' + AG.vinetas(x.areas) + '\n\n' +
    'Mi primera prioridad: ' + x.prioridad + '\n\n' +
    'Habilidades que me conviene reforzar: ' + habilidades.join(', ') + '.\n\n' +
    'Son resultados de una herramienta de autoconocimiento para orientarme, no una evaluación.\n— ' + nombre;
}

F.crecimiento = {
  EXPECTATIVAS, coincidencias, VALORES, INTERESES, MOTIVACIONES,
  /* Completa según el proceso: en DIANA también pide valores, intereses y motivaciones. */
  completa: (d, cfg) => !(cfg && cfg.valores) || completaValores(d || {}),
  seccionValores(AG, d){
    if(!d.valores || !d.valores.length) return '';
    const e = AG.esc;
    return '<h3>Valores, intereses y motivaciones</h3>' +
      '<p><strong>Sus valores:</strong> ' + e(d.valores.join(', ')) + '.</p>' +
      '<p><strong>Lo que más le interesa:</strong> ' + e(top(d.intereses, INTERESES, 2).map(x => x.t.toLowerCase()).join('; ')) + '.</p>' +
      '<p><strong>Lo que más le motiva:</strong> ' + e(top(d.motivaciones, MOTIVACIONES, 3).map(x => x.t.toLowerCase()).join('; ')) + '.</p>';
  },
  pintar(cont, AG, paso){
    const cfg = (paso && paso.cfg) || {};
    const conValores = !!cfg.valores;
    const esAgora = AG.PROCESO.id === 'agora';
    const req = AG.requiere(['disc']);
    if(req){ cont.innerHTML = req; return; }
    const disc = AG.disc();
    const {dom} = disc;
    const A = DISC.AGORA, NOM = DISC.FACTORES;
    const habilidades = DISC.CRECIMIENTO_HABILIDADES[dom];
    const d = Object.assign(vacio(), AG.datos('crecimiento') || {});
    const info = AG.info();
    const foda = AG.foda();
    const debilidades = foda ? AG.lineas(foda.D) : [];
    const tutor = AG.tutor();

    cont.innerHTML =
      '<div class="card">' +
        '<h3>Lo que esperas desarrollar</h3>' +
        (info.aspiracion && info.aspiracion.trim() ? '<p class="note" style="margin-top:0;">En tu información inicial escribiste: “' + AG.esc(info.aspiracion.trim()) + '”.</p>' : '') +
        '<p style="margin-top:0;">En los próximos años, ¿qué quieres desarrollar en ti? Elige las que quieras.</p>' +
        AG.checks('esperas', EXPECTATIVAS.map(e => e.t), d.esperas) +
        '<div class="campo" style="margin-top:8px;"><label for="f_cre_otra">Otra cosa (opcional)</label><input id="f_cre_otra" value="' + AG.esc(d.esperaOtra) + '"></div>' +
      '</div>' +

      '<div class="card">' +
        '<h3>Lo que tu perfil sugiere trabajar</h3>' +
        '<p class="note" style="margin-top:0;">Áreas de crecimiento personal de Ágora para tu estilo, ' + NOM[dom].nombre + '. No son defectos: son el lado que tu estilo ejercita menos. Marca las que quieras trabajar.</p>' +
        AG.checks('areas', A[dom].crecimiento.concat(debilidades.map(t => ({texto: t, nota: 'Lo escribiste en tu FODA como debilidad'}))), d.areas) +
        (foda ? '' : '<p class="note">Cuando completes tu FODA, aquí aparecen también tus debilidades.</p>') +
      '</div>' +

      (conValores ?
      '<div class="card" id="cre_valores">' +
        '<h3>Tus valores</h3>' +
        '<p class="note" style="margin-top:0;">Elige de 3 a 5: los que no negociarías al elegir dónde trabajar o cómo vivir.</p>' +
        AG.checks('valores', VALORES, d.valores || []) +
        '<h3>Lo que te interesa hacer</h3>' +
        '<p class="note" style="margin-top:0;">Del 1 (nada) al 5 (mucho), ¿cuánto te gusta?</p>' +
        INTERESES.map(x => '<div class="campo" style="margin:6px 0;"><label>' + AG.esc(x.t) + '</label>' + AG.radios('int_' + x.id, ESCALA, String((d.intereses || {})[x.id] || '')) + '</div>').join('') +
        '<h3>Lo que te motiva en un trabajo</h3>' +
        '<p class="note" style="margin-top:0;">Del 1 (no me importa) al 5 (me importa mucho).</p>' +
        MOTIVACIONES.map(x => '<div class="campo" style="margin:6px 0;"><label>' + AG.esc(x.t) + '</label>' + AG.radios('mot_' + x.id, ESCALA, String((d.motivaciones || {})[x.id] || '')) + '</div>').join('') +
      '</div>' : '') +

      '<div class="card">' +
        '<h3>Frente a frente</h3>' +
        '<div id="cre_cruce"></div>' +
        '<div class="campo" style="margin-top:12px;"><label for="f_cre_prioridad">Tu primera prioridad <span class="req">*</span></label><select id="f_cre_prioridad"></select></div>' +
        '<h3>Habilidades que te conviene reforzar</h3>' +
        '<div>' + habilidades.map(h => '<span class="pill">' + AG.esc(h) + '</span>').join('') + '</div>' +
        '<div id="cre_cursos"><p class="note">Buscando en el catálogo del Club…</p></div>' +
        AG.boton('crecimiento', AG.completa('crecimiento')) +
      '</div>' +

      (!esAgora ? '' : '<div class="card">' +
        '<h3>Compartir con tu familia</h3>' +
        '<p style="margin-top:0;">El proceso Ágora comparte esta fase con tu madre, padre o tutor. Se abre tu correo con el mensaje listo; tú decides si lo mandas.' +
        (AG.infoCompleta() ? '' : ' Primero completa tu información inicial.') + '</p>' +
        '<a class="secondary" id="cre_correo" href="#">' +
          (tutor.correo ? 'Mandar a ' + AG.esc(tutor.nombre || tutor.correo) : 'Mandar por correo a mi familia') + '</a>' +
        '<p class="note">Si aceptaste guardar tu expediente, tu orientador también puede mandárselos desde el Club.</p>' +
      '</div>');

    // Lo que se lee se mezcla con lo guardado: así Ágora no borra los valores que se contestaron en DIANA.
    const leer = () => {
      const x = Object.assign({}, AG.datos('crecimiento') || {}, {
        esperas: AG.marcados(cont, 'esperas'), esperaOtra: cont.querySelector('#f_cre_otra').value,
        areas: AG.marcados(cont, 'areas'), prioridad: cont.querySelector('#f_cre_prioridad').value, dom
      });
      if(conValores){
        x.valores = AG.marcados(cont, 'valores');
        x.intereses = {}; INTERESES.forEach(i => { const v = AG.radio(cont, 'int_' + i.id); if(v) x.intereses[i.id] = Number(v); });
        x.motivaciones = {}; MOTIVACIONES.forEach(i => { const v = AG.radio(cont, 'mot_' + i.id); if(v) x.motivaciones[i.id] = Number(v); });
      }
      return x;
    };
    // Máximo 5 valores.
    cont.addEventListener('change', ev => {
      if(ev.target.dataset && ev.target.dataset.grupo === 'valores' && ev.target.checked && AG.marcados(cont, 'valores').length > 5) ev.target.checked = false;
    }, true);

    // La prioridad se elige entre lo marcado en las dos columnas.
    function pintarCruce(){
      const x = leer();
      const opciones = x.areas.concat(x.esperas).concat(x.esperaOtra.trim() ? [x.esperaOtra.trim()] : []);
      const sel = cont.querySelector('#f_cre_prioridad');
      const actual = x.prioridad || d.prioridad;
      sel.innerHTML = '<option value="">Elige entre lo que marcaste…</option>' +
        opciones.map(o => '<option' + (o === actual ? ' selected' : '') + '>' + AG.esc(o) + '</option>').join('');
      const co = coincidencias(x.esperas, x.areas);
      cont.querySelector('#cre_cruce').innerHTML = !x.esperas.length && !x.areas.length
        ? '<p class="note" style="margin-top:0;">Marca arriba lo que esperas y lo que quieres trabajar, y aquí se cruzan.</p>'
        : (co.length
          ? '<p style="margin-top:0;"><strong>Donde coinciden</strong> lo que esperas y lo que sugiere tu perfil. Es buen lugar para empezar:</p>' +
            '<ul>' + co.map(c => '<li><strong>' + AG.esc(c.espera) + '</strong> — ' + c.areas.map(AG.esc).join(' / ') + '</li>').join('') + '</ul>'
          : '<p style="margin-top:0;">Lo que esperas y lo que sugiere tu perfil no se cruzan directamente. Está bien: lo que tú esperas cuenta tanto como lo que sale del cuestionario.</p>');
    }
    const guardar = () => { pintarCruce(); AG.guardadoTxt(AG.fijar('crecimiento', leer())); };
    cont.addEventListener('change', guardar);
    cont.addEventListener('input', ev => { if(ev.target.id === 'f_cre_otra') guardar(); });
    pintarCruce();

    const cc = cont.querySelector('#cre_correo');
    if(cc) cc.onclick = ev => {
      const x = leer();
      ev.currentTarget.href = AG.mailto(tutor.correo, 'Mis resultados de Crecimiento personal — proceso Ágora', textoResultados(AG, x, habilidades));
    };

    // Cursos: solo del catálogo del Club, como en el resto del sitio.
    AG.manifest().then(m => {
      const caja = cont.querySelector('#cre_cursos'); if(!caja) return;
      const cat = (m && m.COURSES && m.COURSES.cursos) || {};
      const buscadas = habilidades.map(norm), vistos = new Set(), hallados = [];
      Object.keys(cat).forEach(sec => (cat[sec] || []).forEach(c => {
        if(vistos.has(c.id)) return;
        const suyas = (c.habilidades || []).map(norm);
        if(buscadas.some(b => suyas.some(s => s.includes(b) || b.includes(s)))){ vistos.add(c.id); hallados.push(c); }
      }));
      const enNombre = c => buscadas.some(b => norm(c.nombre).startsWith(b)) ? 0 : 1;
      hallados.sort((x, y) => enNombre(x) - enNombre(y));
      caja.innerHTML = hallados.length
        ? '<p class="note">Cursos del catálogo del Club que trabajan estas habilidades:</p>' + AG.lista(hallados.slice(0, 4).map(c => c.nombre + (c.institucion ? ' — ' + c.institucion : '')))
        : '<p class="note">Hoy el catálogo del Club no tiene un curso para estas habilidades. Preferimos decírtelo a recomendarte algo de otra parte.</p>';
    });

    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      if(!x.esperas.length && !x.esperaOtra.trim()) f.push('elegir al menos una cosa que esperas desarrollar');
      if(x.areas.length < 2) f.push('marcar al menos 2 áreas que quieres trabajar');
      if(!x.prioridad) f.push('elegir tu primera prioridad');
      if(conValores){
        if((x.valores || []).length < 3) f.push('elegir de 3 a 5 valores');
        const sinInt = INTERESES.filter(i => !(x.intereses || {})[i.id]).length, sinMot = MOTIVACIONES.filter(i => !(x.motivaciones || {})[i.id]).length;
        if(sinInt) f.push('calificar lo que te interesa (faltan ' + sinInt + ')');
        if(sinMot) f.push('calificar lo que te motiva (faltan ' + sinMot + ')');
      }
      if(f.length){ AG.faltan(f); return; }
      AG.fijar('crecimiento', x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar('crecimiento', Object.assign({}, x, {
        habilidades,
        hoja: Object.assign({
          'Lo que espero desarrollar': AG.vinetas(x.esperas.concat(x.esperaOtra.trim() ? [x.esperaOtra.trim()] : [])),
          'Áreas de crecimiento': AG.vinetas(x.areas), 'Primera prioridad': x.prioridad,
          'Habilidades a reforzar': habilidades.join(', ')
        }, conValores ? textoValores(x) : {})
      }));
    };
  }
};
})();
