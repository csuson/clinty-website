import { H5P_CONTENT_TYPES, type H5PContentTypeId } from './types'

const FORMAT_GUIDES: Record<H5PContentTypeId, string> = {
  'question-set': `Output format: CSV with header row \`question,answers\`
- One row per multiple-choice question
- Separate answer options with \`|\` or \`;\`
- Mark the correct answer with \`*\` (example: \`Wrong|*Correct*|Wrong\`)

Example:
\`\`\`csv
question,answers
What is our return policy?,30 days|*60 days*|90 days
Which city is our HQ in?,*Foster City*|San Jose|Oakland
\`\`\`

After generating, save as a .csv file and use **Import CSV** in the Quiz editor.`,

  'drag-and-drop': `Output format: CSV with two columns (any headers), one row per pair
- Column 1: draggable item
- Column 2: matching drop zone label
- Example headers: \`question,answers\` or \`lesson,leçon\`

Example:
\`\`\`csv
question,answers
Revenue,*Income statement*
Balance sheet,*Assets and liabilities*
\`\`\`

After generating, save as a .csv file and use **Import CSV** in the Drag and Drop editor.`,

  blanks: `Output format: plain text cloze exercise
- Wrap each correct answer in asterisks: \`*answer*\`
- Use one sentence or short paragraph learners can complete

Example:
Our company was founded in *2018* and is headquartered in *Foster City*. We specialize in *customer onboarding* training.

Paste the text into the **Cloze text** field in the Fill in the Blanks editor.`,

  accordion: `Output format: markdown list of panels
- Each panel: a \`## Title\` heading followed by body text
- 3–6 panels recommended for FAQs or topic overviews

Example:
\`\`\`
## Getting started
How to create an account and complete your first lesson.

## Billing
Payment methods, invoices, and refund policy.

## Support
Contact options and typical response times.
\`\`\`

Copy each title and body into **Accordion panels** in the editor (or ask for CSV: \`title,content\`).`,

  timeline: `Output format: CSV with header \`headline,startDate,text\`
- \`startDate\`: YYYY or YYYY,MM,DD
- \`text\`: short description of the event

Example:
\`\`\`csv
headline,startDate,text
Company founded,2018,Opened our first office.
Product launch,2020,Released the core training platform.
\`\`\`

Enter each row in the **Timeline events** section of the editor.`,

  'course-presentation': `Output format: markdown slides
- Each slide: \`## Slide title\` followed by bullet points or a short paragraph
- 3–8 slides recommended

Example:
\`\`\`
## Welcome
- Who this course is for
- What you will learn

## Key concepts
- Term one: brief definition
- Term two: brief definition
\`\`\`

Copy each slide into the **Slides** section of the Course Presentation editor.`,

  'interactive-video': `Output format: markdown or structured text
- First line: \`Video URL:\` followed by a YouTube or MP4 link (optional)
- Then interaction blocks with timestamp, label, and popup text

Example:
\`\`\`
Video URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ

Interaction 1
Time (seconds): 15
Label: Key term
Text: This scene introduces our core value proposition.

Interaction 2
Time (seconds): 45
Label: Quiz hint
Text: Remember the three steps covered so far.
\`\`\`

Enter details in the **Interactive Video** editor (video URL + interactions).`,
}

function supportedTypesList(): string {
  return H5P_CONTENT_TYPES.map((type) => `- **${type.label}** — ${type.description}`).join('\n')
}

export function buildDefaultH5PAiPrompt(
  contentType: H5PContentTypeId,
  businessBackground?: string,
): string {
  const selected = H5P_CONTENT_TYPES.find((type) => type.id === contentType)
  const label = selected?.label ?? 'H5P content'
  const background = businessBackground?.trim()

  return `You are helping create H5P e-learning content for import into the Clinty H5P Builder.

## Supported content types
${supportedTypesList()}

## Task
Create **${label}** content for our team/customers.

${background ? `## Business context\n${background}\n` : ''}## Requirements
- Match our brand voice: clear, professional, and helpful
- Use accurate facts from the business context above; do not invent policies or numbers
- Keep questions and labels concise
- For quizzes, include 3–4 answer options per question with exactly one correct answer

## Output instructions
${FORMAT_GUIDES[contentType]}

Return only the content in the format above — no extra commentary unless I ask for it.`
}

export function buildAllTypesH5PAiPrompt(businessBackground?: string): string {
  const background = businessBackground?.trim()

  return `You are helping create H5P e-learning content for import into the Clinty H5P Builder.

## Supported content types
${supportedTypesList()}

${background ? `## Business context\n${background}\n` : ''}## Task
Suggest a short learning module plan using the content types above. Pick the best type for each piece (quiz, accordion, fill-in-the-blanks, drag-and-drop, timeline, course presentation, or interactive video).

For each item, specify:
1. Content type
2. Title
3. The actual content in the import format for that type (see below)

## Import formats by type
${Object.entries(FORMAT_GUIDES)
  .map(([id, guide]) => {
    const type = H5P_CONTENT_TYPES.find((entry) => entry.id === id)
    return `### ${type?.label ?? id}\n${guide}`
  })
  .join('\n\n')}

Start with one **Quiz (Question Set)** as CSV (\`question,answers\`) so I can import it immediately.`
}
