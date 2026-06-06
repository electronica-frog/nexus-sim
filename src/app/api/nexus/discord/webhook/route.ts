import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Discord embed color map for wave types
const WAVE_TYPE_COLORS: Record<string, number> = {
  brainstorm: 0xf59e0b,  // amber
  critique: 0xef4444,   // red
  synthesize: 0x06b6d4,  // cyan
  execute: 0x10b981,     // emerald
  quality_gate: 0xa855f7, // purple
}

interface DiscordEmbed {
  title: string
  description: string
  color: number
  fields?: Array<{ name: string; value: string; inline?: boolean }>
  footer?: { text: string }
  timestamp?: string
}

// POST /api/nexus/discord/webhook — Send wave results to a Discord webhook URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhookUrl, waveId, projectId, customMessage, customEmbeds } = body

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Se requiere webhookUrl' }, { status: 400 })
    }

    // Build embeds from wave data if waveId provided
    let embeds: DiscordEmbed[] = customEmbeds || []

    if (waveId && projectId) {
      const wave = await db.wave.findUnique({
        where: { id: waveId },
        include: {
          responses: {
            include: {
              projectAgent: {
                include: { agent: { select: { name: true, emoji: true, division: true } } },
              },
            },
          },
        },
      })

      if (wave) {
        const color = WAVE_TYPE_COLORS[wave.type] || 0x6366f1
        const avgConfidence = wave.responses.length > 0
          ? Math.round((wave.responses.reduce((s, r) => s + r.confidence, 0) / wave.responses.length) * 100)
          : 0

        // Mood summary
        const moodCounts: Record<string, number> = {}
        for (const r of wave.responses) {
          moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1
        }
        const moodStr = Object.entries(moodCounts)
          .map(([mood, count]) => `${mood}: ${count}`)
          .join(', ')

        // Build agent responses (max 10 for Discord limits)
        const agentFields = wave.responses.slice(0, 10).map((r) => ({
          name: `${r.projectAgent.agent.emoji} ${r.projectAgent.agent.name}`,
          value: r.content.length > 300
            ? r.content.slice(0, 300) + '...'
            : r.content,
          inline: false,
        }))

        const mainEmbed: DiscordEmbed = {
          title: `🧬 NEXUS — Oleada #${wave.number} (${wave.type})`,
          description: wave.prompt.length > 200 ? wave.prompt.slice(0, 200) + '...' : wave.prompt,
          color,
          fields: [
            { name: '📊 Estado', value: wave.status, inline: true },
            { name: '🎯 Confianza Promedio', value: `${avgConfidence}%`, inline: true },
            { name: '💬 Respuestas', value: `${wave.responses.length}`, inline: true },
            { name: '🧠 Mood Distribution', value: moodStr || 'N/A', inline: true },
          ],
          timestamp: wave.completedAt ? new Date(wave.completedAt).toISOString() : undefined,
          footer: { text: 'NEXUS Sim — Multi-Agent Collaboration' },
        }

        // Synthesis embed if available
        if (wave.result) {
          embeds.push(mainEmbed)
          embeds.push({
            title: '🧠 Síntesis',
            description: wave.result.length > 1500 ? wave.result.slice(0, 1500) + '...' : wave.result,
            color: 0x06b6d4,
            footer: { text: 'NEXUS Sim' },
          })
        } else {
          embeds = [mainEmbed]
        }

        // Agent response embeds (batch them)
        if (agentFields.length > 0) {
          // Discord allows max 25 fields per embed, max 10 embeds
          for (let i = 0; i < agentFields.length; i += 5) {
            embeds.push({
              title: `💬 Respuestas de Agentes (${i + 1}-${Math.min(i + 5, agentFields.length)})`,
              description: '',
              color,
              fields: agentFields.slice(i, i + 5),
            })
          }
        }
      }
    }

    // If custom message and no embeds built, create simple embed
    if (embeds.length === 0) {
      embeds = [{
        title: customMessage || '🧬 NEXUS Notification',
        description: customMessage || 'Mensaje desde NEXUS Sim',
        color: 0x10b981,
        timestamp: new Date().toISOString(),
        footer: { text: 'NEXUS Sim' },
      }]
    }

    // Truncate to Discord's 10 embed limit
    if (embeds.length > 10) {
      embeds = embeds.slice(0, 10)
    }

    // Send to Discord webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds }),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error('Discord webhook error:', errorText)
      return NextResponse.json({ error: 'Error al enviar a Discord', details: errorText }, { status: 502 })
    }

    const discordData = await webhookResponse.json()

    return NextResponse.json({
      success: true,
      messageId: discordData.id,
      embedsCount: embeds.length,
    })
  } catch (error) {
    console.error('Discord webhook error:', error)
    return NextResponse.json({ error: 'Error interno al enviar webhook' }, { status: 500 })
  }
}
