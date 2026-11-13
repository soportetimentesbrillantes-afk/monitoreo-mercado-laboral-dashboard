#!/usr/bin/env python3
"""
Etapa 4 — Generador del bloque sector_<key>.json con conteos EXACTOS (sin LLM).

Calcula todos los campos del esquema canónico (esquema_sector_sitio.md) por
pandas: fuentes, categorías (por diccionario de palabras clave), habilidades,
top empresas, cobertura geográfica, salario (percentiles reales, normalizados a
MXN mensual), evolución semanal, y la muestra vacantes_detalle con filtro de
recencia y muestreo proporcional por fuente.

Normalización salarial por fuente (ver a_mensual):
  - OCC:    la Etapa 1 anualiza (×12) los salarios, que el portal publica
            mensuales, para hacerlos comparables con Adzuna. Aquí se deshace
            esa conversión SIEMPRE, sin umbral.
  - Adzuna: publica en anual o mensual según la vacante; se divide entre 12
            solo por encima de UMBRAL_SALARIO_ANUAL.

Uso:
  python3 etapa4_sector_json.py \
      --verified vacantes_v1.csv [vacantes_v2.csv ...] \
      --sector Turismo --key turismo \
      --descartadas 58 \
      --categorias categorias_turismo.json \
      --habilidades habilidades_turismo.json \
      --out sector_turismo.json

categorias_*.json:  {"Alimentos y Bebidas": ["cocin", "chef", "mesero", ...], ...}
Idiomas y carreras (desde 2026-11-10): se buscan en el título y, si el CSV trae
la columna `descripcion` (Adzuna la manda en la misma respuesta de la API), en
la descripción. Los idiomas solo se reportan cuando hay descripciones: el
título casi nunca los menciona y un 0 sería engañoso; sin ellas, `idiomas` y
`carreras` salen null ("dato pendiente"). Los porcentajes son sobre
`vacantes_con_descripcion`, no sobre todas las verificadas.

Nivel educativo (desde 2026-11-10): se lee SOLO en la descripción (el título
no lo dice). Cada vacante con descripción queda en uno de seis niveles:
secundaria, bachillerato, técnico/TSU, licenciatura, posgrado o "no lo
especifica". Si la descripción menciona varios, cuenta el MÁS BAJO, porque es
el mínimo que se pide ("bachillerato, deseable licenciatura" = bachillerato).
Por nivel: vacantes, % sobre vacantes_con_descripcion, salario mediano (solo
con 5 o más salarios) e idiomas y carreras de ese nivel. Sin descripciones,
`nivel_educativo` sale null (dato pendiente).

habilidades_*.json: {"tecnicas": {"Ventas y prospección comercial": ["venta", ...]},
                     "blandas":  {"Liderazgo": ["lider", "lidera"], ...},
                     "por_categoria": {"Alimentos y Bebidas":
                        {"tecnicas": [...], "blandas": [...]}, ...}}
"""
import argparse, json, re, unicodedata
from datetime import date, timedelta
from pathlib import Path
import pandas as pd

MESES = {1:"Ene",2:"Feb",3:"Mar",4:"Abr",5:"May",6:"Jun",7:"Jul",8:"Ago",9:"Sep",10:"Oct",11:"Nov",12:"Dic"}
ESTADOS = ["Aguascalientes","Baja California Sur","Baja California","Campeche","Chiapas","Chihuahua",
    "Ciudad de México","CDMX","Coahuila","Colima","Durango","Estado de México","Guanajuato","Guerrero",
    "Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro",
    "Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz",
    "Yucatán","Zacatecas"]
RECENCIA_DIAS = {"Adzuna": 10, "Indeed": 15, "OCC": 20}
UMBRAL_SALARIO_ANUAL = 90000  # arriba de esto en Adzuna se asume anual → /12
# Fuentes cuyos salarios llegan SIEMPRE anualizados desde la Etapa 1, sin importar
# la magnitud. OCC publica mensual y la Etapa 1 multiplica por 12; aplicar aquí un
# umbral dejaría sin convertir las vacantes bajas (una beca de 6,000/mes llega como
# 72,000, por debajo de UMBRAL_SALARIO_ANUAL).
FUENTES_ANUALIZADAS = {"OCC"}

