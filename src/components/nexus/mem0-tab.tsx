'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Brain, Database, Trash2, RefreshCw, Search, TrendingUp, Clock, Sparkles, Filter, Loader2 } from 'lucide-react'

interface Mem0Memory {
  id: string
  projectId: string
  agentId: string
  content: string
  category: string
  tags: string
  baseScore: number
  accessCount: number
  lastAccessedAt: string | null
  decayRate: number
  sourceWaveId: string | null
  sourceType: string
  relevance: number
  createdAt: string
}

interface MemoryStats {
  total: number
  avgRelevance: number
  decayedCount: number
  byCategory: Record<string, number>
  byAgentCount: number
  topRelevance: number
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-zinc-500/10 text-zinc-400 border-zinc-600',
  fact: 'bg-blue-500/10 text-blue-400 border-blue-600',
  skill: 'bg-emerald-500/10 text-emerald-400 border-emerald-600',
  preference: 'bg-violet-500/10 text-violet-400 border-violet-600',
  pattern: 'bg-amber-500/10 text-amber-400 border-amber-600',
  insight: 'bg-rose-500/10 text-rose-400 border-rose-600',
  relationship: 'bg-cyan-500/10 text-cyan-400 border-cyan-600',
}

export function Mem0Tab({ projectId }: { projectId: string }) {
  const [memories, setMemories] = useState<Mem0Memory[]>([])
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [consolidating, setConsolidating] = useState(false)
  const [gcing, setGcing] = useState(false)

  const fetchMemories = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const params = new URLSearchParams({ projectId, limit: '50', category })
      const res = await fetch(`/api/nexus/memory-store?${params}`)
      const data = await res.json()
      if (data.memories) setMemories(data.memories)
    } catch (err) {
      console.error('Error fetching mem0 memories:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!projectId) return
    try {
      const res = await fetch(`/api/nexus/memory-store?projectId=${projectId}&action=stats`)
      const data = await res.json()
      if (data.total !== undefined) setStats(data)
    } catch {}
  }

  useEffect(() => {
    fetchMemories()
    fetchStats()
  }, [projectId, category])

  const handleDelete = async (memoryId: string) => {
    try {
      await fetch(`/api/nexus/memory-store?id=${memoryId}`, { method: 'DELETE' })
      setMemories((prev) => prev.filter((m) => m.id !== memoryId))
    } catch {}
  }

  const handleConsolidate = async () => {
    if (!projectId) return
    setConsolidating(true)
    try {
      const res = await fetch(`/api/nexus/memory-store?projectId=${projectId}&action=consolidate&agentId=all`)
      const data = await res.json()
      if (data.merged > 0) {
        await fetchMemories()
        await fetchStats()
      }
    } catch {} finally {
      setConsolidating(false)
    }
  }

  const handleGC = async () => {
    if (!projectId) return
    setGcing(true)
    try {
      const res = await fetch(`/api/nexus/memory-store?projectId=${projectId}&action=gc`)
      const data = await res.json()
      if (data.deleted > 0) {
        await fetchMemories()
        await fetchStats()
      }
    } catch {} finally {
      setGcing(false)
    }
  }

  const filteredMemories = searchQuery.length >= 2
    ? memories.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tags.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : memories

  return (
    <>
      {/* Stats Header */}
      <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-violet-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <Brain className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-zinc-100">Mem0 — Memoria a Largo Plazo</CardTitle>
                <CardDescription className="text-xs text-zinc-400">Memorias con decay exponencial, relevance scoring y consolidación automática</CardDescription>
              </div>
            </div>
            {stats && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-violet-700 text-violet-400 text-[10px]">
                  <Database className="h-3 w-3 mr-1" />{stats.total} memorias
                </Badge>
                <Badge variant="outline" className="border-emerald-700 text-emerald-400 text-[10px]">
                  <TrendingUp className="h-3 w-3 mr-1" />Avg {stats.avgRelevance}
                </Badge>
                {stats.decayedCount > 0 && (
                  <Badge variant="outline" className="border-amber-700 text-amber-400 text-[10px]">
                    <Clock className="h-3 w-3 mr-1" />{stats.decayedCount} decayed
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        {stats && stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(stats.byCategory).map(([cat, count]) => (
                <Badge
                  key={cat}
                  variant="outline"
                  className={`${CATEGORY_COLORS[cat] || CATEGORY_COLORS.general} text-[9px] px-1.5 cursor-pointer`}
                  onClick={() => setCategory(category === cat ? 'all' : cat)}
                >
                  {cat}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions Bar */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder="Buscar memorias..."
                className="bg-zinc-800 border-zinc-700 text-xs h-8 pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 w-32 text-xs h-8">
                <Filter className="h-3 w-3 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="fact">Facts</SelectItem>
                <SelectItem value="insight">Insights</SelectItem>
                <SelectItem value="skill">Skills</SelectItem>
                <SelectItem value="pattern">Patterns</SelectItem>
                <SelectItem value="preference">Preferences</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px] border-zinc-700 text-zinc-300 hover:bg-violet-500/10 hover:text-violet-400"
              onClick={handleConsolidate}
              disabled={consolidating}
            >
              {consolidating ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Consolidando</> : <><Sparkles className="h-3 w-3 mr-1" />Consolidar</>}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px] border-zinc-700 text-zinc-300 hover:bg-amber-500/10 hover:text-amber-400"
              onClick={handleGC}
              disabled={gcing}
            >
              {gcing ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />GC</> : <><Trash2 className="h-3 w-3 mr-1" />Garbage Collect</>}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px] border-zinc-700 text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400"
              onClick={() => { fetchMemories(); fetchStats() }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memories List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : filteredMemories.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Brain className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-300">Sin memorias Mem0</p>
            <p className="text-xs text-zinc-500 mt-1">Las memorias se crean automáticamente al ejecutar oleadas</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-2">
            {filteredMemories.map((memory, index) => {
              const relPct = Math.round(memory.relevance * 100)
              const relColor = relPct > 80 ? 'bg-emerald-500' : relPct > 50 ? 'bg-amber-500' : 'bg-zinc-600'
              return (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <Badge className={`${CATEGORY_COLORS[memory.category] || CATEGORY_COLORS.general} text-[10px] px-1.5`}>
                              {memory.category}
                            </Badge>
                            <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[9px]">
                              {memory.sourceType}
                            </Badge>
                            <div className="flex items-center gap-1 ml-auto">
                              <div className="w-12 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                                <div className={`h-full rounded-full ${relColor}`} style={{ width: `${Math.min(100, relPct)}%` }} />
                              </div>
                              <span className="text-[9px] text-zinc-400 font-medium w-7 text-right">{relPct}%</span>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-200 leading-relaxed line-clamp-3">{memory.content}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {memory.tags && memory.tags.split(',').map((tag) => (
                              <Badge key={tag} variant="outline" className="border-zinc-700 text-zinc-400 text-[9px] px-1.5">
                                {tag.trim()}
                              </Badge>
                            ))}
                            <span className="text-[9px] text-zinc-600 ml-auto">
                              acc:{memory.accessCount} · decay:{memory.decayRate} · {new Date(memory.createdAt).toLocaleDateString('es')}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-zinc-600 hover:text-red-400 shrink-0"
                          onClick={() => handleDelete(memory.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </>
  )
}
