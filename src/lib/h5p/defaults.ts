import type { PromptFields } from '../prompts'
import { H5P_CONTENT_TYPES } from './types'
import type {
  H5PAccordionPanel,
  H5PBuilderForm,
  H5PContentTypeId,
  H5PDragPair,
  H5PInteractiveVideoInteraction,
  H5PQuizQuestion,
  H5PQuizSettings,
  H5PSlide,
  H5PTimelineEvent,
} from './types'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function paragraphHtml(text: string): string {
  return `<p>${escapeHtml(text.trim())}</p>`
}

function extractBusinessName(background: string): string {
  const match = background.match(/^Business name:\s*(.+)$/im)
  if (match?.[1]) return match[1].trim()

  const firstLine = background.split('\n').map((line) => line.trim()).find(Boolean)
  if (!firstLine) return 'Your Business'

  const introMatch = firstLine.match(/^I'm (.+?),/i)
  if (introMatch?.[1]) return introMatch[1].trim()

  return firstLine.slice(0, 80)
}

function extractBulletItems(background: string, limit = 6): string[] {
  const items = background
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean)

  return items.slice(0, limit)
}

function extractSections(background: string): Array<{ title: string; body: string }> {
  const sections: Array<{ title: string; body: string }> = []
  let currentTitle = 'Overview'
  let currentLines: string[] = []

  for (const rawLine of background.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const headerMatch = line.match(/^([A-Za-z][A-Za-z0-9 /&()-]{2,40}):$/)
    if (headerMatch) {
      if (currentLines.length) {
        sections.push({ title: currentTitle, body: currentLines.join('\n') })
      }
      currentTitle = headerMatch[1]
      currentLines = []
      continue
    }

    currentLines.push(line)
  }

  if (currentLines.length) {
    sections.push({ title: currentTitle, body: currentLines.join('\n') })
  }

  return sections.slice(0, 8)
}

function extractKeyPhrases(background: string, limit = 4): string[] {
  const bullets = extractBulletItems(background, limit)
  if (bullets.length >= 2) {
    return bullets.map((item) => item.split(/[—–-]/)[0]?.trim() || item).slice(0, limit)
  }

  const words = background
    .replace(/https?:\/\/\S+/g, '')
    .match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g)

  return [...new Set(words ?? [])].slice(0, limit)
}

function extractYears(background: string): string[] {
  const years = background.match(/\b(19|20)\d{2}\b/g) ?? []
  return [...new Set(years)].slice(0, 5)
}

function buildAccordionPanels(prompts: PromptFields): H5PAccordionPanel[] {
  const sections = extractSections(prompts.background)
  const panels = sections.map((section) => ({
    title: section.title,
    content: section.body
      .split('\n')
      .map((line) => (line.startsWith('- ') ? `<li>${escapeHtml(line.slice(2))}</li>` : paragraphHtml(line)))
      .join(''),
  }))

  if (prompts.promotions.trim()) {
    panels.push({
      title: 'Current promotions',
      content: paragraphHtml(prompts.promotions.trim()),
    })
  }

  return panels.length ? panels : [{ title: 'About us', content: paragraphHtml(prompts.background.slice(0, 400)) }]
}

function buildSlides(prompts: PromptFields): H5PSlide[] {
  const sections = extractSections(prompts.background)
  if (sections.length) {
    return sections.map((section) => ({
      title: section.title,
      content: section.body.slice(0, 600),
    }))
  }

  return [{ title: extractBusinessName(prompts.background), content: prompts.background.slice(0, 600) }]
}

function buildQuizQuestions(prompts: PromptFields): H5PQuizQuestion[] {
  const businessName = extractBusinessName(prompts.background)
  const bullets = extractBulletItems(prompts.background, 4)
  const questions: H5PQuizQuestion[] = [
    {
      question: `What is the business name described in your background?`,
      answers: [businessName, 'Unknown Business', 'Sample Company', 'Not listed'],
      correctIndex: 0,
    },
  ]

  for (const bullet of bullets.slice(0, 3)) {
    const topic = bullet.split(/[—–-]/)[0]?.trim() || bullet
    const wrongOptions = extractKeyPhrases(prompts.background, 3).filter((item) => item !== topic)
    questions.push({
      question: `Which of the following is offered or mentioned by ${businessName}?`,
      answers: [topic, wrongOptions[0] ?? 'Unrelated service', wrongOptions[1] ?? 'Generic option', wrongOptions[2] ?? 'None of the above'],
      correctIndex: 0,
    })
  }

  return questions.slice(0, 5)
}

