#!/usr/bin/env python3
"""Fichas de puesto para Selección Justa y para la página de fichas.

Junta tres capas por puesto y escribe data/fichas_puestos.json:

  1. Panel (herramientas/fichas/panel.json): lo que contestó el panel de
     expertos en el Excel "Fichas Técnicas 7 Sectores" — descripción,
     habilidades, certificación obligatoria y recomendada.
  2. Conocimiento (herramientas/fichas/conocimiento_*.py): patrón para
     reconocer el puesto en los títulos, escolaridad y experiencia que se
     suelen pedir, competencias con rúbrica, qué método mide cada una y guías
     de prueba, muestra y entrevista. Lo escribió Claude; la empresa lo ajusta.
  3. Mercado (la corrida): de las vacantes del acervo cuyo título coincide con
     el patrón — cuántas hay, salario, escolaridad, idiomas, carreras, años de
     experiencia, habilidades más mencionadas, estados y títulos de ejemplo.

Uso:
  python3 herramientas/fichas_puestos.py --acervo DIR_SALIDA_ACERVO --fecha 2026-11-12 \
      [--out data/fichas_puestos.json]

DIR_SALIDA_ACERVO es la carpeta con una subcarpeta por sector y dentro
acervo_<sector>.csv (verificadas + pendientes de la Etapa 2), la misma que usa
etapa4_sector_json.py --acervo. Se juntan todos los sectores y se quitan
repetidas por id: un puesto como Agente Aduanal sale en Legal y en Logística.
"""
import argparse, json, re, statistics, sys
from collections import Counter
from pathlib import Path

import warnings
import pandas as pd
warnings.filterwarnings("ignore", message="This pattern is interpreted as a regular expression")

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from etapa4_sector_json import (norm, contar_idiomas, contar_carreras,  # noqa: E402
                                contar_menciones, detectar_estado, salario_mensual, NIVELES_EDU, NIVEL_SIN_DATO)

METODOS = {'p': 'prueba', 'm': 'muestra', 'e': 'entrevista'}
PESOS_METODO = {'cv': 20, 'prueba': 25, 'muestra': 30, 'entrevista': 25}
SAL_MIN, SAL_MAX = 3000, 400000          # MXN al mes; fuera de esto se ignora
MIN_SALARIOS = 5                          # menos datos que esto: no se publica el salario
POCOS_DATOS = 20                          # menos vacantes que esto: se avisa

RE_EXP = [
    re.compile(r'(\d{1,2})\s*(?:\+|o mas|a\s*\d{1,2}|-\s*\d{1,2})?\s*anos?\s+(?:de\s+|minimo\s+de\s+)?experiencia'),
    re.compile(r'experiencia\s+(?:minima\s+|comprobable\s+|laboral\s+|previa\s+)*(?:de\s+|en\s+\w+\s+de\s+)?(\d{1,2})\s*(?:\+|a\s*\d{1,2})?\s*anos?'),
    re.compile(r'(\d{1,2})\+?\s*years?\s+(?:of\s+)?experience'),
]
RE_EDAD = re.compile(r'mayor(es)? de|edad|entre \d|rango|de \d{2} a$|\d{2} a \d{2}|years? old')
RE_SIN_EXP = re.compile(r'sin experiencia|no (?:se )?requiere experiencia|no necesitas experiencia|no es necesaria experiencia')


def cargar_conocimiento():
    k = {}
    for f in sorted((AQUI / 'fichas').glob('conocimiento_*.py')):
        ns = {}
        exec(compile(f.read_text(encoding='utf-8'), str(f), 'exec'), ns)
        dup = set(k) & set(ns['FICHAS'])
        if dup: raise SystemExit(f'Fichas repetidas en {f.name}: {dup}')
        k.update(ns['FICHAS'])
    for id_, d in k.items():
        if 'igual' in d:
            base = dict(k[d['igual']]); base.update({x: y for x, y in d.items() if x != 'igual'}); k[id_] = base
    return k


def validar(id_, d):
    errs = []
    comps = d.get('comps') or []
    if not 4 <= len(comps) <= 6: errs.append(f'{len(comps)} competencias (deben ser 4 a 6)')
    if sum(c[1] for c in comps) != 100: errs.append(f'pesos suman {sum(c[1] for c in comps)}')
    for c in comps:
        if len(c) != 6 or not all(isinstance(x, str) and x.strip() for x in (c[0], c[3], c[4], c[5])): errs.append(f'competencia incompleta: {c[0]}')
        if not c[2] or set(c[2]) - set(METODOS): errs.append(f'métodos inválidos en {c[0]}: {c[2]!r}')
    for m in ('prueba', 'muestra', 'entrevista', 'patron', 'escolaridad', 'experiencia'):
        if not d.get(m): errs.append(f'falta {m}')
    try: re.compile(d.get('patron', '')); re.compile(d.get('excluir', '') or 'x')
    except re.error as e: errs.append(f'patrón inválido: {e}')
    if errs: raise SystemExit(f'{id_}: ' + '; '.join(errs))


