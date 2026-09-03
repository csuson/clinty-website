/** Parse and verify Meta signed_request (HMAC-SHA256). Returns payload or null. */
export async function parseMetaSignedRequest(
  signedRequest: string,
  appSecret: string,
): Promise<Record<string, unknown> | null> {
  const parts = signedRequest.split('.', 2)
  if (parts.length !== 2) return null

  const [encodedSig, payload] = parts
  if (!encodedSig || !payload) return null

  let sig: Uint8Array
  let data: Record<string, unknown>
  try {
    sig = base64UrlDecode(encodedSig)
    data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as Record<string, unknown>
  } catch {
    return null
  }

  const algorithm = typeof data.algorithm === 'string' ? data.algorithm.toUpperCase() : ''
  if (algorithm !== 'HMAC-SHA256') return null

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)),
  )

  if (!timingSafeEqual(sig, expected)) return null
  return data
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4)
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}
