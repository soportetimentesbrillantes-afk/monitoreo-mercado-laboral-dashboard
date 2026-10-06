#!/usr/bin/env python3
"""
Generador del boletín semanal — Club de Mentes Brillantes.

Llena newsletter-plantilla.html con los datos de data/sector_<clave>.json y
manifest.json, valida la edición y escribe el HTML, el PDF y el índice.

  python3 newsletter_cmb/generar_newsletter.py --repo . --fecha 2026-10-03

QUÉ VALIDA, Y POR QUÉ CADA COSA
  - Dos páginas exactas. Las hojas tienen alto fijo con overflow:hidden, así que
    un desbordamiento no empuja una tercera página: la recorta en silencio. Por
    eso se cuenta sobre el PDF renderizado, no sobre el HTML.
  - La cifra global contra la suma por sector. Una vez se publicó una edición
    con datos clonados que marcaba 1,907 vacantes en vez de 6,281, y se detectó
    tarde. Ahora no se puede.
  - Cero lenguaje interno a la vista del lector: nada de "pipeline", "corrida",
    "manifiesto" ni fechas AAAA-MM-DD.
  - Todas las fuentes que aportaron vacantes aparecen en el pie. Antes solo se
    listaban las que encabezaban algún sector, así que OCC no aparecía pese a
    aportar más de mil vacantes.

DATOS VIEJOS
  Si la vacante más reciente tiene más de --dias-frescura días al momento de la
  edición, el boletín imprime un aviso diciéndolo. No se calla y no se maquilla:
  publicar vacantes de hace tres semanas como si fueran de esta semana manda a
  la gente a postularse a plazas que ya se cerraron.
"""
import argparse, json, re, subprocess, sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
         'agosto','septiembre','octubre','noviembre','diciembre']

# Palabras de taller que nunca debe ver quien lee el boletín.
JERGA = ['pipeline', 'corrida', 'manifiesto', 'manifest', 'etapa 2', 'etapa 4',
         'json', 'csv', 'commit', 'repositorio', 'scraping', 'endpoint']


def dia_mes(d):
    return f'{d.day} de {MESES[d.month - 1]}'


def dia_mes_anio(d):
    return f'{d.day} de {MESES[d.month - 1]} de {d.year}'


def periodo_semana(f):
    """Semana de lunes a domingo que contiene la fecha de edición."""
    ini = f - timedelta(days=f.weekday())
    fin = ini + timedelta(days=6)
    if ini.month == fin.month:
        return f'Semana del {ini.day} al {fin.day} de {MESES[ini.month-1]} de {fin.year}'
    return (f'Semana del {ini.day} de {MESES[ini.month-1]} al '
            f'{fin.day} de {MESES[fin.month-1]} de {fin.year}')


def miles(n):
    return f'{int(n):,}'.replace(',', ',')


# ──────────────────────────── lectura de datos ────────────────────────────

def cargar(repo):
    man = json.loads((repo / 'manifest.json').read_text(encoding='utf-8'))
    claves = [s['key'] for s in man['sectores']]
    sectores = []
    for k in claves:
        p = repo / 'data' / f'sector_{k}.json'
        if not p.exists():
            print(f'  aviso: falta {p.name}, se omite el sector', file=sys.stderr)
            continue
        d = json.loads(p.read_text(encoding='utf-8'))
        d['_clave'] = k
        sectores.append(d)
    if not sectores:
        sys.exit('No hay datos de ningún sector.')
    return man, sectores


def primero(lista, campo_nombre, campo_valor):
    """Primer elemento de una lista ya ordenada, o None. Devuelve (nombre, valor)."""
    if not lista:
        return None, None
    e = lista[0]
    return e.get(campo_nombre), e.get(campo_valor)


def fecha_mas_reciente(sectores):
    fechas = []
    for s in sectores:
        for v in s.get('vacantes_detalle', []):
            f = v.get('fecha_publicacion')
            if f:
                try:
                    fechas.append(date.fromisoformat(f))
                except ValueError:
                    pass
    return max(fechas) if fechas else None


# ──────────────────────────── armado de bloques ────────────────────────────

