/* =====================================================================
   DIANA — Iniciar: Plan de formación
   =====================================================================

   Hoja de DIANA: "Identificar oportunidades de formación y certificaciones
   relevantes de la industria"; información: "lista de cursos técnicos y de
   habilidades blandas de la industria"; resultado: "lista inicial de
   formación personalizada — no priorizada".

   Es una lista inicial: aquí no se prioriza (eso pasa en Nutrir, con la
   selección de cursos). Se arma con:
   - las habilidades técnicas y blandas que más piden las vacantes de su
     industria (monitoreo del Club) y las que su estilo DISC ejercita menos;
   - los cursos del catálogo propio del Club para esa industria (nunca de
     plataformas externas, como en el resto del sitio);
   - lo que la persona agregue: otros cursos o certificaciones que conozca.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const vacio = () => ({tecnicas:[], blandas:[], cursos:[], otros:''});
const total = d => (d.tecnicas || []).length + (d.blandas || []).length + (d.cursos || []).length + AG_lineas(d.otros).length;
function AG_lineas(t){ return String(t || '').split('\n').map(x => x.trim()).filter(Boolean); }

F.formacion = {
  titulo: 'Plan de formación',
  seccion(AG, d){
    return '<p class="note" style="margin-top:0;">Lista inicial, sin prioridad todavía.</p>' +
      '<div class="dos-col"><div class="bloque"><h3>Habilidades técnicas</h3>' + (AG.lista(d.tecnicas) || '<p class="vacio">—</p>') + '</div>' +
      '<div class="bloque"><h3>Habilidades blandas</h3>' + (AG.lista(d.blandas) || '<p class="vacio">—</p>') + '</div></div>' +
      ((d.cursos || []).length ? '<h3>Cursos del catálogo del Club</h3>' + AG.lista(d.cursos) : '') +
      (AG_lineas(d.otros).length ? '<h3>Otros cursos y certificaciones</h3>' + AG.lista(AG_lineas(d.otros)) : '');
  },
  pintar(cont, AG, paso){
    const req = AG.requiere(['mapa']);
    if(req){ cont.innerHTML = req; return; }
    const mapa = AG.datos('mapa') || {};
    const info = AG.info(), disc = AG.disc();
    const d = Object.assign(vacio(), AG.datos(paso.id) || {});
    const tiene = (info.certificaciones || []).map(x => norm(x.nombre)).join(' | ');
    cont.innerHTML = '<div class="card" id="for_lista"><p class="note">Cargando…</p></div>' +
      '<div class="card"><h3>Otros cursos o certificaciones que quieres considerar</h3>' +
        '<p class="note" style="margin-top:0;">Uno por renglón. Por ejemplo, una certificación que piden las vacantes de tu rol (' + AG.esc(mapa.rol || 'tu rol objetivo') + ') o un curso que ya tenías en mente. En la fase Nutrir los priorizas.</p>' +
        '<div class="campo"><textarea id="f_for_otros" rows="4">' + AG.esc(d.otros) + '</textarea></div>' +
        AG.boton(paso.id, AG.completa(paso.id)) + '</div>';
    const caja = cont.querySelector('#for_lista');
    const leer = () => ({tecnicas: AG.marcados(cont, 'tecnicas'), blandas: AG.marcados(cont, 'blandas'), cursos: AG.marcados(cont, 'cursos'), otros: cont.querySelector('#f_for_otros').value});
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    const conYa = t => tiene.includes(norm(t)) ? {texto: t, nota: 'Ya tienes algo de esto en tus cursos'} : t;

    const clave = mapa.industria && mapa.industria !== 'otra' ? mapa.industria : null;
    Promise.all([clave ? AG.sector(clave) : Promise.resolve(null), AG.manifest()]).then(([s, m]) => {
      const tec = s ? (s.habilidades_tecnicas || []).slice(0, 8).map(x => x.skill) : [];
      const bla = [...new Set((s ? (s.habilidades_blandas || []).slice(0, 6).map(x => x.skill) : [])
        .concat(disc ? DISC.CRECIMIENTO_HABILIDADES[disc.dom].map(h => h.charAt(0).toUpperCase() + h.slice(1)) : []))];
      const cat = (m && m.COURSES && m.COURSES.cursos) || {};
      const cursos = (clave && cat[clave] ? cat[clave] : []).slice(0, 12).map(c => c.nombre + (c.institucion ? ' — ' + c.institucion : ''));
      caja.innerHTML =
        '<h3>Habilidades técnicas que piden en ' + AG.esc(mapa.industriaNombre || mapa.industriaOtra || 'tu industria') + '</h3>' +
        (tec.length ? '<p class="note" style="margin-top:0;">Las que más aparecen en las vacantes del monitoreo. Marca en las que quieres formarte.</p>' + AG.checks('tecnicas', tec.map(conYa), d.tecnicas)
          : '<p class="note" style="margin-top:0;">El monitoreo del Club no cubre esta industria. Escribe abajo las habilidades técnicas que piden las vacantes de tu rol.</p>') +
        '<h3>Habilidades blandas</h3>' +
        '<p class="note" style="margin-top:0;">Las que piden las vacantes y las que tu estilo ejercita menos.</p>' + AG.checks('blandas', bla, d.blandas) +
        '<h3>Cursos del catálogo del Club</h3>' +
        (cursos.length ? AG.checks('cursos', cursos, d.cursos)
          : '<p class="note" style="margin-top:0;">Hoy el catálogo del Club no tiene cursos para esta industria. Preferimos decírtelo a recomendarte algo de otra parte.</p>');
    });
    cont.addEventListener('change', guardar);
    cont.addEventListener('input', guardar);

    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer();
      if(total(x) < 3){ AG.faltan(['elegir o escribir al menos 3 cosas en las que te quieres formar (llevas ' + total(x) + ')']); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {
        'Habilidades técnicas': AG.vinetas(x.tecnicas), 'Habilidades blandas': AG.vinetas(x.blandas),
        'Cursos del catálogo': AG.vinetas(x.cursos), 'Certificaciones y otros': AG.vinetas(AG_lineas(x.otros))
      }}));
    };
  }
};
})();
