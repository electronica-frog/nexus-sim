'use client'

import React from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { CardDescription } from '@/components/ui/card'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Brain, MessageSquare, Calendar, CheckCircle2, Gauge } from 'lucide-react'
import type { Wave } from './types'
import { WAVE_TYPES, WAVE_COLOR_MAP, MOOD_CONFIG } from './constants'

export function WaveDetailDialog({ wave, onClose }: { wave: Wave | null; onClose: () => void }) {
  if (!wave) return null

  const waveTypeConfig = WAVE_TYPES.find((w) => w.value === wave.type)
  const avgConf = wave.responses.length > 0
    ? wave.responses.reduce((s, r) => s + r.confidence, 0) / wave.responses.length
    : 0

  return (
    <Dialog open={!!wave} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Badge className={`${WAVE_COLOR_MAP[wave.type]} border`}>{wave.type}</Badge>
            <DialogTitle>Oleada #{wave.number}</DialogTitle>
            <Badge variant="outline" className="border-zinc-700 text-zinc-200 text-xs ml-auto">
              <MessageSquare className="h-3 w-3 mr-1" />{wave.responses.length} respuestas
            </Badge>
          </div>
          <CardDescription className="text-zinc-200 mt-2">
            <p className="text-sm">{wave.prompt}</p>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(wave.createdAt).toLocaleString('es')}</span>
              {wave.completedAt && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" />Completada</span>}
              {waveTypeConfig && <span className="flex items-center gap-1">{React.createElement(waveTypeConfig.icon, { className: 'h-3 w-3' })}{waveTypeConfig.label}</span>}
            </div>
          </CardDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Confidence Gauge */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
            <Gauge className="h-4 w-4 text-zinc-300" />
            <span className="text-xs text-zinc-300">Confianza Promedio:</span>
            <Progress value={avgConf * 100} className="flex-1 h-2" />
            <span className="text-xs font-medium">{Math.round(avgConf * 100)}%</span>
          </div>

          {/* Responses */}
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {wave.responses.map((response) => {
                const agentName = response.projectAgent?.agent?.name || 'Agente'
                const agentEmoji = response.projectAgent?.agent?.emoji || '🤖'
                const agentDiv = response.projectAgent?.agent?.division || ''
                const moodCfg = MOOD_CONFIG[response.mood] || MOOD_CONFIG.neutral
                const MoodIcon = moodCfg.icon

                return (
                  <Card key={response.id} className="bg-zinc-800/50 border-zinc-800">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7"><AvatarFallback className="bg-zinc-800 text-xs">{agentEmoji}</AvatarFallback></Avatar>
                          <div>
                            <p className="text-sm font-medium">{agentName}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[9px] px-1">{agentDiv}</Badge>
                              <span className={`flex items-center gap-0.5 text-[10px] ${moodCfg.color}`}><MoodIcon className="h-2.5 w-2.5" />{moodCfg.label}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Progress value={response.confidence * 100} className="w-14 h-1.5" />
                          <span className="text-[10px] text-zinc-200">{Math.round(response.confidence * 100)}%</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{response.content}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>

          {/* Synthesis */}
          {wave.result && (
            <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-800/30">
              <h4 className="text-sm font-medium text-cyan-400 flex items-center gap-2 mb-2"><Brain className="h-4 w-4" />Síntesis</h4>
              <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">{wave.result}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
