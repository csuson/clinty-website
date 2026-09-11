import { H5P_CONTENT_TYPES, H5P_TEACHER_EXERCISES, type H5PContentTypeId, type H5PLanguageLesson } from './types'

const FORMAT_GUIDES: Record<H5PContentTypeId, string> = {
  'question-set': `Output format: CSV with header row \`word,translation\` OR \`question,answers\`
- For vocabulary: one row per word; answers column can list options separated by \`|\` with \`*\` on the correct translation
- For full MCQ: \`question,answers\` with \`Wrong|*Correct*|Wrong\`

Example (vocabulary quiz):
\`\`\`csv
word,translation
bonjour,hello|goodbye|please|*hello*
merci,*thank you*|sorry|welcome
\`\`\`

Or simple pairs (import as word list):
\`\`\`csv
word,translation
bonjour,hello
merci,thank you
\`\`\``,

  'drag-and-drop': `Output format: CSV or tab-separated word list — one pair per row
- Column 1: word or phrase in target language (draggable, wrapped in *asterisks* in H5P)
- Column 2: translation or definition (drop zone label after =)

Example:
\`\`\`csv
word,translation
bonjour,hello
merci,thank you
chat,cat
\`\`\``,

  blanks: `Output format: plain text cloze exercise
- Wrap each correct answer in asterisks: \`*answer*\`
- One or more sentences students complete

Example:
The French word for hello is *bonjour*.
To say thank you in French, use *merci*.

Or provide word,translation rows and we will build sentences automatically.`,

  'dialog-cards': `Output format: CSV or tab-separated word list — one pair per row
- Column 1: word in target language (card front)
- Column 2: translation (card back)

Example:
\`\`\`csv
word,translation
bonjour,hello
merci,thank you
\`\`\``,

  flashcards: `Output format: CSV or tab-separated word list — one pair per row
- Column 1: prompt word or phrase
- Column 2: correct typed answer

Example:
\`\`\`csv
word,translation
bonjour,hello
merci,thank you
\`\`\``,

  'single-choice-set': `Output format: CSV with header \`word,translation\` OR \`question,answers\`
- For vocabulary: one row per word; we auto-generate distractors from other translations
- For full MCQ: \`question,answers\` with \`Wrong|*Correct*|Wrong\`

Example:
\`\`\`csv
word,translation
bonjour,hello
merci,thank you
\`\`\``,

  crossword: `Output format: CSV or tab-separated word list — one pair per row
- Column 1: answer word for the grid (target language, single words work best)
- Column 2: clue (translation or short definition)

Example:
\`\`\`csv
word,translation
bonjour,hello
merci,thank you
chat,cat
\`\`\``,

  'mark-the-words': `Output format: plain text with correct words wrapped in asterisks
- Students click the marked words in the passage

Example:
Click the French greetings: *bonjour* and *merci* are common words.

Or provide word,translation rows and we will build a find-the-words task.`,

  accordion: `Output format: CSV glossary — one term per row
- Column 1: word or phrase in target language
- Column 2: definition or translation

Example:
\`\`\`csv
word,translation
bonjour,hello — used as a greeting
merci,thank you
au revoir,goodbye
\`\`\``,

  timeline: `Output format: CSV with header \`headline,startDate,text\`
- Use for historical reading or story sequence in language class

Example:
\`\`\`csv
headline,startDate,text
Story begins,2024,Students meet the main character.
Conflict,2024,The problem is introduced.
\`\`\``,

  'course-presentation': `Output format: markdown slides for a grammar or culture lesson
- Each slide: \`## Slide title\` followed by bullet points

Example:
\`\`\`
## Regular -er verbs
- parler — to speak
- aimer — to like
- Example: Je *parle* français.

## Practice
- Complete the conjugation table.
\`\`\``,

  'interactive-video': `Output format: structured text for a video lesson
- Video URL (YouTube or MP4)
- Timestamped popup notes or mini-quiz hints in the target language

Example:
\`\`\`
Video URL: https://www.youtube.com/watch?v=example
Time: 30 — Vocabulary note: "bonjour" means hello
Time: 90 — Grammar tip: formal vs informal greeting
\`\`\``,
}

function lessonContext(lesson: H5PLanguageLesson): string {
  const parts = [
    lesson.unitName.trim() && `Unit/lesson: ${lesson.unitName.trim()}`,
    lesson.targetLanguage.trim() && `Target language: ${lesson.targetLanguage.trim()}`,
    lesson.sourceLanguage.trim() && `Students' language: ${lesson.sourceLanguage.trim()}`,
  ].filter(Boolean)

  return parts.length ? parts.join('\n') : ''
}

function supportedTypesList(): string {
  return H5P_TEACHER_EXERCISES.map((type) => `- **${type.label}** — ${type.description}`).join('\n')
}

export function buildDefaultH5PAiPrompt(
  contentType: H5PContentTypeId,
  languageLesson?: H5PLanguageLesson,
  extraContext?: string,
): string {
  const selected = H5P_CONTENT_TYPES.find((type) => type.id === contentType)
  const teacher = H5P_TEACHER_EXERCISES.find((type) => type.id === contentType)
  const label = teacher?.label ?? selected?.label ?? 'H5P content'
  const lesson = languageLesson ? lessonContext(languageLesson) : ''
  const background = extraContext?.trim()

  return `You are helping a language teacher create H5P classroom exercises for import into the Clinty Language Exercise Builder.

## Exercise types for teachers
${supportedTypesList()}

## Task
Create **${label}** content for students.

${lesson ? `## Lesson context\n${lesson}\n` : ''}${background ? `## Additional context\n${background}\n` : ''}## Requirements
- Appropriate for classroom use (clear, age-neutral language)
- Focus on vocabulary, grammar, or reading skills — not marketing or business training
- Keep questions and labels concise
- For quizzes, include 3–4 answer options with exactly one correct answer when using full MCQ format
- Use realistic vocabulary for the target language level

## Output instructions
${FORMAT_GUIDES[contentType]}

Return only the content in the format above — no extra commentary unless I ask for it.`
}

export function buildAllTypesH5PAiPrompt(
  languageLesson?: H5PLanguageLesson,
  extraContext?: string,
): string {
  const lesson = languageLesson ? lessonContext(languageLesson) : ''
  const background = extraContext?.trim()

  return `You are helping a language teacher plan H5P classroom activities for the Clinty Language Exercise Builder.

## Exercise types
${supportedTypesList()}

${lesson ? `## Lesson context\n${lesson}\n` : ''}${background ? `## Additional context\n${background}\n` : ''}## Task
Suggest a short lesson activity set for language students. Pick the best type for each piece.

For each item, specify:
1. Exercise type
2. Title
3. The actual content in the import format for that type

## Import formats by type
${Object.entries(FORMAT_GUIDES)
  .filter(([id]) => H5P_TEACHER_EXERCISES.some((entry) => entry.id === id) || id === 'question-set')
  .map(([id, guide]) => {
    const type = H5P_TEACHER_EXERCISES.find((entry) => entry.id === id)
    return `### ${type?.label ?? id}\n${guide}`
  })
  .join('\n\n')}

Start with one **Vocabulary quiz** as CSV (\`word,translation\` or \`question,answers\`) so I can import it immediately.`
}
