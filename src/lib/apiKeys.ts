const API_KEY_PREFIX = 'clinty_sk_'
const API_KEY_RANDOM_LENGTH = 48
export const API_KEY_LENGTH = API_KEY_PREFIX.length + API_KEY_RANDOM_LENGTH

export function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${API_KEY_PREFIX}${token}`
}

export function getKeyPrefix(key: string): string {
  return key.slice(0, 16)
}

export function maskApiKey(prefix: string): string {
  const hiddenLength = Math.max(API_KEY_LENGTH - prefix.length, 0)
  return `${prefix}${'•'.repeat(hiddenLength)}`
}

export async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyApiKey(key: string, storedHash: string): Promise<boolean> {
  return (await hashApiKey(key)) === storedHash
}
