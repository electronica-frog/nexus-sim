/**
 * Vector Search — TF-IDF + Cosine Similarity
 * Pure JS implementation for semantic memory search (NO external dependencies).
 * Optimized for Spanish text with stop-word removal and stemmer-free approach.
 */

// ===== STOP WORDS (same set used in semantic-memory.ts) =====

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a',
  'en', 'por', 'para', 'con', 'sin', 'sobre', 'entre', 'hacia', 'hasta', 'desde',
  'que', 'es', 'son', 'ser', 'estar', 'fue', 'ha', 'han', 'o', 'y', 'pero', 'no',
  'más', 'menos', 'muy', 'ya', 'como', 'se', 'su', 'sus', 'lo', 'le', 'les',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'me', 'te', 'nos', 'mi', 'tu', 'nuestro', 'suyo',
  'qué', 'cómo', 'cuándo', 'dónde', 'quién', 'cuál',
  'también', 'puede', 'pueden', 'tiene', 'tienen', 'todo', 'todos', 'todas',
  'cada', 'otro', 'otra', 'otros', 'otras', 'algo', 'nada', 'mucho',
  'hay', 'hay', 'sea', 'sí', 'no', 'bien', 'mal', 'si', 'ni',
])

// ===== Types =====

export interface SearchIndex {
  documents: Array<{ id: string; content: string; tokens: string[] }>
  vocabulary: string[]           // sorted unique terms across all documents
  idfMap: Map<string, number>    // term → IDF value
  tfidfVectors: Map<string, Map<string, number>>  // docId → (term → tfidf)
}

export interface SearchResult {
  id: string
  score: number
  content: string
  matchedTerms: string[]
}

// ===== Tokenizer =====

/**
 * Tokenizes Spanish text: lowercases, strips non-alpha, removes stop words,
 * and collapses tokens shorter than 2 chars.
 */
export function tokenize(text: string): string[] {
  if (!text) return []

  return text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

// ===== TF-IDF =====

/**
 * Computes a raw term-frequency map for a single token list.
 */
function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1)
  }
  return tf
}

/**
 * Computes IDF for every unique term across a list of documents.
 * IDF(t) = log(N / df(t)), where N = total docs, df(t) = docs containing term t.
 */
function computeIDF(
  documents: string[][],
): Map<string, number> {
  const N = documents.length
  if (N === 0) return new Map()

  // Document frequency
  const df = new Map<string, number>()
  for (const doc of documents) {
    const seen = new Set<string>(doc)
    for (const term of seen) {
      df.set(term, (df.get(term) || 0) + 1)
    }
  }

  const idf = new Map<string, number>()
  for (const [term, count] of df) {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1) // smoothed IDF
  }

  return idf
}

/**
 * Computes TF-IDF vectors for a set of documents.
 * Returns an array of Maps (one per document): term → tfidf weight.
 * Also returns the shared vocabulary and IDF map.
 */
export function computeTFIDF(documents: string[]): {
  vectors: Map<string, number>[]
  vocabulary: string[]
  idfMap: Map<string, number>
} {
  const tokenizedDocs = documents.map(tokenize)
  const idfMap = computeIDF(tokenizedDocs)

  // Collect sorted vocabulary
  const vocabSet = new Set<string>()
  for (const [, term] of idfMap) {
    vocabSet.add(term)
  }
  const vocabulary = Array.from(idfMap.keys()).sort()

  // Compute TF-IDF for each document
  const vectors = tokenizedDocs.map((tokens) => {
    const tf = computeTF(tokens)
    const vec = new Map<string, number>()
    for (const [term, freq] of tf) {
      const idf = idfMap.get(term) || 0
      vec.set(term, freq * idf)
    }
    return vec
  })

  return { vectors, vocabulary, idfMap }
}

// ===== Cosine Similarity =====

/**
 * Computes cosine similarity between two sparse vectors (Maps).
 */
export function cosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>,
): number {
  // Dot product over shared keys
  let dot = 0
  // Iterate over the smaller vector for efficiency
  const [smaller, larger] = vecA.size <= vecB.size ? [vecA, vecB] : [vecB, vecA]
  for (const [term, valA] of smaller) {
    const valB = larger.get(term)
    if (valB !== undefined) {
      dot += valA * valB
    }
  }

  // Magnitudes
  let magA = 0
  for (const v of vecA.values()) magA += v * v
  let magB = 0
  for (const v of vecB.values()) magB += v * v

  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  if (denom === 0) return 0

  return dot / denom
}

