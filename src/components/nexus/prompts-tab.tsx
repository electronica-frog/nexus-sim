'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  MessageSquarePlus, ThumbsUp, ThumbsDown, Search, Filter, Loader2,
  Plus, SortAsc, SortDesc, Clock, Star, Archive, Trash2, Tag, Sparkles, Send,
  ChevronUp, ChevronDown, Copy, Check,
} from 'lucide-react'
import { WAVE_COLOR_MAP } from '@/components/nexus/constants'
import { toast } from 'sonner'

interface PromptItem {
  id: string
  title: string
  content: string
  authorAgent: string | null
  authorType: string
  version: number
  votes: number
  tags: string
  category: string
  status: string
  createdAt: string
  updatedAt: string
}

interface PromptsTabProps {
  projectId: string
}

const CATEGORIES = [
  { value: 'all', label: 'Todas', icon: Filter },
  { value: 'general', label: 'General', icon: MessageSquarePlus },
  { value: 'brainstorm', label: 'Lluvia de Ideas', icon: Sparkles },
  { value: 'critique', label: 'Crítica', icon: ThumbsDown },
  { value: 'synthesize', label: 'Síntesis', icon: ThumbsUp },
  { value: 'execute', label: 'Ejecución', icon: Send },
  { value: 'quality_gate', label: 'Control de Calidad', icon: Star },
]

