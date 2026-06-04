'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Brain, FileText, Filter, Loader2, ChevronDown, ChevronUp, Sparkles, Database, RefreshCw } from 'lucide-react'
import { WAVE_COLOR_MAP, MEMORY_TYPE_COLORS } from '@/components/nexus/constants'
import type { Project, AgentMemory, SharedLearning, MemorySearchResult } from '@/components/nexus/types'

interface MemoryTabProps {
  project: Project
  sharedLearnings: SharedLearning[]
  sharedLearningsExpanded: boolean
  setSharedLearningsExpanded: (v: boolean) => void
  memorySearchQuery: string
  setMemorySearchQuery: (v: string) => void
  memorySearchResults: MemorySearchResult[]
  memorySearching: boolean
  memorySearchType: string
  showMemorySearch: boolean
  setShowMemorySearch: (v: boolean) => void
  memoryAgentFilter: string
  setMemoryAgentFilter: (v: string) => void
  divisions: string[]
  filteredMemories: AgentMemory[]
  handleMemorySearch: (q: string) => void
  chromaIndexing: boolean
  chromaStatus: { memories: number; skills: number } | null
  indexChroma: () => void
}

export function MemoryTab({
  project,
  sharedLearnings,
  sharedLearningsExpanded,
  setSharedLearningsExpanded,
  memorySearchQuery,
  setMemorySearchQuery,
  memorySearchResults,
  memorySearching,
  memorySearchType,
  showMemorySearch,
  setShowMemorySearch,
  memoryAgentFilter,
  setMemoryAgentFilter,
  divisions,
  filteredMemories,
  handleMemorySearch,
  chromaIndexing,
  chromaStatus,
  indexChroma,
}: MemoryTabProps) {
  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-emerald-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <Brain className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-zinc-100">Aprendizaje Compartido entre Agentes</CardTitle>
                <CardDescription className="text-xs text-zinc-400">Insights importantes (importancia &gt;70%) de todas las oleadas</CardDescription>
              </div>
            </div>
            {sharedLearnings.length > 0 && (
              <Badge variant="outline" className="border-emerald-700 text-emerald-400 text-[10px]">{sharedLearnings.length} aprendizajes</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sharedLearnings.length === 0 ? (
            <div className="text-center py-6">
              <Brain className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
              <p className="text-xs text-zinc-400">Sin aprendizajes compartidos aún. Ejecuta oleadas para generar memoria semántica.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {sharedLearnings
                  .slice(0, sharedLearningsExpanded ? sharedLearnings.length : 5)
                  .map((learning, idx) => {
                    const waveTypeKey = learning.waveType || 'unknown'
                    return (
                      <motion.div
                        key={learning.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <span className="text-base">{learning.agentEmoji}</span>
                          <span className="text-[10px] font-medium text-zinc-300">{learning.agentName}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-200 leading-relaxed line-clamp-2">{learning.content.slice(0, 200)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className={`${WAVE_COLOR_MAP[waveTypeKey] || 'text-zinc-300 bg-zinc-800 border-zinc-700'} text-[9px] px-1.5`}>
                              {learning.waveType}
                            </Badge>
                            {learning.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="border-zinc-700 text-zinc-400 text-[9px] px-1.5">{tag}</Badge>
                            ))}
                            <div className="flex items-center gap-1 ml-auto">
                              <div className="w-1 h-3 rounded-full bg-emerald-500" />
                              <span className="text-[9px] text-emerald-400 font-medium">{Math.round(learning.importance * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
              </div>
              {sharedLearnings.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full mt-3 text-xs text-zinc-400 hover:text-zinc-200" onClick={() => setSharedLearningsExpanded(!sharedLearningsExpanded)}>
                  {sharedLearningsExpanded ? (<><ChevronUp className="h-3 w-3 mr-1" />Ver menos</>) : (<><ChevronDown className="h-3 w-3 mr-1" />Ver más ({sharedLearnings.length - 5} aprendizajes adicionales)</>)}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input placeholder="Buscar en memorias..." className="bg-zinc-800 border-zinc-700 text-xs h-8 pl-8 pr-8" value={memorySearchQuery} onChange={(e) => { setMemorySearchQuery(e.target.value); handleMemorySearch(e.target.value) }} />
              {memorySearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 animate-spin" />}
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowMemorySearch(!showMemorySearch); setMemorySearchQuery(''); setMemorySearchResults([]) }}>
              <Loader2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {memorySearchResults.length > 0 && (
            <ScrollArea className="max-h-64 mt-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1 px-0.5">
                  {memorySearchType === 'chromadb-semantic' ? (
                    <>
                      <Database className="h-3 w-3 text-emerald-400" />
                      <span className="text-[9px] font-medium text-emerald-400">Búsqueda semántica ChromaDB (all-MiniLM-L6-v2)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-violet-400" />
                      <span className="text-[9px] font-medium text-violet-400">Búsqueda semántica TF-IDF (fallback)</span>
                    </>
                  )}
                </div>
                {memorySearchResults.map((r) => (
                  <div key={r.id} className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs">{r.agentEmoji}</span>
                      <span className="text-[10px] font-medium text-zinc-300">{r.agentName}</span>
                      <Badge className="text-[9px] px-1">{r.type}</Badge>
                      {r.score !== undefined && (
                        <div className="flex items-center gap-1 ml-auto">
                          <div className="w-12 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
                              style={{ width: `${Math.min(100, Math.round(r.score * 100))}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-zinc-400 font-medium w-7 text-right">
                            {Math.round(r.score * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-300 line-clamp-2">{r.content.slice(0, 150)}</p>
                    {r.matchedTerms && r.matchedTerms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.matchedTerms.map((term) => (
                          <Badge key={term} variant="outline" className="border-violet-700/50 text-violet-400 text-[8px] px-1.5 py-0">{term}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          {memorySearchQuery.length >= 2 && !memorySearching && memorySearchResults.length === 0 && (
            <p className="text-[10px] text-zinc-500 mt-2 text-center">Sin resultados para &quot;{memorySearchQuery}&quot;</p>
          )}
        </CardContent>
      </Card>

      {/* ChromaDB Index Status & Action */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-zinc-300">ChromaDB Vector Store</span>
              {chromaStatus && (
                <Badge variant="outline" className="border-emerald-700 text-emerald-400 text-[9px]">
                  {chromaStatus.memories + chromaStatus.skills} docs
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] border-zinc-700 text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-700"
              onClick={indexChroma}
              disabled={chromaIndexing}
            >
              {chromaIndexing ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Indexando...</> : <><RefreshCw className="h-3 w-3 mr-1" />Indexar Datos</>}
            </Button>
          </div>
          {chromaStatus && (
            <div className="flex items-center gap-3 mt-2 text-[9px] text-zinc-500">
              <span>{chromaStatus.memories} memorias</span>
              <span>·</span>
              <span>{chromaStatus.skills} skills</span>
              <span>·</span>
              <span>384-dim embeddings</span>
              <span>·</span>
              <span>cosine similarity</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={memoryAgentFilter} onValueChange={setMemoryAgentFilter}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 flex-1 sm:w-48 text-sm"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Filtrar por división" /></SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">Todas las divisiones</SelectItem>
            {divisions.map((div) => <SelectItem key={div} value={div}>{div}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="border-zinc-700 text-zinc-200 text-xs h-8 px-3 flex items-center"><FileText className="h-3 w-3 mr-1" />{filteredMemories.length} memorias</Badge>
      </div>

      {filteredMemories.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="py-12 text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-zinc-300">No hay memorias almacenadas</p>
          <p className="text-xs text-zinc-200 mt-1">Las memorias se crean automáticamente al ejecutar oleadas</p>
        </CardContent></Card>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-2">
            {filteredMemories.map((memory, index) => {
              const agent = project.agents.find((pa) => pa.agentId === memory.agentId)
              return (
                <motion.div key={memory.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02 }}>
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-sm">{agent?.agent?.emoji || '🤖'}</span>
                            <span className="text-xs font-medium text-zinc-300">{agent?.agent?.name || 'Desconocido'}</span>
                            <Badge className={`text-[10px] px-1.5 ${MEMORY_TYPE_COLORS[memory.type] || ''}`}>{memory.type}</Badge>
                          </div>
                          <p className="text-xs text-zinc-200 leading-relaxed">{memory.content}</p>
                          <div className="flex items-center gap-3 mt-2">
                            {memory.tags && <div className="flex flex-wrap gap-1">{memory.tags.split(',').map((tag) => <Badge key={tag} variant="outline" className="border-zinc-700 text-zinc-300 text-[10px] px-1.5">{tag.trim()}</Badge>)}</div>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-6 rounded-full ${memory.importance > 0.7 ? 'bg-emerald-500' : memory.importance > 0.4 ? 'bg-amber-500' : 'bg-zinc-600'}`} />
                            <span className="text-[10px] text-zinc-300">{Math.round(memory.importance * 100)}%</span>
                          </div>
                          <span className="text-[10px] text-zinc-200">{new Date(memory.createdAt).toLocaleDateString('es')}</span>
                        </div>
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
