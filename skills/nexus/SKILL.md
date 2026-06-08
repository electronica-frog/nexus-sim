---
name: nexus
slug: nexus
version: 2.0.0
description: >
  NEXUS Sim v2 — Sistema de simulación multi-agente. Comandos: botardo.team (correr oleadas
  con agentes AI), botardo.braindump (guardar contexto importante), botardo.volvi (reconectar
  contexto). Ejecuta brainstorm, critique, synthesize, execute y quality_gate waves con equipos
  de agentes AI que tienen trust networks, memoria semántica, y skills auto-mejorables. Todo corre
  desde Bash vía harness directo — no necesita servidor web ni Vercel.
  Use this skill when the user says "nexus", "equipo", "team", "brainstorm", "braindump",
  "volvi", "oleada", "wave", "agentes", "multi-agent", "confía en el equipo", or wants
  collaborative AI thinking on any topic. Also triggers with botardo.team, botardo.braindump,
  botardo.volvi commands.
---

# NEXUS — Equipo Multi-Agente

NEXUS corre oleadas de agentes AI desde Bash. No necesita servidor web, ni Vercel, ni navegador.
Los agentes viven en una DB SQLite con memorias, trust scores, y skills aprendidas.

## Comandos

### botardo.team — Pensar desde múltiples perspectivas

Ejecuta una oleada de agentes AI sobre un tema. Los agentes aportan desde sus divisiones
(design, engineering, product, marketing, testing, etc.) con memorias acumuladas.

**Sintaxis**: `botardo.team <tipo> <tema>` o simplemente pedí "que el equipo piense sobre X"

```bash
# Brainstorm — generar ideas (5 agentes, ~25s)
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-harness.js \
  --type brainstorm --agents 5 --skip-naming --prompt "TEMA AQUÍ"

# Critique — encontrar flaws (4 agentes, ~20s)
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-harness.js \
  --type critique --agents 4 --skip-naming --division testing --prompt "Criticá: TEMA"

# Synthesize — fusionar ideas (4 agentes, ~20s)
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-harness.js \
  --type synthesize --agents 4 --skip-naming --division specialized --prompt "Sintetizá: TEMA"
```

**Tipos de oleada:**

| Tipo | Cuándo usarlo | Temp | Divisiones recomendadas |
|------|--------------|------|------------------------|
| `brainstorm` | Generar ideas, explorar opciones | 0.9 | Todas (o `--division` específica) |
| `critique` | Encontrar riesgos, evaluar propuestas | 0.3 | testing, engineering, specialized |
| `synthesize` | Fusionar propuestas en plan concreto | 0.5 | specialized, product, engineering |
| `execute` | Diseñar implementación detallada | 0.4 | engineering, design |
| `quality_gate` | Validar y puntuar resultados | 0.2 | testing, specialized |

**Flags útiles:**
- `--agents N` — cantidad de agentes (default 5)
- `--division NOMBRE` — filtrar por división (engineering, design, product, marketing, testing, specialized, etc.)
- `--skip-naming` — saltar fase de nombrar la ola (ahorra 3 calls API)
- `--wave-name "NOMBRE"` -- `--wave-emoji "🚀"` -- `--wave-personality "audaz"` — personalizar ola
- `--save /path/to/output.json` — guardar resultados en archivo específico
- `NEXUS_DELAY=X` (env var) — delay entre agentes en ms (default 3000, usar 5000 para evitar rate limits)

### botardo.braindump — Guardar contexto importante

Todo lo que el usuario diga en modo braindump se guarda como memoria en la DB de NEXUS.
Los agentes futuras pueden buscar estas memorias para tener contexto.

```bash
# Guardar una nota/memoria en la DB
cd /home/z/my-project && python3 -c "
import sqlite3, json, datetime
conn = sqlite3.connect('db/custom.db')
content = '''CONTENIDO A GUARDAR AQUÍ'''
conn.execute('INSERT INTO AgentMemory (id, projectId, type, content, importance, createdAt, metadata) VALUES (?,?,?,?,?,?,?)',
  ('mem-' + datetime.datetime.now().strftime('%Y%m%d%H%M%S'), 'cmpytm3mx004apvrh7r7b18nv', 'braindump', content, 0.9, datetime.datetime.now().isoformat(), json.dumps({'source': 'braindump'})))
conn.commit()
conn.close()
print('Guardado como memoria braindump')
"
```

