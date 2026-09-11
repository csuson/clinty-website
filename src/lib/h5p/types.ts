export const H5P_CONTENT_TYPES = [
  {
    id: 'interactive-video',
    label: 'Interactive Video',
    mainLibrary: 'H5P.InteractiveVideo',
    majorVersion: 1,
    minorVersion: 27,
    description: 'Video with pauses, text, and optional interactions.',
  },
  {
    id: 'course-presentation',
    label: 'Course Presentation',
    mainLibrary: 'H5P.CoursePresentation',
    majorVersion: 1,
    minorVersion: 26,
    description: 'Slide-based presentation with text and images.',
  },
  {
    id: 'question-set',
    label: 'Quiz (Question Set)',
    mainLibrary: 'H5P.QuestionSet',
    majorVersion: 1,
    minorVersion: 20,
    description: 'Multiple-choice quiz with scoring.',
  },
  {
    id: 'blanks',
    label: 'Fill in the Blanks',
    mainLibrary: 'H5P.Blanks',
    majorVersion: 1,
    minorVersion: 14,
    description: 'Cloze-style fill-in-the-blank exercise.',
  },
  {
    id: 'drag-and-drop',
    label: 'Drag the Words',
    mainLibrary: 'H5P.DragText',
    majorVersion: 1,
    minorVersion: 10,
    description: 'Drag each word or phrase to its matching definition.',
  },
  {
    id: 'accordion',
    label: 'Accordion',
    mainLibrary: 'H5P.Accordion',
    majorVersion: 1,
    minorVersion: 0,
    description: 'Expandable sections for FAQs and topics.',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    mainLibrary: 'H5P.Timeline',
    majorVersion: 1,
    minorVersion: 1,
    description: 'Chronological events and milestones.',
  },
  {
    id: 'mark-the-words',
    label: 'Mark the Words',
    mainLibrary: 'H5P.MarkTheWords',
    majorVersion: 1,
    minorVersion: 11,
    description: 'Click the correct words in a passage.',
  },
  {
    id: 'dialog-cards',
    label: 'Dialog Cards',
    mainLibrary: 'H5P.Dialogcards',
    majorVersion: 1,
    minorVersion: 9,
    description: 'Flip cards with term on front and translation on back.',
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    mainLibrary: 'H5P.Flashcards',
    majorVersion: 1,
    minorVersion: 7,
    description: 'Type-the-answer flashcard deck.',
  },
  {
    id: 'single-choice-set',
    label: 'Single Choice Set',
    mainLibrary: 'H5P.SingleChoiceSet',
    majorVersion: 1,
    minorVersion: 10,
    description: 'Quick swipe-style multiple choice questions.',
  },
  {
    id: 'crossword',
    label: 'Crossword',
    mainLibrary: 'H5P.Crossword',
    majorVersion: 0,
    minorVersion: 5,
    description: 'Crossword puzzle generated from clue and answer pairs.',
  },
] as const

export type H5PContentTypeId = (typeof H5P_CONTENT_TYPES)[number]['id']

