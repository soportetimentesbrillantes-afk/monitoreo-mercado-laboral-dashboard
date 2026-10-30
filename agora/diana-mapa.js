/* =====================================================================
   DIANA — Iniciar: Mapa de carrera
   =====================================================================

   Hoja de DIANA: "Desarrolla mapa profesional considerando desarrollo
   académico y resultados de la fase Descubrir vs posibles roles en industria
   objetivo"; resultado: "Mapa de carrera personalizado".

   Cruza tres cosas, y dice de dónde sale cada una:
   - Lo que ya trae: su preparación académica y experiencia (Información
     inicial) y lo que descubrió de sí (Perfil DISC, estilo de trabajo).
   - Los roles posibles de su industria objetivo: los puestos que describió
     el panel de expertos de cada industria (fichas.html) y las categorías de
     puesto que el monitoreo semanal ve en las vacantes (data/sector_*.json).
   - La afinidad de su estilo con cada rol (afinidad-estilo.js): orientación,
     no requisito.
   La persona elige su rol objetivo y escribe qué la acerca y qué le falta.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};

let fichasPromesa = null;
/* Los puestos por industria de fichas.html: {Industria: [{puesto, descripcion, corrida}]} */
function fichas(){
  if(!fichasPromesa) fichasPromesa = fetch('fichas.html', {cache: 'no-store'}).then(r => r.ok ? r.text() : '').then(html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = {};
    doc.querySelectorAll('details.industria').forEach(det => {
      const sum = det.querySelector('summary');
      const nombre = sum ? [...sum.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : '';
      out[nombre] = [...det.querySelectorAll('tbody tr')].map(tr => {
        const td = tr.querySelector('.puesto'), marca = td && td.querySelector('.marca');
        return {puesto: td ? [...td.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : '',
          descripcion: (tr.querySelector('.descripcion') || {}).textContent || '', corrida: !!(marca && marca.classList.contains('corrida'))};
      }).filter(x => x.puesto);
    });
    return out;
  }).catch(() => ({}));
  return fichasPromesa;
}

const ETQ = {alta:'Alta', media:'Media', baja:'Baja'};
const OTRA = 'otra';
const vacio = () => ({industria:'', industriaNombre:'', industriaOtra:'', rol:'', rolOtro:'', rol2:'', brecha:'', revisados:[]});

F.mapa = {
  titulo: 'Mapa de carrera',
  fichas,
  seccion(AG, d){
    const e = AG.esc;
    return '<p><strong>Industria objetivo:</strong> ' + e(d.industriaNombre || d.industriaOtra || '—') + '</p>' +
      '<p><strong>Rol objetivo:</strong> ' + e(d.rol || '—') + (d.rol2 ? '. <strong>Segundo rol:</strong> ' + e(d.rol2) : '') + '</p>' +
      (d.revisados && d.revisados.length ? '<table class="tabla"><tr><th>Roles que revisó</th><th>Afinidad con su estilo</th></tr>' +
        d.revisados.map(r => '<tr><td>' + e(r.rol) + '</td><td>' + e(r.afinidad ? ETQ[r.afinidad] : '—') + '</td></tr>').join('') + '</table>' : '') +
      (d.brecha ? '<h3>Qué lo acerca y qué le falta</h3><p>' + e(d.brecha) + '</p>' : '');
  },
  pintar(cont, AG, paso){
    const req = AG.requiere(['disc']);
    if(req){ cont.innerHTML = req; return; }
    const info = AG.info(), disc = AG.disc(), est = AG.datos('estilo') || {};
    const d = Object.assign(vacio(), AG.datos(paso.id) || {});
    const perfil = AFINIDAD.perfilNormalizado(disc.p);
    const ori = F.estilo ? F.estilo.orientacion(disc) : null;
    const NOM = DISC.FACTORES;
    const exps = (info.experiencia || []).filter(x => (x.rol || '').trim()).map(x => x.rol.trim() + (x.organizacion ? ' en ' + x.organizacion.trim() : ''));
    const certs = (info.certificaciones || []).filter(x => (x.nombre || '').trim()).map(x => x.nombre.trim());

    cont.innerHTML =
      '<div class="card">' +
        '<h3>Lo que ya traes</h3>' +
        '<div class="grid dos">' +
          '<div><p style="margin:4px 0;"><strong>Preparación:</strong> ' + AG.esc([info.nivel, info.carrera, info.institucion].filter(x => (x || '').trim()).join(' · ') || '—') + '</p>' +
            '<p style="margin:4px 0;"><strong>Experiencia:</strong> ' + AG.esc(info.sinExperiencia ? 'Todavía sin experiencia formal' : (exps.join('; ') || '—')) + '</p>' +
            '<p style="margin:4px 0;"><strong>Cursos y certificaciones:</strong> ' + AG.esc(certs.join(', ') || '—') + '</p></div>' +
          '<div><p style="margin:4px 0;"><strong>Tu estilo:</strong> ' + NOM[disc.dom].nombre + ' con ' + NOM[disc.seg].nombre + (ori ? ' — ' + AG.esc(ori.titulo.toLowerCase()) : '') + '</p>' +
            ((est.trabajo || []).length ? '<p style="margin:4px 0;"><strong>Cómo trabajas:</strong> ' + AG.esc(est.trabajo.slice(0, 3).join(' ')) + '</p>' : '') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<h3>Tu industria objetivo</h3>' +
        '<div class="grid dos"><div class="campo"><label for="f_map_ind">Industria</label><select id="f_map_ind"></select></div>' +
        '<div class="campo" id="campoMapOtra"' + (d.industria === OTRA ? '' : ' hidden') + '><label for="f_map_otra">¿Cuál?</label><input id="f_map_otra" value="' + AG.esc(d.industriaOtra) + '"></div></div>' +
        '<h3>Roles posibles</h3>' +
        '<p class="note" style="margin-top:0;">Los puestos que describió un panel de expertos de la industria y los que el monitoreo semanal del Club ve hoy en las vacantes. <strong>Afinidad con tu estilo</strong>: qué tanto se parece tu forma de trabajar a la que suele pedir ese puesto. Es orientación, no un requisito.</p>' +
        '<div style="overflow-x:auto;"><table class="tabla tarjetas" id="map_roles"></table></div>' +
      '</div>' +
      '<div class="card">' +
        '<h3>Tu rol objetivo</h3>' +
        '<div class="grid dos">' +
          '<div class="campo"><label for="f_map_rol">Rol objetivo <span class="req">*</span></label><select id="f_map_rol"></select></div>' +
          '<div class="campo"><label for="f_map_rol2">Segundo rol (opcional)</label><select id="f_map_rol2"></select></div>' +
          '<div class="campo ancho"><label for="f_map_rolotro">¿Otro rol que no está en la lista?</label><input id="f_map_rolotro" value="' + AG.esc(d.rolOtro) + '" placeholder="Escríbelo y elígelo arriba como &quot;Otro&quot;"></div>' +
          '<div class="campo ancho"><label for="f_map_brecha">¿Qué te acerca a ese rol y qué te falta? <span class="req">*</span></label><textarea id="f_map_brecha" rows="4" placeholder="Lo que ya tienes (estudios, experiencia, tu estilo) y lo que te falta (habilidades, experiencia, certificaciones)">' + AG.esc(d.brecha) + '</textarea></div>' +
        '</div>' +
        AG.boton(paso.id, AG.completa(paso.id)) +
      '</div>';

    let roles = [], sectores = [];
    const leer = () => {
      const ind = cont.querySelector('#f_map_ind').value;
      const sec = sectores.find(s => s.key === ind);
      let rol = cont.querySelector('#f_map_rol').value;
      const otro = cont.querySelector('#f_map_rolotro').value.trim();
      if(rol === '__otro') rol = otro;
      let rol2 = cont.querySelector('#f_map_rol2').value; if(rol2 === '__otro') rol2 = otro;
      return {industria: ind, industriaNombre: sec ? sec.nombre : '', industriaOtra: cont.querySelector('#f_map_otra').value.trim(),
        rol, rolOtro: otro, rol2, brecha: cont.querySelector('#f_map_brecha').value,
        revisados: roles.slice(0, 15).map(r => ({rol: r.rol, afinidad: r.afinidad}))};
    };
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));

    function llenarRoles(){
      const x = leer();
      const actual = d.rol, actual2 = d.rol2;
      const ops = roles.map(r => r.rol);
      const opciones = (sel, v, vacia) => '<option value="">' + vacia + '</option>' + ops.map(o => '<option' + (o === v ? ' selected' : '') + '>' + AG.esc(o) + '</option>').join('') +
        '<option value="__otro"' + (v && !ops.includes(v) && v === x.rolOtro ? ' selected' : '') + '>Otro (el que escribas abajo)</option>';
      cont.querySelector('#f_map_rol').innerHTML = opciones('rol', cont.querySelector('#f_map_rol').value || actual, 'Elige…');
      cont.querySelector('#f_map_rol2').innerHTML = opciones('rol2', cont.querySelector('#f_map_rol2').value || actual2, 'Ninguno');
      cont.querySelector('#map_roles').innerHTML = roles.length
        ? '<tr><th>Rol</th><th>Qué hace</th><th>Afinidad con tu estilo</th><th>Vacantes hoy</th></tr>' + roles.map(r =>
          '<tr><td><strong>' + AG.esc(r.rol) + '</strong></td><td data-l="Qué hace" class="note" style="margin:0;">' + AG.esc(r.desc || '—') + '</td>' +
          '<td data-l="Afinidad">' + (r.afinidad ? '<span class="nivel ' + r.afinidad + '">' + ETQ[r.afinidad] + '</span>' : '—') + '</td>' +
          '<td data-l="Vacantes">' + (r.vacantes ? r.vacantes.toLocaleString('es-MX') : '—') + '</td></tr>').join('')
        : '<tr><td class="note">' + (x.industria === OTRA ? 'Para una industria fuera del monitoreo, escribe abajo el rol que te interesa.' : 'Elige tu industria.') + '</td></tr>';
    }
    async function cargarRoles(){
      const ind = cont.querySelector('#f_map_ind').value;
      cont.querySelector('#campoMapOtra').hidden = ind !== OTRA;
      roles = [];
      const sec = sectores.find(s => s.key === ind);
      if(sec){
        const [fi, datos] = await Promise.all([fichas(), AG.sector(sec.key)]);
        (fi[sec.nombre] || []).forEach(f => roles.push({rol: f.puesto, desc: f.descripcion, fuente: 'panel'}));
        ((datos && datos.categorias_puesto) || []).filter(c => c.categoria !== 'Otro').forEach(c => {
          if(!roles.some(r => r.rol.toLowerCase() === c.categoria.toLowerCase())) roles.push({rol: c.categoria, desc: 'Categoría de puesto en las vacantes del monitoreo', vacantes: c.vacantes, fuente: 'monitoreo'});
        });
        roles.forEach(r => { r.afinidad = AFINIDAD.nivel(AFINIDAD.afinidad(r.rol + ' ' + (r.desc || '') + ' ' + sec.nombre, perfil)); });
        const peso = {alta: 3, media: 2, baja: 1};
        roles.sort((a, b) => (peso[b.afinidad] || 0) - (peso[a.afinidad] || 0) || (b.vacantes || 0) - (a.vacantes || 0));
      }
      llenarRoles();
    }

    AG.manifest().then(m => {
      sectores = (m && m.sectores) || [];
      const pre = d.industria || ((sectores.find(s => (info.sectores || []).includes(s.nombre)) || {}).key) || '';
      cont.querySelector('#f_map_ind').innerHTML = '<option value="">Elige…</option>' +
        sectores.map(s => '<option value="' + s.key + '"' + (s.key === pre ? ' selected' : '') + '>' + AG.esc(s.nombre) + '</option>').join('') +
        '<option value="' + OTRA + '"' + (pre === OTRA ? ' selected' : '') + '>Otra industria</option>';
      cargarRoles();
    });

    cont.addEventListener('change', ev => {
      if(ev.target.id === 'f_map_ind'){ cargarRoles().then(guardar); return; }
      guardar();
    });
    cont.addEventListener('input', ev => { if(ev.target.tagName !== 'SELECT') guardar(); });

    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      if(!x.industria || (x.industria === OTRA && !x.industriaOtra)) f.push('elegir tu industria objetivo');
      if(!x.rol) f.push('elegir tu rol objetivo');
      if(x.rol2 && x.rol2 === x.rol) f.push('que el segundo rol sea distinto');
      if(x.brecha.trim().length < 10) f.push('escribir qué te acerca al rol y qué te falta');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {
        'Industria objetivo': x.industriaNombre || x.industriaOtra, 'Rol objetivo': x.rol, 'Segundo rol': x.rol2,
        'Roles revisados': x.revisados.map(r => r.rol + (r.afinidad ? ' (afinidad ' + r.afinidad + ')' : '')).join('\n'),
        'Qué me acerca y qué me falta': x.brecha.trim()
      }}));
    };
  }
};
})();
