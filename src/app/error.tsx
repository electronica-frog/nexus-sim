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
      <Card className="bg-zinc-900 border-zinc-800 max-w-lg w-full">
        <CardContent className="p-8 text-center space-y-4">
          <div className="text-5xl">&#9889;</div>
          <h2 className="text-xl font-bold text-zinc-100">Error de Carga</h2>
          <p className="text-sm text-zinc-400">
            Ocurrio un error inesperado al cargar NEXUS.
          </p>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-left">
            <p className="text-xs font-mono text-red-400 break-all">
              {error.message?.slice(0, 500)}
            </p>
            {error.digest && (
              <p className="text-[10px] text-zinc-500 mt-2">Digest: {error.digest}</p>
            )}
            {error.stack && (
              <details className="mt-2">
                <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-300">
                  Stack Trace
                </summary>
                <pre className="text-[9px] text-zinc-600 mt-1 overflow-auto max-h-40 whitespace-pre-wrap">
                  {error.stack.slice(0, 2000)}
                </pre>
              </details>
            )}
          </div>
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
