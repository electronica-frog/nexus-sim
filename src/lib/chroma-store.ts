/**
 * ChromaDB Vector Store for NEXUS Sim v2
 * Uses ChromaDB's PersistentClient via Python script (embed.py) for semantic embeddings.
 * all-MiniLM-L6-v2 model → 384-dim vectors with cosine similarity.
 * 
 * Strategy: Call Python embed.py via child_process.execFile (async) for:
 * - Generating embeddings (for new memories/skills/waves)
 * - Semantic search queries (ChromaDB handles the full search)
 * - CRUD operations on collections
 * 
 * Data persists in .chroma-data/ directory (SQLite + HNSW indices).
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

const EMBED_SCRIPT = path.join(process.cwd(), 'embed.py')
const PYTHON = process.env.PYTHON_PATH || 'python3'

interface EmbedResult {
  embeddings: number[][]
  dimension: number
}

interface QueryResult {
  ids: string[][]
  documents: string[][]
  metadatas: Record<string, unknown>[][]
  distances: number[][]
}

interface CountResult {
  count: number
}

interface CollectionInfo {
  name: string
  count: number
}

async function runChroma(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const { stdout } = await execFileAsync(PYTHON, [EMBED_SCRIPT], {
      input: JSON.stringify(input),
      maxBuffer: 50 * 1024 * 1024, // 50MB for large results
      timeout: 60000, // 60s timeout
    })
    return JSON.parse(stdout.trim())
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    // Try to parse error from Python stdout
    if (errMsg.includes('{')) {
      try {
        const parsed = JSON.parse(errMsg.substring(errMsg.indexOf('{')))
        if (parsed.error) throw new Error(`ChromaDB: ${parsed.error}`)
      } catch { /* ignore parse error */ }
    }
    throw new Error(`ChromaDB exec failed: ${errMsg.substring(0, 200)}`)
  }
}

// ===== EMBEDDING GENERATION =====

/**
 * Generate embeddings for a list of texts using ChromaDB's all-MiniLM-L6-v2 model.
 * Returns 384-dim float vectors.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) return []
  
  // ChromaDB handles batching well, but limit to 100 at a time
  const BATCH_SIZE = 100
  const allEmbeddings: number[][] = []
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const result = await runChroma({ action: 'embed', texts: batch }) as EmbedResult
    allEmbeddings.push(...result.embeddings)
  }
  
  return allEmbeddings
}

// ===== COLLECTION OPERATIONS =====

/**
 * Add documents to a ChromaDB collection. Auto-generates embeddings.
 */
export async function addToCollection(
  collection: string,
  ids: string[],
  documents: string[],
  metadatas?: Record<string, unknown>[],
): Promise<{ success: boolean; count: number }> {
  const input: Record<string, unknown> = {
    action: 'add',
    collection,
    ids,
    documents,
  }
  if (metadatas) input.metadatas = metadatas
  
  return await runChroma(input) as { success: boolean; count: number }
}

/**
 * Query a collection with semantic search.
 * Returns documents sorted by similarity (cosine distance).
 */
export async function queryCollection(
  collection: string,
  queryTexts: string[],
  nResults: number = 10,
  whereFilter?: Record<string, unknown>,
): Promise<QueryResult> {
  const input: Record<string, unknown> = {
    action: 'query',
    collection,
    query_texts: queryTexts,
    n_results: nResults,
  }
  if (whereFilter) input.where = whereFilter
  
  return await runChroma(input) as QueryResult
}

/**
 * Delete documents from a collection.
 */
export async function deleteFromCollection(
  collection: string,
  ids: string[],
): Promise<{ success: boolean }> {
  return await runChroma({ action: 'delete', collection, ids }) as { success: boolean }
}

/**
 * Get document count in a collection.
 */
export async function getCollectionCount(collection: string): Promise<number> {
  const result = await runChroma({ action: 'count', collection }) as CountResult
  return result.count
}

/**
 * Reset (delete) a collection.
 */
export async function resetCollection(collection: string): Promise<{ success: boolean }> {
  return await runChroma({ action: 'reset', collection }) as { success: boolean }
}

/**
 * List all collections.
 */
export async function listCollections(): Promise<CollectionInfo[]> {
  const result = await runChroma({ action: 'list_collections' }) as { collections: CollectionInfo[] }
  return result.collections
}

// ===== COSINE SIMILARITY (for in-memory search fallback) =====

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Find top-K most similar vectors to a query vector.
 */
export function findSimilar(
  queryEmbedding: number[],
  embeddings: Array<{ id: string; embedding: number[] }>,
  topK: number = 10,
): Array<{ id: string; score: number }> {
  const scored = embeddings.map(({ id, embedding }) => ({
    id,
    score: cosineSimilarity(queryEmbedding, embedding),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}
