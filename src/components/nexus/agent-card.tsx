'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Handshake, Star, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { ProjectAgent, LiveAgentState } from './types'
import { STATUS_COLOR_MAP, MOOD_CONFIG, TRUST_COLOR, TRUST_BAR_COLOR } from './constants'

export function AgentCard({ projectAgent, onClick, skillCount }: { projectAgent: ProjectAgent; onClick: () => void; skillCount?: number }) {
  const { agent, status, trustScore } = projectAgent
  const statusColor = STATUS_COLOR_MAP[status] || 'bg-zinc-500'
  const trust = trustScore ?? 0.5
  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl shrink-0 group-hover:scale-110 transition-transform">{agent.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium truncate">{agent.name}</p>
              <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
              {skillCount && skillCount > 0 && (
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-[10px] px-1.5 h-4 flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5" />{skillCount}
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[10px] px-1.5">{agent.division}</Badge>
            {/* Trust indicator */}
            <div className="flex items-center gap-2 mt-1.5">
              <Handshake className={`h-3 w-3 ${TRUST_COLOR(trust)}`} />
              <div className="flex-1 h-1 rounded bg-zinc-800 overflow-hidden">
                <div className={`h-full rounded ${TRUST_BAR_COLOR(trust)}`} style={{ width: `${Math.round(trust * 100)}%` }} />
              </div>
              <span className={`text-[10px] font-medium ${TRUST_COLOR(trust)}`}>{Math.round(trust * 100)}%</span>
            </div>
            {agent.vibe && <p className="text-[11px] text-zinc-300 mt-1 line-clamp-2 leading-tight">{agent.vibe.slice(0, 80)}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LiveAgentCard({ agent, index }: { agent: LiveAgentState; index: number }) {
  const isThinking = agent.status === 'thinking'
  const isDone = agent.status === 'done'
  const moodCfg = MOOD_CONFIG[agent.mood] || MOOD_CONFIG.neutral
  const MoodIcon = moodCfg.icon

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <div className={`p-3 rounded-lg border transition-colors ${isDone ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-900/50 border-emerald-800/30'}`}>
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="h-8 w-8 text-base">
            <AvatarFallback className="bg-zinc-800 text-sm">{agent.emoji}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{agent.agentName}</p>
            <div className="flex items-center gap-2">
              {isThinking && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400">
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}>Pensando</motion.span>
                  <span className="flex gap-0.5">
                    <motion.span className="w-1 h-1 rounded-full bg-amber-400" animate={{ opacity: [0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} />
                    <motion.span className="w-1 h-1 rounded-full bg-amber-400" animate={{ opacity: [0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} />
                    <motion.span className="w-1 h-1 rounded-full bg-amber-400" animate={{ opacity: [0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} />
                  </span>
                </span>
              )}
              {isDone && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />Respondió
                </span>
              )}
              {agent.status === 'failed' && (
                <span className="flex items-center gap-1 text-[10px] text-red-400">
                  <AlertTriangle className="h-3 w-3" />Error
                </span>
              )}
            </div>
          </div>

          {isDone && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${moodCfg.color} border-current/20 text-[9px]`}>
                <MoodIcon className="h-2.5 w-2.5 mr-0.5" />{moodCfg.label}
              </Badge>
              <div className="flex items-center gap-1">
                <Progress value={agent.confidence * 100} className="w-12 h-1.5" />
                <span className="text-[10px] text-zinc-300">{Math.round(agent.confidence * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {agent.content && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">{agent.content}</p>
          </motion.div>
        )}

        {isThinking && (
          <div className="mt-2 space-y-1.5">
            <Skeleton className="h-3 w-full bg-zinc-800" />
            <Skeleton className="h-3 w-4/5 bg-zinc-800" />
            <Skeleton className="h-3 w-3/5 bg-zinc-800" />
          </div>
        )}
      </div>
    </motion.div>
  )
}