# Idiomas: regex sobre texto normalizado (minúsculas, sin acentos). "Bilingüe" en
# una vacante mexicana casi siempre es español-inglés: se cuenta como inglés.
IDIOMAS = {
    "Inglés": [r"\bingles\b", r"\benglish\b", r"\bbilingue\b", r"\bbilingual\b"],
    "Francés": [r"\bfrances\b", r"\bfrench\b"],
    "Alemán": [r"\baleman\b", r"\bgerman\b(?!y)"],
    "Portugués": [r"\bportugues\b", r"\bportuguese\b"],
    "Italiano": [r"\bitaliano\b", r"\bitalian\b"],
    "Japonés": [r"\bjapones\b", r"\bjapanese\b"],
    "Chino (mandarín)": [r"\bmandarin\b", r"\bchinese\b", r"\bidioma chino\b", r"\bchino mandarin\b"],
    "Coreano": [r"\bcoreano\b", r"\bkorean\b"],
}
NIVEL_INGLES = [("avanzado", r"avanzad|fluid|nativ|100 ?%|bilingue|bilingual|advanced|fluent|conversacional"),
                ("intermedio", r"intermedi|intermediate|b1|b2"),
                ("basico", r"basic|elemental")]
# Carreras: patrones específicos de formación (no del puesto a secas). "Contador"
# o "abogado" sí cuentan: son profesiones que exigen esa carrera.
_GRADO = r"(?:lic\w*\.?|licenciatura|licenciad[oa]|carrera|egresad[oa]s?|titulad[oa]s?|pasante|estudiante|estudios)\s+(?:en|de)\s+"
CARRERAS = {
    "Administración": [_GRADO + r"administracion", r"\badministracion de empresas\b", r"\blae\b"],
    "Contaduría": [r"\bcontador(?:a|es)?\b", r"\bcontaduria\b", _GRADO + r"contabilidad", r"\bc\.p\.\b"],
    "Finanzas y economía": [_GRADO + r"(?:finanzas|economia)", r"\beconomista\b", r"\bactuari"],
    "Derecho": [r"\babogad[oa]s?\b", _GRADO + r"derecho", r"\blicenciad[oa] en derecho\b"],
    "Mercadotecnia y comunicación": [r"\bmercadotecnia\b", _GRADO + r"(?:marketing|comunicacion|ciencias de la comunicacion|publicidad)"],
    "Recursos humanos y psicología": [_GRADO + r"(?:recursos humanos|relaciones industriales)", r"\bpsicolog"],
    "Ingeniería industrial": [r"\bingenier\w*\s+industrial", r"\bing\.?\s+industrial"],
    "Ingeniería mecánica": [r"\bingenier\w*\s+(?:en\s+)?mecanic", r"\bing\.?\s+mecanic"],
    "Ingeniería mecatrónica": [r"\bmecatronic"],
    "Ingeniería eléctrica y electrónica": [r"\bingenier\w*\s+(?:en\s+)?electr", r"\bing\.?\s+electr"],
    "Ingeniería química": [r"\bingenier\w*\s+(?:en\s+)?quimic", r"\bquimico farmac"],
    "Ingeniería automotriz": [r"\bingenier\w*\s+(?:en\s+)?automotri"],
    "Ingeniería civil y arquitectura": [r"\bingenier\w*\s+civil", r"\barquitect"],
    "Sistemas, software y TI": [r"\bingenier\w*\s+(?:en\s+)?(?:sistemas|software|computacion|informatica|tecnologias de la informacion)",
                                _GRADO + r"(?:informatica|sistemas|computacion|ciencias de la computacion)", r"\bciencias de la computacion\b"],
    "Logística y comercio internacional": [r"\bcomercio (?:internacional|exterior)\b", _GRADO + r"logistica", r"\bingenier\w*\s+(?:en\s+)?logistica"],
    "Turismo, hotelería y gastronomía": [r"\bgastronom", _GRADO + r"(?:turismo|hoteleria|administracion hotelera|administracion turistica)"],
    "Diseño": [r"\bdiseno grafico\b", _GRADO + r"diseno", r"\bdiseno industrial\b"],
    "Salud": [r"\benfermer", r"\bmedic[oa]s? (?:general|cirujan)", r"\bmedicina\b", r"\bnutriolog", r"\bquimico clinic"],
    "Carrera técnica": [r"\bcarrera tecnica\b", r"\bbachillerato tecnico\b", r"\btecnico (?:en|superior)\b", r"\btsu\b", r"\bconalep\b", r"\bcbtis\b"],
}
# Nivel educativo, de menor a mayor. Patrones sobre la descripción normalizada
# (minúsculas, sin acentos). "Bachillerato técnico" es media superior: cuenta
# como bachillerato. CONALEP y TSU se cuentan como técnico.
NIVELES_EDU = [
    ("secundaria", "Secundaria", [r"\bsecundaria\b"]),
    ("bachillerato", "Bachillerato o preparatoria",
        [r"\bbachillerato\b", r"\bpreparatoria\b", r"\bprepa\b", r"\bmedia superior\b",
         r"\bmedio superior\b", r"\bhigh school\b"]),
    ("tecnico", "Técnico o TSU",
        [r"\bcarrera tecnica\b", r"\btecnico superior\b", r"\btsu\b", r"\bnivel tecnico\b",
         r"\bestudios tecnicos\b", r"\bformacion tecnica\b", r"\bescolaridad:?\s+tecnic",
         r"\bconalep\b", r"\bcbtis\b", r"\bcecyt", r"\bprofesional tecnico\b", r"\btechnical degree\b"]),
    ("licenciatura", "Licenciatura o ingeniería",
        [r"\blicenciatura\b", r"\blicenciad[oa]s?\s+en\b", r"\bingenieria\b", r"\bingenier[oa]s?\b",
         r"\b(?:estudios|formacion|educacion|nivel)\s+(?:universitari|profesional|superior)",
         r"\buniversitari[oa]s?\b", r"\btitulo profesional\b", r"\bcedula profesional\b",
         r"\bpasante\b", r"\bcarrera\s+(?:profesional|universitaria|trunca|afin|terminada|concluida)\b",
         r"\bbachelor", r"\bdegree in\b", r"\bcollege degree\b", r"\buniversity degree\b"]),
    ("posgrado", "Posgrado", [r"\bmaestria\b", r"\bdoctorado\b", r"\bposgrado\b", r"\bpostgrado\b",
                              r"\bmaster'?s? degree\b", r"\bmba\b", r"\bphd\b"]),
]
NIVEL_SIN_DATO = ("no_especifica", "No lo especifica")
_RE_NIVELES = [(k, re.compile("|".join(v))) for k, _, v in NIVELES_EDU]
MIN_SALARIOS_NIVEL = 5

