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
    label: 'Drag and Drop',
    mainLibrary: 'H5P.DragQuestion',
    majorVersion: 1,
    minorVersion: 14,
    description: 'Match items to correct drop zones.',
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
] as const

export type H5PContentTypeId = (typeof H5P_CONTENT_TYPES)[number]['id']

export type H5PAccordionPanel = {
  title: string
  content: string
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

export type H5PBuilderForm = {
  contentType: H5PContentTypeId
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
}
