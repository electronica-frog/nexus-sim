// ===== Types =====
export interface Agent {
  id: string
  agentId: string
  name: string
  division: string
  emoji: string
  color: string
  vibe: string
  personality?: string
}

export interface ProjectAgent {
  id: string
  projectId: string
  agentId: string
  role: string
  status: string
  waveNumber: number
  trustScore: number
  agent: Agent
}

export interface WaveResponse {
  id: string
  waveId: string
  agentId: string
  content: string
  confidence: number
  mood: string
  projectAgent?: ProjectAgent
}

export interface Wave {
  id: string
  projectId: string
  number: number
  type: string
  status: string
  prompt: string
  result: string | null
  createdAt: string
  completedAt: string | null
  responses: WaveResponse[]
  specId?: string
}

export interface AgentMemory {
  id: string
  projectId: string
  agentId: string
  type: string
  content: string
  tags: string
  importance: number
  createdAt: string
}

export interface Proposal {
  id: string
  projectId: string
  waveId: string | null
  title: string
  description: string
  type: string
  priority: string
  status: string
  createdAt: string
}

export interface Spec {
  id: string
  projectId: string
  title: string
  description: string
  phase: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  _count?: { waves: number }
}

export interface AgentSkill {
  id: string
  projectId: string
  agentId: string
  agentName: string
  agentEmoji: string
  agentDivision: string
  name: string
  description: string
  sourceWaveId: string | null
  quality: number
  timesUsed: number
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: string
  waves: Wave[]
  agents: ProjectAgent[]
  memories: AgentMemory[]
  proposals: Proposal[]
  specs: Spec[]
}

export interface BenchAgentMetric {
  projectAgentId: string
  agentId: string
  agentName: string
  agentEmoji: string
  agentDivision: string
  trustScore: number
  role: string
  status: string
  totalWaves: number
  avgConfidence: number
  avgResponseLength: number
  successRate: number
  moodDistribution: Record<string, number>
  dominantMood: string
}

export interface BenchAggregates {
  totalResponses: number
  avgConfidence: number
  mostActiveDivision: string
  mostTrustedAgent: { name: string; emoji: string; trustScore: number } | null
}

// SSE live agent state
export interface LiveAgentState {
  agentId: string
  agentName: string
  emoji: string
  division: string
  status: 'thinking' | 'done' | 'failed'
  content: string
  confidence: number
  mood: string
  pipelineStep?: string
}

export interface DashboardData {
  totalAgents: number; activeAgents: number; idleAgents: number; failedAgents: number;
  totalWaves: number; completedWaves: number; failedWaves: number;
  totalMemories: number; totalSkills: number; totalSpecs: number; totalProposals: number;
  averageTrust: number; averageConfidence: number;
  lastWaveAt: string | null; systemUptime: string | null;
  waveTypeDistribution: Record<string, number>; divisionActivity: Record<string, number>;
  waveStats: Array<{
    waveNumber: number; type: string; responseCount: number;
    avgConfidence: number; avgMood: number; completedAt: string | null;
  }>;
  activityLogs: Array<{
    id: string; type: string; message: string; metadata: string; createdAt: string;
  }>;
  skillsCount: number;
  sharedLearningsCount: number;
}