export function PromptsTab({ projectId }: PromptsTabProps) {
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'newest' | 'votes'>('newest')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [newTags, setNewTags] = useState('')
  const [creating, setCreating] = useState(false)

  // Expanded prompt
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchPrompts = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        projectId,
        category,
        sort,
        page: String(page),
        limit: '20',
      })
      const res = await fetch(`/api/nexus/prompts?${params}`)
      const data = await res.json()
      if (data.prompts) {
        setPrompts(data.prompts)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Error fetching prompts:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, category, sort, page])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [category, sort])

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Título y contenido son requeridos')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/nexus/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: newTitle.trim(),
          content: newContent.trim(),
          category: newCategory,
          tags: newTags,
          authorType: 'human',
        }),
      })
      const data = await res.json()
      if (data.prompt) {
        toast.success(`Prompt "${newTitle.trim()}" creado`)
        setDialogOpen(false)
        setNewTitle('')
        setNewContent('')
        setNewCategory('general')
        setNewTags('')
        fetchPrompts()
      } else {
        toast.error(data.error || 'Error al crear prompt')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  const handleVote = async (promptId: string, direction: 'up' | 'down') => {
    try {
      const res = await fetch('/api/nexus/prompts/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, direction }),
      })
      const data = await res.json()
      if (data.prompt) {
        setPrompts((prev) =>
          prev.map((p) => (p.id === promptId ? { ...p, votes: data.newVotes } : p))
        )
      }
    } catch {
      toast.error('Error al votar')
    }
  }

  const handleArchive = async (promptId: string) => {
    try {
      const res = await fetch('/api/nexus/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promptId, status: 'archived' }),
      })
      const data = await res.json()
      if (data.prompt) {
        toast.success('Prompt archivado')
        fetchPrompts()
      }
    } catch {
      toast.error('Error al archivar')
    }
  }

  const handleDelete = async (promptId: string) => {
    try {
      const res = await fetch(`/api/nexus/prompts?id=${promptId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Prompt eliminado')
        fetchPrompts()
      }
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Copiado al portapapeles')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Error al copiar')
    }
  }

  const filteredPrompts = search.trim()
    ? prompts.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.content.toLowerCase().includes(search.toLowerCase()) ||
          p.tags.toLowerCase().includes(search.toLowerCase())
      )
    : prompts

  return (
    <div className="space-y-4">
      {/* Header + Actions */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <MessageSquarePlus className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-zinc-100">Galería de Prompts</CardTitle>
                <CardDescription className="text-xs text-zinc-400">Guardá, versioná y votá prompts para tus oleadas</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[10px]">{total} prompts</Badge>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white h-8 gap-1.5 text-xs">
                    <Plus className="h-3 w-3" />Guardar Prompt
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-base">Guardar Prompt en Galería</DialogTitle>
                    <DialogDescription className="text-zinc-400 text-xs">Guardá un prompt reutilizable para futuras oleadas</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div>
                      <label className="text-xs text-zinc-300 mb-1 block">Título</label>
                      <Input
                        placeholder="Nombre descriptivo del prompt..."
                        className="bg-zinc-800 border-zinc-700 text-sm"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-300 mb-1 block">Contenido del Prompt</label>
                      <Textarea
                        placeholder="Escribí el prompt completo aquí..."
                        className="bg-zinc-800 border-zinc-700 text-sm min-h-[120px] resize-none"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-300 mb-1 block">Categoría</label>
                        <Select value={newCategory} onValueChange={setNewCategory}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-300 mb-1 block">Tags (separados por coma)</label>
                        <Input
                          placeholder="ux, rendimiento, api..."
                          className="bg-zinc-800 border-zinc-700 text-sm"
                          value={newTags}
                          onChange={(e) => setNewTags(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                    <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-zinc-300">Cancelar</Button>
                    <Button
                      onClick={handleCreate}
                      disabled={creating || !newTitle.trim() || !newContent.trim()}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      {creating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Guardando...</> : <><Plus className="h-3.5 w-3.5 mr-1.5" />Guardar</>}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters Bar */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder="Buscar prompts..."
                className="bg-zinc-800 border-zinc-700 text-xs h-8 pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Category Filter */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 flex-1 sm:w-44 text-xs h-8">
                <Filter className="h-3 w-3 mr-1.5" />
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Sort */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
              onClick={() => setSort(sort === 'newest' ? 'votes' : 'newest')}
            >
              {sort === 'newest' ? (
                <><SortDesc className="h-3 w-3" />Más nuevos</>
              ) : (
                <><SortAsc className="h-3 w-3" />Más votados</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prompts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 space-y-3">
                <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse" />
                <div className="h-16 w-full bg-zinc-800 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-5 w-12 bg-zinc-800 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPrompts.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <MessageSquarePlus className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-300 font-medium">Sin prompts en la galería</p>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              {search ? `Sin resultados para "${search}"` : 'Guardá tu primer prompt para empezar'}
            </p>
            {!search && (
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />Guardar Primer Prompt
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredPrompts.map((prompt, index) => {
                const isExpanded = expandedId === prompt.id
                const tagsList = prompt.tags ? prompt.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
                const categoryColorClass = WAVE_COLOR_MAP[prompt.category] || 'text-zinc-400 bg-zinc-800 border-zinc-700'

                return (
                  <motion.div
                    key={prompt.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                  >
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group">
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-sm font-medium text-zinc-100 truncate">{prompt.title}</h3>
                              <Badge className={`text-[9px] px-1.5 py-0 ${categoryColorClass}`}>{prompt.category}</Badge>
                              {prompt.authorType === 'agent' && (
                                <Badge variant="outline" className="border-amber-700 text-amber-400 text-[9px] px-1.5">🤖 agente</Badge>
                              )}
                            </div>
                            {prompt.authorAgent && (
                              <p className="text-[10px] text-zinc-500">por {prompt.authorAgent} · v{prompt.version}</p>
                            )}
                          </div>
                          {/* Vote buttons */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400"
                              onClick={() => handleVote(prompt.id, 'up')}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <span className="text-xs font-medium text-zinc-200 min-w-[20px] text-center">{prompt.votes}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-red-500/10 text-zinc-400 hover:text-red-400"
                              onClick={() => handleVote(prompt.id, 'down')}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Content */}
                        <p className={`text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
                          {prompt.content}
                        </p>

                        {prompt.content.length > 200 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-6 text-[10px] text-zinc-500 hover:text-zinc-300 gap-1 p-0"
                            onClick={() => setExpandedId(isExpanded ? null : prompt.id)}
                          >
                            {isExpanded ? <><ChevronUp className="h-2.5 w-2.5" />Menos</> : <><ChevronDown className="h-2.5 w-2.5" />Más</>}
                          </Button>
                        )}

                        {/* Footer */}
                        <Separator className="bg-zinc-800 my-2.5" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {tagsList.slice(0, 4).map((tag) => (
                              <Badge key={tag} variant="outline" className="border-zinc-700 text-zinc-400 text-[9px] px-1.5 py-0 gap-0.5">
                                <Tag className="h-2 w-2" />{tag}
                              </Badge>
                            ))}
                            {tagsList.length > 4 && (
                              <span className="text-[9px] text-zinc-500">+{tagsList.length - 4}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-100"
                              onClick={() => handleCopy(prompt.content, prompt.id)}
                              title="Copiar prompt"
                            >
                              {copiedId === prompt.id ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-zinc-400 hover:text-amber-400"
                              onClick={() => handleArchive(prompt.id)}
                              title="Archivar"
                            >
                              <Archive className="h-2.5 w-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400"
                              onClick={() => handleDelete(prompt.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="h-2.5 w-2.5 text-zinc-600" />
                          <span className="text-[9px] text-zinc-600">
                            {new Date(prompt.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-zinc-700 text-zinc-300"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </Button>
              <span className="text-xs text-zinc-400">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-zinc-700 text-zinc-300"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
