/**
 * Shared WhatsApp session teardown used by Admin remove and Integrations disconnect.
 *
 * 1. Best-effort Baileys logout + Storage auth wipe via gateway `/v1/login/disconnect`
 * 2. Delete the `whatsapp_connections` row
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type SupabaseAdmin = ReturnType<typeof createClient>

export type GatewayCaller = (
  method: string,
  path: string,
  body?: Record<string, unknown>,
) => Promise<Record<string, unknown>>

export type RemoveWhatsAppConnectionResult = {
  gatewayDisconnected: boolean
  gatewayError: string | null
  rowDeleted: boolean
}

/**
 * Disconnect the live gateway session (clears Baileys creds in Storage) and delete
 * the per-user `whatsapp_connections` row. Gateway failures are best-effort so a
 * dead gateway cannot block removing a stuck DB row.
 */
export async function removeWhatsAppConnection(
  admin: SupabaseAdmin,
  userId: string,
  options: {
    gatewayUrl?: string | null
    gatewayKey?: string | null
    callGateway?: GatewayCaller
  } = {},
): Promise<RemoveWhatsAppConnectionResult> {
  const id = (userId || '').trim()
  if (!id) {
    throw new Error('user_id is required')
  }

  let gatewayDisconnected = false
  let gatewayError: string | null = null
  const gatewayUrl = (options.gatewayUrl || '').trim()
  const gatewayKey = (options.gatewayKey || '').trim()
  const callGateway = options.callGateway

  if (gatewayUrl && gatewayKey && callGateway) {
    try {
      await callGateway('POST', '/v1/login/disconnect', { user_id: id })
      gatewayDisconnected = true
    } catch (err) {
      gatewayError = err instanceof Error ? err.message : String(err)
      console.warn(
        `WhatsApp gateway disconnect failed during connection remove (user=${id}):`,
        gatewayError,
      )
    }
  }

  const { error } = await admin.from('whatsapp_connections').delete().eq('user_id', id)
  if (error) {
    throw new Error(error.message)
  }

  return {
    gatewayDisconnected,
    gatewayError,
    rowDeleted: true,
  }
}