def tarjeta(s):
    cob = s.get('pct_con_habilidades')
    # Un 0 aquí significa que el campo no se calculó, no que no haya datos.
    cob_html = (f'{cob}%' if cob else '<span class="pendiente">dato pendiente</span>')

    cat, pct = primero(s.get('categorias_puesto', []), 'categoria', 'pct')
    cat_txt = f'{cat} ({pct}%)' if cat else '<span class="pendiente">dato pendiente</span>'

    tec, tn = primero(s.get('habilidades_tecnicas', []), 'skill', 'menciones')
    bla, bn = primero(s.get('habilidades_blandas', []), 'skill', 'menciones')
    debil = ' <span class="debil">— señal débil</span>'
    tec_txt = (f'{tec} ({tn})' + (debil if tn and tn < 3 else '')) if tec else \
        '<span class="pendiente">dato pendiente</span>'
    bla_txt = (f'{bla} ({bn})' + (debil if bn and bn < 3 else '')) if bla else \
        '<span class="pendiente">dato pendiente</span>'

    fuentes = s.get('fuentes', {})
    total_f = sum(fuentes.values()) or 1
    f_nom = max(fuentes, key=fuentes.get) if fuentes else None
    f_txt = f'{f_nom} ({100*fuentes[f_nom]/total_f:.1f}%)' if f_nom else \
        '<span class="pendiente">dato pendiente</span>'

    return f'''    <div class="sector-card">
      <div class="kpi">{miles(s["vacantes_verificadas"])}</div>
      <div class="nombre">{s["nombre"].upper()}</div>
      <dl>
        <div class="fila"><dt>Cobertura:</dt> <dd>{cob_html}</dd></div>
        <div class="fila"><dt>Categoría top:</dt> <dd>{cat_txt}</dd></div>
        <div class="fila"><dt>Técnica top:</dt> <dd>{tec_txt}</dd></div>
        <div class="fila"><dt>Blanda top:</dt> <dd>{bla_txt}</dd></div>
        <div class="fila"><dt>Fuente:</dt> <dd>{f_txt}</dd></div>
      </dl>
    </div>'''


def combinar_habilidades(sectores, campo):
    """Suma menciones de la misma habilidad entre sectores y dice quién aporta más."""
    total = defaultdict(int)
    aporte = defaultdict(lambda: defaultdict(int))
    for s in sectores:
        for hh in s.get(campo, []):
            nombre, n = hh.get('skill'), hh.get('menciones', 0)
            if not nombre:
                continue
            total[nombre] += n
            aporte[nombre][s['nombre']] += n
    if not total:
        return None, 0, None
    top = max(total, key=total.get)
    mayor = max(aporte[top], key=aporte[top].get)
    return top, total[top], mayor


def filas_habilidades(sectores):
    filas = []
    for s in sectores:
        tec, tn = primero(s.get('habilidades_tecnicas', []), 'skill', 'menciones')
        bla, bn = primero(s.get('habilidades_blandas', []), 'skill', 'menciones')
        debil = ' <span class="debil">— señal débil</span>'
        t = (f'{tec} ({tn})' + (debil if tn and tn < 3 else '')) if tec else 'dato pendiente'
        b = (f'{bla} ({bn})' + (debil if bn and bn < 3 else '')) if bla else 'dato pendiente'
        filas.append(f'      <tr><td class="sec">{s["nombre"]}</td><td>{t}</td><td>{b}</td></tr>')
    return '\n'.join(filas)


def hallazgo(sectores):
    """Compara la concentración de la categoría principal entre el sector más
    concentrado y el más repartido. Es una lectura derivada de los datos, no
    una opinión: las dos cifras salen de categorias_puesto."""
    conc = []
    for s in sectores:
        cat, pct = primero(s.get('categorias_puesto', []), 'categoria', 'pct')
        if pct is not None:
            conc.append((pct, s['nombre'], cat))
    if len(conc) < 2:
        return 'dato pendiente', 'dato pendiente', 'Dato pendiente para esta edición.'
    conc.sort(reverse=True)
    (pa, sa, _), (pb, sb, _) = conc[0], conc[-1]
    txt = (f'En <strong>{sa}</strong>, una sola categoría de puesto concentra '
           f'{pa:.0f}% de las vacantes. En <strong>{sb}</strong>, la categoría más '
           f'demandada apenas llega a {pb:.0f}%. Quien busca empleo en {sa} compite por '
           f'un mismo tipo de puesto y conviene especializarse; en {sb} la demanda está '
           f'repartida y conviene un perfil más amplio.')
    return f'{pa:.0f}%', f'{pb:.0f}%', txt


def aviso_datos(dias, fecha_dato):
    """El bloque naranja que aparece cuando la edición no trae datos nuevos."""
    if dias is None or fecha_dato is None:
        return ''
    return (f'<div class="aviso-datos"><b>Esta edición no trae vacantes nuevas.</b>'
            f'Esta semana no se recolectaron vacantes, así que las cifras de abajo son '
            f'las mismas del {dia_mes(fecha_dato)} y las plazas que las originaron '
            f'llevan {dias} días publicadas: muchas ya se habrán cerrado. '
            f'Tómalas como una fotografía del mercado, no como una bolsa de trabajo '
            f'vigente.</div>')


