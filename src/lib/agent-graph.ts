/**
 * LangGraph — Agent State Machine for NEXUS Sim v2
 *
 * Implements graph-based wave execution patterns instead of
 * simple sequential agent loops. Each wave type has its own graph:
 *
 * BRAINSTORM: gather → diverge → cross-pollinate → synthesize
 * CRITIQUE: inspect → challenge → verify → report
 * SYNTHESIZE: collect → rank → integrate → output
 * EXECUTE: plan → delegate → implement → verify
 * QUALITY_GATE: audit → check → approve/reject → certify
 *
 * The graph is defined declaratively and executed via a simple
 * interpreter. No external LangGraph dependency needed.
 */

export interface GraphNode {
  id: string
  label: string
  type: 'agent' | 'aggregate' | 'decision' | 'transform' | 'output'
  /** Division filter for agent nodes (empty = any) */
  division?: string
  /** How many agents run in this node */
  agentCount?: number
  /** Agent selection strategy: 'all' | 'top_trust' | 'random' | 'division' */
  strategy?: 'all' | 'top_trust' | 'random' | 'division'
}

export interface GraphEdge {
  from: string
  to: string
  /** Optional condition: 'always' | function name */
  condition?: string
  /** Label for UI visualization */
  label?: string
}

export interface AgentGraph {
  id: string
  waveType: string
  name: string
  description: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  entryNode: string
  terminalNodes: string[]
}

// ===== GRAPH DEFINITIONS =====

const BRAINSTORM_GRAPH: AgentGraph = {
  id: 'graph-brainstorm',
  waveType: 'brainstorm',
  name: 'Brainstorm Flow',
  description: 'Gather diverse ideas, cross-pollinate, then synthesize',
  nodes: [
    { id: 'gather', label: 'Gather Ideas', type: 'agent', strategy: 'division', agentCount: 6, division: '' },
    { id: 'cross_pollinate', label: 'Cross-Pollinate', type: 'transform' },
    { id: 'diverge', label: 'Divergent Thinking', type: 'agent', strategy: 'top_trust', agentCount: 3 },
    { id: 'synthesize', label: 'Synthesize', type: 'aggregate' },
  ],
  edges: [
    { from: 'gather', to: 'cross_pollinate', label: 'ideas collected' },
    { from: 'cross_pollinate', to: 'diverge', label: 'after remixing' },
    { from: 'diverge', to: 'synthesize', label: 'new angles ready' },
  ],
  entryNode: 'gather',
  terminalNodes: ['synthesize'],
}

const CRITIQUE_GRAPH: AgentGraph = {
  id: 'graph-critique',
  waveType: 'critique',
  name: 'Critique Flow',
  description: 'Multi-angle inspection with challenge and verification',
  nodes: [
    { id: 'inspect', label: 'Initial Inspection', type: 'agent', strategy: 'division', agentCount: 6, division: '' },
    { id: 'challenge', label: 'Challenge', type: 'agent', strategy: 'top_trust', agentCount: 3, division: 'specialized' },
    { id: 'decision', label: 'Severity Check', type: 'decision' },
    { id: 'deep_audit', label: 'Deep Audit', type: 'agent', strategy: 'top_trust', agentCount: 2, division: 'testing' },
    { id: 'report', label: 'Report Findings', type: 'aggregate' },
  ],
  edges: [
    { from: 'inspect', to: 'challenge', label: 'issues found' },
    { from: 'challenge', to: 'decision', label: 'challenges ready' },
    { from: 'decision', to: 'deep_audit', condition: 'high_severity', label: 'critical issues' },
    { from: 'decision', to: 'report', condition: 'low_severity', label: 'minor issues' },
    { from: 'deep_audit', to: 'report', label: 'audit complete' },
  ],
  entryNode: 'inspect',
  terminalNodes: ['report'],
}