def nivel_educativo(desc):
    """Clave del nivel más bajo que menciona la descripción, o 'no_especifica'."""
    for clave, rx in _RE_NIVELES:
        if rx.search(desc): return clave
    return NIVEL_SIN_DATO[0]

_RE_IDIOMAS = {k: re.compile("|".join(v)) for k, v in IDIOMAS.items()}
_RE_CARRERAS = {k: re.compile("|".join(v)) for k, v in CARRERAS.items()}

def contar_idiomas(textos):
    """Menciones por idioma (una por vacante) y, para inglés, el nivel pedido
    cuando aparece cerca de la palabra (40 caracteres alrededor)."""
    out = []
    for idioma, rx in _RE_IDIOMAS.items():
        n, niveles = 0, {"avanzado": 0, "intermedio": 0, "basico": 0, "sin_nivel": 0}
        for t in textos:
            m = rx.search(t)
            if not m: continue
            n += 1
            if idioma == "Inglés":
                ventana = t[max(0, m.start() - 40): m.end() + 40]
                nivel = next((k for k, r in NIVEL_INGLES if re.search(r, ventana)), "sin_nivel")
                niveles[nivel] += 1
        if n:
            fila = {"idioma": idioma, "menciones": n}
            if idioma == "Inglés": fila["niveles"] = niveles
            out.append(fila)
    return sorted(out, key=lambda x: -x["menciones"])

