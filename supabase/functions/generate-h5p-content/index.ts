import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  assertWithinTokenLimit,
  readOpenAiUsage,
  recordAiUsageWithAlerts,
} from '../_shared/aiUsage.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `You generate structured H5P builder content for Clinty.
Return ONLY valid JSON (no markdown fences) matching the requested content type.

Supported contentType values:
- question-set: { title, intro, quizQuestions: [{ question, answers: string[], correctIndex: number }] }
- drag-and-drop: { title, intro, dragPairs: [{ draggable, dropZone }] }
- blanks: { title, intro, blanksText } — wrap answers in *asterisks*
- accordion: { title, accordionPanels: [{ title, content }] }
- timeline: { title, intro, timelineEvents: [{ headline, startDate, text }] }
- course-presentation: { title, intro, slides: [{ title, content }] }
- interactive-video: { title, intro, videoUrl, interactions: [{ time, label, text }] }
- dialog-cards: { title, intro, vocabCards: [{ term, translation }] }
- flashcards: { title, intro, vocabCards: [{ term, translation }] }
- single-choice-set: { title, intro, quizQuestions: [{ question, answers: string[], correctIndex: number }] }
- mark-the-words: { title, markTheWordsTaskDescription, markTheWordsText } — wrap clickable words in *asterisks*
- crossword: { title, intro, vocabCards: [{ term, translation }] } — term is grid answer, translation is clue

Rules:
- Use only facts from the user prompt and business context
- Do not invent policies, prices, or contact details
- Keep content concise and training-ready
- For quiz questions, provide 3-4 answers with exactly one correctIndex
- correctIndex is zero-based`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')?.trim()
    if (!openaiKey) {
      return json({
        error: 'AI generation is not configured. Set OPENAI_API_KEY in Supabase Edge Function secrets.',
      }, 503)
    }

    await assertWithinTokenLimit(admin, user.id)

    const body = await req.json().catch(() => ({}))
    const contentType = typeof body.content_type === 'string' ? body.content_type.trim() : ''
    const userPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''

    if (!contentType) {
      return json({ error: 'Missing content_type' }, 400)
    }
    if (!userPrompt) {
      return json({ error: 'Missing prompt' }, 400)
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `contentType: ${contentType}\n\n${userPrompt}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = typeof data?.error?.message === 'string'
        ? data.error.message
        : `OpenAI request failed (${response.status})`
      return json({ error: message }, 502)
    }

    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      return json({ error: 'OpenAI returned empty content' }, 502)
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(content)
    } catch {
      return json({ error: 'OpenAI returned invalid JSON' }, 502)
    }

    const usage = readOpenAiUsage(data)
    await recordAiUsageWithAlerts(admin, {
      user_id: user.id,
      feature: 'h5p_generate',
      model: MODEL,
      usage,
    })

    return json({ content: parsed, usage })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    const status = message.includes('token limit') ? 429 : 500
    return json({ error: message }, status)
  }
})

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