### botardo.volvi — Reconectar contexto

Muestra lo que pasó desde la última vez: últimas oleadas, memorias recientes, estado del sistema.

```bash
# Estado completo del sistema
cd /home/z/my-project && node scripts/nexus-harness.js --status

# Últimas memorias guardadas
cd /home/z/my-project && python3 -c "
import sqlite3
conn = sqlite3.connect('db/custom.db')
conn.row_factory = sqlite3.Row
mems = conn.execute('SELECT type, content, importance, createdAt FROM AgentMemory ORDER BY createdAt DESC LIMIT 10').fetchall()
for m in mems:
    print(f'[{m[\"type\"]}] imp:{m[\"importance\"]:.1f} | {m[\"content\"][:100]}')
    print(f'  {m[\"createdAt\"][:19]}')
conn.close()
"

# Últimas waves corridas (desde DB)
cd /home/z/my-project && python3 -c "
import sqlite3, json
conn = sqlite3.connect('db/custom.db')
conn.row_factory = sqlite3.Row
waves = conn.execute('SELECT number, type, status, createdAt FROM Wave ORDER BY number DESC LIMIT 10').fetchall()
for w in waves:
    print(f'  #{w[\"number\"]:>3} | {w[\"type\"]:12} | {w[\"status\"]} | {str(w[\"createdAt\"])[:19]}')
conn.close()
"
```

## Pipeline Completo (3 oleadas en secuencia)

Para análisis profundo: brainstorm → critique → synthesize:

```bash
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-harness.js \
  --type brainstorm --agents 5 --skip-naming \
  --prompt "TEMA" \
  --save /home/z/my-project/download/braindump-topic.json && \
NEXUS_DELAY=5000 node scripts/nexus-harness.js \
  --type critique --agents 4 --skip-naming --division testing \
  --prompt "Criticá las propuestas sobre TEMA" \
  --save /home/z/my-project/download/critique-topic.json && \
NEXUS_DELAY=5000 node scripts/nexus-harness.js \
  --type synthesize --agents 4 --skip-naming --division specialized \
  --prompt "Sintetizá las mejores propuestas sobre TEMA" \
  --save /home/z/my-project/download/synthesize-topic.json
```

## Leer Resultados

Los resultados siempre se guardan en `/home/z/my-project/download/wave-results.json`
(o en el archivo especificado con `--save`):

```bash
cat /home/z/my-project/download/wave-results.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Wave #{d.get(\"waveNumber\",\"?\")} | {d[\"type\"]} | {len(d.get(\"responses\",[]))} agents')
print(f'Confianza: {d.get(\"avgConfidence\",0):.3f} | Moods: {d.get(\"moodBreakdown\",{})}')
print()
for r in d.get('responses', []):
    a = r.get('agent', {})
    if r.get('error'):
        print(f'  ERROR: {a.get(\"name\",\"?\")} - {r[\"error\"][:100]}')
    else:
        print(f'  {a.get(\"emoji\",\"\")} {a.get(\"name\",\"?\")} [{a.get(\"division\",\"?\")}]')
        print(f'     {r.get(\"mood\",\"?\")} conf:{r.get(\"confidence\",0):.2f} | {r.get(\"content\",\"\")[:200]}')
        print()
"
```

## Ralph Loop — Ciclo de pensamiento de 4 fases

Para análisis profundo con auto-reflexión: PROPONE → EVALÚA → REFLEXIONA → AJUSTA

```bash
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-ralph-loop.js --quick --prompt "TEMA AQUÍ"
```

Lee los resultados en `/home/z/my-project/download/ralph-loop/`.

## Notas Técnicas

- **DB**: `/home/z/my-project/db/custom.db` (SQLite + WAL, 154+ agentes, 70+ waves)
- **Harness**: `/home/z/my-project/scripts/nexus-harness.js` (usa z-ai-web-dev-sdk, no necesita servidor)
- **Delay entre agentes**: usar `NEXUS_DELAY=5000` para evitar rate limits (429)
- **Oleada de 5 agentes**: ~25-35 segundos
- **Pipeline 3 olas**: ~60-80 segundos
- **Ralph Loop completo**: ~2-3 minutos con `--quick`
- **No necesita Vercel ni servidor web** — todo corre desde Bash en el sandbox