def contar_carreras(textos):
    out = [{"carrera": c, "menciones": sum(1 for t in textos if rx.search(t))} for c, rx in _RE_CARRERAS.items()]
    return sorted([x for x in out if x["menciones"]], key=lambda x: -x["menciones"])

def norm(s):
    if not isinstance(s, str): return ""
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(c for c in s if not unicodedata.combining(c))

LEGAL_SUFFIX_RE = re.compile(
    r"[,.]?\s*(s\.?a\.?p?\.?i?\.?(\s*de\s*c\.?v\.?)?|s\.?\s*de\s*r\.?l\.?(\s*de\s*c\.?v\.?)?|"
    r"s\.?c\.?|a\.?c\.?|inc\.?|llc|ltd\.?|corp\.?|de\s*c\.?v\.?)\s*$")

def norm_empresa(s):
    s = norm(s)
    s = re.sub(r"[^\w\s]", " ", LEGAL_SUFFIX_RE.sub("", LEGAL_SUFFIX_RE.sub("", s)))
    return re.sub(r"\s+", " ", s).strip()

def detectar_estado(ubicacion):
    u = norm(ubicacion)
    for e in ESTADOS:
        if norm(e) in u:
            return "Ciudad de México" if e == "CDMX" else e
    if re.search(r",\s*(jal|qroo|n\.?\s?l|edo\.?\s?mex|cdmx)\.?$", u):
        m = {"jal":"Jalisco","qroo":"Quintana Roo","n l":"Nuevo León","nl":"Nuevo León",
             "edo mex":"Estado de México","cdmx":"Ciudad de México"}
        for k, v in m.items():
            if u.rstrip(".").endswith(k): return v
    return None

def clasificar(titulo, dicc):
    t = norm(titulo)
    for cat, kws in dicc.items():
        if any(norm(k) in t for k in kws):
            return cat
    return "Otro"

def contar_menciones(textos, dicc):
    out = []
    for skill, kws in dicc.items():
        n = sum(1 for t in textos if any(norm(k) in t for k in kws))
        if n > 0: out.append({"skill": skill, "menciones": n})
    return sorted(out, key=lambda x: -x["menciones"])

def a_mensual(v, fuente):
    """Normaliza un salario a MXN mensual según su fuente. Devuelve v sin tocar
    si no hay regla para esa fuente."""
    if pd.isna(v) or v <= 0:
        return v
    if fuente in FUENTES_ANUALIZADAS:
        return v / 12
    if fuente == "Adzuna" and v > UMBRAL_SALARIO_ANUAL:
        return v / 12
    return v

