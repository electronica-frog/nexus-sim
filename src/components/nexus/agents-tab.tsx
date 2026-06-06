'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Users, Filter, Handshake, Star, Trash2, Flame } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TRUST_COLOR, TRUST_LABEL, MEMORY_TYPE_COLORS } from '@/components/nexus/constants'
import { AgentCard } from '@/components/nexus/agent-card'
import type { Project, Agent, ProjectAgent, AgentSkill } from '@/components/nexus/types'

interface AgentsTabProps {
  project: Project
  filteredAgents: ProjectAgent[]
  agentSearch: string
  setAgentSearch: (v: string) => void
  agentFilter: string
  setAgentFilter: (v: string) => void
  divisions: string[]
  agentSkills: AgentSkill[]
  selectedAgent: Agent | null
  setSelectedAgent: (a: Agent | null) => void
  deleteSkill: (id: string) => void
}

export function AgentsTab({
  project,
  filteredAgents,
  agentSearch,
  setAgentSearch,
  agentFilter,
  setAgentFilter,
  divisions,
  agentSkills,
  selectedAgent,
  setSelectedAgent,
  deleteSkill,
}: AgentsTabProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteSkillId, setDeleteSkillId] = useState<string | null>(null)

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300" />
          <Input placeholder="Buscar agentes..." value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} className="bg-zinc-900 border-zinc-800 pl-9 text-sm" />
        </div>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 w-full sm:w-48 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="División" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">Todas</SelectItem>
            {divisions.map((div) => <SelectItem key={div} value={div}>{div}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredAgents.map((pa, index) => (
          <motion.div key={pa.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
            <AgentCard projectAgent={pa} onClick={() => setSelectedAgent(pa.agent)} skillCount={agentSkills.filter((s) => s.agentId === pa.agentId).length} />
          </motion.div>
        ))}
      </div>
      {filteredAgents.length === 0 && (
        <div className="text-center py-12 text-zinc-300">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No se encontraron agentes</p>
          <p className="text-xs text-zinc-200 mt-1">Intenta con otro filtro o término de búsqueda</p>
        </div>
      )}
      <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[80vh]">
          {selectedAgent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><span className="text-2xl">{selectedAgent.emoji}</span><span>{selectedAgent.name}</span></DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-zinc-700">{selectedAgent.division}</Badge>
                  <Badge variant="outline" className="border-zinc-700"><span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: selectedAgent.color === 'cyan' ? '#06b6d4' : selectedAgent.color === 'red' ? '#ef4444' : selectedAgent.color === 'purple' ? '#a855f7' : selectedAgent.color === 'amber' ? '#f59e0b' : selectedAgent.color === 'emerald' ? '#10b981' : '#6b7280' }} />{selectedAgent.color}</Badge>
                </div>
                {(() => {
                  const pa = project.agents.find((p) => p.agentId === selectedAgent.id)
                  const trust = pa?.trustScore ?? 0.5
                  return (
                    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-zinc-200 flex items-center gap-1.5"><Handshake className="h-3.5 w-3.5" />Confiabilidad</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${TRUST_COLOR(trust)}`}>{Math.round(trust * 100)}%</span>
                          <Badge variant="outline" className={`border-current/20 ${TRUST_COLOR(trust)} text-[10px]`}>{TRUST_LABEL(trust)}</Badge>
                        </div>
                      </div>
                      <Progress value={trust * 100} className="h-2" />
                    </div>
                  )
                })()}
                <Separator className="bg-zinc-800" />
                <div>
                  <h4 className="text-sm font-medium text-zinc-200 mb-2">Personalidad</h4>
                  <ScrollArea className="max-h-48"><p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{selectedAgent.personality?.slice(0, 2000) || ''}</p></ScrollArea>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-200 mb-2 flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />Habilidades ({agentSkills.filter((s) => s.agentId === selectedAgent.id).length})
                  </h4>
                  <ScrollArea className="max-h-40">
                    {agentSkills.filter((s) => s.agentId === selectedAgent.id).length === 0 ? (
                      <div className="text-center py-3">
                        <p className="text-xs text-zinc-200">Sin habilidades aprendidas aún</p>
                        <p className="text-[10px] text-zinc-300 mt-1">Las habilidades se extraen automáticamente de respuestas entusiastas con alta confianza</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {agentSkills.filter((s) => s.agentId === selectedAgent.id).slice(0, 8).map((s) => (
                          <div key={s.id} className="p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <Star className="h-3 w-3 text-orange-400" />
                                <span className="text-xs font-medium text-orange-300">{s.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-300">{s.timesUsed}x</span>
                                <button onClick={() => { setDeleteSkillId(s.id); setShowDeleteDialog(true) }} className="text-zinc-400 hover:text-red-400 transition-colors" title="Eliminar habilidad">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-300 mb-1.5">{s.description}</p>
                            <div className="flex items-center gap-1.5">
                              <Progress value={Math.min(s.quality * 100, 100)} className={`h-1.5 ${s.quality >= 0.7 ? '[&>div]:bg-orange-500' : s.quality >= 0.4 ? '[&>div]:bg-amber-500' : '[&>div]:bg-zinc-500'}`} />
                              <span className="text-[10px] text-zinc-300">{Math.round(s.quality * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-200 mb-2">Memorias ({project.memories.filter((m) => m.agentId === selectedAgent.id).length})</h4>
                  <ScrollArea className="max-h-32">
                    {project.memories.filter((m) => m.agentId === selectedAgent.id).length === 0 ? (
                      <p className="text-xs text-zinc-200">Sin memorias aún</p>
                    ) : (
                      <div className="space-y-2">
                        {project.memories.filter((m) => m.agentId === selectedAgent.id).slice(0, 5).map((m) => (
                          <div key={m.id} className="p-2 rounded bg-zinc-800/50 border border-zinc-800">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`text-[10px] px-1.5 ${MEMORY_TYPE_COLORS[m.type] || ''}`}>{m.type}</Badge>
                              <span className="text-[10px] text-zinc-300">{new Date(m.createdAt).toLocaleDateString('es')}</span>
                            </div>
                            <p className="text-xs text-zinc-200">{m.content.slice(0, 120)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Skill Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Skill</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro? El skill será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteSkillId) {
                  deleteSkill(deleteSkillId)
                  setShowDeleteDialog(false)
                  setDeleteSkillId(null)
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
