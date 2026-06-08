---
name: botardo
slug: botardo
version: 1.0.0
description: >
  BOTARDO — Master skill. Un solo punto de entrada que invoca todo el sistema NEXUS.
  Comandos: botardo (orquestra y routea), botardo.team (brainstorm/critique/synthesize),
  botardo.braindump (guardar memoria), botardo.volvi (reconectar contexto),
  botardo.harness (auto-mejora), botardo.status (estado del sistema),
  botardo.research (busca web y aprende), botardo.export (JSON + GitHub sync).
  Use this skill when the user says "botardo", "nexus", "equipo", "team", "brainstorm",
  "braindump", "volvi", "harness", "status", "research", "export", "sync", "agentes",
  "multi-agent", "oleada", "wave", "memoria", or any botardo.* command.
  Also triggers with: botardo.team, botardo.braindump, botardo.volvi, botardo.harness,
  botardo.status, botardo.research, botardo.export.
---

# BOTARDO — Master Skill

> *"Un solo comando para gobernarlos a todos."*

BOTARDO es el punto de entrada único del sistema cooperativo NEXUS. Desde aquí se
accede a todo: pensar, guardar, reconectar, orquestar, investigar, exportar.

## Arquitectura

```
botardo (master)
├── nexus/              → Brain & Cognition (botardo.team, .braindump, .volvi)
│   ├── agents/         → SOUL.md + memories.json por agente
│   │   ├── ai-engineer/
│   │   ├── backend-architect/
│   │   ├── devops-automator/
│   │   ├── data-remediation-engineer/
│   │   ├── system-observer/
│   │   ├── nexus-collective/
│   │   └── index.json  → Registro de agentes activos
│   ├── SOUL.md          → Soul del sistema
│   └── soul-templates/  → Templates para crear souls
├── nexus-auto/          → Autopilot (botardo.harness)
├── botardo-knowledge/   → Research & Learning (botardo.research)
│   └── references/      → Investigación convertida en knowledge
└── nexus-git-push/      → GitHub sync utility
```

## Routing — Qué ejecutar según el comando

| Comando | Acción | Skill delegada |
|---------|--------|---------------|
| `botardo` (solo) | Detectar intención → routear al comando correcto | Este mismo skill |
| `botardo.team` | Ejecutar oleada de agentes | nexus |
| `botardo.braindump` | Guardar memoria importante | nexus |
| `botardo.volvi` | Reconectar contexto | nexus |
| `botardo.harness` | Orquestar auto-mejora | nexus-auto |
| `botardo.status` | Estado completo del sistema | nexus-auto |
| `botardo.research` | Buscar en web y aprender | botardo-knowledge |
| `botardo.export` | Exportar JSON + sync GitHub | nexus-auto + nexus-git-push |

## Comandos

### botardo — Router principal

Detecta la intención del mensaje y ejecuta la acción correcta:

**Si el mensaje pide pensar/discutir → botardo.team**
```bash
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-harness.js \
  --type brainstorm --agents 5 --skip-naming --prompt "TEMA"
```

**Si el mensaje pide guardar algo → botardo.braindump**
```bash
cd /home/z/my-project && python3 -c "
import sqlite3, json, datetime
conn = sqlite3.connect('db/custom.db')
now = datetime.datetime.now().isoformat()
content = '''CONTENIDO A GUARDAR'''
conn.execute('INSERT INTO AgentMemory (id, projectId, agentId, type, content, tags, importance, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)',
  ('mem-' + datetime.datetime.now().strftime('%Y%m%d%H%M%S'), 'cmpytm3mx004apvrh7r7b18nv', 'system', 'braindump', content, 'braindump,user-input', 1.0, now, now))
conn.commit()
conn.close()
print('Memoria guardada')
"
```

**Si el mensaje pide reconectar → botardo.volvi**
```bash
cd /home/z/my-project && node scripts/nexus-harness.js --status
cat /home/z/my-project/skills/nexus/agents/nexus-collective/memories.json
```

**Si el mensaje pide auto-mejora → botardo.harness**
```bash
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-run-cycle.js
```

**Si el mensaje pide estado → botardo.status**
```bash
cd /home/z/my-project && node scripts/nexus-harness.js --status && \
node scripts/nexus-priority-scorer.js && \
cat /home/z/my-project/download/priority-scores.json
```

**Si el mensaje pide investigar → botardo.research**
```bash
# Usar web-search skill para buscar, luego guardar resultado en botardo-knowledge/references/
```

**Si el mensaje pide exportar → botardo.export**
```bash
cd /home/z/my-project && node scripts/nexus-export.js && bash scripts/nexus-sync.sh
```

### botardo.team — Pensar desde múltiples perspectivas

```bash
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

### botardo.status — Estado completo del sistema

```bash
# Agents registrados con souls
cat /home/z/my-project/skills/nexus/agents/index.json

# Memorias del colectivo
cat /home/z/my-project/skills/nexus/agents/nexus-collective/memories.json

# Health score
cd /home/z/my-project && node scripts/nexus-priority-scorer.js

# Estado de la cola de tareas
cat /home/z/my-project/task-list.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Ciclo: {d[\"cycle\"]} | Completados hoy: {d.get(\"cyclesCompletedToday\",0)}/{d.get(\"maxCyclesPerDay\",8)}')
for t in d['tasks']:
    s = {'pending':'⏳','running':'🔄','completed':'✅'}.get(t['status'],'❓')
    print(f'  {s} {t[\"id\"]:15} | {t[\"status\"]:10} | {t[\"name\"]}')
"
```

## Agentes Activos

| Agente | División | Trust | Especialidad |
|--------|----------|-------|-------------|
| 🤖 AI Engineer | engineering | 0.70 | System design, API architecture |
| 🏗️ Backend Architect | engineering | 0.64 | Data modeling, failure analysis |
| ⚙️ DevOps Automator | engineering | 0.64 | CI/CD, automation, health checks |
| 🧬 Data Remediation | engineering | 0.645 | Data integrity, audit trails |
| 👁️ System Observer | specialized | 0.60 | Meta-analysis, pattern detection |
| 🌐 NEXUS Collective | system | 1.00 | Collective identity, principles |

## Investigación de Referencia

Convertida en knowledge en `botardo-knowledge/references/`:

| Fuente | Qué tomamos |
|--------|------------|
| **Hermes Agent** (Nous Research) | SOUL.md, skills portables, sub-agent delegation |
| **Engram** (Gentleman Programming) | Memoria persistente SQLite+FTS5, MCP server |
| **Spec-Driven Development** | Specs antes de código, phased execution |
| **Mem0** | Cross-session memory patterns |
| **CrewAI** | Role-playing multi-agent patterns |
| **YES AND** (Microsoft) | Diversity of thought, confidence-based turn-taking |
| **Stanford generative agents** | Personality simulation accuracy |

## Principios del Sistema

1. **La web app es el chat** — nuestra interfaz es esta conversación
2. **Proactividad** — observamos, proponemos, actuamos sin esperar
3. **Persistencia** — memorias viven en JSON vía GitHub
4. **Evolución** — cada ciclo nos mejora
5. **Honestidad** — no echo chamber, disenso real, trust real

## Notas Técnicas

- **Runtime**: Sandbox K8s, no daemons, no background processes
- **LLM**: z-ai-web-dev-sdk (sin servidor Next.js)
- **Delay**: `NEXUS_DELAY=5000` para evitar rate limits (429)
- **Timeout**: ~120s por comando
- **Persistencia**: JSON files en skills/nexus/agents/ + export a GitHub
- **Oleada 5 agentes**: ~25-35s
- **Pipeline 3 olas**: ~60-80s
