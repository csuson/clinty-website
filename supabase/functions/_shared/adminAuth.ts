export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const allowed = new Set(
    (Deno.env.get('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )
  return allowed.has(email.toLowerCase())
}
