import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'
import type { AiTokenUsage } from '../aiUsage'
import type { H5PBuilderForm, H5PContentTypeId } from './types'

export type GeneratedH5PContent = Partial<H5PBuilderForm> & {
  contentType?: H5PContentTypeId
}

export async function generateH5PContentWithAi(
  contentType: H5PContentTypeId,
  prompt: string,
): Promise<{ content: GeneratedH5PContent; usage: AiTokenUsage }> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('generate-h5p-content', {
    body: { content_type: contentType, prompt },
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  const data = result.data as { content?: GeneratedH5PContent; usage?: AiTokenUsage }
  if (!data.content) {
    throw new Error('AI returned no content')
  }

  return {
    content: data.content,
    usage: data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }
}

function hasFunctionFailure(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string' &&
      (data as { error: string }).error,
  )
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function applyGeneratedH5PContent(
  form: H5PBuilderForm,
  generated: GeneratedH5PContent,
): H5PBuilderForm {
  const next: H5PBuilderForm = { ...form }

  if (generated.contentType && generated.contentType === form.contentType) {
    // keep current type
  }

  if (asString(generated.title)) next.title = generated.title!.trim()
  if (asString(generated.intro)) next.intro = generated.intro!.trim()
  if (asString(generated.videoUrl)) next.videoUrl = generated.videoUrl!.trim()
  if (asString(generated.blanksText)) next.blanksText = generated.blanksText!

  if (Array.isArray(generated.quizQuestions) && generated.quizQuestions.length) {
    next.quizQuestions = generated.quizQuestions.map((question) => ({
      question: asString(question.question) ?? '',
      answers: Array.isArray(question.answers)
        ? question.answers.map((answer) => asString(answer) ?? '').filter(Boolean)
        : [''],
      correctIndex: asNumber(question.correctIndex) ?? 0,
    }))
  }

  if (Array.isArray(generated.dragPairs) && generated.dragPairs.length) {
    next.dragPairs = generated.dragPairs.map((pair) => ({
      draggable: asString(pair.draggable) ?? '',
      dropZone: asString(pair.dropZone) ?? '',
    }))
  }

  if (Array.isArray(generated.accordionPanels) && generated.accordionPanels.length) {
    next.accordionPanels = generated.accordionPanels.map((panel) => ({
      title: asString(panel.title) ?? 'Section',
      content: asString(panel.content) ?? '',
    }))
  }

  if (Array.isArray(generated.timelineEvents) && generated.timelineEvents.length) {
    next.timelineEvents = generated.timelineEvents.map((event) => ({
      headline: asString(event.headline) ?? 'Event',
      text: asString(event.text) ?? '',
      startDate: asString(event.startDate) ?? String(new Date().getFullYear()),
    }))
  }

  if (Array.isArray(generated.slides) && generated.slides.length) {
    next.slides = generated.slides.map((slide) => ({
      title: asString(slide.title) ?? 'Slide',
      content: asString(slide.content) ?? '',
    }))
  }

  if (Array.isArray(generated.interactions) && generated.interactions.length) {
    next.interactions = generated.interactions.map((interaction) => ({
      time: asNumber(interaction.time) ?? 0,
      label: asString(interaction.label) ?? 'Note',
      text: asString(interaction.text) ?? '',
    }))
  }

  return next
}
