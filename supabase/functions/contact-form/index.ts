import { sendTransactionalEmail } from '../_shared/transactionalEmail.ts'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'

let corsHeaders: Record<string, string> = {}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(req)
  }

  corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const inbox = Deno.env.get('CONTACT_INBOX_EMAIL')?.trim()
  if (!inbox) {
    return json({ error: 'Contact form is not configured' }, 503)
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const honeypot = typeof body.website === 'string' ? body.website.trim() : ''
  if (honeypot) {
    return json({ ok: true })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const company = typeof body.company === 'string' ? body.company.trim() : ''
  const inquiryType = typeof body.inquiryType === 'string' ? body.inquiryType.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!name || !email || !inquiryType || !message) {
    return json({ error: 'Missing required fields' }, 400)
  }
  if (!isValidEmail(email)) {
    return json({ error: 'Invalid email address' }, 400)
  }
  if (name.length > 120 || email.length > 254 || company.length > 160 || inquiryType.length > 80 || message.length > 5000) {
    return json({ error: 'Message is too long' }, 400)
  }

  const subject = `[Clinty] ${inquiryType}${company ? ` — ${company}` : ''}`
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    company ? `Company: ${company}` : '',
    `Inquiry type: ${inquiryType}`,
    '',
    'Message:',
    message,
  ]
    .filter(Boolean)
    .join('\n')

  const html = [
    `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(email)}</p>`,
    company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : '',
    `<p><strong>Inquiry type:</strong> ${escapeHtml(inquiryType)}</p>`,
    '<p><strong>Message:</strong></p>',
    `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
  ]
    .filter(Boolean)
    .join('')

  const sent = await sendTransactionalEmail({
    to: inbox,
    subject,
    html,
    text,
  })

  if (!sent) {
    return json({ error: 'Unable to send message right now. Please try WhatsApp instead.' }, 502)
  }

  return json({ ok: true })
})
