# Agentic AI Research Report

> **Date**: June 2026
> **Scope**: Hermes Agent investigation, Agentic AI ecosystem overview, and 10 open-source repos complementary to NEXUS Sim

---

## Table of Contents

1. [Part 1: Agente Hermes — Deep Dive](#part-1-agente-hermes--deep-dive)
2. [Part 2: Agentic AI Ecosystem — Overview](#part-2-agentic-ai-ecosystem--overview)
3. [Part 3: 10 Open-Source Technologies Similar to NEXUS Sim](#part-3-10-open-source-technologies-similar-to-nexus-sim)
4. [Appendix: Sources & References](#appendix-sources--references)

---

## Part 1: Agente Hermes — Deep Dive

### What Is It?

**Hermes Agent** (often referred to as "Agente Hermes" in Spanish-language communities) is an **open-source, self-improving AI agent framework** built by **Nous Research** — the AI lab behind the Hermes, Nomos, and Psyche large language model families. It is **not** a simple chatbot wrapper or coding copilot; rather, it is an autonomous agent with a built-in learning loop that creates skills from experience, improves them during use, persists knowledge across sessions, and builds a deepening model of who you are.

- **Type**: Open-source AI agent framework
- **License**: MIT
- **Developer**: Nous Research
- **Website**: https://hermes-agent.nousresearch.com
- **GitHub**: https://github.com/nousresearch/hermes-agent

### GitHub Repository

| Field | Details |
|-------|---------|
| **Repo** | [NousResearch/hermes-agent](https://github.com/nousresearch/hermes-agent) |
| **Language** | Python (agent core + skills), Shell (installer), TypeScript (web UI) |
| **License** | MIT |
| **Model Support** | Nous Hermes, OpenAI, Claude, or any LLM endpoint |

### Key Features

#### 1. Self-Improving Learning Loop
- Agent-curated **persistent memory** with periodic nudges to retain knowledge
- **Autonomous skill creation** — the agent writes reusable skill files from execution traces
- **Skill self-improvement** — skills are refined automatically during use via DSPy + GEPA (no GPU needed, just API calls)
- **FTS5 cross-session recall** with LLM summarization for memory retrieval

#### 2. Multi-Backend Deployment
- Runs anywhere: a **$5 VPS**, a GPU cluster, or **serverless infrastructure** (Daytona, Modal)
- 6 terminal backends: local, Docker, SSH, Daytona, Singularity, Modal
- Serverless persistence — hibernates when idle, costs nearly nothing

#### 3. Multi-Platform Communication
- 20+ messaging platforms from one gateway:
  - **Telegram, Discord, Slack, WhatsApp, Signal, Matrix**
  - Microsoft Teams, Google Chat, Email, SMS
  - DingTalk, Feishu, WeCom, Weixin, QQ Bot, Yuanbao
  - BlueBubbles, Home Assistant, Mattermost, and more

#### 4. Sub-Agent Delegation & Parallelization
- Spawn **isolated subagents** for parallel workstreams
- Programmatic **Tool Calling** collapses multi-step pipelines into single inference calls

#### 5. Skills Hub
- Skills are **portable, shareable, and community-contributed**
- Community Skills Hub for discovering and sharing agent skills

#### 6. Rich Tool Ecosystem
- 60+ built-in tools (web search, image generation, TTS, browser, code execution, etc.)
- **MCP (Model Context Protocol)** server support for extended tool capabilities
- **Tool Gateway** — one subscription covers web search, image generation, TTS, and browser tools

#### 7. Personality & Identity
- **SOUL.md** — define the agent's default voice and personality
- **Project context files** that shape every conversation
- **Dialectic user modeling** — builds a deepening model of the user across sessions

#### 8. Security & Isolation
- Command approval and authorization
- Container isolation for sandboxed execution

#### 9. Scheduled Automations
- Built-in **cron** for scheduled tasks with delivery to any platform

#### 10. Advanced Capabilities
- Batch processing and trajectory export
- RL training with **Atropos** (Nous Research's training framework)
- Real-time voice interaction in CLI, Telegram, Discord, and Discord VC

### How It Relates to Multi-Agent Systems

Hermes Agent has a dedicated **multi-agent architecture roadmap** tracked in GitHub Issue [#344](https://github.com/NousResearch/hermes-agent/issues/344) — "Multi-Agent Architecture: Orchestration, Cooperation, Specialized Agents." The plan is to evolve Hermes from a **single-agent system with isolated sub-agent delegation** into a **true multi-agent system** with:

- **Orchestration layer** for coordinating multiple specialized agents
- **Cooperation protocols** for inter-agent communication
- **Specialized agent roles** for different domains (work, home, scheduling, finances, etc.)

Currently, Hermes supports multi-agent patterns through:
- Sub-agent spawning for parallel workstreams
- Delegation to isolated worker agents
- Community members are already building **fleets of Hermes agents** that scout problems, research them, and build fixes autonomously (with human approval at key checkpoints)

### Relevance to NEXUS Sim

| Aspect | Hermes Agent | NEXUS Sim |
|--------|-------------|-----------|
| **Self-improvement** | Built-in learning loop (DSPy + GEPA) | Wave-based execution with iterative refinement |
| **Memory** | FTS5 persistent memory, cross-session recall | Memory persistence system |
| **Multi-agent** | Sub-agent delegation, evolving to true multi-agent | Wave-based multi-agent orchestration |
| **Communication** | 20+ platforms (Telegram, Discord, etc.) | Agent-to-agent protocols |
| **Self-hosted** | Yes, runs anywhere | Yes |
| **Skills/Tools** | 60+ built-in, MCP support, Skills Hub | Spec-driven development |
| **Personality** | SOUL.md, dialectic user modeling | Agent personas |
| **Simulation** | Not a simulation framework | Core simulation/orchestration system |

**Integration opportunities**:
- Hermes Agent could serve as a **communication gateway** for NEXUS Sim agents
- NEXUS Sim's wave-based orchestration could complement Hermes' sub-agent delegation
- Hermes' self-improving skills could enhance NEXUS agents' capabilities
- MCP tool support enables tool sharing between both systems

---

## Part 2: Agentic AI Ecosystem — Overview

### What Is Agentic AI?

**Agentic AI** represents the evolution from generative AI (systems that generate content) to **autonomous AI systems that can perceive, reason, plan, and take action** to accomplish complex goals. Unlike traditional chatbots that respond to prompts, agentic AI systems:

- **Autonomously decompose tasks** into sub-tasks
- **Choose and use tools** (web search, code execution, API calls)
- **Maintain memory** across sessions
- **Collaborate with other agents** (multi-agent systems)
- **Iterate and self-correct** based on feedback
- **Operate persistently** (not just in single conversations)

As Deloitte noted in their 2026 Tech Trends: *"Many agentic AI implementations are failing. But leading organizations that are reimagining operations and managing agents as workers are finding success."*

### Key Categories of Agentic AI Tools

Based on the 2026 landscape analysis (120+ tools mapped across 11 categories by StackOne), the agentic AI ecosystem spans:

#### 1. **Agent Frameworks (Code-First)**
Frameworks for developers to build custom agents from scratch:
- LangGraph, CrewAI, AutoGen/AG2, Google ADK, OpenAI Agents SDK, Smolagents, Mastra

#### 2. **Agent Orchestration Platforms**
Tools for orchestrating multiple agents and complex workflows:
- LangGraph Platform, CrewAI Enterprise, Google Vertex AI Agent Builder, Amazon Bedrock Agents

#### 3. **Agent Memory Systems**
Dedicated memory layers for agent persistence:
- Mem0, Zep AI, Letta (formerly MemGPT), ALMA

#### 4. **Agent Communication Protocols**
Standards for inter-agent communication:
- **MCP (Model Context Protocol)** by Anthropic — tools/context for agents
- **A2A (Agent-to-Agent Protocol)** by Google — agent interoperability

#### 5. **Visual/No-Code Agent Builders**
Platforms for building agents without coding:
- Dify, n8n, Flowise, LangFlow, Google AgentKit

#### 6. **Autonomous Coding Agents**
AI agents that write, review, and deploy code:
- Claude Code, Cursor, Devin, OpenHands, Aide

#### 7. **Multi-Agent Simulation Systems**
Platforms for simulating multi-agent interactions:
- MetaGPT, ChatDev, CAMEL

#### 8. **Self-Improving Agents**
Agents that learn and evolve from experience:
- Hermes Agent (Nous Research), Agent Evolution frameworks

#### 9. **Agent Evaluation & Observability**
Tools for monitoring and evaluating agent performance:
- LangSmith, Langfuse, Braintrust, Weave

#### 10. **Enterprise Agent Platforms**
End-to-end platforms for deploying agents at scale:
- Microsoft Copilot Studio, Salesforce Agentforce, ServiceNow AI Agents

#### 11. **Foundation Models for Agents**
LLMs specifically designed for agentic use:
- Claude (Anthropic), GPT-4o/o3 (OpenAI), Gemini (Google), Hermes (Nous Research), DeepSeek

### Major Players & Frameworks (2025–2026)

| Framework | Creator | Type | Stars (GitHub) | Language |
|-----------|---------|------|---------------|----------|
| **LangChain / LangGraph** | LangChain | Framework | ~95k+ | Python/JS |
| **MetaGPT** | FoundationAgents | Simulation | ~44k+ | Python |
| **CrewAI** | CrewAI Inc | Multi-agent | ~30k+ | Python |
| **AutoGen** | Microsoft (maintenance mode) | Multi-agent | ~40k+ | Python |
| **AG2** | ag2ai (AutoGen fork) | Multi-agent | ~12k+ | Python |
| **Hermes Agent** | Nous Research | Self-improving | Growing rapidly | Python |
| **Smolagents** | Hugging Face | Lightweight | ~12k+ | Python |
| **OpenAI Swarm** | OpenAI | Educational | ~25k+ | Python |
| **Mastra** | Gatsby team | TypeScript-first | ~7k+ | TypeScript |
| **Mem0** | Mem0.ai | Memory layer | ~25k+ | Python |
| **MCP Protocol** | Anthropic | Communication standard | ~35k+ (spec repo) | TypeScript |
| **A2A Protocol** | Google | Communication standard | ~5k+ | Multi |

### Current Trends (2025–2026)

1. **From single agents to agent swarms**: Multi-agent systems are the dominant pattern, with frameworks specializing in orchestration, delegation, and collaboration.

2. **Agent communication standards**: MCP (Anthropic) and A2A (Google) are emerging as the two key interoperability protocols. MCP provides tools/context; A2A provides agent-to-agent communication.

3. **Self-improving agents**: Agents that learn from execution traces and improve their own skills (Hermes Agent leads here).

4. **Enterprise adoption challenges**: Deloitte reports many agentic AI implementations are failing. Success requires reimagining operations and treating agents as workers, not tools.

5. **TypeScript ecosystem growth**: Mastra and other TS-first frameworks are filling a gap in the Python-dominated agent landscape.

6. **Memory persistence as a category**: Dedicated memory systems (Mem0, Zep, Letta) are becoming first-class infrastructure.

7. **Simulation-driven development**: Frameworks like MetaGPT and ChatDev simulate entire organizations with role-playing agents.

8. **Spec-driven / requirements-driven agents**: Growing interest in agents that start from specifications and autonomously produce working software.

9. **Serverless agent deployment**: Modal, Daytona, and similar platforms enable agents that cost nearly nothing when idle.

10. **NVIDIA RTX integration**: Local-first agents running on consumer hardware (Hermes Agent partnered with NVIDIA RTX AI Garage).

---

## Part 3: 10 Open-Source Technologies Similar to NEXUS Sim

The following 10 repositories are selected for their relevance to NEXUS Sim's core capabilities: **multi-agent orchestration, LLM-powered agents, wave-based execution, memory persistence, and collaborative AI**.

### Summary Table

| # | Name | GitHub URL | Stars | Language | Category |
|---|------|-----------|-------|----------|----------|
| 1 | **Hermes Agent** | [NousResearch/hermes-agent](https://github.com/nousresearch/hermes-agent) | ~15k+ | Python | Self-improving agent framework |
| 2 | **CrewAI** | [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) | ~30k+ | Python | Multi-agent orchestration |
| 3 | **AG2 (formerly AutoGen)** | [ag2ai/ag2](https://github.com/ag2ai/ag2) | ~12k+ | Python | Multi-agent cooperation |
| 4 | **LangGraph** | [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | ~10k+ | Python/JS | Stateful agent orchestration |
| 5 | **MetaGPT** | [FoundationAgents/MetaGPT](https://github.com/FoundationAgents/MetaGPT) | ~44k+ | Python | Multi-agent simulation |
| 6 | **OpenAI Swarm** | [openai/swarm](https://github.com/openai/swarm) | ~25k+ | Python | Lightweight multi-agent |
| 7 | **Smolagents** | [huggingface/smolagents](https://github.com/huggingface/smolagents) | ~12k+ | Python | Code-first agent library |
| 8 | **Mem0** | [mem0ai/mem0](https://github.com/mem0ai/mem0) | ~25k+ | Python | Agent memory layer |
| 9 | **Mastra** | [mastra-ai/mastra](https://github.com/mastra-ai/mastra) | ~7k+ | TypeScript | TS-first agent framework |
| 10 | **ChatDev** | [openbmb/ChatDev](https://github.com/openbmb/ChatDev) | ~28k+ | Python | Multi-agent software dev |

---

### 1. Hermes Agent

| Field | Details |
|-------|---------|
| **GitHub** | [NousResearch/hermes-agent](https://github.com/nousresearch/hermes-agent) |
| **Stars** | ~15k+ (rapidly growing, trending in mid-2026) |
| **Language/Framework** | Python (core), TypeScript (web UI), Shell (installer) |
| **License** | MIT |

**Key Features:**
- Built-in learning loop: creates skills from experience, improves during use
- Persistent memory with FTS5 cross-session recall and LLM summarization
- Self-hosted, runs on $5 VPS to GPU clusters
- 20+ messaging platform integrations (Telegram, Discord, Slack, etc.)
- Sub-agent delegation and parallelization
- MCP server support for extended tools
- 60+ built-in tools
- Scheduled automations via cron
- SOUL.md personality system with dialectic user modeling
- NVIDIA RTX AI Garage partnership

**Comparison to NEXUS Sim:**
- Hermes is a **personal assistant framework** with self-improvement; NEXUS Sim is a **multi-agent simulation/orchestration system**
- Hermes excels at **single-user adaptive learning**; NEXUS Sim excels at **wave-based multi-agent orchestration**
- Both feature persistent memory and agent personalization
- Hermes' Skills Hub concept parallels NEXUS' spec-driven development

**Integration Potential:** **HIGH** — Hermes could serve as a communication gateway (20+ platforms) for NEXUS Sim agents. Its self-improving skills could enhance NEXUS agents. MCP tool sharing enables ecosystem interoperability.

---

### 2. CrewAI

| Field | Details |
|-------|---------|
| **GitHub** | [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) |
| **Stars** | ~30k+ |
| **Language/Framework** | Python |
| **License** | Apache 2.0 |

**Key Features:**
- Role-based agent design (define agents with roles, goals, backstories)
- Task delegation and sequential/parallel execution
- Built-in memory (short-term, long-term, entity memory)
- Tool integration (custom tools, API tools)
- Visual build tools for creating agent workflows
- Process-driven orchestration (sequential, hierarchical)
- Multi-agent collaboration patterns
- Enterprise-ready with CrewAI Enterprise

**Comparison to NEXUS Sim:**
- CrewAI focuses on **role-playing agents with task flows**; NEXUS Sim focuses on **wave-based simulation execution**
- CrewAI's role/backstory system is similar to NEXUS' agent personas
- CrewAI lacks wave-based execution and simulation paradigms
- Both support memory persistence

**Integration Potential:** **HIGH** — CrewAI's multi-agent patterns could be adapted into NEXUS Sim's orchestration layer. Role definitions could map to NEXUS agent specs. Task flows could map to wave stages.

---

### 3. AG2 (formerly AutoGen)

| Field | Details |
|-------|---------|
| **GitHub** | [ag2ai/ag2](https://github.com/ag2ai/ag2) |
| **Stars** | ~12k+ |
| **Language/Framework** | Python |
| **License** | MIT (originated from Microsoft's AutoGen) |

**Key Features:**
- Conversational agent framework with multi-agent chat
- Asynchronous messaging with event-driven and request/response patterns
- Human-in-the-loop support
- Function calling and tool integration
- Agent-as-a-tool pattern
- Multi-agent conversation patterns (group chat, sequential, nested)
- Microsoft Agent Foundation integration
- Originally from Microsoft Research, now community-maintained fork

**Comparison to NEXUS Sim:**
- AG2's conversational agent model is more **chat-oriented**; NEXUS Sim is more **execution-oriented**
- AG2's group chat patterns are similar to NEXUS' agent collaboration
- AG2 lacks the wave-based execution model and simulation focus of NEXUS
- Both support agent memory and human-in-the-loop

**Integration Potential:** **MEDIUM-HIGH** — AG2's conversation patterns could enhance NEXUS agent communication. Its human-in-the-loop patterns could integrate with NEXUS approval gates.

---

### 4. LangGraph

| Field | Details |
|-------|---------|
| **GitHub** | [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) |
| **Stars** | ~10k+ |
| **Language/Framework** | Python, JavaScript/TypeScript |
| **License** | MIT |

**Key Features:**
- **Graph-based agent orchestration** — model agent behavior as state machines
- Explicit control over agent state, transitions, and routing
- Support for cycles (agents can loop back)
- Built-in persistence and checkpointing
- Sub-graph composition for modular agent design
- Human-in-the-loop support
- Streaming support
- Integration with LangChain ecosystem (tools, memory, models)
- LangSmith observability integration

**Comparison to NEXUS Sim:**
- LangGraph uses **explicit state machines**; NEXUS Sim uses **wave-based execution**
- LangGraph is more **deterministic/developer-controlled**; NEXUS Sim is more **simulation-driven**
- Both support persistence and multi-agent orchestration
- LangGraph's graph composition is similar to NEXUS' modular agent design

**Integration Potential:** **HIGH** — LangGraph's state machine model could formalize NEXUS Sim's wave transitions. Its checkpointing could enhance NEXUS' persistence. LangChain ecosystem integration brings vast tool/library access.

---

### 5. MetaGPT

| Field | Details |
|-------|---------|
| **GitHub** | [FoundationAgents/MetaGPT](https://github.com/FoundationAgents/MetaGPT) |
| **Stars** | ~44k+ |
| **Language/Framework** | Python |
| **License** | MIT |

**Key Features:**
- **Software company simulation** — simulates entire software teams (PM, architect, engineer, QA)
- Takes a **one-line requirement** and produces user stories, competitive analysis, requirements, data structures, APIs, and documentation
- Role-playing agents with standardized operating procedures (SOPs)
- Structured outputs with Pydantic models
- Memory and context management
- Human interaction support
- Research paper-backed methodology (published at ICLR)

**Comparison to NEXUS Sim:**
- MetaGPT simulates a **software company**; NEXUS Sim is a **general-purpose simulation/orchestration platform**
- Both use **role-playing agents** with defined behaviors
- MetaGPT's SOP-driven agents are similar to NEXUS' spec-driven agents
- Both produce structured outputs from high-level requirements

**Integration Potential:** **VERY HIGH** — MetaGPT is conceptually the closest to NEXUS Sim in its simulation approach. Its SOP-driven agent model could directly inspire NEXUS' agent specifications. Could potentially be a reference implementation for certain NEXUS wave patterns.

---

### 6. OpenAI Swarm

| Field | Details |
|-------|---------|
| **GitHub** | [openai/swarm](https://github.com/openai/swarm) |
| **Stars** | ~25k+ |
| **Language/Framework** | Python |
| **License** | MIT |

**Key Features:**
- **Lightweight** multi-agent orchestration (educational focus)
- **Agent handoff** pattern — agents transfer control to other agents contextually
- Built on ChatCompletions API
- Runs almost entirely on the client side
- Minimal abstractions — simple and transparent
- Lightweight context variables for state sharing
- No built-in persistence or memory (intentionally minimal)

**Comparison to NEXUS Sim:**
- Swarm is intentionally **minimal/educational**; NEXUS Sim is **full-featured production-grade**
- Swarm's agent handoff pattern is simpler than NEXUS' wave-based execution
- Swarm lacks memory, persistence, and simulation capabilities
- Both focus on multi-agent coordination

**Integration Potential:** **MEDIUM** — Swarm's handoff patterns could inform NEXUS Sim's inter-agent transitions. Its minimal approach is a good reference for understanding agent coordination fundamentals. However, the educational scope limits production integration.

---

### 7. Smolagents

| Field | Details |
|-------|---------|
| **GitHub** | [huggingface/smolagents](https://github.com/huggingface/smolagents) |
| **Stars** | ~12k+ |
| **Language/Framework** | Python |
| **License** | Apache 2.0 |

**Key Features:**
- **Code-first agent design** — agents "think in code" (write Python to solve problems)
- Barebones library: ~1,000 lines of core logic
- Tool management with custom tool creation
- Multi-agent support with agent delegation
- Hugging Face Hub integration for model access
- Vision support for multimodal agents
- Document-based agents (process PDFs, web pages)
- Managed agents (shared via HF Hub)

**Comparison to NEXUS Sim:**
- Smolagents is **minimal and code-centric**; NEXUS Sim is **rich and simulation-centric**
- Smolagents' code-based reasoning is a different paradigm from NEXUS' wave-based execution
- Both support multi-agent coordination and tool use
- Smolagents is ideal for rapid prototyping; NEXUS for complex simulations

**Integration Potential:** **MEDIUM** — Smolagents could serve as a lightweight agent runtime within NEXUS Sim nodes. Its Hugging Face ecosystem integration brings model access. Code-based reasoning could complement NEXUS' spec-driven development.

---

### 8. Mem0

| Field | Details |
|-------|---------|
| **GitHub** | [mem0ai/mem0](https://github.com/mem0ai/mem0) |
| **Stars** | ~25k+ |
| **Language/Framework** | Python |
| **License** | Apache 2.0 |

**Key Features:**
- **Universal memory layer** for AI agents and apps
- Persistent context that survives across sessions
- 91.6 on LoCoMo benchmark (+20 points over previous algorithms)
- Graph-based memory with entities and relationships
- User-specific, session-specific, and agent-specific memory
- Drop-in integration with LangChain, LlamaIndex, CrewAI, etc.
- Managed service or self-hosted open-source
- Memory search, deletion, and update operations
- Production-ready with enterprise features

**Comparison to NEXUS Sim:**
- Mem0 is a **dedicated memory infrastructure**; NEXUS Sim has **integrated memory**
- Mem0's graph-based memory model is more sophisticated than typical agent memory
- NEXUS Sim's memory is simulation-context-aware; Mem0 is general-purpose
- Both prioritize cross-session persistence

**Integration Potential:** **VERY HIGH** — Mem0 could replace or enhance NEXUS Sim's memory persistence layer. Its graph-based memory with entities/relationships would add semantic richness. Drop-in integration means minimal coupling.

---

### 9. Mastra

| Field | Details |
|-------|---------|
| **GitHub** | [mastra-ai/mastra](https://github.com/mastra-ai/mastra) |
| **Stars** | ~7k+ |
| **Language/Framework** | TypeScript / JavaScript |
| **License** | MIT |

**Key Features:**
- **TypeScript-first** agent framework (from the Gatsby team)
- Workflow graphs that can **suspend and resume**
- RAG pipeline builder
- Built-in evaluation framework ("evals")
- Agent memory and context management
- Tool integration with MCP support
- Modern developer experience (npm create mastra)
- Designed for production deployment
- Full-stack agent applications

**Comparison to NEXUS Sim:**
- Mastra is **TypeScript-native** (rare in agent frameworks); NEXUS Sim may use various languages
- Mastra's suspend/resume workflows are similar to NEXUS' wave-based execution stages
- Mastra focuses on **web application integration**; NEXUS focuses on **simulation/orchestration**
- Both support MCP for tool interoperability

**Integration Potential:** **HIGH** — If NEXUS Sim uses TypeScript, Mastra is the ideal framework partner. Its suspend/resume model maps well to wave execution. MCP support enables ecosystem interop. Eval framework could test NEXUS agent behaviors.

---

### 10. ChatDev

| Field | Details |
|-------|---------|
| **GitHub** | [openbmb/ChatDev](https://github.com/openbmb/ChatDev) |
| **Stars** | ~28k+ |
| **Language/Framework** | Python |
| **License** | Apache 2.0 |

**Key Features:**
- **Virtual software company** powered by multi-agent collaboration
- Agents play roles: CEO, CTO, programmer, tester, designer
- Chat chain-based communication between agents
- **ChatDev 2.0 (DevAll)**: zero-code multi-agent orchestration platform
- Automated software development from natural language requirements
- Human-agent interaction support
- Environment support (Docker containers)
- Research-backed (published at ICLR, ICSE)

**Comparison to NEXUS Sim:**
- ChatDev simulates a **software development company**; NEXUS Sim is a **general simulation platform**
- Both use **role-playing multi-agent architectures**
- ChatDev's chat chain model is more structured/conversational than NEXUS' wave model
- Both transform high-level requirements into structured outputs

**Integration Potential:** **VERY HIGH** — Like MetaGPT, ChatDev is conceptually aligned with NEXUS Sim. Its role-playing simulation approach is a direct parallel. ChatDev 2.0's zero-code orchestration could be a user-facing layer on top of NEXUS Sim. Software development workflows could be a reference NEXUS simulation domain.

---

### Integration Matrix

| Repo | Orchestration | Memory | Communication | Simulation | Spec-Driven | TypeScript |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Hermes Agent** | ★★★ | ★★★★ | ★★★★★ | ★★ | ★★★ | ✗ |
| **CrewAI** | ★★★★ | ★★★ | ★★★ | ★★ | ★★★ | ✗ |
| **AG2** | ★★★ | ★★ | ★★★★ | ★★ | ★★ | ✗ |
| **LangGraph** | ★★★★★ | ★★★★ | ★★★ | ★★★ | ★★★★ | ✓ |
| **MetaGPT** | ★★★ | ★★★ | ★★★ | ★★★★★ | ★★★★★ | ✗ |
| **OpenAI Swarm** | ★★★ | ★ | ★★ | ★ | ★★ | ✗ |
| **Smolagents** | ★★ | ★★ | ★★ | ★ | ★★ | ✗ |
| **Mem0** | ✗ | ★★★★★ | ✗ | ✗ | ✗ | ✗ |
| **Mastra** | ★★★★ | ★★★ | ★★★ | ★★ | ★★★ | ✓ |
| **ChatDev** | ★★★ | ★★ | ★★★★ | ★★★★★ | ★★★★ | ✗ |

### Recommended Integration Priorities for NEXUS Sim

1. **MetaGPT / ChatDev** — Closest conceptual alignment for simulation-based multi-agent systems
2. **Hermes Agent** — Self-improving learning loop and multi-platform communication
3. **Mem0** — Best-in-class memory persistence layer
4. **LangGraph** — Formal state machine orchestration for wave transitions
5. **Mastra** — TypeScript integration if NEXUS uses TS stack
6. **CrewAI** — Proven multi-agent patterns for role-based orchestration

---

## Appendix: Sources & References

### Hermes Agent
- [NousResearch/hermes-agent — GitHub](https://github.com/nousresearch/hermes-agent)
- [Hermes Agent Official Documentation](https://hermes-agent.nousresearch.com/docs)
- [Hermes Agent — MindStudio Blog](https://www.mindstudio.ai/blog/what-is-hermes-agent-openclaw-alternative)
- [Hermes Unlocks Self-Improving AI Agents — NVIDIA Blog](https://blogs.nvidia.com/blog/rtx-ai-garage-hermes-agent-dgx-spark)
- [Deploy Hermes Agent on OpenShift AI — Red Hat](https://developers.redhat.com/articles/2026/06/02/deploy-hermes-agent-openshift-ai-vllm-model-serving)
- [Multi-Agent Architecture Issue #344 — GitHub](https://github.com/NousResearch/hermes-agent/issues/344)

### Agentic AI Ecosystem
- [120+ Agentic AI Tools Mapped — StackOne](https://www.stackone.com/blog/ai-agent-tools-landscape-2026)
- [Enterprise Agentic AI Landscape 2026 — Kai Waehner](https://www.kai-waehner.de/blog/2026/04/06/enterprise-agentic-ai-landscape-2026-trust-flexibility-and-vendor-lock-in)
- [Agentic AI Frameworks Top 10 — NetApp Instaclustr](https://www.instaclustr.com/education/agentic-ai/agentic-ai-frameworks-top-10-options-in-2026)
- [Agentic AI Strategy — Deloitte Insights](https://www.deloitte.com/us/en/insights/topics/technology-management/tech-trends/2026/agentic-ai-strategy.html)
- [State of Agent Engineering — LangChain](https://www.langchain.com/state-of-agent-engineering)
- [AI Agent Frameworks Compared — Langfuse](https://langfuse.com/blog/2025-03-19-ai-agent-comparison)
- [Best Open Source Agent Frameworks — Firecrawl](https://www.firecrawl.dev/blog/best-open-source-agent-frameworks)

### Agent Communication Protocols
- [MCP (Model Context Protocol) — Anthropic](https://www.anthropic.com/news/model-context-protocol)
- [A2A (Agent-to-Agent Protocol) — Google](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability)
- [A2A Protocol GitHub](https://github.com/a2aproject/A2A)

### Framework Repositories
- [LangGraph — GitHub](https://github.com/langchain-ai/langgraph)
- [CrewAI — GitHub](https://github.com/crewAIInc/crewAI)
- [AG2 — GitHub](https://github.com/ag2ai/ag2)
- [MetaGPT — GitHub](https://github.com/FoundationAgents/MetaGPT)
- [OpenAI Swarm — GitHub](https://github.com/openai/swarm)
- [Smolagents — GitHub](https://github.com/huggingface/smolagents)
- [Mem0 — GitHub](https://github.com/mem0ai/mem0)
- [Mastra — GitHub](https://github.com/mastra-ai/mastra)
- [ChatDev — GitHub](https://github.com/openbmb/ChatDev)
- [AutoGen (Microsoft) — GitHub](https://github.com/microsoft/autogen)

---

> **Report generated**: June 2026
> **Research method**: Web search across 20+ queries, analysis of 80+ search results, review of official documentation and GitHub repositories
> **Disclaimer**: Star counts are approximate and reflect values at the time of research (June 2026). The agentic AI landscape evolves rapidly.
