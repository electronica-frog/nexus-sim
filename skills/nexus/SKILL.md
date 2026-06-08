---
name: nexus
slug: nexus
version: 4.0.0
description: >
  NEXUS Sim v2 — Sistema de simulación multi-agente. Comandos: botardo.team (correr oleadas
  con agentes AI), botardo.braindump (guardar contexto importante), botardo.volvi (reconectar
  contexto), botardo.harness (orquestar, routear al lugar correcto). Ejecuta brainstorm, critique,
  synthesize, execute y quality_gate waves con equipos de agentes AI que tienen trust networks,
  memoria semántica, y skills auto-mejorables. Todo corre desde Bash vía harness directo — no
  necesita servidor web ni Vercel.
  Use this skill when the user says "nexus", "equipo", "team", "brainstorm", "braindump",
  "volvi", "oleada", "wave", "agentes", "multi-agent", "confía en el equipo", "harness",
  "auto-mejora", "corré un ciclo", "salud del sistema", "exportar", "sincronizar", "sync",
  "botardo.harness", or wants collaborative AI thinking on any topic.
  Also triggers with botardo.team, botardo.braindump, botardo.volvi, botardo.harness commands.
---

# NEXUS — Sistema Cooperativo Multi-Agente

> *"La web app es este chat. Los agentes tienen identidad, memorias persisten, evolucionan."*

NEXUS es un sistema cooperativo multi-agente. Los agentes activos tienen identidad
persistente (SOUL.md), memorias versionables (memories.json), y skills aprendidas.
Todo corre desde Bash — no necesita servidor web ni Vercel.

**Master entry point**: `botardo` — un solo comando que invoca todo el sistema.
**Knowledge base**: `botardo-knowledge` — investigación convertida en conocimiento.

## Comandos

### botardo.team — Pensar desde múltiples perspectivas

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

# Pipeline completo: brainstorm → critique → synthesize (~60-80s)
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-harness.js \
  --type brainstorm --agents 5 --skip-naming --prompt "TEMA" && \
NEXUS_DELAY=5000 node scripts/nexus-harness.js \
  --type critique --agents 4 --skip-naming --division testing \
  --prompt "Criticá las propuestas sobre TEMA" && \
NEXUS_DELAY=5000 node scripts/nexus-harness.js \
  --type synthesize --agents 4 --skip-naming --division specialized \
  --prompt "Sintetizá las mejores propuestas sobre TEMA"
```

**Tipos de oleada:**

| Tipo | Cuándo | Temp | Divisiones |
|------|-------|------|-----------|
| `brainstorm` | Generar ideas | 0.9 | Todas |
| `critique` | Encontrar riesgos | 0.3 | testing, engineering, specialized |
| `synthesize` | Fusionar propuestas | 0.5 | specialized, product, engineering |
| `execute` | Diseñar implementación | 0.4 | engineering, design |
| `quality_gate` | Validar y puntuar | 0.2 | testing, specialized |

**Flags:**
- `--agents N` — cantidad de agentes (default 5)
- `--division NOMBRE` — filtrar por división
- `--skip-naming` — saltar fase de nombrar (ahorra 3 API calls)
- `--save /path.json` — guardar resultados en archivo específico
- `NEXUS_DELAY=5000` — delay entre agentes (evitar 429)

### botardo.braindump — Guardar contexto importante

```bash
cd /home/z/my-project && python3 -c "
import sqlite3, json, datetime
conn = sqlite3.connect('db/custom.db')
now = datetime.datetime.now().isoformat()
content = '''CONTENIDO A GUARDAR'''
conn.execute('INSERT INTO AgentMemory (id, projectId, agentId, type, content, tags, importance, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)',
  ('mem-' + datetime.datetime.now().strftime('%Y%m%d%H%M%S'), 'cmpytm3mx004apvrh7r7b18nv', 'system', 'braindump', content, 'braindump', 1.0, now, now))
conn.commit()
conn.close()
print('Guardado como memoria braindump')
"
```

### botardo.volvi — Reconectar contexto

```bash
# Estado del sistema
cd /home/z/my-project && node scripts/nexus-harness.js --status

# Últimas memorias
cd /home/z/my-project && python3 -c "
import sqlite3
conn = sqlite3.connect('db/custom.db')
for m in conn.execute('SELECT type, content, importance, createdAt FROM AgentMemory ORDER BY createdAt DESC LIMIT 5').fetchall():
    print(f'[{m[0]}] imp:{float(m[3]):.1f} | {str(m[1])[:100]}')
conn.close()
"

# Últimas waves
cd /home/z/my-project && python3 -c "
import sqlite3
conn = sqlite3.connect('db/custom.db')
for w in conn.execute('SELECT number, type, status FROM Wave ORDER BY number DESC LIMIT 10').fetchall():
    print(f'  #{w[0]:>3} | {w[1]:12} | {w[2]}')
