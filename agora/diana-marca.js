/* =====================================================================
   DIANA — Iniciar: Marca personal y profesional
   =====================================================================

   Hoja de DIANA: "Crear marca personal y profesional personalizada";
   información: "captura de información de expectativas personales";
   resultado: "lista de características a desarrollar personales y
   profesionales".

   Tres partes:
   1. Expectativas: cómo quiere que la reconozcan.
   2. Características a desarrollar, personales y profesionales. Se proponen
      a partir de lo que ya hizo (su estilo, sus valores, sus áreas de
      crecimiento, lo que eligió formar) y ella elige o escribe las suyas.
   3. Su propuesta de valor en una frase: quién es, qué hace bien y para
      quién. Es la base de su presentación en Alinear.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};
const lineas = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const vacio = () => ({reconocer:'', recordar:'', personales:[], personalesOtras:'', profesionales:[], profesionalesOtras:'', soy:'', hago:'', para:''});
const frase = d => [d.soy, d.hago, d.para].every(x => (x || '').trim())
  ? 'Soy ' + d.soy.trim() + ' que ' + d.hago.trim() + ' para ' + d.para.trim() + '.' : '';
const todas = (lista, otras) => (lista || []).concat(lineas(otras));

F.marca = {
  titulo: 'Marca personal y profesional',
  frase,
  seccion(AG, d){
    const e = AG.esc;
    return (frase(d) ? '<p style="font-size:1.05rem;"><strong>“' + e(frase(d)) + '”</strong></p>' : '') +
      (d.reconocer ? '<p><strong>Cómo quiere que la reconozcan:</strong> ' + e(d.reconocer) + '</p>' : '') +
      '<div class="dos-col"><div class="bloque"><h3>Características personales a desarrollar</h3>' + (AG.lista(todas(d.personales, d.personalesOtras)) || '<p class="vacio">—</p>') + '</div>' +
      '<div class="bloque"><h3>Características profesionales a desarrollar</h3>' + (AG.lista(todas(d.profesionales, d.profesionalesOtras)) || '<p class="vacio">—</p>') + '</div></div>';
  },
  pintar(cont, AG, paso){
    const req = AG.requiere(['disc', 'mapa']);
    if(req){ cont.innerHTML = req; return; }
    const disc = AG.disc(), mapa = AG.datos('mapa') || {}, cre = AG.datos('crecimiento') || {}, form = AG.datos('formacion') || {}, est = AG.datos('estilo') || {};
    const d = Object.assign(vacio(), AG.datos(paso.id) || {});
    // Primera vez: la frase arranca con su rol objetivo del Mapa de carrera.
    if(!AG.datos(paso.id) && mapa.rol) d.soy = mapa.rol;
    const A = DISC.AGORA[disc.dom];
    const personalesSug = [...new Set(A.estilo.concat(cre.valores || []).concat((cre.areas || []).slice(0, 3)))];
    const profesionalesSug = [...new Set((form.tecnicas || []).concat(form.blandas || []).concat(DISC.CRECIMIENTO_HABILIDADES[disc.dom]))];

    cont.innerHTML =
      '<div class="card">' +
        '<h3>Tus expectativas</h3>' +
        '<div class="campo"><label for="f_mar_rec">En dos años, ¿cómo quieres que te describan en tu trabajo?</label><textarea id="f_mar_rec" rows="2" placeholder="Por ejemplo: la persona a la que le confían los cierres de mes porque no se le escapa nada">' + AG.esc(d.reconocer) + '</textarea></div>' +
        '<div class="campo"><label for="f_mar_recordar">¿Por qué quieres que te recuerden? (opcional)</label><textarea id="f_mar_recordar" rows="2">' + AG.esc(d.recordar) + '</textarea></div>' +
      '</div>' +
      '<div class="card">' +
        '<h3>Características personales que quieres desarrollar</h3>' +
        '<p class="note" style="margin-top:0;">Salen de tu estilo, tus valores y tus áreas de crecimiento. Elige las que quieras que formen parte de tu marca.</p>' +
        AG.checks('personales', personalesSug, d.personales) +
        '<div class="campo" style="margin-top:8px;"><label for="f_mar_potras">Otras, una por renglón</label><textarea id="f_mar_potras" rows="2">' + AG.esc(d.personalesOtras) + '</textarea></div>' +
        '<h3>Características profesionales que quieres desarrollar</h3>' +
        '<p class="note" style="margin-top:0;">Salen de tu plan de formación y de lo que tu estilo ejercita menos.</p>' +
        AG.checks('profesionales', profesionalesSug, d.profesionales) +
        '<div class="campo" style="margin-top:8px;"><label for="f_mar_profotras">Otras, una por renglón</label><textarea id="f_mar_profotras" rows="2">' + AG.esc(d.profesionalesOtras) + '</textarea></div>' +
      '</div>' +
      '<div class="card">' +
        '<h3>Tu propuesta de valor, en una frase</h3>' +
        '<p class="note" style="margin-top:0;">Es lo primero que vas a decir de ti en una entrevista o en tu perfil profesional.' + ((est.trabajo || []).length ? ' Lo que marcaste de cómo trabajas te puede ayudar: “' + AG.esc(est.trabajo[0]) + '”.' : '') + '</p>' +
        '<div class="grid">' +
          '<div class="campo"><label for="f_mar_soy">Soy…</label><input id="f_mar_soy" value="' + AG.esc(d.soy) + '" placeholder="una analista de datos"></div>' +
          '<div class="campo"><label for="f_mar_hago">que…</label><input id="f_mar_hago" value="' + AG.esc(d.hago) + '" placeholder="convierte números en decisiones claras"></div>' +
          '<div class="campo"><label for="f_mar_para">para…</label><input id="f_mar_para" value="' + AG.esc(d.para) + '" placeholder="equipos que necesitan vender mejor"></div>' +
        '</div>' +
        '<div class="mercado" id="mar_frase" style="margin-top:10px;"></div>' +
        AG.boton(paso.id, AG.completa(paso.id)) +
      '</div>';

    const leer = () => ({
      reconocer: cont.querySelector('#f_mar_rec').value, recordar: cont.querySelector('#f_mar_recordar').value,
      personales: AG.marcados(cont, 'personales'), personalesOtras: cont.querySelector('#f_mar_potras').value,
      profesionales: AG.marcados(cont, 'profesionales'), profesionalesOtras: cont.querySelector('#f_mar_profotras').value,
      soy: cont.querySelector('#f_mar_soy').value, hago: cont.querySelector('#f_mar_hago').value, para: cont.querySelector('#f_mar_para').value
    });
    const pintarFrase = () => { const t = frase(leer()); cont.querySelector('#mar_frase').innerHTML = t ? '<strong>“' + AG.esc(t) + '”</strong>' : '<span class="note">Completa los tres espacios y aquí aparece tu frase.</span>'; };
    const guardar = () => { pintarFrase(); AG.guardadoTxt(AG.fijar(paso.id, leer())); };
    cont.addEventListener('input', guardar);
    cont.addEventListener('change', guardar);
    pintarFrase();

    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      if(x.reconocer.trim().length < 10) f.push('escribir cómo quieres que te describan');
      const np = todas(x.personales, x.personalesOtras).length, nf = todas(x.profesionales, x.profesionalesOtras).length;
      if(np < 3) f.push('al menos 3 características personales (llevas ' + np + ')');
      if(nf < 3) f.push('al menos 3 características profesionales (llevas ' + nf + ')');
      if(!frase(x)) f.push('completar tu propuesta de valor: soy…, que…, para…');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {
        'Propuesta de valor': frase(x), 'Cómo quiero que me reconozcan': x.reconocer.trim(),
        'Características personales': AG.vinetas(todas(x.personales, x.personalesOtras)),
        'Características profesionales': AG.vinetas(todas(x.profesionales, x.profesionalesOtras))
      }}));
    };
  }
};
})();
