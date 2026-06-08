# Quick Reference: What NEXUS Learned

## Architecture Decisions
- **Persistence**: JSON files via GitHub, not just volatile SQLite
- **Identity**: SOUL.md per agent (inspired by Hermes Agent)
- **Orchestration**: Wave-based (brainstorm → critique → synthesize → execute → quality_gate)
- **Memory**: memories.json per agent, synced to GitHub
- **Entry point**: Single master skill `botardo` that routes to all sub-skills

## Agent Trust Scores (from waves)
- AI Engineer: 0.70 (highest confidence, consistent output)
- Backend Architect: 0.64 (solid but conservative)
- DevOps Automator: 0.64 (reliable infrastructure thinking)
- Data Remediation: 0.645 (unique critical perspective)
- System Observer: 0.60 (emerging, high-impact observations)

## Key Problems Identified (waves #39-42)
1. Echo chamber — 210 memories, zero from user
2. Trust scores inflated — calculated at runtime, not persisted
3. SQLite fragile — no backup, disappears on sandbox reset
4. Skills without validation — auto-extracted but not quality-checked
5. No user interaction model — agents talk to themselves
6. First wave #1 never formally completed

## What We Built (bases)
1. 6 agent SOUL.md files with identity, personality, history
2. memories.json per agent with structured, versionable memories
3. index.json registry of active agents
4. Master skill `botardo` — one entry point for everything
5. Knowledge base `botardo-knowledge` — research converted to actionable knowledge
6. GitHub-backed persistence via nexus-export + nexus-sync

## Tech Stack
- LLM: z-ai-web-dev-sdk (Node.js)
- Runtime: K8s sandbox, no daemons, ~120s timeout
- DB: SQLite (local) + JSON (persistent via GitHub)
- Language: JavaScript/Node.js + Python for utilities
- Interface: Discord chat
- Version control: GitHub (electronica-frog)
