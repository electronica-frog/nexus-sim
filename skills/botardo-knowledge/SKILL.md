---
name: botardo-knowledge
slug: botardo-knowledge
version: 1.0.0
description: >
  BOTARDO Knowledge Base — Investigación convertida en conocimiento persistente.
  Contiene referencias de: Agentic AI (Hermes Agent, CrewAI, MetaGPT, Mem0, Mastra),
  Spec-Driven Development (Gentleman Programming, Engram, SDD methodology),
  Multi-agent patterns (YES AND framework, Stanford generative agents),
  Persistence systems (Mem0, Engram FTS5, cross-session memory).
  Use this skill when the user asks about research, references, what we studied,
  "que sabemos", "investigacion", "knowledge", "referencias", "fuentes", or needs
  context about the agentic AI landscape.
---

# BOTARDO Knowledge Base

Conocimiento persistido del sistema NEXUS. Cada referencia fue investigada,
analizada por oleadas de agentes, y convertida en knowledge accionable.

## Categorías de Conocimiento

### 1. Agentic AI Ecosystem (2025-2026)

**Fuente**: `download/agentic-ai-research.md` (607 líneas)

Lo que aprendimos:
- **120+ herramientas mapeadas** en 11 categorías (StackOne)
- **Framework leaders**: LangGraph (state machines), CrewAI (role-playing), MetaGPT (simulation), ChatDev (software company)
- **Memory layer**: Mem0 es el estándar — graph-based memory con entities/relationships
- **Communication protocols**: MCP (Anthropic) para tools, A2A (Google) para agent-to-agent
- **TypeScript gap**: Mastra llena el vacío TS en un ecosistema dominado por Python
- **Key insight**: "Many agentic AI implementations are failing" (Deloitte 2026) — treating agents as workers, not tools, is the key differentiator

### 2. Hermes Agent (Nous Research)

**Fuente**: `download/agentic-ai-research.md` Part 1 + web search

Lo que tomamos:
- **SOUL.md**: Definir personalidad del agente en un archivo markdown ← IMPLEMENTADO
- **Skills portables**: Skills que se crean desde execution traces ← INSPIRÓ NUESTRO SISTEMA
- **Sub-agent delegation**: Spawn agentes aislados para workstreams paralelos
- **Persistent memory**: FTS5 cross-session recall con LLM summarization
- **20+ messaging platforms**: Telegram, Discord, Slack, WhatsApp, etc.
- **NO tomamos**: MCP server (no lo necesitamos), 60+ built-in tools (tenemos z-ai-web-dev-sdk)

### 3. Spec-Driven Development (Gentleman Programming)

**Fuente**: `download/gentleman-research.md` + `download/aliirz.json` + `download/gentleman-org.json`

Lo que aprendimos:
- **Core thesis**: "Si le tirás una prompt vaga a un agente, te escupe basura. El problema no es la IA, es la falta de proceso."
- **Phases**: Init → Design → Implementation → Review → Cleanup
- **Per-phase model routing**: Opus para design, Sonnet para implementation, Haiku para cleanup
- **gentle-ai**: Meta-configurator que envuelve otros frameworks
- **Engram**: Memoria persistente — Go binary con SQLite + FTS5
- **NO tomamos**: Go binary (corremos en sandbox JS/Python), brew install (no tenemos brew)

### 4. Memory & Persistence Patterns

**Fuente**: `download/search_persistence.json` + `download/search_multiagent.json`

Lo que aprendimos:
- **Reddit**: "structured memory that persists across sessions with full visibility" — Next.js + JSON
- **Mem0**: Graph-based memory, 91.6 on LoCoMo benchmark, user/session/agent-specific
- **Oracle**: Short-term (context window) vs long-term (persistent files/DB)
- **Key insight**: "LLMs don't remember past sessions, agents do" — agents = model + memory + tools

### 5. Multi-Agent Orchestration

**Fuente**: `download/search_multiagent.json` + `download/search_yesand.json`

Lo que aprendimos:
- **IBM**: "Coordinating multiple specialized AI agents within a unified system"
- **YES AND (Microsoft)**: Diversity of thought framework — confidence-based agent turn-taking
- **Codebridge**: 4-step workflow — Define → Design → Build → Monitor
- **Cognition (Devin)**: "Don't Build Multi-Agents" — useful counterpoint, sometimes single agent is better
- **Key insight**: Orchestration ≠ chaos. Need explicit coordination, not just "spawn agents and hope"

### 6. Agent Personalities

**Fuente**: `download/search_personalities.json`

Lo que aprendimos:
- **Stanford**: AI agents simulate 1,052 individuals' personalities with impressive accuracy
- **MIT Sloan**: "Designing agents with complementary personalities led to better performance"
- **ScienceDirect**: "Challenges persist in aligning AI with human values"
- **Key insight**: Personalidad no es solo flavor text — afecta performance del equipo

## Archivos de Referencia

| Archivo | Contenido | Tamaño |
|---------|-----------|--------|
| `download/agentic-ai-research.md` | Hermes Agent deep dive + 10 repos + ecosystem overview | 607 líneas |
| `download/gentleman-research.md` | Gentleman Programming SDD + Engram research | 185 líneas |
| `download/search_persistence.json` | 10 resultados sobre memoria persistente en agentes | Web search |
| `download/search_multiagent.json` | 10 resultados sobre orquestación multi-agente | Web search |
| `download/search_yesand.json` | 10 resultados sobre framework YES AND (Microsoft) | Web search |
| `download/search_personalities.json` | 10 resultados sobre personalidades en agentes | Web search |
| `download/wave-results.json` | Wave #44 — diseño de arquitectura completo | Synthesize |
| `download/nexus-export.json` | Export de DB SQLite (vacío — DB fue reseteada) | Export |

## Cómo se usa este knowledge

1. Cuando un agente necesita contexto sobre el ecosistema → lee `references/`
2. Cuando el usuario pregunta "qué sabemos sobre X" → busco en los archivos
3. Cuando diseñamos una nueva feature → revisamos qué aprendimos de referencias
4. Cuando corremos auto-mejora → los agentes usan este knowledge como base

## Trade-offs de nuestro enfoque

| Decisión | Tomamos | No tomamos | Por qué |
|----------|---------|-----------|---------|
| SOUL.md | Sí (Hermes) | MCP server (Hermes) | No necesitamos protocolo MCP, ya tenemos z-ai-web-dev-sdk |
| Memoria | JSON files (Engram-inspired) | Go binary (Engram) | Corremos en sandbox JS/Python, no Go |
| Skills | Portables + auto-mejorables | 60+ built-in (Hermes) | Usamos z-ai-web-dev-sdk como tool layer |
| Orquestación | Wave-based (propio) | Graph state machines (LangGraph) | Waves son más simples y suficientes |
| Multi-agent | Role-playing (CrewAI-inspired) | Full CrewAI framework | Ya tenemos nexus-harness.js |
| Personality | SOUL.md (Hermes + Stanford) | Full personality simulation (Stanford) | SOUL.md es suficiente, no necesitamos 1052 personalidades |
| Persistence | JSON via GitHub | Graph DB (Mem0) | JSON es simple, legible, versionable |
| SDD | Specs antes de código | Full SDD workflow (Gentleman) | Adoptamos el principio, no el framework completo |
