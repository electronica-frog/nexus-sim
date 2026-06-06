import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// WAVE TYPE EMOJI MAP
const WAVE_EMOJIS: Record<string, string> = {
  brainstorm: '💡',
  critique: '⚠️',
  synthesize: '🧠',
  execute: '⚡',
  quality_gate: '🛡️',
}

const WAVE_TYPE_COLORS: Record<string, number> = {
  brainstorm: 0xf59e0b,
  critique: 0xef4444,
  synthesize: 0x06b6d4,
  execute: 0x10b981,
  quality_gate: 0xa855f7,
}

// POST /api/nexus/discord/announce — Announce wave start/complete to Discord
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      webhookUrl,
      projectId,
      event,       // 'wave_start' | 'wave_complete' | 'pipeline_start' | 'pipeline_complete' | 'custom'
      waveNumber,
      waveType,
      prompt,
      result,
      agentCount,
      totalResponses,
      customTitle,
      customMessage,
    } = body

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Se requiere webhookUrl' }, { status: 400 })
    }

    if (!event) {
      return NextResponse.json({ error: 'Se requiere event type' }, { status: 400 })
    }

    // Get project name if projectId provided
    let projectName = 'NEXUS Sim'
    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      })
      if (project) projectName = project.name
    }

    const color = WAVE_TYPE_COLORS[waveType] || 0x10b981
    const emoji = WAVE_EMOJIS[waveType] || '🧬'
    const timestamp = new Date().toISOString()

    let embeds: Array<{
      title: string
      description: string
      color: number
      fields?: Array<{ name: string; value: string; inline?: boolean }>
      timestamp?: string
      footer?: { text: string }
    }> = []

    switch (event) {
      case 'wave_start':
        embeds = [{
          title: `${emoji} Oleada #${waveNumber || '?'} Iniciada`,
          description: prompt ? (prompt.length > 300 ? prompt.slice(0, 300) + '...' : prompt) : 'Sin prompt',
          color,
          fields: [
            { name: '📋 Tipo', value: waveType || 'N/A', inline: true },
            { name: '👥 Agentes', value: String(agentCount || '?'), inline: true },
            { name: '📁 Proyecto', value: projectName, inline: true },
          ],
          timestamp,
          footer: { text: 'NEXUS Sim — Wave Start' },
        }]
        break

      case 'wave_complete':
        embeds = [{
          title: `${emoji} Oleada #${waveNumber || '?'} Completada`,
          description: `Resultados de la oleada ${waveType || ''}`,
          color,
          fields: [
            { name: '📋 Tipo', value: waveType || 'N/A', inline: true },
            { name: '💬 Respuestas', value: String(totalResponses || 0), inline: true },
            { name: '📁 Proyecto', value: projectName, inline: true },
          ],
          timestamp,
          footer: { text: 'NEXUS Sim — Wave Complete' },
        }]
        // Add synthesis if provided
        if (result) {
          embeds.push({
            title: '🧠 Síntesis',
            description: result.length > 1500 ? result.slice(0, 1500) + '...' : result,
            color: 0x06b6d4,
            timestamp,
            footer: { text: 'NEXUS Sim' },
          })
        }
        break

      case 'pipeline_start':
        embeds = [{
          title: '🚀 Pipeline Automático Iniciado',
          description: prompt ? (prompt.length > 300 ? prompt.slice(0, 300) + '...' : prompt) : 'Pipeline de 5 pasos',
          color: 0xf59e0b,
          fields: [
            { name: '👥 Agentes', value: String(agentCount || '?'), inline: true },
            { name: '📁 Proyecto', value: projectName, inline: true },
            { name: '📋 Pasos', value: 'brainstorm → critique → synthesize → execute → quality_gate', inline: false },
          ],
          timestamp,
          footer: { text: 'NEXUS Sim — Pipeline Start' },
        }]
        break

      case 'pipeline_complete':
        embeds = [{
          title: '🎉 Pipeline Completado',
          description: 'El pipeline automático de 5 pasos ha finalizado exitosamente',
          color: 0x10b981,
          fields: [
            { name: '💬 Respuestas Totales', value: String(totalResponses || 0), inline: true },
            { name: '📁 Proyecto', value: projectName, inline: true },
          ],
          timestamp,
          footer: { text: 'NEXUS Sim — Pipeline Complete' },
        }]
        if (result) {
          embeds.push({
            title: '📊 Resumen Ejecutivo',
            description: result.length > 1500 ? result.slice(0, 1500) + '...' : result,
            color: 0x10b981,
            timestamp,
            footer: { text: 'NEXUS Sim' },
          })
        }
        break

      case 'custom':
        embeds = [{
          title: customTitle || '🧬 NEXUS Announcement',
          description: customMessage || 'Custom announcement from NEXUS Sim',
          color,
          timestamp,
          footer: { text: `NEXUS Sim — ${projectName}` },
        }]
        break

      default:
        return NextResponse.json({ error: `Tipo de evento no soportado: ${event}` }, { status: 400 })
    }

    // Send to Discord webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds }),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error('Discord announce error:', errorText)
      return NextResponse.json({ error: 'Error al enviar anuncio a Discord', details: errorText }, { status: 502 })
    }

    const discordData = await webhookResponse.json()

    return NextResponse.json({
      success: true,
      messageId: discordData.id,
      event,
      embedsCount: embeds.length,
    })
  } catch (error) {
    console.error('Discord announce error:', error)
    return NextResponse.json({ error: 'Error interno al enviar anuncio' }, { status: 500 })
  }
}
