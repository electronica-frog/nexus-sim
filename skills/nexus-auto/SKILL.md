---
name: nexus-auto
slug: nexus-auto
version: 2.0.0
description: >
  NEXUS Auto — Piloto automático de NEXUS. Comando: botardo.harness (orquestar, routear al lugar
  correcto). Corre ciclos de auto-mejora automáticos (brainstorm → critique → synthesize → health
  → export → sync), gestiona la cola de tareas, analiza salud del sistema, y sincroniza con GitHub.
  Todo via Bash, sin daemon, sin servidor web. Use this skill when the user says "auto-mejora",
  "corré un ciclo", "harness", "auto-loop", "salud del sistema", "exportar", "sincronizar",
  "sync", "botardo.harness", or wants to run/monitor the NEXUS auto-improvement system.
---

# NEXUS Auto — Piloto Automático

Orquesta ciclos de auto-mejora, análisis de salud, y sincronización con GitHub.
Todo es one-shot (no daemon) — cada comando corre y termina.

## Comandos

### botardo.harness — Orquestar / Routear

Modo orquestador: determina qué acción ejecutar según el contexto del mensaje.

```bash
# Ciclo completo de auto-mejora (6 tareas, ~78s)
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-run-cycle.js

# Solo la próxima tarea pendiente (~15s)
cd /home/z/my-project && NEXUS_DELAY=5000 node scripts/nexus-run-cycle.js --single

# Ver estado de la cola de tareas
cat /home/z/my-project/task-list.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Ciclo: {d[\"cycle\"]} | Completados hoy: {d.get(\"cyclesCompletedToday\",0)}/{d.get(\"maxCyclesPerDay\",8)}')
print(f'Último reset: {d.get(\"lastResetDate\",\"N/A\")}')
print()
for t in d['tasks']:
    status_icon = {'pending': '⏳', 'running': '🔄', 'completed': '✅'}.get(t['status'], '❓')
    print(f'  {status_icon} {t[\"id\"]:15} | {t[\"status\"]:10} | {t[\"name\"]}')
    if t.get('lastRun'): print(f'     Último: {t[\"lastRun\"][:19]}')
    if t.get('failCount', 0) > 0: print(f'     Fallos: {t[\"failCount\"]}')
"
```

### Estado del Sistema (Health)

```bash
# Status rápido — agentes, waves, trust
cd /home/z/my-project && node scripts/nexus-harness.js --status

# Health Score completo (0-100)
cd /home/z/my-project && node scripts/nexus-priority-scorer.js
# Lee resultados: cat /home/z/my-project/download/priority-scores.json
```

### Exportar y Sincronizar con GitHub

```bash
# Exportar DB a JSON + pushear a GitHub
cd /home/z/my-project && node scripts/nexus-export.js && bash scripts/nexus-sync.sh
```

Esto:
1. Exporta toda la DB SQLite a `/home/z/my-project/download/nexus-export.json`
2. Commitea y pushea a GitHub (repo electronica-frog/nexus-sim)
3. Vercel auto-deploy si está conectado

### Resetear Cola de Tareas

```bash
cd /home/z/my-project && python3 -c "
import json
with open('task-list.json','r') as f: d=json.load(f)
for t in d['tasks']:
    t['status']='pending'; t['failCount']=0; t['lastRun']=None
with open('task-list.json','w') as f: json.dump(d, f, indent=2)
print(f'Todas las tareas reseteadas (ciclo {d[\"cycle\"]})')
"
```

## Ciclo de Auto-Mejora — Qué hace cada tarea

| # | Tarea | Qué hace | Duración |
|---|-------|----------|----------|
| 1 | **watchdog** | Health check del sistema (DB + harness) | ~1s |
| 2 | **brainstorm** | 4 agentes proponen mejoras para NEXUS | ~15s |
| 3 | **critique** | 3 agentes evalúan las propuestas | ~10s |
| 4 | **synthesize** | 3 agentes fusionan en plan accionable | ~10s |
| 5 | **health-score** | Analiza salud, rankings, gaps | ~1s |
| 6 | **export-sync** | Exporta DB + push a GitHub | ~2s |

**Total**: ~40-50s por ciclo (con NEXUS_DELAY=5000)

Dependencias: critique espera a brainstorm, synthesize espera a critique.

## Configuración

| Parámetro | Archivo | Default | Descripción |
|-----------|---------|---------|-------------|
| `NEXUS_DELAY` | env var | 5000ms | Delay entre agentes (evita 429) |
| `MAX_CYCLES_PER_DAY` | task-list.json | 8 | Máximo de ciclos por día |
| `MAX_FAIL` | nexus-run-cycle.js | 3 | Fallos antes de saltar tarea |

## Limitaciones Conocidas

1. **Cron jobs rotos**: agentTurn = "user access denied", webDevReview = "exec limits exceeded". Los ciclos se corren on-demand.
2. **Rate limits**: API LLM devuelve 429 si se envían requests muy seguidos. `NEXUS_DELAY=5000` mitiga esto.
3. **Background processes**: El sandbox mata procesos background. Todo es one-shot.

## Archivos Clave

| Archivo | Qué hace |
|---------|----------|
| `scripts/nexus-harness.js` | Ejecuta oleadas de agentes |
| `scripts/nexus-run-cycle.js` | One-shot cycle runner (6 tareas) |
| `scripts/nexus-ralph-loop.js` | Ciclo de 4 fases (PROPONE→EVALÚA→REFLEXIONA→AJUSTA) |
| `scripts/nexus-priority-scorer.js` | Health score + recomendaciones |
| `scripts/nexus-export.js` | Exporta DB a JSON |
| `scripts/nexus-sync.sh` | Git push a GitHub |
| `task-list.json` | Cola de tareas del auto-loop |
| `db/custom.db` | Base de datos SQLite (154+ agentes, memorias, trust) |
| `download/wave-results.json` | Últimos resultados de ola |
| `download/priority-scores.json` | Último health score |
