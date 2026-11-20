/* Fichas de puesto · Club de Mentes Brillantes
   Lo comparten seleccion.html (rellenar la vacante) y fichas-puestos.html.

   Lee data/fichas_puestos.json, que arma herramientas/fichas_puestos.py con
   tres capas por puesto: el panel de expertos (Excel), la rúbrica y guías
   (propuesta de Claude, editable) y el mercado (vacantes de la corrida cuyo
   título coincide con el puesto).

   window.FICHAS_PUESTOS
     cargar()          → Promise con el JSON (una sola descarga)
     aVacante(ficha)   → {puesto, competencias, metodos} en el formato de Selección Justa
     legal(ficha)      → texto del requisito legal, o '' si no hay
     resumen(ficha)    → [[etiqueta, texto, nota?], …] para mostrar lo que suele pedir el mercado
     sectores(datos)   → [[sector, [fichas…]], …] en el orden del panel
     mes(fecha)        → "12 nov 2026"
*/
(function(){
  'use strict';
  const URL_DATOS = 'data/fichas_puestos.json';
  const MID = ['cv', 'prueba', 'muestra', 'entrevista'];
  const MIN_DATOS = 5;
  let promesa = null;

  function cargar(){
    if(!promesa) promesa = fetch(URL_DATOS, {cache: 'no-cache'})
      .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(e => { promesa = null; throw e; });
    return promesa;
  }

  function aVacante(f){
    const id = i => 'k' + (i + 1);
    const competencias = f.competencias.map((c, i) => ({id: id(i), nombre: c.nombre, peso: c.peso, n1: c.n1, n3: c.n3, n5: c.n5}));
    const metodos = {};
    MID.forEach(m => {
      metodos[m] = {
        peso: Number(f.metodos.pesos[m]) || 0,
        comps: f.competencias.map((c, i) => c.metodos.includes(m) ? id(i) : null).filter(Boolean),
        guia: m === 'cv' ? '' : (f.metodos[m] || '')
      };
    });
    return {puesto: f.puesto, competencias, metodos};
  }

  /* Solo lo que el panel marcó como obligatorio por ley ("SÍ — …", "Aplica NOM…",
     "Solo obligatorio en…"). "Ninguna" o "Ninguna (…)" no cuenta. */
  function legal(f){
    const t = String((f.panel && f.panel.cert_obligatoria) || '').trim();
    if(!t || /^ninguna\b/i.test(t)) return '';
    return t.replace(/^s[ií]\s*,?\s*(?:[—–-]\s*)?/i, '').replace(/^\w/, x => x.toUpperCase());
  }

  const pesos = n => '$' + Math.round(n).toLocaleString('es-MX');
  const pc = n => (n < 1 ? '<1' : Math.round(n)) + ' %';
  const num = n => Number(n).toLocaleString('es-MX');
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function mes(fecha){ const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || ''); return m ? Number(m[3]) + ' ' + MESES[Number(m[2]) - 1] + ' ' + m[1] : (fecha || ''); }

  function resumen(f){
    const m = f.mercado || {}, out = [];
    const n = m.vacantes || 0;
    out.push(['Vacantes en la corrida', n ? num(n) + (m.pocos_datos ? ' (pocas: tómalo con cautela)' : '') : 'Ninguna con este título en la corrida; vale lo del panel y la rúbrica']);
    if(!n) return out;
    const s = m.salario || {};
    if(s.mediana) out.push(['Sueldo mensual', pesos(s.mediana) + ' de mediana', 'La mitad de las vacantes con sueldo publicado ofrece entre ' + pesos(s.p25) + ' y ' + pesos(s.p75) + ' (' + num(s.vacantes_con_dato) + ' con dato).']);
    const e = m.escolaridad;
    if(e && e.lo_especifican >= MIN_DATOS){
      const top = e.niveles.slice().sort((a, b) => b.vacantes - a.vacantes).filter(x => x.pct_de_las_que_especifican >= 5).slice(0, 3);
      out.push(['Escolaridad que piden', top.map(x => x.nivel + ' ' + pc(x.pct_de_las_que_especifican)).join(' · '), 'De las ' + num(e.lo_especifican) + ' vacantes que lo dicen (' + pc(e.pct_lo_especifican) + ' del total).']);
    }
    const x = m.experiencia;
    if(x && x.vacantes_con_dato >= MIN_DATOS){
      const md = Number(x.mediana_anios);
      out.push(['Experiencia que piden', md === 0 ? 'La mayoría acepta sin experiencia' : (md === 1 ? '1 año' : String(md).replace('.5', ' y medio') + ' años') + ' de mediana', x.distribucion.map(d => d.rango + ' ' + pc(d.pct)).join(' · ') + ' (de ' + num(x.vacantes_con_dato) + ' que lo dicen).']);
    }
    const idi = (m.idiomas || []).filter(i => i.pct >= 1);
    if(idi.length){
      const en = idi.find(i => i.idioma === 'Inglés');
      const nv = en && en.niveles ? Object.entries({avanzado: 'avanzado', intermedio: 'intermedio', basico: 'básico'}).map(([k, t]) => [t, en.niveles[k] || 0]).filter(z => z[1]).sort((a, b) => b[1] - a[1]) : [];
      out.push(['Idiomas', idi.map(i => i.idioma + ' ' + pc(i.pct)).join(' · '), nv.length ? 'En inglés el nivel más pedido es ' + nv[0][0] + '.' : '']);
    } else out.push(['Idiomas', 'Casi ninguna vacante pide otro idioma']);
    const car = (m.carreras || []).filter(c => c.pct >= 2).slice(0, 3);
    if(car.length) out.push(['Carreras que mencionan', car.map(c => c.carrera + ' ' + pc(c.pct)).join(' · ')]);
    const hab = (m.habilidades_tecnicas || []).filter(h => h.pct >= 3).slice(0, 4);
    if(hab.length) out.push(['Temas que más aparecen en las descripciones', hab.map(h => h.skill + ' ' + pc(h.pct)).join(' · ')]);
    if((m.estados || []).length) out.push(['Dónde hay más', m.estados.slice(0, 3).map(z => z.estado).join(', ')]);
    return out;
  }

  function sectores(d){
    const orden = [], por = {};
    d.fichas.forEach(f => { if(!por[f.sector]){ por[f.sector] = []; orden.push(f.sector); } por[f.sector].push(f); });
    return orden.map(s => [s, por[s]]);
  }

  window.FICHAS_PUESTOS = {cargar, aVacante, legal, resumen, sectores, mes, URL: URL_DATOS};
})();
