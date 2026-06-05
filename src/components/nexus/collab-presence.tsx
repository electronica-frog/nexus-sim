'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Users, Eye } from 'lucide-react'
import { useNexusSocket } from '@/hooks/use-nexus-socket'

interface CollabPresenceProps {
  projectId: string | undefined
}

/**
 * Real-time collaboration presence indicator.
 * Shows connection status, user count, remote cursors, and agent focus.
 */
export function CollabPresence({ projectId }: CollabPresenceProps) {
  const { connected, userCount, remoteFocus } = useNexusSocket(projectId)

  return (
    <div className="flex items-center gap-2">
      {/* Connection status */}
      <Badge
        variant="outline"
        className={`text-[10px] px-2 py-0.5 transition-colors ${
          connected
            ? 'border-emerald-700 text-emerald-400 bg-emerald-500/5'
            : 'border-zinc-700 text-zinc-500 bg-zinc-800/50'
        }`}
      >
        {connected ? (
          <><Wifi className="h-3 w-3 mr-1" />Online</>
        ) : (
          <><WifiOff className="h-3 w-3 mr-1" />Offline</>
        )}
      </Badge>

      {/* User count */}
      {connected && (
        <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] px-2 py-0.5">
          <Users className="h-3 w-3 mr-1" />
          {userCount} {userCount === 1 ? 'usuario' : 'usuarios'}
        </Badge>
      )}

      {/* Remote agent focus indicator */}
      <AnimatePresence>
        {remoteFocus && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1"
          >
            <Badge
              variant="outline"
              className="border-violet-700 text-violet-400 text-[10px] px-2 py-0.5 bg-violet-500/10"
            >
              <Eye className="h-3 w-3 mr-1" />
              Alguien viendo: {remoteFocus.agentName}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
