/* =====================================================================
   Proceso Ágora — Fase 9: Plan de acción 30, 60 y 90 días
   =====================================================================

   Hoja de Ágora: "Sugiere acciones y complementa con información personal en
   área de captura"; resultado: "plan de acción personalizado". (De DIANA se
   toman los tres tipos de objetivo: educación, experiencia y conexión.)

   Las sugerencias salen de lo que la persona ya hizo: su prioridad de
   crecimiento (fase 6), su siguiente paso del FODA (fase 3), su ruta
   profesional (fase 8), lo que el monitoreo del Club ve en ese sector y los
   cursos del catálogo propio del Club. Ninguna entra al plan si ella no la
   agrega; y puede escribir las suyas.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};

const PLAZOS = [30, 60, 90];
const TIPOS = ['Educación', 'Experiencia', 'Conexión'];
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const sinPunto = t => String(t || '').trim().replace(/[.。]+$/, '');

function sugerencias(AG, extra){
  const info = AG.info();
  const cre = AG.datos('crecimiento') || {};
  const ruta = AG.datos('ruta') || {};
  // En DIANA la "ruta" es el rol objetivo del Mapa de carrera.
  const mapa = AG.enProceso('mapa') ? (AG.datos('mapa') || {}) : {};
  const form = AG.enProceso('formacion') ? (AG.datos('formacion') || {}) : {};
  const marca = AG.enProceso('marca') ? (AG.datos('marca') || {}) : {};
  const foda = AG.foda();
  const disc = AG.disc();
  const habilidades = disc ? DISC.CRECIMIENTO_HABILIDADES[disc.dom] : [];
  const r = sinPunto(mapa.rol || ruta.principal);
  const sector = extra.sectorNombre;
  const preuniversitario = ['Secundaria', 'Preparatoria o bachillerato'].includes(info.nivel);
  const S = [];
  const add = (plazo, tipo, texto) => { if(texto) S.push({plazo, tipo, texto}); };

  // 30 días: arrancar
  if(cre.prioridad) add(30, 'Educación', 'Elegir una acción concreta para trabajar tu prioridad: ' + sinPunto(cre.prioridad).toLowerCase() + '.');
  if(foda && sinPunto(foda.paso)) add(30, 'Experiencia', 'Tu siguiente paso del FODA: ' + sinPunto(foda.paso) + '.');
  add(30, 'Conexión', AG.PROCESO.id === 'agora' ? 'Platicar tus resultados del proceso Ágora con tu orientador y con tu familia.' : 'Revisar tus resultados de Descubrir e Iniciar con tu mentor.');
  if(F.marca && F.marca.frase(marca)) add(30, 'Conexión', 'Poner tu propuesta de valor en tu perfil de LinkedIn: «' + sinPunto(F.marca.frase(marca)) + '».');
  (form.cursos || []).slice(0, 1).forEach(c => add(60, 'Educación', 'Inscribirte al curso «' + c.split(' — ')[0] + '» de tu plan de formación.'));
  (form.tecnicas || []).slice(0, 1).forEach(t => add(90, 'Educación', 'Avanzar en ' + t + ', de tu plan de formación.'));
  if(r) add(30, 'Educación', preuniversitario ? 'Revisar el plan de estudios de ' + r + ' en al menos tres escuelas: materias, duración y costo.' : 'Revisar qué certificaciones o especialidades piden para trabajar en ' + r + '.');

  // 60 días: construir
  if(extra.curso) add(60, 'Educación', 'Tomar el curso «' + extra.curso + '» del catálogo del Club.');
  else if(habilidades.length) add(60, 'Educación', 'Empezar un curso o taller de ' + habilidades[0] + '.');
  add(60, 'Experiencia', r ? 'Buscar un voluntariado, servicio social, práctica o proyecto relacionado con ' + r + '.' : 'Buscar un voluntariado, servicio social o proyecto donde practiques lo que quieres estudiar.');
  add(60, 'Conexión', r ? 'Hablar con alguien que estudie o trabaje en ' + r + ' y preguntarle cómo es su día a día.' : 'Hablar con alguien que trabaje en lo que te interesa y preguntarle cómo es su día a día.');

  // 90 días: mostrar
  if(extra.habilidadMercado && sector) add(90, 'Educación', 'Empezar a aprender ' + extra.habilidadMercado + ', de lo que más piden hoy las vacantes de ' + sector + '.');
  add(90, 'Experiencia', 'Tener algo que mostrar: un proyecto, una práctica o un logro con cifras.');
  add(90, 'Conexión', sector ? 'Ir a una feria vocacional, un open house o conocer una empresa de ' + sector + '.' : 'Ir a una feria vocacional o un open house de las escuelas que te interesan.');
  if(cre.prioridad) add(90, 'Educación', 'Revisar con tu orientador cómo vas en tu prioridad y ajustar este plan.');
  return S;
}

const vacio = () => ({acciones: []});
const nuevoId = () => Math.random().toString(36).slice(2, 9);

F.plan = {
  PLAZOS, TIPOS,
  pintar(cont, AG){
    const d = Object.assign(vacio(), AG.datos('plan') || {});
    const extra = {};

    cont.innerHTML =
      '<div class="card">' +
        '<h3>Sugerencias para tu plan</h3>' +
        '<p class="note" style="margin-top:0;">Salen de lo que hiciste en las fases anteriores. Agrega las que te sirvan; también puedes escribir las tuyas en cada columna. Piensa en tres tipos: <strong>educación</strong> (lo que vas a aprender), <strong>experiencia</strong> (lo que vas a hacer) y <strong>conexión</strong> (con quién vas a hablar).</p>' +
        '<div id="pln_sug"></div>' +
      '</div>' +
      '<div class="card">' +
        '<h3>Tu plan</h3>' +
        '<div class="tres-col">' + PLAZOS.map(p =>
          '<div class="columna" data-plazo="' + p + '"><h4>' + p + ' días</h4><div data-lista="' + p + '"></div>' +
          '<div class="campo" style="margin-top:8px;"><label for="f_pln_txt_' + p + '">Agregar una acción tuya</label><input id="f_pln_txt_' + p + '" placeholder="Qué vas a hacer"></div>' +
          '<div class="acciones" style="margin-top:6px;"><select id="f_pln_tipo_' + p + '" style="padding:6px 8px;border:1px solid var(--gris-borde);border-radius:8px;">' + TIPOS.map(t => '<option>' + t + '</option>').join('') + '</select>' +
          '<button type="button" class="secondary mini" data-propia="' + p + '">Agregar</button></div></div>').join('') +
        '</div>' +
        AG.boton('plan', AG.completa('plan')) +
      '</div>';

    const guardar = () => AG.guardadoTxt(AG.fijar('plan', d));
    function pintarPlan(){
      PLAZOS.forEach(p => {
        const items = d.acciones.filter(a => a.plazo === p);
        cont.querySelector('[data-lista="' + p + '"]').innerHTML = items.length
          ? items.map(a => '<div class="accion"><div><div class="tipo">' + AG.esc(a.tipo) + '</div>' + AG.esc(a.texto) + '</div><button type="button" class="quitar" data-quitar="' + a.id + '">Quitar</button></div>').join('')
          : '<p class="note">Todavía nada para los primeros ' + p + ' días.</p>';
      });
      cont.querySelectorAll('[data-quitar]').forEach(b => {
        b.onclick = () => { d.acciones = d.acciones.filter(a => a.id !== b.dataset.quitar); guardar(); pintarPlan(); pintarSug(); };
      });
    }
    function pintarSug(){
      const S = sugerencias(AG, extra);
      cont.querySelector('#pln_sug').innerHTML = PLAZOS.map(p => {
        const delPlazo = S.filter(s => s.plazo === p);
        if(!delPlazo.length) return '';
        return '<p style="margin:10px 0 2px;"><strong>Primeros ' + p + ' días</strong></p>' + delPlazo.map(s => {
          const ya = d.acciones.some(a => a.texto === s.texto);
          return '<div class="sugerencia"><span><span class="pill" style="margin:0 6px 0 0;">' + s.tipo + '</span>' + AG.esc(s.texto) + '</span>' +
            '<button type="button" class="secondary mini" data-sug="' + AG.esc(JSON.stringify(s)) + '"' + (ya ? ' disabled' : '') + '>' + (ya ? 'Agregada' : 'Agregar') + '</button></div>';
        }).join('');
      }).join('');
      cont.querySelectorAll('[data-sug]').forEach(b => {
        b.onclick = () => {
          const s = JSON.parse(b.dataset.sug);
          if(d.acciones.some(a => a.texto === s.texto)) return;
          d.acciones.push({id: nuevoId(), plazo: s.plazo, tipo: s.tipo, texto: s.texto, sugerida: true});
          guardar(); pintarPlan(); pintarSug();
        };
      });
    }
    cont.querySelectorAll('[data-propia]').forEach(b => {
      b.onclick = () => {
        const p = Number(b.dataset.propia);
        const inp = cont.querySelector('#f_pln_txt_' + p);
        const t = inp.value.trim(); if(!t) { inp.focus(); return; }
        d.acciones.push({id: nuevoId(), plazo: p, tipo: cont.querySelector('#f_pln_tipo_' + p).value, texto: t});
        inp.value = ''; guardar(); pintarPlan();
      };
    });
    cont.querySelectorAll('input[id^="f_pln_txt_"]').forEach(inp => {
      inp.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); cont.querySelector('[data-propia="' + inp.id.split('_').pop() + '"]').click(); } });
    });
    pintarPlan(); pintarSug();

    // Lo que llega después: el curso del catálogo y lo que pide el mercado.
    (async () => {
      const m = await AG.manifest();
      const disc = AG.disc();
      const ruta = AG.datos('ruta') || {};
      const mapa = AG.enProceso('mapa') ? (AG.datos('mapa') || {}) : {};
      const car = (window.CARRERAS_AGORA || []).find(c => norm(c.n) === norm(ruta.principal));
      const clave = (mapa.industria && mapa.industria !== 'otra') ? mapa.industria : (car && car.s[0]);
      if(clave){
        const s = await AG.sector(clave);
        if(s){ extra.sectorNombre = s.nombre; extra.habilidadMercado = ((s.habilidades_tecnicas || [])[0] || {}).skill; }
      }
      const cat = (m && m.COURSES && m.COURSES.cursos) || {};
      const buscadas = (disc ? DISC.CRECIMIENTO_HABILIDADES[disc.dom] : []).map(norm);
      const pool = clave && cat[clave] ? cat[clave] : [].concat(...Object.values(cat));
      // Primero los que trabajan la habilidad en su nombre ("Comunicación efectiva"),
      // luego los que solo la traen entre sus habilidades.
      const cubre = c => (c.habilidades || []).map(norm).some(h => buscadas.some(b => h.includes(b) || b.includes(h)));
      const enNombre = c => buscadas.some(b => norm(c.nombre).startsWith(b));
      const curso = pool.find(c => cubre(c) && enNombre(c)) || pool.find(cubre);
      if(curso) extra.curso = curso.nombre;
      if(cont.isConnected) pintarSug();
    })();

    cont.querySelector('#btnCompletar').onclick = () => {
      const vacios = PLAZOS.filter(p => !d.acciones.some(a => a.plazo === p));
      if(vacios.length){ AG.faltan(vacios.map(p => 'al menos una acción para los primeros ' + p + ' días')); return; }
      guardar();
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      const col = p => d.acciones.filter(a => a.plazo === p).map(a => '[' + a.tipo + '] ' + a.texto).join('\n');
      AG.terminar('plan', {acciones: d.acciones, hoja: {'30 días': col(30), '60 días': col(60), '90 días': col(90)}});
    };
  }
};
})();