def salario_mensual(row):
    vals = [pd.to_numeric(row.get(c), errors="coerce") for c in ("salario_min", "salario_max")]
    vals = [v for v in vals if pd.notna(v) and v > 0]
    if not vals: return None
    # Para OCC la conversión es lineal e incondicional, así que dividir el promedio
    # equivale a promediar los valores ya divididos.
    return a_mensual(sum(vals) / len(vals), row.get("fuente"))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verified", nargs="+", required=True)
    ap.add_argument("--sector", required=True); ap.add_argument("--key", required=True)
    ap.add_argument("--descartadas", type=int, default=0)
    ap.add_argument("--categorias", required=True); ap.add_argument("--habilidades", required=True)
    ap.add_argument("--hoy", default=None, help="YYYY-MM-DD (default: hoy)")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    hoy = date.fromisoformat(a.hoy) if a.hoy else date.today()

    df = pd.concat([pd.read_csv(f, dtype=str) for f in a.verified], ignore_index=True)
    # normalizar etiqueta de fuente (adzuna/occ/indeed -> Adzuna/OCC/Indeed)
    df["fuente"] = df["fuente"].str.strip().str.lower().map(
        {"adzuna": "Adzuna", "occ": "OCC", "indeed": "Indeed"}).fillna(df["fuente"])
    # deduplicar por hash SOLO entre hashes reales (ignora vacíos/placeholder tipo "New")
    hash_valido = df["hash_contenido"].notna() & (df["hash_contenido"].str.len() >= 16)
    dup = hash_valido & df["hash_contenido"].duplicated(keep="first") & \
          df["hash_contenido"].where(hash_valido).duplicated(keep="first")
    df = df[~dup].reset_index(drop=True)
    cats = json.loads(Path(a.categorias).read_text())
    habs = json.loads(Path(a.habilidades).read_text())
    n = len(df)

    df["_fecha"] = pd.to_datetime(df["fecha_publicacion"], errors="coerce",
                                  format="mixed", utc=True).dt.tz_localize(None).dt.normalize()
    df["_estado"] = df["ubicacion"].map(detectar_estado)
    df["_cat"] = df["titulo_puesto"].map(lambda t: clasificar(t, cats))
    df["_texto"] = (df["titulo_puesto"].fillna("") + " " + df["habilidades_tecnicas"].fillna("")
                    + " " + df["habilidades_blandas"].fillna("")).map(norm)
    if "descripcion" not in df.columns: df["descripcion"] = ""
    df["_desc"] = df["descripcion"].fillna("").map(norm)
    df["_con_desc"] = df["_desc"].str.len().ge(40)
    df["_texto_largo"] = (df["titulo_puesto"].fillna("").map(norm) + " \n " + df["_desc"])
    df["_sal"] = df.apply(salario_mensual, axis=1)
    df["_hab_explicita"] = df["habilidades_tecnicas"].fillna("").str.strip().ne("") | \
                           df["habilidades_blandas"].fillna("").str.strip().ne("")

    # fuentes / categorías / habilidades / empresas / estados — todo exacto
    fuentes = df["fuente"].value_counts().to_dict()
    cat_counts = df["_cat"].value_counts()
    categorias = [{"categoria": c, "vacantes": int(v), "pct": round(100*v/n, 1)}
                  for c, v in cat_counts.items()]
    tecnicas = contar_menciones(df["_texto"], habs["tecnicas"])[:15]
    blandas = contar_menciones(df["_texto"], habs["blandas"])[:15]
    df["_emp"] = df["empresa"].map(norm_empresa)
    emp = df[df["_emp"].ne("") & ~df["_emp"].str.contains(
        "confidencial|importante empresa|importante grupo|reclutamiento y seleccion", na=False)]
    def rep(s):
        vc = s.dropna().value_counts()
        return vc.index[0] if len(vc) else ""
    representante = emp.groupby("_emp")["empresa"].agg(rep)
    top_emp = [{"empresa": representante[e], "vacantes": int(v)}
               for e, v in emp["_emp"].value_counts().head(14).items()]
    est = df["_estado"].dropna().value_counts()
    top_estados = [{"estado": e, "vacantes": int(v)} for e, v in est.head(10).items()]

    # idiomas y carreras (ver docstring)
    n_desc = int(df["_con_desc"].sum())
    if n_desc:
        idiomas = contar_idiomas(df.loc[df["_con_desc"], "_texto_largo"])
        for x in idiomas: x["pct"] = round(100 * x["menciones"] / n_desc, 1)
    else:
        idiomas = None
    # Carreras: con el título solo casi no aparecen (se probó con las corridas de
    # agosto: 0.6 % como máximo), así que sin descripciones también es dato pendiente.
    if n_desc:
        carreras = contar_carreras(df.loc[df["_con_desc"], "_texto_largo"])[:12]
        for x in carreras: x["pct"] = round(100 * x["menciones"] / n_desc, 1)
    else:
        carreras = None

    # nivel educativo (ver docstring)
    if n_desc:
        dd = df.loc[df["_con_desc"]].copy()
        dd["_nivel"] = dd["_desc"].map(nivel_educativo)
        nivel_edu = {"base": "vacantes_con_descripcion", "niveles": []}
        for clave, nombre in [(k, nom) for k, nom, _ in NIVELES_EDU] + [NIVEL_SIN_DATO]:
            g = dd[dd["_nivel"] == clave]
            k = len(g)
            sal = g["_sal"].dropna()
            fila = {"clave": clave, "nivel": nombre, "vacantes": k, "pct": round(100 * k / n_desc, 1),
                    "vacantes_con_salario": int(len(sal)),
                    "salario_mediano_mensual_mxn": int(sal.median()) if len(sal) >= MIN_SALARIOS_NIVEL else None}
            if k:
                idi = contar_idiomas(g["_texto_largo"])[:5]
                for x in idi: x["pct"] = round(100 * x["menciones"] / k, 1)
                car = contar_carreras(g["_texto_largo"])[:6]
                for x in car: x["pct"] = round(100 * x["menciones"] / k, 1)
            else:
                idi, car = [], []
            fila["idiomas"], fila["carreras"] = idi, car
            nivel_edu["niveles"].append(fila)
    else:
        nivel_edu = None

    con_sal = df["_sal"].dropna()
    salario = {"vacantes_con_dato": int(len(con_sal)), "pct_con_dato": round(100*len(con_sal)/n, 1),
               "mediana_mensual_mxn": int(con_sal.median()), "p25_mensual_mxn": int(con_sal.quantile(.25)),
               "p75_mensual_mxn": int(con_sal.quantile(.75))} if len(con_sal) else \
              {"vacantes_con_dato": 0, "pct_con_dato": 0.0, "mediana_mensual_mxn": None,
               "p25_mensual_mxn": None, "p75_mensual_mxn": None}

    hoy_ts = pd.Timestamp(hoy)
    sem = df.dropna(subset=["_fecha"]).copy()
    sem = sem[(sem["_fecha"] >= hoy_ts - pd.Timedelta(days=120)) & (sem["_fecha"] <= hoy_ts)]
    sem["_lunes"] = sem["_fecha"] - pd.to_timedelta(sem["_fecha"].dt.weekday, unit="D")
    evo = [{"semana": f"{d.day:02d} {MESES[d.month]}", "vacantes": int(v)}
           for d, v in sem.groupby("_lunes").size().sort_index().items()]

    # vacantes_detalle: recencia por fuente + muestreo proporcional (max 60)
    def vigente(r):
        lim = RECENCIA_DIAS.get(r["fuente"], 10)
        return pd.notna(r["_fecha"]) and (hoy - r["_fecha"].date()) <= timedelta(days=lim)
    vig = df[df.apply(vigente, axis=1)].sort_values("_fecha", ascending=False)
    cuotas = {f: max(1, round(60 * c / len(vig))) for f, c in vig["fuente"].value_counts().items()} if len(vig) else {}
    if len(vig):
        muestra = pd.concat([vig[vig["fuente"] == f].head(q) for f, q in cuotas.items()])
        if len(muestra) < 60:  # completar hasta 60 con las vigentes restantes más recientes
            resto = vig.loc[~vig.index.isin(muestra.index)].head(60 - len(muestra))
            muestra = pd.concat([muestra, resto])
        muestra = muestra.head(60)
    else:
        muestra = vig

    def fila_detalle(r):
        inf = habs.get("por_categoria", {}).get(r["_cat"], {})
        def split_habs(v):
            if pd.isna(v): return []
            return [h.strip() for h in str(v).split(";") if h.strip() and h.strip().lower() != "nan"]
        ht = split_habs(r.get("habilidades_tecnicas")) or inf.get("tecnicas", ["(inferida del título)"])[:2]
        hb = split_habs(r.get("habilidades_blandas")) or inf.get("blandas", [])[:2]
        sal_min = pd.to_numeric(r.get("salario_min"), errors="coerce")
        sal_max = pd.to_numeric(r.get("salario_max"), errors="coerce")
        sal_min = a_mensual(sal_min, r["fuente"])
        sal_max = a_mensual(sal_max, r["fuente"])
        return {"titulo": r["titulo_puesto"], "empresa": r["empresa"], "ubicacion": r["ubicacion"],
                "habilidades_tecnicas": ht, "habilidades_blandas": hb,
                "salario_min": int(sal_min) if pd.notna(sal_min) else None,
                "salario_max": int(sal_max) if pd.notna(sal_max) else None,
                "fecha_publicacion": r["_fecha"].strftime("%Y-%m-%d") if pd.notna(r["_fecha"]) else None,
                "fuente": r["fuente"], "url": r["url_original"]}

    bloque = {
        "nombre": a.sector, "vacantes_verificadas": n, "vacantes_descartadas": a.descartadas,
        "vacantes_con_habilidades": int(df["_hab_explicita"].sum()),
        "pct_con_habilidades": round(100*df["_hab_explicita"].sum()/n, 1),
        "fuentes": {k: int(v) for k, v in fuentes.items()},
        "categorias_puesto": categorias, "habilidades_tecnicas": tecnicas,
        "habilidades_blandas": blandas, "top_empresas": top_emp,
        "cobertura_geografica": {"top_estados": top_estados, "estados_unicos": int(est.size)},
        "salario": salario, "evolucion_semanal": evo,
        "vacantes_con_descripcion": n_desc,
        "idiomas": idiomas,
        "carreras": carreras,
        "nivel_educativo": nivel_edu,
        "total_empresas_unicas": int(df["_emp"].nunique()),
        "ultima_semana_vacantes": evo[-1]["vacantes"] if evo else 0,
        "vacantes_detalle": [fila_detalle(r) for _, r in muestra.iterrows()],
        "vacantes_detalle_nota": (
            f"Generado programáticamente ({hoy.isoformat()}) por etapa4_sector_json.py sobre "
            f"{n} vacantes verificadas ({', '.join(Path(f).name for f in a.verified)}). Todos los "
            "conteos son exactos (pandas, sin estimaciones). Salario normalizado a MXN mensual "
            f"(Adzuna >{UMBRAL_SALARIO_ANUAL:,}/año se dividió entre 12; "
            f"{'/'.join(sorted(FUENTES_ANUALIZADAS))} llega anualizado desde la Etapa 1 y se "
            "dividió entre 12 siempre). vacantes_con_habilidades "
            "cuenta solo habilidades EXPLÍCITAS en el CSV fuente. Muestra vacantes_detalle: filtro "
            "de recencia Adzuna<=10d / Indeed<=15d / OCC<=20d desde hoy, muestreo proporcional por "
            "fuente, máx. 60; habilidades faltantes inferidas por categoría de puesto. Idiomas y "
            "carreras: % sobre las vacantes con descripción (vacantes_con_descripcion); sin "
            "descripciones, idiomas y carreras = null (dato pendiente). Nivel educativo: el más bajo "
            "que menciona la descripción; % sobre vacantes_con_descripcion; salario por nivel solo "
            f"con {MIN_SALARIOS_NIVEL}+ salarios; null sin descripciones."),
    }
    Path(a.out).write_text(json.dumps(bloque, ensure_ascii=False, indent=1))
    print(f"OK -> {a.out} | verificadas={n} | detalle={len(bloque['vacantes_detalle'])} filas | "
          f"empresas_unicas={bloque['total_empresas_unicas']} | mediana={salario['mediana_mensual_mxn']}")

if __name__ == "__main__":
    main()