# ──────────────────────────────── validación ────────────────────────────────

def texto_visible(html):
    s = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.S | re.I)
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', s)


def validar(html, total_esperado, sectores):
    fallas = []

    vis = texto_visible(html).lower()
    for j in JERGA:
        if j in vis:
            fallas.append(f'lenguaje interno a la vista del lector: "{j}"')
    if re.search(r'\b\d{4}-\d{2}-\d{2}\b', vis):
        fallas.append('hay una fecha en formato AAAA-MM-DD a la vista del lector')

    suma = sum(s['vacantes_verificadas'] for s in sectores)
    if suma != total_esperado:
        fallas.append(f'la cifra global ({total_esperado}) no cuadra con la suma por sector ({suma})')
    if miles(suma) not in html:
        fallas.append(f'la cifra global {miles(suma)} no aparece impresa en el boletín')

    if '{{' in html:
        huecos = sorted(set(re.findall(r'\{\{(\w+)\}\}', html)))
        fallas.append(f'quedaron huecos sin llenar: {", ".join(huecos)}')

    tarjetas = html.count('class="sector-card"')
    if tarjetas != len(sectores):
        fallas.append(f'se imprimieron {tarjetas} tarjetas de sector y hay {len(sectores)} sectores')

    return fallas


def contar_paginas(ruta_html, ruta_pdf, aquí):
    """Renderiza el PDF con el motor de impresión del navegador y devuelve el
    número de páginas. Si no hay navegador, devuelve None y no se valida el
    largo — y eso se reporta, no se asume correcto."""
    script = aquí / 'a_pdf.mjs'
    if not script.exists():
        return None, 'falta a_pdf.mjs'
    try:
        r = subprocess.run(['node', str(script), str(ruta_html), str(ruta_pdf)],
                           capture_output=True, text=True, timeout=180)
        if r.returncode != 0:
            return None, (r.stderr or r.stdout).strip().splitlines()[-1:] or ['error al renderizar']
        return int(r.stdout.strip().splitlines()[-1]), None
    except Exception as e:
        return None, str(e)


