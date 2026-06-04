'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Target, ThumbsUp, ThumbsDown } from 'lucide-react'
import { PROPOSAL_STATUS_MAP } from '@/components/nexus/constants'
import type { Project } from '@/components/nexus/types'

interface ProposalsTabProps {
  project: Project
  updateProposalStatus: (id: string, status: string) => void
  setActiveTab: (v: string) => void
  setWaveType: (v: string) => void
}

export function ProposalsTab({
  project,
  updateProposalStatus,
  setActiveTab,
  setWaveType,
}: ProposalsTabProps) {
  return (
    <>
      {project.proposals.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="py-12 text-center">
          <Target className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-zinc-300">No hay propuestas generadas</p>
          <p className="text-xs text-zinc-200 mt-1">Las propuestas se generan automáticamente en oleadas de Crítica</p>
          <Button variant="ghost" size="sm" className="mt-3 text-red-400" onClick={() => { setActiveTab('waves'); setWaveType('critique') }}>
            Ejecutar Crítica →
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {project.proposals.map((proposal) => {
            const statusCfg = PROPOSAL_STATUS_MAP[proposal.status] || PROPOSAL_STATUS_MAP.proposed
            return (
              <Card key={proposal.id} className={`bg-zinc-900 border-l-4 ${statusCfg.color.split(' ')[0]}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant="outline" className={statusCfg.color}>{statusCfg.label}</Badge>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-200 text-[10px]">{proposal.type}</Badge>
                        <Badge variant="outline" className={`border-zinc-700 text-[10px] ${proposal.priority === 'high' ? 'text-red-400' : proposal.priority === 'urgent' ? 'text-red-500' : proposal.priority === 'medium' ? 'text-amber-400' : 'text-zinc-200'}`}>{proposal.priority}</Badge>
                      </div>
                      <h3 className="text-sm font-medium">{proposal.title}</h3>
                      <p className="text-xs text-zinc-200 mt-1 leading-relaxed">{proposal.description}</p>
                      <p className="text-[10px] text-zinc-200 mt-2">Creada: {new Date(proposal.createdAt).toLocaleString('es')}</p>
                    </div>
                    {proposal.status === 'proposed' && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => updateProposalStatus(proposal.id, 'approved')} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 h-8 w-8 p-0" title="Aprobar"><ThumbsUp className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => updateProposalStatus(proposal.id, 'rejected')} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 p-0" title="Rechazar"><ThumbsDown className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
