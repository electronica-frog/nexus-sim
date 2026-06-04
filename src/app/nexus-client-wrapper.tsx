'use client'

import dynamic from 'next/dynamic'

const NexusContent = dynamic(() => import('./nexus-content'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-5xl animate-pulse">🧬</div>
        <p className="text-zinc-300 text-sm">Cargando NEXUS Sim...</p>
      </div>
    </div>
  ),
})

export default function NexusClientWrapper() {
  return <NexusContent />
}