conn.close()
"

# Leer SOUL.md del sistema
cat /home/z/my-project/skills/nexus/SOUL.md
```

### botardo.harness — Orquestar / Routear

*(Delegado a skill nexus-auto — ver nexus-auto/SKILL.md)*

```bash
# Ciclo completo de auto-mejora (6 tareas, ~78s)
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-run-cycle.js

# Solo la próxima tarea pendiente
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-run-cycle.js --single

# Health score
cd /home/z/my-project && node scripts/nexus-priority-scorer.js

# Export + sync GitHub
cd /home/z/my-project && node scripts/nexus-export.js && bash scripts/nexus-sync.sh
```

## Archivos del Sistema

### Identity & Memory
| Archivo | Qué es |
|---------|--------|
| `skills/nexus/SOUL.md` | Soul del sistema NEXUS — identidad colectiva |
| `skills/nexus/soul-templates/SOUL-TEMPLATE.md` | Template para crear SOUL.md de agentes |
| `skills/nexus/agents/` | Agentes con SOUL.md + memories.json |
| `skills/nexus/agents/index.json` | Registro de agentes activos |
| `skills/nexus/agents/ai-engineer/` | AI Engineer — lead architect |
| `skills/nexus/agents/backend-architect/` | Backend Architect — data/persistence |
| `skills/nexus/agents/devops-automator/` | DevOps Automator — automation |
| `skills/nexus/agents/data-remediation-engineer/` | Data Remediation — integrity |
| `skills/nexus/agents/system-observer/` | System Observer — meta-analysis |
| `skills/nexus/agents/nexus-collective/` | Collective soul + shared memories |

### Scripts
| Archivo | Qué hace |
|---------|----------|
| `scripts/nexus-harness.js` | Ejecuta oleadas de agentes |
| `scripts/nexus-run-cycle.js` | One-shot cycle runner (6 tareas) |
| `scripts/nexus-ralph-loop.js` | Ciclo 4 fases (PROPONE→EVALÚA→REFLEXIONA→AJUSTA) |
| `scripts/nexus-priority-scorer.js` | Health score + recomendaciones |
| `scripts/nexus-export.js` | Exporta DB a JSON |
| `scripts/nexus-sync.sh` | Git push a GitHub |
| `task-list.json` | Cola de tareas del auto-loop |

### Skills relacionadas
| Skill | Comando | Qué hace |
|-------|---------|----------|
| `botardo` | botardo (cualquier cosa) | Master entry point — routea a todo |
| `nexus` | botardo.team, .braindump, .volvi | Brain/cognition — pensar, guardar, reconectar |
| `nexus-auto` | botardo.harness, .status | Autopilot — ciclos, health, export, sync |
| `botardo-knowledge` | botardo.research | Knowledge base — investigación persistida |

### Output
| Archivo | Qué contiene |
|---------|--------------|
| `download/wave-results.json` | Últimos resultados de ola |
| `download/nexus-export.json` | Export completo de la DB |
| `download/priority-scores.json` | Último health score |

## Investigación de Referencia

Lo que estudiamos para construir NEXUS (archivos en `download/`):

| Fuente | Qué tomamos |
|--------|------------|
| **Hermes Agent** (Nous Research) | Concepto de SOUL.md, skills portables, sub-agent delegation |
| **Engram** (Gentleman Programming) | Memoria persistente SQLite+FTS5, MCP server |
| **Spec-Driven Development** | Methodology: specs antes de código, phased execution |
| **Mem0** | Cross-session memory patterns |
| **Microsoft Agent Framework** | Multi-language agent orchestration |
| **CrewAI** | Role-playing multi-agent patterns |

## Notas Técnicas

- **Runtime**: Sandbox K8s, no daemons, no background processes
- **LLM**: z-ai-web-dev-sdk (sin servidor Next.js)
- **Delay**: `NEXUS_DELAY=5000` para evitar rate limits (429)
- **Timeout**: ~120s por comando
- **Persistencia**: JSON files en agents/ + export JSON + GitHub sync
- **Agentes activos**: 6 (con SOUL.md + memories.json propios)
- **Oleada 5 agentes**: ~25-35s
- **Pipeline 3 olas**: ~60-80s
- **Ralph Loop**: ~2-3 min con `--quick`

## Fase Actual: BASES

El sistema completó su fase de fundación:
1. Agent souls creados con identidad persistente
2. memories.json por agente (versionable en GitHub)
3. Master skill `botardo` como entry point único
4. Knowledge base con investigación convertida en conocimiento
5. Arquitectura clara: botardo → nexus / nexus-auto / botardo-knowledge
