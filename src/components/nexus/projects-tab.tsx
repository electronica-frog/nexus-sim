'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FolderTree, Plus, Archive, Trash2, ExternalLink, Users, Waves,
  Brain, Target, Calendar, ArrowRightLeft, Search, CheckCircle2,
  Loader2, AlertTriangle, ChevronDown, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface ProjectCount {
  waves: number
  agents: number
  memories: number
  proposals: number
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  createdAt: string
  _count?: ProjectCount
}

interface TransferItem {
  id: string
  type: 'skill' | 'memory' | 'mem0'
  name: string
  description: string
  agentName?: string
  quality?: number
  importance?: number
}

interface ProjectsTabProps {
  projects: Project[]
  currentProjectId: string | null
  selectProject: (id: string) => void
  createNewProject: (name: string, description?: string) => Promise<void>
  setActiveTab: (tab: string) => void
  fetchProjects: () => Promise<Project[]>
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active: { label: 'Activo', color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
  paused: { label: 'Pausado', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-500/40' },
  completed: { label: 'Completado', color: 'text-cyan-300', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40' },
}

function getStatusBadge(status: string) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active
  return (
    <Badge variant="outline" className={`${cfg.bg} ${cfg.color} ${cfg.border} border text-[10px]`}>
      {cfg.label}
    </Badge>
  )
}

export function ProjectsTab({
  projects,
  currentProjectId,
  selectProject,
  createNewProject,
  setActiveTab,
  fetchProjects,
}: ProjectsTabProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Cross-project transfer state
  const [sourceProject, setSourceProject] = useState('')
  const [targetProject, setTargetProject] = useState('')
  const [transferItems, setTransferItems] = useState<TransferItem[]>([])
  const [selectedTransferIds, setSelectedTransferIds] = useState<Set<string>>(new Set())
  const [exploringTransfer, setExploringTransfer] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [showTransferPanel, setShowTransferPanel] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createNewProject(newName.trim(), newDesc.trim() || undefined)
      await fetchProjects()
      setNewName('')
      setNewDesc('')
      setShowCreate(false)
      toast.success('Proyecto creado exitosamente')
    } catch (error) {
      toast.error('Error al crear proyecto')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (projectId: string) => {
    setDeletingId(projectId)
    try {
      const res = await fetch(`/api/nexus/project?id=${projectId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Proyecto eliminado')
        await fetchProjects()
        if (projectId === currentProjectId) {
          // Select the first available project
          const remaining = projects.filter(p => p.id !== projectId)
          if (remaining.length > 0) {
            selectProject(remaining[0].id)
          }
        }
      } else {
        toast.error(data.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setDeletingId(null)
      setShowDeleteConfirm(null)
    }
  }

  const handleArchiveToggle = async (project: Project) => {
    const newStatus = project.status === 'paused' ? 'active' : 'paused'
    setArchivingId(project.id)
    try {
      const res = await fetch(`/api/nexus/project?id=${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.project) {
        toast.success(newStatus === 'paused' ? 'Proyecto archivado' : 'Proyecto reactivado')
        await fetchProjects()
      }
    } catch {
      toast.error('Error al cambiar estado')
    } finally {
      setArchivingId(null)
    }
  }

  const handleExploreTransfer = async () => {
    if (!sourceProject || !targetProject || sourceProject === targetProject) {
      toast.error('Selecciona proyectos origen y destino diferentes')
      return
    }
    setExploringTransfer(true)
    try {
      const res = await fetch(`/api/nexus/cross-project?sourceId=${sourceProject}&targetId=${targetProject}`)
      const data = await res.json()
      if (data.items) {
        setTransferItems(data.items)
        setSelectedTransferIds(new Set())
        toast.success(`${data.items.length} items transferibles encontrados`)
      } else {
        toast.error(data.error || 'Error al explorar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setExploringTransfer(false)
    }
  }

  const handleExecuteTransfer = async () => {
    if (selectedTransferIds.size === 0) {
      toast.error('Selecciona al menos un item para transferir')
      return
    }
    setTransferring(true)
    try {
      const res = await fetch('/api/nexus/cross-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: sourceProject,
          targetId: targetProject,
          itemIds: Array.from(selectedTransferIds),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Transferidos ${selectedTransferIds.size} items exitosamente`)
        setTransferItems([])
        setSelectedTransferIds(new Set())
        await fetchProjects()
      } else {
        toast.error(data.error || 'Error en la transferencia')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setTransferring(false)
    }
  }

  const toggleTransferItem = (id: string) => {
    setSelectedTransferIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const otherProjects = projects.filter(p => p.id !== currentProjectId)
  const sourceProjectName = projects.find(p => p.id === sourceProject)?.name || ''
  const targetProjectName = projects.find(p => p.id === targetProject)?.name || ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <FolderTree className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Proyectos</h2>
            <p className="text-xs text-zinc-400">{projects.length} proyecto{projects.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {projects.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTransferPanel(!showTransferPanel)}
              className="border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 text-xs"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
              Cross-Project
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
          >
            {showCreate ? <ChevronRight className="h-3.5 w-3.5 mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
            Nuevo Proyecto
          </Button>
        </div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-zinc-200">Crear Nuevo Proyecto</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Nombre del proyecto..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <Textarea
                    placeholder="Descripción (opcional)..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 text-sm min-h-[36px] h-9 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}
                    className="text-zinc-400 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={!newName.trim() || creating}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    {creating ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Plus className="h-3 w-3 mr-1.5" />}
                    Crear Proyecto
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project, idx) => {
          const isCurrent = project.id === currentProjectId
          const counts = project._count || { waves: 0, agents: 0, memories: 0, proposals: 0 }
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={`bg-zinc-900 border ${isCurrent ? 'border-emerald-500/60 ring-1 ring-emerald-500/20' : 'border-zinc-800'} transition-all hover:border-zinc-700`}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                      <CardTitle className="text-sm font-semibold text-zinc-100 truncate">{project.name}</CardTitle>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                  {project.description && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{project.description}</p>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[11px]">
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Users className="h-3 w-3" />
                      <span>{counts.agents}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Waves className="h-3 w-3" />
                      <span>{counts.waves}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Brain className="h-3 w-3" />
                      <span>{counts.memories}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Target className="h-3 w-3" />
                      <span>{counts.proposals}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-500 ml-auto">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                  </div>

                  <Separator className="bg-zinc-800" />

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {!isCurrent ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { selectProject(project.id); setActiveTab('dashboard') }}
                        className="flex-1 h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled
                        className="flex-1 h-7 text-xs text-zinc-500"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Actual
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleArchiveToggle(project)}
                      disabled={archivingId === project.id || isCurrent}
                      className="h-7 text-xs text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10"
                      title={project.status === 'paused' ? 'Reactivar' : 'Archivar'}
                    >
                      {archivingId === project.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3 w-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(project.id)}
                      disabled={isCurrent}
                      className="h-7 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Delete Confirm */}
                  <AnimatePresence>
                    {showDeleteConfirm === project.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                            <span className="text-[11px] text-red-300">Eliminar &quot;{project.name}&quot; y todos sus datos?</span>
                          </div>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowDeleteConfirm(null)}
                              className="h-6 text-[10px] text-zinc-400 px-2"
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(project.id)}
                              disabled={deletingId === project.id}
                              className="h-6 text-[10px] px-2"
                            >
                              {deletingId === project.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Cross-Project Transfer Panel */}
      {projects.length >= 2 && (
        <AnimatePresence>
          {showTransferPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-violet-400" />
                    <CardTitle className="text-sm font-medium text-zinc-200">Transferencia Cross-Project</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 mb-1 block">Proyecto Origen</label>
                      <select
                        value={sourceProject}
                        onChange={(e) => setSourceProject(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      >
                        <option value="">Seleccionar...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 mb-1 block">Proyecto Destino</label>
                      <select
                        value={targetProject}
                        onChange={(e) => setTargetProject(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      >
                        <option value="">Seleccionar...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleExploreTransfer}
                    disabled={!sourceProject || !targetProject || sourceProject === targetProject || exploringTransfer}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
                  >
                    {exploringTransfer ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Search className="h-3 w-3 mr-1.5" />}
                    Explorar Transferencia
                  </Button>

                  {/* Transfer Items */}
                  {transferItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-300">
                          {selectedTransferIds.size} de {transferItems.length} seleccionados
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (selectedTransferIds.size === transferItems.length) {
                              setSelectedTransferIds(new Set())
                            } else {
                              setSelectedTransferIds(new Set(transferItems.map(i => i.id)))
                            }
                          }}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200 h-6"
                        >
                          {selectedTransferIds.size === transferItems.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                        </Button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                        {transferItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => toggleTransferItem(item.id)}
                            className={`w-full text-left p-2 rounded-lg border transition-colors text-xs ${
                              selectedTransferIds.has(item.id)
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-zinc-100'
                                : 'bg-zinc-800/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                selectedTransferIds.has(item.id)
                                  ? 'bg-emerald-500 border-emerald-500'
                                  : 'border-zinc-600'
                              }`}>
                                {selectedTransferIds.has(item.id) && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[9px] px-1.5 py-0">
                                    {item.type}
                                  </Badge>
                                  <span className="font-medium truncate">{item.name}</span>
                                </div>
                                {item.agentName && (
                                  <span className="text-[10px] text-zinc-500">{item.agentName}</span>
                                )}
                              </div>
                              {item.quality !== undefined && (
                                <span className="text-[10px] text-zinc-500">{(item.quality * 100).toFixed(0)}%</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      <Separator className="bg-zinc-800" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">
                          {sourceProjectName} → {targetProjectName}
                        </span>
                        <Button
                          size="sm"
                          onClick={handleExecuteTransfer}
                          disabled={selectedTransferIds.size === 0 || transferring}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        >
                          {transferring ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <ArrowRightLeft className="h-3 w-3 mr-1.5" />}
                          Transferir Seleccionados ({selectedTransferIds.size})
                        </Button>
                      </div>
                    </div>
                  )}

                  {transferItems.length === 0 && sourceProject && targetProject && !exploringTransfer && (
                    <p className="text-xs text-zinc-500 text-center py-2">
                      Presiona &quot;Explorar Transferencia&quot; para ver los items disponibles
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
