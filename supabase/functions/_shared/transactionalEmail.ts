type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

function normalizeRecipients(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to]
  return [...new Set(list.map((value) => value.trim().toLowerCase()).filter(Boolean))]
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  const from = Deno.env.get('TRANSACTIONAL_FROM_EMAIL')?.trim() ?? 'Clinty <notifications@clinty.net>'
  const recipients = normalizeRecipients(input.to)

  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set; skipping transactional email')
    return false
  }

  if (recipients.length === 0) {
    console.warn('No recipients for transactional email; skipping')
    return false
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error('Transactional email failed:', response.status, detail)
    return false
  }

  return true
}

export function parseAdminNotificationEmails(): string[] {
  return [...new Set(
    (Deno.env.get('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )]
}
