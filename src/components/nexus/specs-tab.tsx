'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Kanban, ClipboardList, Trash2, ChevronLeft, ChevronRight, Waves, X, Loader2 } from 'lucide-react'
import { SPEC_PHASES, SPEC_PHASE_CONFIG, SPEC_PRIORITY_CONFIG, WAVE_COLOR_MAP, WAVE_DOT_COLOR } from '@/components/nexus/constants'
import type { Project, Spec } from '@/components/nexus/types'

interface SpecsTabProps {
  project: Project
  specTitle: string
  setSpecTitle: (v: string) => void
  specDescription: string
  setSpecDescription: (v: string) => void
  specPriority: string
  setSpecPriority: (v: string) => void
  specCreating: boolean
  specView: 'list' | 'kanban'
  setSpecView: (v: 'list' | 'kanban') => void
  selectedSpec: Spec | null
  setSelectedSpec: (s: Spec | null) => void
  createSpec: () => void
  updateSpecPhase: (id: string, phase: string) => void
  updateSpecPriority: (id: string, priority: string) => void
  deleteSpec: (id: string) => void
}

export function SpecsTab({
  project,
  specTitle,
  setSpecTitle,
  specDescription,
  setSpecDescription,
  specPriority,
  setSpecPriority,
  specCreating,
  specView,
  setSpecView,
  selectedSpec,
  setSelectedSpec,
  createSpec,
  updateSpecPhase,
  updateSpecPriority,
  deleteSpec,
}: SpecsTabProps) {
  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Plus className="h-4 w-4" />Nueva Especificación
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button size="sm" variant={specView === 'kanban' ? 'default' : 'ghost'} onClick={() => setSpecView('kanban')} className={`h-7 px-2 text-xs ${specView === 'kanban' ? 'bg-zinc-700 text-zinc-100' : ''}`}>
                <Kanban className="h-3 w-3 mr-1" />Pipeline
              </Button>
              <Button size="sm" variant={specView === 'list' ? 'default' : 'ghost'} onClick={() => setSpecView('list')} className={`h-7 px-2 text-xs ${specView === 'list' ? 'bg-zinc-700 text-zinc-100' : ''}`}>
                <ClipboardList className="h-3 w-3 mr-1" />Lista
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <Input placeholder="Título de la especificación" value={specTitle} onChange={(e) => setSpecTitle(e.target.value)} className="bg-zinc-800 border-zinc-700 text-sm" />
            </div>
            <div className="md:col-span-5">
              <Textarea placeholder="Descripción detallada (opcional)" value={specDescription} onChange={(e) => setSpecDescription(e.target.value)} rows={1} className="bg-zinc-800 border-zinc-700 text-sm resize-none" />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Select value={specPriority} onValueChange={setSpecPriority}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={createSpec} disabled={specCreating || !specTitle.trim()} className="bg-cyan-600 hover:bg-cyan-700 text-white h-9 shrink-0">
                {specCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {project.specs.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="py-12 text-center">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-zinc-300">No hay especificaciones creadas</p>
          <p className="text-xs text-zinc-200 mt-1">Las specs guían el desarrollo basado en especificaciones (SDD)</p>
        </CardContent></Card>
      ) : specView === 'kanban' ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-[900px]">
            {SPEC_PHASES.map((phase) => {
              const phaseCfg = SPEC_PHASE_CONFIG[phase]
              const specsInPhase = project.specs.filter((s) => s.phase === phase && s.status === 'active')
              return (
                <div key={phase} className="flex-1 min-w-[160px]">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={`w-2 h-2 rounded-full ${phaseCfg.bg.includes('zinc') ? 'bg-zinc-500' : phaseCfg.bg.includes('amber') ? 'bg-amber-500' : phaseCfg.bg.includes('cyan') ? 'bg-cyan-500' : phaseCfg.bg.includes('purple') ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                    <span className={`text-xs font-medium ${phaseCfg.color}`}>{phaseCfg.label}</span>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[10px] px-1 py-0 ml-auto">{specsInPhase.length}</Badge>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {specsInPhase.length === 0 ? (
                      <div className="text-center py-4 text-[10px] text-zinc-200 border border-dashed border-zinc-800 rounded-lg">Sin specs</div>
                    ) : (
                      specsInPhase.map((spec) => {
                        const prioCfg = SPEC_PRIORITY_CONFIG[spec.priority] || SPEC_PRIORITY_CONFIG.medium
                        const isSelected = selectedSpec?.id === spec.id
                        return (
                          <motion.div
                            key={spec.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? `${phaseCfg.bg} ring-1 ring-current/20` : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                            onClick={() => setSelectedSpec(isSelected ? null : spec)}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${prioCfg.color.split(' ')[1]} ${prioCfg.color.split(' ')[0]}`}>{prioCfg.label}</Badge>
                              {spec._count && spec._count.waves > 0 && (
                                <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[9px] px-1 py-0"><Waves className="h-2 w-2 mr-0.5" />{spec._count.waves}</Badge>
                              )}
                            </div>
                            <p className="text-xs font-medium text-zinc-100 line-clamp-2">{spec.title}</p>
                            <p className="text-[10px] text-zinc-200 mt-1 line-clamp-1">{spec.description.slice(0, 80)}</p>
                            <p className="text-[9px] text-zinc-200 mt-2">{new Date(spec.createdAt).toLocaleDateString('es')}</p>
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-zinc-800">
                              {SPEC_PHASES.indexOf(phase) > 0 && (
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800" onClick={(e) => { e.stopPropagation(); updateSpecPhase(spec.id, SPEC_PHASES[SPEC_PHASES.indexOf(phase) - 1]) }}>
                                  <ChevronLeft className="h-3 w-3" />
                                </Button>
                              )}
                              {SPEC_PHASES.indexOf(phase) < SPEC_PHASES.length - 1 && (
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800" onClick={(e) => { e.stopPropagation(); updateSpecPhase(spec.id, SPEC_PHASES[SPEC_PHASES.indexOf(phase) + 1]) }}>
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              )}
                              <div className="flex-1" />
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={(e) => { e.stopPropagation(); deleteSpec(spec.id) }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </motion.div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {project.specs.filter((s) => s.status === 'active').map((spec, idx) => {
            const phaseCfg = SPEC_PHASE_CONFIG[spec.phase] || SPEC_PHASE_CONFIG.draft
            const prioCfg = SPEC_PRIORITY_CONFIG[spec.priority] || SPEC_PRIORITY_CONFIG.medium
            const isSelected = selectedSpec?.id === spec.id
            return (
              <motion.div
                key={spec.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? `${phaseCfg.bg} ring-1 ring-current/20` : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                onClick={() => setSelectedSpec(isSelected ? null : spec)}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${phaseCfg.bg.includes('zinc') ? 'bg-zinc-500' : phaseCfg.bg.includes('amber') ? 'bg-amber-500' : phaseCfg.bg.includes('cyan') ? 'bg-cyan-500' : phaseCfg.bg.includes('purple') ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{spec.title}</p>
                  <p className="text-[11px] text-zinc-200 truncate mt-0.5">{spec.description.slice(0, 120) || 'Sin descripción'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${phaseCfg.bg} ${phaseCfg.color}`}>{phaseCfg.label}</Badge>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${prioCfg.color.split(' ')[1]} ${prioCfg.color.split(' ')[0]}`}>{prioCfg.label}</Badge>
                  {spec._count && spec._count.waves > 0 && (
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[9px] px-1 py-0"><Waves className="h-2 w-2 mr-0.5" />{spec._count.waves}</Badge>
                  )}
                  <span className="text-[9px] text-zinc-200 ml-1">{new Date(spec.createdAt).toLocaleDateString('es')}</span>
                  <Select value={spec.phase} onValueChange={(v) => updateSpecPhase(spec.id, v)}>
                    <SelectTrigger className="h-6 w-auto bg-zinc-800 border-zinc-700 text-[9px] px-1" onClick={(e) => e.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPEC_PHASES.map((p) => (
                        <SelectItem key={p} value={p}>{SPEC_PHASE_CONFIG[p].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={spec.priority} onValueChange={(v) => updateSpecPriority(spec.id, v)}>
                    <SelectTrigger className="h-6 w-auto bg-zinc-800 border-zinc-700 text-[9px] px-1" onClick={(e) => e.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0" onClick={(e) => { e.stopPropagation(); deleteSpec(spec.id) }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {selectedSpec && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-100">{selectedSpec.title}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setSelectedSpec(null)} className="h-6 w-6 p-0 text-zinc-200 hover:text-zinc-100">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`border ${SPEC_PHASE_CONFIG[selectedSpec.phase]?.bg} ${SPEC_PHASE_CONFIG[selectedSpec.phase]?.color}`}>{SPEC_PHASE_CONFIG[selectedSpec.phase]?.label}</Badge>
              <Badge variant="outline" className={`border ${SPEC_PRIORITY_CONFIG[selectedSpec.priority]?.color.split(' ')[1]} ${SPEC_PRIORITY_CONFIG[selectedSpec.priority]?.color.split(' ')[0]}`}>{SPEC_PRIORITY_CONFIG[selectedSpec.priority]?.label}</Badge>
              <span className="text-[10px] text-zinc-200">{new Date(selectedSpec.createdAt).toLocaleString('es')}</span>
            </div>
            {selectedSpec.description && (
              <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">{selectedSpec.description}</p>
            )}
            {project.waves.filter((w) => w.specId === selectedSpec.id).length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-zinc-300">Oleadas Vinculadas:</p>
                <ScrollArea className="max-h-32">
                  {project.waves.filter((w) => w.specId === selectedSpec.id).map((w) => (
                    <div key={w.id} className="flex items-center gap-2 p-1.5 rounded bg-zinc-800/50 border border-zinc-800 text-[11px]">
                      <div className={`w-1.5 h-1.5 rounded-full ${WAVE_DOT_COLOR[w.type] || 'bg-zinc-500'}`} />
                      <span className="text-zinc-200">#{w.number}</span>
                      <Badge variant="outline" className={`border ${WAVE_COLOR_MAP[w.type]?.split(' ')[2] || 'border-zinc-500'} ${(WAVE_COLOR_MAP[w.type]?.split(' ')[0]) || 'text-zinc-300'} text-[9px] px-1 py-0`}>{w.type}</Badge>
                      <span className="text-zinc-200 truncate">{w.prompt.slice(0, 60)}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