function buildDragPairs(prompts: PromptFields): H5PDragPair[] {
  const bullets = extractBulletItems(prompts.background, 4)
  if (bullets.length >= 2) {
    return bullets.slice(0, 4).map((item) => {
      const [left, right] = item.split(/[—–-]/).map((part) => part.trim())
      return {
        draggable: left || item,
        dropZone: right || 'Key detail',
      }
    })
  }

  const phrases = extractKeyPhrases(prompts.background, 4)
  return phrases.map((phrase, index) => ({
    draggable: phrase,
    dropZone: `Category ${index + 1}`,
  }))
}

function buildTimelineEvents(prompts: PromptFields): H5PTimelineEvent[] {
  const years = extractYears(prompts.background)
  const businessName = extractBusinessName(prompts.background)
  const bullets = extractBulletItems(prompts.background, 4)

  if (years.length) {
    return years.map((year, index) => ({
      headline: bullets[index]?.split(/[—–-]/)[0]?.trim() || `${businessName} milestone`,
      text: bullets[index] || prompts.background.slice(0, 180),
      startDate: year,
    }))
  }

  const currentYear = new Date().getFullYear()
  return bullets.slice(0, 4).map((bullet, index) => ({
    headline: bullet.split(/[—–-]/)[0]?.trim() || `Milestone ${index + 1}`,
    text: bullet,
    startDate: String(currentYear - (bullets.length - index)),
  }))
}

function buildBlanksText(prompts: PromptFields): string {
  const businessName = extractBusinessName(prompts.background)
  const phrases = extractKeyPhrases(prompts.background, 2)
  const second = phrases.find((phrase) => phrase !== businessName) ?? 'your team'

  return `Welcome to *${businessName}*. We help customers learn more about *${second}*.`
}

function buildInteractions(prompts: PromptFields): H5PInteractiveVideoInteraction[] {
  const sections = extractSections(prompts.background)
  return sections.slice(0, 4).map((section, index) => ({
    time: index * 15,
    label: section.title,
    text: section.body.slice(0, 280),
  }))
}

function defaultQuizSettings(): H5PQuizSettings {
  return {
    showIntroPage: true,
    startButtonText: 'Start Quiz',
    progressType: 'dots',
    passPercentage: 50,
    showResultPage: true,
    showSolutionButton: true,
    showRetryButton: true,
    resultHeading: 'Results',
    scoreBarLabel: 'You got @finals out of @totals points',
  }
}

export function defaultH5PBuilderForm(
  contentType: H5PContentTypeId = 'question-set',
  prompts: PromptFields,
): H5PBuilderForm {
  const businessName = extractBusinessName(prompts.background)
  const intro = prompts.background.split('\n\n')[0]?.trim() || prompts.background.slice(0, 280)

  return {
    contentType,
    title: `${businessName} — ${H5P_CONTENT_TYPES.find((type) => type.id === contentType)?.label ?? 'H5P'}`,
    intro,
    videoUrl: '',
    blanksText: buildBlanksText(prompts),
    accordionPanels: buildAccordionPanels(prompts),
    quizQuestions: buildQuizQuestions(prompts),
    quizSettings: defaultQuizSettings(),
    dragPairs: buildDragPairs(prompts),
    timelineEvents: buildTimelineEvents(prompts),
    slides: buildSlides(prompts),
    interactions: buildInteractions(prompts),
  }
}

export function applyBusinessBackgroundToForm(
  form: H5PBuilderForm,
  prompts: PromptFields,
): H5PBuilderForm {
  const defaults = defaultH5PBuilderForm(form.contentType, prompts)
  return {
    ...form,
    title: defaults.title,
    intro: defaults.intro,
    blanksText: defaults.blanksText,
    accordionPanels: defaults.accordionPanels,
    quizQuestions: defaults.quizQuestions,
    quizSettings: defaults.quizSettings,
    dragPairs: defaults.dragPairs,
    timelineEvents: defaults.timelineEvents,
    slides: defaults.slides,
    interactions: defaults.interactions,
  }
}