const SYNTHESIZE_GRAPH: AgentGraph = {
  id: 'graph-synthesize',
  waveType: 'synthesize',
  name: 'Synthesis Flow',
  description: 'Collect perspectives, rank by trust, integrate into unified view',
  nodes: [
    { id: 'collect', label: 'Collect Perspectives', type: 'agent', strategy: 'division', agentCount: 8, division: '' },
    { id: 'rank', label: 'Rank by Trust', type: 'transform' },
    { id: 'integrate', label: 'Integrate', type: 'agent', strategy: 'top_trust', agentCount: 3, division: 'specialized' },
    { id: 'output', label: 'Final Output', type: 'output' },
  ],
  edges: [
    { from: 'collect', to: 'rank', label: 'all voices heard' },
    { from: 'rank', to: 'integrate', label: 'ranked by trust' },
    { from: 'integrate', to: 'output', label: 'integrated' },
  ],
  entryNode: 'collect',
  terminalNodes: ['output'],
}

const EXECUTE_GRAPH: AgentGraph = {
  id: 'graph-execute',
  waveType: 'execute',
  name: 'Execution Flow',
  description: 'Plan, delegate implementation steps, verify delivery',
  nodes: [
    { id: 'plan', label: 'Plan Steps', type: 'agent', strategy: 'top_trust', agentCount: 2, division: 'project-management' },
    { id: 'delegate', label: 'Delegate', type: 'agent', strategy: 'division', agentCount: 6, division: 'engineering' },
    { id: 'verify', label: 'Verify', type: 'agent', strategy: 'top_trust', agentCount: 2, division: 'testing' },
    { id: 'result', label: 'Result', type: 'output' },
  ],
  edges: [
    { from: 'plan', to: 'delegate', label: 'plan ready' },
    { from: 'delegate', to: 'verify', label: 'implementation done' },
    { from: 'verify', to: 'result', label: 'verified' },
  ],
  entryNode: 'plan',
  terminalNodes: ['result'],
}

const QUALITY_GATE_GRAPH: AgentGraph = {
  id: 'graph-quality_gate',
  waveType: 'quality_gate',
  name: 'Quality Gate Flow',
  description: 'Rigorous audit with evidence collection and final certification',
  nodes: [
    { id: 'audit', label: 'Initial Audit', type: 'agent', strategy: 'division', agentCount: 4, division: 'testing' },
    { id: 'evidence', label: 'Gather Evidence', type: 'agent', strategy: 'top_trust', agentCount: 3, division: 'specialized' },
    { id: 'decision', label: 'Pass/Fail Decision', type: 'decision' },
    { id: 'certify', label: 'Certify', type: 'output' },
    { id: 'reject', label: 'Reject with Report', type: 'output' },
  ],
  edges: [
    { from: 'audit', to: 'evidence', label: 'findings identified' },
    { from: 'evidence', to: 'decision', label: 'evidence collected' },
    { from: 'decision', to: 'certify', condition: 'pass', label: 'all checks pass' },
    { from: 'decision', to: 'reject', condition: 'fail', label: 'issues remain' },
  ],
  entryNode: 'audit',
  terminalNodes: ['certify', 'reject'],
}

// ===== GRAPH REGISTRY =====

export const WAVE_GRAPHS: Record<string, AgentGraph> = {
  brainstorm: BRAINSTORM_GRAPH,
  critique: CRITIQUE_GRAPH,
  synthesize: SYNTHESIZE_GRAPH,
  execute: EXECUTE_GRAPH,
  quality_gate: QUALITY_GATE_GRAPH,
}

/**
 * Get the graph for a given wave type.
 */
export function getGraph(waveType: string): AgentGraph {
  return WAVE_GRAPHS[waveType] || BRAINSTORM_GRAPH
}

// ===== GRAPH EXECUTION INTERPRETER =====

export interface GraphExecutionContext {
  graph: AgentGraph
  currentNode: string
  completedNodes: Set<string>
  allResponses: Array<{ nodeId: string; agentId: string; content: string; confidence: number; mood: string }>
  metrics: { nodesCompleted: number; totalNodes: number; startTime: number }
}

/**
 * Initialize execution context for a graph.
 */
export function initGraphExecution(waveType: string): GraphExecutionContext {
  const graph = getGraph(waveType)
  return {
    graph,
    currentNode: graph.entryNode,
    completedNodes: new Set(),
    allResponses: [],
    metrics: { nodesCompleted: 0, totalNodes: graph.nodes.length, startTime: Date.now() },
  }
}

