'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Activity } from 'lucide-react'

export function StatCard({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: number; color: string }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-zinc-800 ${color}`}><Icon className="h-4 w-4" /></div>
        <div><p className="text-lg font-bold">{value}</p><p className="text-xs text-zinc-300">{label}</p></div>
      </CardContent>
    </Card>
  )
}
