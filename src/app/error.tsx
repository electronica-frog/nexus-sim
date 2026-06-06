'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('NEXUS Error Boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          <div className="text-5xl">⚡</div>
          <h2 className="text-xl font-bold text-zinc-100">Error de Carga</h2>
          <p className="text-sm text-zinc-400">
            Ocurrió un error inesperado al cargar NEXUS.
          </p>
          <p className="text-xs text-zinc-500 font-mono break-all">
            {error.message?.slice(0, 200)}
          </p>
          <Button
            onClick={reset}
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
