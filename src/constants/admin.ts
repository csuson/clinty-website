export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return parseAdminEmails(import.meta.env.VITE_ADMIN_EMAILS).includes(email.toLowerCase())
}