/**
 * Advance to the next node(s) in the graph.
 * Returns the next node ID(s) to execute, or null if the graph is complete.
 */
export function advanceGraph(
  ctx: GraphExecutionContext,
  decisionResult?: string
): string[] | null {
  const { graph, currentNode, completedNodes } = ctx

  // Mark current node as completed
  completedNodes.add(currentNode)
  ctx.metrics.nodesCompleted = completedNodes.size

  // Find edges from current node
  const outgoingEdges = graph.edges.filter((e) => e.from === currentNode)

  if (outgoingEdges.length === 0) {
    // No outgoing edges — terminal node
    return null
  }

  const nextNodes: string[] = []

  for (const edge of outgoingEdges) {
    // Check condition
    if (edge.condition && edge.condition !== 'always') {
      if (edge.condition === decisionResult) {
        nextNodes.push(edge.to)
      }
      // If condition doesn't match, skip this edge
    } else {
      // No condition or 'always'
      nextNodes.push(edge.to)
    }
  }

  // If no conditions matched but there are edges, follow the first one
  if (nextNodes.length === 0 && outgoingEdges.length > 0) {
    nextNodes.push(outgoingEdges[0].to)
  }

  // Skip already-completed nodes (prevent infinite loops)
  const filtered = nextNodes.filter((n) => !completedNodes.has(n))

  if (filtered.length === 0) {
    return null // Graph complete
  }

  ctx.currentNode = filtered[0]
  return filtered
}

/**
 * Check if a graph execution is complete.
 */
export function isGraphComplete(ctx: GraphExecutionContext): boolean {
  return ctx.graph.terminalNodes.some((n) => ctx.completedNodes.has(n))
}

/**
 * Select agents for a graph node based on its strategy.
 */
export function selectAgentsForNode(
  node: GraphNode,
  allAgents: Array<{ id: string; agentId: string; name: string; division: string; trustScore: number }>
): Array<{ id: string; agentId: string; name: string; division: string; trustScore: number }> {
  const { strategy, agentCount, division } = node

  let candidates = [...allAgents]

  // Filter by division if specified
  if (division) {
    candidates = candidates.filter((a) => a.division === division)
  }

  switch (strategy) {
    case 'top_trust':
      return candidates.sort((a, b) => b.trustScore - a.trustScore).slice(0, agentCount || 3)

    case 'random':
      return candidates.sort(() => Math.random() - 0.5).slice(0, agentCount || 3)

    case 'division':
      // Already filtered by division above
      return candidates.slice(0, agentCount || 6)

    case 'all':
    default:
      return candidates.slice(0, agentCount || candidates.length)
  }
}

/**
 * Evaluate a decision node's condition based on response data.
 */
export function evaluateDecision(
  responses: Array<{ confidence: number; mood: string }>
): string {
  const avgConfidence = responses.reduce((s, r) => s + r.confidence, 0) / (responses.length || 1)
  const skepticalCount = responses.filter((r) => r.mood === 'skeptical' || r.mood === 'concerned').length

  // High severity: many skeptical responses or low confidence
  if (skepticalCount >= responses.length * 0.5 || avgConfidence < 0.4) {
    return 'high_severity' // or 'fail' depending on graph
  }

  return 'low_severity' // or 'pass'
}

/**
 * Format graph execution status for SSE events.
 */
export function formatGraphStatus(ctx: GraphExecutionContext): {
  graphId: string
  graphName: string
  currentNode: string
  currentLabel: string
  progress: number
  nodesCompleted: number
  totalNodes: number
} {
  const node = ctx.graph.nodes.find((n) => n.id === ctx.currentNode)
  return {
    graphId: ctx.graph.id,
    graphName: ctx.graph.name,
    currentNode: ctx.currentNode,
    currentLabel: node?.label || ctx.currentNode,
    progress: ctx.metrics.nodesCompleted / ctx.metrics.totalNodes,
    nodesCompleted: ctx.metrics.nodesCompleted,
    totalNodes: ctx.metrics.totalNodes,
  }
}
