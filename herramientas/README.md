# herramientas/ — scripts del pipeline optimizado

- etapa2_verificar.py: verificación de empresa determinística (ver docstring).
- etapa4_sector_json.py: genera data/sector_<key>.json con conteos exactos (ver docstring).
- fichas_puestos.py: genera data/fichas_puestos.json (fichas de puesto para Selección Justa y fichas-puestos.html) con el panel (fichas/panel.json), la rúbrica y guías (fichas/conocimiento_*.py) y el acervo de una corrida. No corre cada lunes: se vuelve a correr cuando se pida actualizar.
- categorias_<sector>.json / habilidades_<sector>.json: diccionarios reutilizables por corrida.

Flujo completo: "prompt_ejecutable_pipeline_optimizado_v1.md" en Drive
(05 Scripts pipeline (optimizacion)).