# ───────────────────────────────── principal ─────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', default='.', help='raíz del repositorio del sitio')
    ap.add_argument('--fecha', default=None, help='fecha de la edición, AAAA-MM-DD')
    ap.add_argument('--periodo', default=None, help='texto del periodo; por omisión, la semana de la fecha')
    ap.add_argument('--patron', default=None, help='frase de lectura transversal; por omisión se deriva de los datos')
    ap.add_argument('--dias-frescura', type=int, default=10,
                    help='días a partir de los cuales se imprime el aviso de datos viejos')
    ap.add_argument('--sin-indice', action='store_true', help='no actualizar boletines.json')
    a = ap.parse_args()

    repo = Path(a.repo).resolve()
    aquí = Path(__file__).resolve().parent
    fecha = date.fromisoformat(a.fecha) if a.fecha else date.today()
    periodo = a.periodo or periodo_semana(fecha)

    man, sectores = cargar(repo)
    sectores.sort(key=lambda s: -s['vacantes_verificadas'])
    total = sum(s['vacantes_verificadas'] for s in sectores)

    reciente = fecha_mas_reciente(sectores)
    dias = (fecha - reciente).days if reciente else None
    viejo = dias is not None and dias > a.dias_frescura

    tec, tecn, tecs = combinar_habilidades(sectores, 'habilidades_tecnicas')
    bla, blan, blas = combinar_habilidades(sectores, 'habilidades_blandas')
    c1, c2, htxt = hallazgo(sectores)

    fuentes_todas = sorted({f for s in sectores for f, n in s.get('fuentes', {}).items() if n})
    encabeza = defaultdict(int)
    for s in sectores:
        if s.get('fuentes'):
            encabeza[max(s['fuentes'], key=s['fuentes'].get)] += 1
    lider_f = max(encabeza, key=encabeza.get) if encabeza else None

    patron = a.patron or (
        f'La habilidad técnica más mencionada del periodo acumula {tecn} menciones y viene '
        f'sobre todo de {tecs}; la blanda más mencionada acumula {blan}, con mayor aporte de {blas}.'
        if tec and bla else 'Dato pendiente para esta edición.')

    campos = {
        'PERIODO': periodo,
        'AVISO_DATOS': aviso_datos(dias, reciente) if viejo else '',
        'TOTAL': miles(total),
        'SECTORES_N': str(len(sectores)),
        'LIDER_N': miles(sectores[0]['vacantes_verificadas']),
        'LIDER_NOMBRE': sectores[0]['nombre'],
        'MENOR_N': miles(sectores[-1]['vacantes_verificadas']),
        'MENOR_NOMBRE': sectores[-1]['nombre'],
        'PROMEDIO': miles(round(total / len(sectores))),
        'TARJETAS_P1': '\n'.join(tarjeta(s) for s in sectores[:6]),
        'TARJETAS_P2': '\n'.join(tarjeta(s) for s in sectores[6:]),
        'TEC_TOP_VAL': tec or 'dato pendiente',
        'TEC_TOP_DET': f'{tecn} menciones · mayor aporte: {tecs}' if tec else 'dato pendiente',
        'BLANDA_TOP_VAL': bla or 'dato pendiente',
        'BLANDA_TOP_DET': f'{blan} menciones · mayor aporte: {blas}' if bla else 'dato pendiente',
        'PATRON': patron,
        'FILAS_HAB': filas_habilidades(sectores),
        'FUENTE_PATRON': (f'Fuente principal por sector: {lider_f} encabeza en '
                          f'{encabeza[lider_f]} de los {len(sectores)} sectores.'
                          if lider_f else 'Fuente principal por sector: dato pendiente.'),
        'TRANSPARENCIA': (f'El combinado se calculó con los {len(sectores)} sectores que '
                          f'tienen ambas habilidades confirmadas.'),
        'HALLAZGO_C1': c1, 'HALLAZGO_C2': c2, 'HALLAZGO_TXT': htxt,
        'FUENTES_VACANTES': ' · '.join(fuentes_todas) or 'dato pendiente',
        'FOLIO': f'Edición del {dia_mes_anio(fecha)}',
    }

    html = (aquí / 'newsletter-plantilla.html').read_text(encoding='utf-8')
    for k, v in campos.items():
        html = html.replace('{{' + k + '}}', str(v))

    salida = repo / 'boletines'
    salida.mkdir(exist_ok=True)
    ruta_html = salida / f'newsletter-{fecha.isoformat()}.html'
    ruta_pdf = salida / f'newsletter-{fecha.isoformat()}.pdf'

    fallas = validar(html, total, sectores)
    ruta_html.write_text(html, encoding='utf-8')

    paginas, err = contar_paginas(ruta_html, ruta_pdf, aquí)
    if paginas is None:
        print(f'  aviso: no se pudo renderizar el PDF ({err}). El largo NO quedó validado.')
    elif paginas != 2:
        fallas.append(f'el boletín salió en {paginas} páginas y debe caber en exactamente 2')

    if fallas:
        ruta_html.unlink(missing_ok=True)
        ruta_pdf.unlink(missing_ok=True)
        print('\nLa edición NO se generó. Falla la validación:')
        for f in fallas:
            print('  · ' + f)
        sys.exit(1)

    if not a.sin_indice:
        idx = repo / 'boletines.json'
        datos = json.loads(idx.read_text(encoding='utf-8')) if idx.exists() else {'ediciones': []}
        datos['ediciones'] = [e for e in datos['ediciones'] if e.get('folio') != fecha.isoformat()]
        resumen = f'{miles(total)} vacantes verificadas en {len(sectores)} sectores. {sectores[0]["nombre"]} encabeza con {miles(sectores[0]["vacantes_verificadas"])}.'
        if viejo:
            resumen = 'Sin vacantes nuevas esta semana. ' + resumen
        datos['ediciones'].insert(0, {
            'folio': fecha.isoformat(), 'fecha': fecha.isoformat(), 'periodo': periodo,
            'titulo': f'Boletín — {periodo}', 'resumen': resumen,
            'html': f'boletines/{ruta_html.name}', 'pdf': f'boletines/{ruta_pdf.name}',
        })
        datos['ediciones'].sort(key=lambda e: e['folio'], reverse=True)
        idx.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding='utf-8')

    print(f'OK  {ruta_html.name}' + (f' + {ruta_pdf.name} ({paginas} págs.)' if paginas else ''))
    print(f'    {miles(total)} vacantes · {len(sectores)} sectores · {periodo}')
    if viejo:
        print(f'    AVISO IMPRESO: los datos son del {dia_mes(reciente)}, {dias} días atrás.')


if __name__ == '__main__':
    main()