// ===== Convenience: compute a single TF-IDF vector from text (using existing IDF) =====

/**
 * Computes the TF-IDF vector for a single text using a pre-computed IDF map.
 * Useful for queries and for pre-computing embeddings to store.
 */
export function computeTFIDFVector(
  text: string,
  idfMap?: Map<string, number>,
): Map<string, number> {
  const tokens = tokenize(text)
  const tf = computeTF(tokens)

  // If no idfMap provided, each term gets TF * 1 (pure TF)
  const idf = idfMap || new Map<string, number>()

  const vec = new Map<string, number>()
  for (const [term, freq] of tf) {
    vec.set(term, freq * (idf.get(term) || 1))
  }
  return vec
}

/**
 * Converts a sparse vector (Map) to a JSON-serializable format.
 * Returns { term: value, ... }
 */
export function vectorToJson(vec: Map<string, number>): Record<string, number> {
  const obj: Record<string, number> = {}
  for (const [k, v] of vec) {
    obj[k] = v
  }
  return obj
}

/**
 * Converts a JSON object back to a sparse vector Map.
 */
export function jsonToVector(json: Record<string, number>): Map<string, number> {
  const vec = new Map<string, number>()
  for (const [k, v] of Object.entries(json)) {
    vec.set(k, v)
  }
  return vec
}

/**
 * Converts a sparse vector (Map) to a dense number[] aligned with a vocabulary.
 * All terms not in the vector get 0.
 */
export function vectorToArray(vec: Map<string, number>, vocabulary: string[]): number[] {
  return vocabulary.map((term) => vec.get(term) || 0)
}

// ===== Build Search Index =====

/**
 * Builds an in-memory search index from memory objects.
 * The index can be queried with `search()`.
 */
export function buildSearchIndex(
  memories: Array<{ content: string; id: string }>,
): SearchIndex {
  if (memories.length === 0) {
    return { documents: [], vocabulary: [], idfMap: new Map(), tfidfVectors: new Map() }
  }

  const tokenizedDocs = memories.map((m) => tokenize(m.content))
  const idfMap = computeIDF(tokenizedDocs)

  const vocabulary = Array.from(idfMap.keys()).sort()

  const tfidfVectors = new Map<string, Map<string, number>>()
  const documents: SearchIndex['documents'] = []

  for (let i = 0; i < memories.length; i++) {
    const m = memories[i]
    const tf = computeTF(tokenizedDocs[i])
    const vec = new Map<string, number>()
    for (const [term, freq] of tf) {
      vec.set(term, freq * (idfMap.get(term) || 0))
    }
    tfidfVectors.set(m.id, vec)
    documents.push({ id: m.id, content: m.content, tokens: tokenizedDocs[i] })
  }

  return { documents, vocabulary, idfMap, tfidfVectors }
}

// ===== Search =====

/**
 * Searches the index with a query string, returning results sorted by similarity.
 * Only results with score > 0 are returned.
 */
export function search(
  index: SearchIndex,
  query: string,
  topK: number = 20,
): SearchResult[] {
  if (!query || index.documents.length === 0) return []

  // Compute query TF-IDF using the index's IDF map
  const queryTokens = tokenize(query)
  const queryTF = computeTF(queryTokens)
  const queryVec = new Map<string, number>()
  for (const [term, freq] of queryTF) {
    queryVec.set(term, freq * (index.idfMap.get(term) || 1))
  }

  const results: SearchResult[] = []

  for (const doc of index.documents) {
    const docVec = index.tfidfVectors.get(doc.id)
    if (!docVec) continue

    const score = cosineSimilarity(queryVec, docVec)
    if (score > 0) {
      // Find matched terms (intersection of query tokens and doc tokens)
      const queryTokenSet = new Set(queryTokens)
      const matchedTerms = doc.tokens.filter((t) => queryTokenSet.has(t))

      results.push({
        id: doc.id,
        score,
        content: doc.content,
        matchedTerms: [...new Set(matchedTerms)], // deduplicate
      })
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)

  return results.slice(0, topK)
}
