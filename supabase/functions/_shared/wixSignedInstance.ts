/**
 * Parse Wix's signed `instance` query parameter (external dashboard / Open App).
 * @see https://dev.wix.com/docs/build-apps/develop-your-app/access/app-instances/parse-the-app-instance-query-parameter
 */

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(normalized + pad)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

export type WixSignedInstancePayload = {
  instanceId: string
  uid?: string
  permissions?: string
  siteOwnerId?: string
  signDate?: string
}

/** Verify HMAC and return decoded payload, or null if invalid. */
export async function parseWixSignedInstance(
  instance: string,
  appSecret: string,
): Promise<WixSignedInstancePayload | null> {
  const trimmed = instance.trim()
  const secret = appSecret.trim()
  if (!trimmed || !secret) return null

  const dot = trimmed.indexOf('.')
  if (dot <= 0 || dot === trimmed.length - 1) return null

  const signaturePart = trimmed.slice(0, dot)
  const dataPart = trimmed.slice(dot + 1)

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const mac = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataPart)),
    )
    const provided = base64UrlToBytes(signaturePart)
    if (!bytesEqual(mac, provided)) return null

    const jsonBytes = base64UrlToBytes(dataPart)
    const parsed = JSON.parse(new TextDecoder().decode(jsonBytes)) as Record<string, unknown>
    const instanceId =
      typeof parsed.instanceId === 'string'
        ? parsed.instanceId.trim()
        : typeof parsed.instance_id === 'string'
          ? parsed.instance_id.trim()
          : ''
    if (!instanceId) return null

    return {
      instanceId,
      uid: typeof parsed.uid === 'string' ? parsed.uid : undefined,
      permissions: typeof parsed.permissions === 'string' ? parsed.permissions : undefined,
      siteOwnerId: typeof parsed.siteOwnerId === 'string' ? parsed.siteOwnerId : undefined,
      signDate: typeof parsed.signDate === 'string' ? parsed.signDate : undefined,
    }
  } catch {
    return null
  }
}