/** Primary exercise types for language teachers (shown first in the builder). */
export const H5P_TEACHER_EXERCISES: ReadonlyArray<{
  id: H5PContentTypeId
  label: string
  description: string
  importHint: string
}> = [
  {
    id: 'question-set',
    label: 'Vocabulary quiz',
    description: 'Show a word or phrase — students pick the correct translation.',
    importHint: 'CSV/TXT: word,translation — or alternating lines (French then English)',
  },
  {
    id: 'drag-and-drop',
    label: 'Matching',
    description: 'Drag each word or phrase into the box with its translation (Drag the Words layout).',
    importHint: 'CSV/TXT: term,translation — one pair per row',
  },
  {
    id: 'blanks',
    label: 'Fill in the blanks',
    description: 'Cloze sentences — wrap answers in *asterisks*.',
    importHint: 'TXT with *answers* or word,translation to auto-build sentences',
  },
  {
    id: 'accordion',
    label: 'Glossary',
    description: 'Expandable word list students can study before a quiz.',
    importHint: 'CSV/TXT: word,definition — builds accordion panels',
  },
  {
    id: 'dialog-cards',
    label: 'Flip cards',
    description: 'Turn cards to reveal translations — ideal for vocabulary drills.',
    importHint: 'CSV/TXT: word,translation — or term on one line, indented translation below',
  },
  {
    id: 'flashcards',
    label: 'Type-answer cards',
    description: 'Students type the translation before checking their answer.',
    importHint: 'CSV/TXT: word,translation — or term on one line, indented translation below',
  },
  {
    id: 'single-choice-set',
    label: 'Quick quiz',
    description: 'Fast multiple-choice cards students answer one at a time.',
    importHint: 'CSV/TXT: word,translation — auto-generates distractors',
  },
  {
    id: 'mark-the-words',
    label: 'Mark the words',
    description: 'Students click correct words in a sentence — grammar and reading.',
    importHint: 'TXT with *marked* words, or word list to build a find-the-words task',
  },
  {
    id: 'crossword',
    label: 'Crossword',
    description: 'Auto-generated crossword from vocabulary clues and answers.',
    importHint: 'CSV/TXT: word,translation — clue and answer (single words work best)',
  },
]

export const H5P_MORE_CONTENT_TYPES: ReadonlyArray<{
  id: H5PContentTypeId
  label: string
  description: string
}> = [
  {
    id: 'course-presentation',
    label: 'Lesson slides',
    description: 'Slide-based presentation for grammar notes or culture topics.',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Historical or story sequence for reading classes.',
  },
  {
    id: 'interactive-video',
    label: 'Interactive video',
    description: 'Video with pauses and popup notes.',
  },
]

export type H5PAccordionPanel = {
  title: string
  content: string
}

export type H5PVocabCard = {
  term: string
  translation: string
}

export type H5PQuizQuestion = {
  question: string
  answers: string[]
  correctIndex: number
}

export type H5PQuizSettings = {
  showIntroPage: boolean
  startButtonText: string
  progressType: 'dots' | 'textual'
  passPercentage: number
  showResultPage: boolean
  showSolutionButton: boolean
  showRetryButton: boolean
  resultHeading: string
  scoreBarLabel: string
}

export type PackageH5POptions = {
  /** Skip intro screen and prefer div embed for in-app preview. */
  forPreview?: boolean
  /**
   * Omit bundled library folders (h5p.json + content only).
   * Use for Lumi Cloud (cannot install libraries) or any LMS that already has
   * the required content types installed.
   */
  contentOnly?: boolean
}

export type H5PDragPair = {
  draggable: string
  dropZone: string
}

export type H5PTimelineEvent = {
  headline: string
  text: string
  startDate: string
}

export type H5PSlide = {
  title: string
  content: string
}

export type H5PInteractiveVideoInteraction = {
  time: number
  label: string
  text: string
}

export type H5PLanguageLesson = {
  unitName: string
  targetLanguage: string
  sourceLanguage: string
}

export type H5PBuilderForm = {
  contentType: H5PContentTypeId
  languageLesson: H5PLanguageLesson
  title: string
  intro: string
  videoUrl: string
  blanksText: string
  accordionPanels: H5PAccordionPanel[]
  quizQuestions: H5PQuizQuestion[]
  quizSettings: H5PQuizSettings
  dragPairs: H5PDragPair[]
  timelineEvents: H5PTimelineEvent[]
  slides: H5PSlide[]
  interactions: H5PInteractiveVideoInteraction[]
  vocabCards: H5PVocabCard[]
  markTheWordsTaskDescription: string
  markTheWordsText: string
}

export type H5PGenerateRequest = {
  contentType: H5PContentTypeId
  title: string
  intro?: string
  videoUrl?: string
  blanksText?: string
  accordionPanels?: H5PAccordionPanel[]
  quizQuestions?: H5PQuizQuestion[]
  dragPairs?: H5PDragPair[]
  timelineEvents?: H5PTimelineEvent[]
  slides?: H5PSlide[]
  interactions?: H5PInteractiveVideoInteraction[]
  vocabCards?: H5PVocabCard[]
  markTheWordsTaskDescription?: string
  markTheWordsText?: string
}