def leer_acervo(carpeta):
    fs = sorted(Path(carpeta).glob('*/acervo_*.csv'))
    if not fs: raise SystemExit(f'No hay acervo_*.csv en {carpeta}')
    df = pd.concat([pd.read_csv(f, dtype=str) for f in fs], ignore_index=True)
    df = df.drop_duplicates(subset=['id_interno']).reset_index(drop=True)
    df['fuente'] = df['fuente'].str.strip().str.lower().map({'adzuna': 'Adzuna', 'occ': 'OCC', 'indeed': 'Indeed'}).fillna(df['fuente'])
    if 'descripcion' not in df.columns: df['descripcion'] = ''
    df['_tit'] = df['titulo_puesto'].fillna('').map(norm)
    df['_desc'] = df['descripcion'].fillna('').map(norm)
    df['_con_desc'] = df['_desc'].str.len().ge(40)
    df['_texto_largo'] = df['_tit'] + ' \n ' + df['_desc']
    df['_sal'] = df.apply(salario_mensual, axis=1)
    return df, [f.parent.name for f in fs]


# Como nivel_educativo de la Etapa 4, pero sin contar "ingeniería" suelta: en
# las descripciones aparece en la presentación de la empresa ("líder mundial en
# gases industriales e ingeniería") y hacía parecer que a un chofer le piden
# licenciatura. Aquí cuenta solo "ingeniería en…", "ingeniero industrial", etc.
_ING = r"\bingenier(?:ia|o|a|os|as)\s+(?:en\b|industrial|mecanic|civil|quimic|electr|ambiental|de sistemas|logistic|automotriz|mecatronic|agronom|biomedic)"
_RE_NIVELES_FICHA = [(k, re.compile("|".join([_ING] + [x for x in v if "ingenier" not in x] if k == "licenciatura" else v))) for k, _, v in NIVELES_EDU]
def nivel_ficha(t):
    for clave, rx in _RE_NIVELES_FICHA:
        if rx.search(t): return clave
    return NIVEL_SIN_DATO[0]


def anios_experiencia(t):
    if RE_SIN_EXP.search(t): return 0
    for rx in RE_EXP:
        for m in rx.finditer(t):
            # "mayor de 18 años, experiencia en…" es la edad, no la experiencia
            if RE_EDAD.search(t[max(0, m.start() - 25): m.start() + 4]): continue
            n = int(m.group(1))
            if 0 < n <= 15: return n
    return None


def pct(a, b): return round(100 * a / b, 1) if b else 0.0


def mercado(g, habs):
    n = len(g)
    out = {'vacantes': int(n), 'pocos_datos': bool(n < POCOS_DATOS)}
    if not n: return out
    # Una empresa que publica la misma vacante en 30 ciudades pesaría 30 veces:
    # para lo que sale del texto, cada descripción distinta cuenta una vez.
    gd = g[g['_con_desc']]
    gd = gd[~gd['_desc'].str[:300].duplicated()]
    nd = len(gd)
    out['descripciones_distintas'] = int(nd)
    sal = g['_sal'].dropna(); sal = sal[(sal >= SAL_MIN) & (sal <= SAL_MAX)]
    out['salario'] = {'vacantes_con_dato': int(len(sal)), 'p25': int(sal.quantile(.25)), 'mediana': int(sal.median()), 'p75': int(sal.quantile(.75))} \
        if len(sal) >= MIN_SALARIOS else {'vacantes_con_dato': int(len(sal))}
    if nd:
        cuenta = Counter(gd['_texto_largo'].map(nivel_ficha))
        nombres = {k: v for k, v, _ in NIVELES_EDU}
        con = nd - cuenta.get(NIVEL_SIN_DATO[0], 0)
        out['escolaridad'] = {'lo_especifican': int(con), 'pct_lo_especifican': pct(con, nd),
                              'niveles': [{'clave': k, 'nivel': nombres[k], 'vacantes': int(cuenta[k]), 'pct_de_las_que_especifican': pct(cuenta[k], con)}
                                          for k, _, _ in NIVELES_EDU if cuenta.get(k)]}
        idi = contar_idiomas(gd['_texto_largo'])
        out['idiomas'] = [dict(x, pct=pct(x['menciones'], nd)) for x in idi[:4]]
        out['carreras'] = [dict(x, pct=pct(x['menciones'], nd)) for x in contar_carreras(gd['_texto_largo'])[:5]]
        anios = [int(a) for a in gd['_texto_largo'].map(anios_experiencia) if pd.notna(a)]
        if anios:
            dist = Counter('Sin experiencia' if a == 0 else '1 a 2 años' if a <= 2 else '3 a 4 años' if a <= 4 else '5 años o más' for a in anios)
            out['experiencia'] = {'vacantes_con_dato': len(anios), 'pct_con_dato': pct(len(anios), nd),
                                  'mediana_anios': statistics.median(anios),
                                  'distribucion': [{'rango': r, 'vacantes': dist[r], 'pct': pct(dist[r], len(anios))}
                                                   for r in ('Sin experiencia', '1 a 2 años', '3 a 4 años', '5 años o más') if dist[r]]}
    # Solo en la descripción, no en el título: el título ya dice el puesto y
    # contarlo inflaría la habilidad que le da nombre. Las blandas del
    # diccionario se infieren del título, así que aquí no se usan: las da el panel.
    if habs and nd:
        out['habilidades_tecnicas'] = [dict(x, pct=pct(x['menciones'], nd)) for x in contar_menciones(gd['_desc'], habs['tecnicas'])[:6]]
    est = g['ubicacion'].map(detectar_estado).dropna().value_counts()
    out['estados'] = [{'estado': e, 'vacantes': int(v)} for e, v in est.head(5).items()]
    tit = g['titulo_puesto'].fillna('').str.strip()
    vistos, ej = set(), []
    for t, _ in tit.value_counts().items():
        k = norm(t)
        if k and k not in vistos: vistos.add(k); ej.append(t)
        if len(ej) == 5: break
    out['titulos_ejemplo'] = ej
    return out


MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
def fecha_legible(f):
    a, m, d = (int(x) for x in f.split('-'))
    return f'{d} de {MESES[m - 1]} de {a}'


def armar(panel, k, df, sectores, fecha):
    habs_por_sector = {}
    for s in {p['sector_clave'] for p in panel}:
        f = AQUI / f'habilidades_{s}.json'
        habs_por_sector[s] = json.loads(f.read_text()) if f.exists() else None
    fichas = []
    for p in panel:
        d = k.get(p['id'])
        if not d: raise SystemExit(f'Falta el conocimiento de {p["id"]}')
        validar(p['id'], d)
        m = df['_tit'].str.contains(d['patron'], regex=True)
        if d.get('excluir'): m &= ~df['_tit'].str.contains(d['excluir'], regex=True)
        g = df[m]
        comps = [{'nombre': c[0], 'peso': c[1], 'metodos': ['cv'] + [METODOS[x] for x in c[2]], 'n1': c[3], 'n3': c[4], 'n5': c[5]} for c in d['comps']]
        fichas.append({
            'id': p['id'], 'sector': p['sector'], 'sector_clave': p['sector_clave'], 'puesto': p['puesto'],
            'panel': {x: p[x] for x in ('origen', 'descripcion', 'habilidades_tecnicas', 'habilidades_blandas', 'cert_obligatoria', 'cert_recomendada')},
            'suele_pedir': {'escolaridad': d['escolaridad'], 'experiencia': d['experiencia']},
            'competencias': comps,
            'metodos': {'pesos': dict(PESOS_METODO, **d.get('pesos', {})), 'prueba': d['prueba'], 'muestra': d['muestra'], 'entrevista': d['entrevista']},
            'mercado': mercado(g, habs_por_sector[p['sector_clave']]),
        })
    return {
        'version': 1, 'corrida': fecha,
        'fuentes': {
            'panel': 'Cuestionario a personas expertas de cada industria (Excel "Fichas Técnicas 7 Sectores"). Opinión de expertos, no norma oficial.',
            'conocimiento': 'Competencias, rúbrica, guías y lo que se suele pedir: propuesta de Claude a partir del panel y del mercado mexicano. Punto de partida para que la empresa lo ajuste.',
            'mercado': f'Vacantes del acervo de la corrida del {fecha_legible(fecha)} (todas las vigentes en Adzuna para los términos de {len(sectores)} sectores, verificadas y pendientes de la Etapa 2) cuyo título coincide con el puesto. '
                       'Escolaridad, idiomas y experiencia se cuentan una vez por descripción distinta; la de Adzuna son los primeros ~500 caracteres, así que son un piso.',
        },
        'base_vacantes': int(len(df)),
        'fichas': fichas,
    }


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--acervo', required=True)
    a.add_argument('--fecha', required=True)
    a.add_argument('--out', default=str(AQUI.parent / 'data' / 'fichas_puestos.json'))
    a = a.parse_args()
    panel = json.loads((AQUI / 'fichas' / 'panel.json').read_text(encoding='utf-8'))
    k = cargar_conocimiento()
    sobran = set(k) - {p['id'] for p in panel}
    if sobran: raise SystemExit(f'Conocimiento sin puesto en el panel: {sobran}')
    df, sectores = leer_acervo(a.acervo)
    res = armar(panel, k, df, sectores, a.fecha)
    Path(a.out).write_text(json.dumps(res, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for f in res['fichas']:
        m = f['mercado']
        print(f"{f['sector'][:12]:12} {f['puesto'][:44]:44} {m['vacantes']:6} vac  sal {m.get('salario', {}).get('mediana', '—')}")
    print(f"{len(res['fichas'])} fichas · base {res['base_vacantes']} vacantes → {a.out}")


if __name__ == '__main__':
    main()
