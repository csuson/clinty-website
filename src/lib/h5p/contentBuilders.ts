import type { H5PBuilderForm, H5PContentTypeId, PackageH5POptions } from './types'

function createSubContentId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `sub-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function paragraphHtml(text: string): string {
  return `<p>${escapeHtml(text).trim()}</p>`
}

function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, index) => index)
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}

function buildMultiChoiceQuestion(question: H5PBuilderForm['quizQuestions'][number]) {
  return {
    params: {
      question: paragraphHtml(question.question),
      answers: question.answers.map((answer, index) => ({
        text: paragraphHtml(answer),
        correct: index === question.correctIndex,
        tipsAndFeedback: { tip: '', chosenFeedback: '', notChosenFeedback: '' },
      })),
      media: { disableImageZooming: false },
      overallFeedback: [{ from: 0, to: 100 }],
      behaviour: {
        enableRetry: true,
        enableSolutionsButton: true,
        enableCheckButton: true,
        type: 'auto',
        singlePoint: false,
        randomAnswers: true,
        showSolutionsRequiresInput: true,
        confirmCheckDialog: false,
        confirmRetryDialog: false,
        autoCheck: false,
        passPercentage: 100,
        showScorePoints: true,
      },
      UI: {
        checkAnswerButton: 'Check',
        submitAnswerButton: 'Submit',
        showSolutionButton: 'Show solution',
        tryAgainButton: 'Retry',
        tipsLabel: 'Show tip',
        scoreBarLabel: 'You got :num out of :total points',
        tipAvailable: 'Tip available',
        feedbackAvailable: 'Feedback available',
        readFeedback: 'Read feedback',
        wrongAnswer: 'Wrong answer',
        correctAnswer: 'Correct answer',
        shouldCheck: 'Should have been checked',
        shouldNotCheck: 'Should not have been checked',
        noInput: 'Please answer before viewing the solution',
        a11yCheck: 'Check the answers. The responses will be marked as correct, incorrect, or unanswered.',
        a11yShowSolution: 'Show the solution. The task will be marked with its correct solution.',
        a11yRetry: 'Retry the task. Reset all responses and start the task over again.',
      },
      confirmCheck: {
        header: 'Finish ?',
        body: 'Are you sure you wish to finish ?',
        cancelLabel: 'Cancel',
        confirmLabel: 'Finish',
      },
      confirmRetry: {
        header: 'Retry ?',
        body: 'Are you sure you wish to retry ?',
        cancelLabel: 'Cancel',
        confirmLabel: 'Confirm',
      },
    },
    library: 'H5P.MultiChoice 1.16',
    metadata: {
      contentType: 'Multiple Choice',
      license: 'U',
      title: question.question.slice(0, 80),
    },
    subContentId: createSubContentId(),
  }
}

function buildAccordionContent(form: H5PBuilderForm) {
  return {
    panels: form.accordionPanels.map((panel) => ({
      title: panel.title,
      content: panel.content.startsWith('<') ? panel.content : paragraphHtml(panel.content),
    })),
    hTag: 'h2',
  }
}

function buildBlanksContent(form: H5PBuilderForm) {
  return {
    text: form.blanksText,
    media: { disableImageZooming: false },
    overallFeedback: [{ from: 0, to: 100 }],
    showSolutions: 'Show solution',
    tryAgain: 'Retry',
    checkAnswer: 'Check',
    submitAnswer: 'Submit',
    notFilledOut: 'Please fill in all blanks to view solution',
    answerIsCorrect: ':ans is correct',
    answerIsWrong: ':ans is wrong',
    answeredCorrectly: 'Answered correctly',
    answeredIncorrectly: 'Answered incorrectly',
    solutionLabel: 'Correct answer:',
    inputLabel: 'Blank input @num of @total',
    inputHasTipLabel: 'Tip available',
    tipLabel: 'Tip',
    behaviour: {
      enableRetry: true,
      enableSolutionsButton: true,
      enableCheckButton: true,
      autoCheck: false,
    },
  }
}

function buildTimelineContent(form: H5PBuilderForm) {
  return {
    timeline: {
      headline: form.title,
      text: form.intro ? paragraphHtml(form.intro) : '',
      defaultZoomLevel: '0',
      height: 600,
      date: form.timelineEvents.map((event) => ({
        startDate: event.startDate.replace(/-/g, ','),
        headline: event.headline,
        text: event.text ? (event.text.startsWith('<') ? event.text : paragraphHtml(event.text)) : '',
      })),
      language: 'en',
    },
  }
}

function dragTextFieldToken(text: string): string {
  return text.trim().replace(/\*/g, '').replace(/\s+/g, ' ')
}

function buildDragTextLine(draggable: string, dropZone: string): string {
  return `*${dragTextFieldToken(draggable)}* = ${dragTextFieldToken(dropZone)}`
}

function buildDragAndDropContent(form: H5PBuilderForm) {
  const pairs = form.dragPairs.filter((pair) => pair.draggable.trim() && pair.dropZone.trim())
  const ordered = shuffleIndices(pairs.length).map((index) => pairs[index])
  const textField = ordered.map((pair) => buildDragTextLine(pair.draggable, pair.dropZone)).join('\n')

  return {
    media: { disableImageZooming: false },
    taskDescription: form.intro.trim() || 'Drag the words into the correct boxes',
    overallFeedback: [{ from: 0, to: 100 }],
    checkAnswer: 'Check',
    submitAnswer: 'Submit',
    tryAgain: 'Retry',
    showSolution: 'Show solution',
    dropZoneIndex: 'Drop Zone @index.',
    empty: 'Drop Zone @index is empty.',
    contains: 'Drop Zone @index contains draggable @draggable.',
    ariaDraggableIndex: '@index of @count draggables.',
    tipLabel: 'Show tip',
    correctText: 'Correct!',
    incorrectText: 'Incorrect!',
    resetDropTitle: 'Reset drop',
    resetDropDescription: 'Are you sure you want to reset this drop zone?',
    grabbed: 'Draggable is grabbed.',
    cancelledDragging: 'Cancelled dragging.',
    correctAnswer: 'Correct answer:',
    feedbackHeader: 'Feedback',
    behaviour: {
      enableRetry: true,
      enableSolutionsButton: true,
      enableCheckButton: true,
      instantFeedback: false,
    },
    scoreBarLabel: 'You got :num out of :total points',
    a11yCheck: 'Check the answers. The responses will be marked as correct, incorrect, or unanswered.',
    a11yShowSolution: 'Show the solution. The task will be marked with its correct solution.',
    a11yRetry: 'Retry the task. Reset all responses and start the task over again.',
    textField,
  }
}

function buildQuestionSetContent(form: H5PBuilderForm, options?: PackageH5POptions) {
  const settings = form.quizSettings
  const questions = form.quizQuestions
    .filter((question) => question.question.trim() && question.answers.some((answer) => answer.trim()))
    .map((question) => buildMultiChoiceQuestion(question))

  return {
    introPage: {
      showIntroPage: options?.forPreview ? false : settings.showIntroPage,
      title: form.title,
      introduction: form.intro ? paragraphHtml(form.intro) : '',
      startButtonText: settings.startButtonText,
    },
    progressType: settings.progressType,
    passPercentage: settings.passPercentage,
    questions,
    disableBackwardsNavigation: false,
    randomQuestions: false,
    texts: {
      prevButton: 'Previous question',
      previous: 'Previous',
      nextButton: 'Next question',
      next: 'Next',
      finishButton: 'Finish',
      submitButton: 'Submit',
      textualProgress: 'Question: @current of @total questions',
      jumpToQuestion: 'Question %d of %total',
      questionLabel: 'Question',
      readSpeakerProgress: 'Question @current of @total',
      unansweredText: 'Unanswered',
      answeredText: 'Answered',
      currentQuestionText: 'Current question',
      navigationLabel: 'Questions',
      questionSetInstruction: 'Choose question to display',
    },
    override: {
      checkButton: true,
      showSolutionButton: 'on',
      retryButton: 'on',
    },
    endGame: {
      showResultPage: settings.showResultPage,
      showSolutionButton: settings.showSolutionButton,
      showRetryButton: settings.showRetryButton,
      message: settings.resultHeading,
      scoreBarLabel: settings.scoreBarLabel,
      overallFeedback: [{ from: 0, to: 100 }],
      solutionButtonText: 'Show solution',
      retryButtonText: 'Retry',
      finishButtonText: 'Finish',
      submitButtonText: 'Submit',
    },
  }
}

function buildCoursePresentationContent(form: H5PBuilderForm) {
  return {
    presentation: {
      slides: form.slides.map((slide) => ({
        elements: [
          {
            x: 8,
            y: 10,
            width: 84,
            height: 80,
            action: {
              library: 'H5P.AdvancedText 1.1',
              params: {
                text: `<h2>${slide.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h2>${slide.content.startsWith('<') ? slide.content : paragraphHtml(slide.content)}`,
              },
              metadata: { contentType: 'Text', license: 'U', title: slide.title.slice(0, 80) },
              subContentId: createSubContentId(),
            },
            alwaysDisplayComments: false,
            backgroundOpacity: 0,
            displayAsButton: false,
            goToSlideType: 'specified',
            invisible: false,
          },
        ],
        keywords: [],
      })),
      keywordListEnabled: false,
      keywordListAlwaysShow: false,
      keywordListAutoHide: false,
      keywordListOpacity: 90,
    },
  }
}

function buildMarkTheWordsContent(form: H5PBuilderForm) {
  return {
    taskDescription: form.markTheWordsTaskDescription.trim() || 'Click on the correct words in the text.',
    textField: form.markTheWordsText,
    media: { disableImageZooming: false },
    overallFeedback: [{ from: 0, to: 100 }],
    checkAnswerButton: 'Check',
    submitAnswerButton: 'Submit',
    tryAgainButton: 'Retry',
    showSolutionButton: 'Show solution',
    behaviour: {
      enableRetry: true,
      enableSolutionsButton: true,
      enableCheckButton: true,
      showScorePoints: true,
    },
    correctAnswer: 'Correct!',
    incorrectAnswer: 'Incorrect!',
    missedAnswer: 'Answer not found!',
    displaySolutionDescription: 'Task is updated to contain the solution.',
    scoreBarLabel: 'You got :num out of :total points',
  }
}

function buildDialogCardsContent(form: H5PBuilderForm) {
  const cards = form.vocabCards.filter((card) => card.term.trim() && card.translation.trim())

  return {
    title: form.title.trim() ? paragraphHtml(form.title) : '',
    mode: 'normal',
    description: form.intro.trim() ? paragraphHtml(form.intro) : '',
    dialogs: cards.map((card) => ({
      text: `<p style="text-align: center;">${card.term.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
      answer: `<p style="text-align: center;">${card.translation.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
      tips: { front: '', back: '' },
    })),
    behaviour: {
      enableRetry: true,
      disableBackwardsNavigation: false,
      scaleTextNotCard: false,
      randomCards: false,
    },
  }
}

function buildFlashcardsContent(form: H5PBuilderForm) {
  const cards = form.vocabCards.filter((card) => card.term.trim() && card.translation.trim())

  return {
    description: form.intro.trim() || form.title.trim() || 'Type the translation for each card.',
    cards: cards.map((card) => ({
      text: card.term.trim(),
      answer: card.translation.trim(),
      tip: { tip: '' },
    })),
    progressText: 'Card @card of @total',
    next: 'Next',
    previous: 'Previous',
    checkAnswerText: 'Check',
    showSolutionsRequiresInput: true,
    defaultAnswerText: 'Your answer',
    correctAnswerText: 'Correct',
    incorrectAnswerText: 'Incorrect',
    showSolutionText: 'Correct answer(s)',
    results: 'Results',
    ofCorrect: '@score of @total correct',
    showResults: 'Show results',
    answerShortText: 'A:',
    retry: 'Retry',
    caseSensitive: false,
    randomCards: false,
  }
}

/** Layout defaults matching crossword-13273.h5p (H5P.Crossword 0.5). */
const CROSSWORD_LAYOUT = {
  overallFeedback: [{ from: 0, to: 100 }],
  theme: {
    backgroundColor: '#173354',
    gridColor: '#000000',
    cellBackgroundColor: '#ffffff',
    cellColor: '#000000',
    clueIdColor: '#606060',
    cellBackgroundColorHighlight: '#3e8de8',
    cellColorHighlight: '#ffffff',
    clueIdColorHighlight: '#e0e0e0',
  },
  behaviour: {
    enableInstantFeedback: false,
    scoreWords: true,
    applyPenalties: false,
    enableRetry: true,
    enableSolutionsButton: true,
  },
  l10n: {
    across: 'Across',
    down: 'Down',
    checkAnswer: 'Check',
    submitAnswer: 'Submit',
    tryAgain: 'Retry',
    showSolution: 'Show solution',
    couldNotGenerateCrossword:
      'Could not generate a crossword with the given words. Please try again with fewer words or words that have more characters in common.',
    couldNotGenerateCrosswordTooFewWords: 'Could not generate a crossword. You need at least two words.',
    probematicWords:
      "Some words could not be placed. If you are using fixed words, please make sure that their position doesn&#039;t prevent other words from being placed. Words with the same alignment may not be placed touching each other. Problematic word(s): @words",
    extraClue: 'Extra clue',
    closeWindow: 'Close window',
  },
  a11y: {
    crosswordGrid:
      'Crossword grid. Use arrow keys to navigate and the keyboard to enter characters. Alternatively, use Tab to navigate to type the answers in Fill in the Blanks style fields instead of the grid.',
    column: 'Column',
    row: 'Row',
    across: 'Across',
    down: 'Down',
    empty: 'Empty',
    resultFor: 'Result for: @clue',
    correct: 'Correct',
    wrong: 'Wrong',
    point: 'point',
    solutionFor: 'For @clue the solution is: @solution',
    extraClueFor: 'Open extra clue for @clue',
    letterSevenOfNine: 'Letter @position of @length',
    lettersWord: '@length letter word',
    check: 'Check the characters. The responses will be marked as correct, incorrect, or unanswered.',
    showSolution: 'Show the solution. The crossword will be filled with its correct solution.',
    retry: 'Retry the task. Reset all responses and start the task over again.',
    yourResult: 'You got @score out of @total points',
  },
} as const

function buildCrosswordContent(form: H5PBuilderForm) {
  const words = form.vocabCards
    .filter((card) => card.term.trim() && card.translation.trim())
    .map((card) => ({
      fixWord: false,
      orientation: 'across' as const,
      clue: card.translation.trim(),
      answer: card.term.trim(),
    }))

  return {
    taskDescription: form.intro.trim() || '',
    words,
    ...CROSSWORD_LAYOUT,
  }
}

function buildSingleChoiceSetContent(form: H5PBuilderForm) {
  const questions = form.quizQuestions.filter(
    (question) => question.question.trim() && question.answers.some((answer) => answer.trim()),
  )

  return {
    choices: questions.map((question) => {
      const answers = question.answers.filter((answer) => answer.trim())
      const correct = answers[question.correctIndex] ?? answers[0] ?? ''
      const others = answers.filter((_, index) => index !== question.correctIndex)
      const ordered = [correct, ...others].filter(Boolean)

      return {
        question: paragraphHtml(question.question),
        answers: ordered.map((answer) => ({ answer: paragraphHtml(answer) })),
      }
    }),
    overallFeedback: [{ from: 0, to: 100 }],
    behaviour: {
      autoContinue: true,
      timeoutCorrect: 2000,
      timeoutWrong: 3000,
      soundEffectsEnabled: true,
      enableRetry: true,
      enableSolutionsButton: true,
      passPercentage: 100,
    },
  }
}

function buildInteractiveVideoContent(form: H5PBuilderForm) {
  const videoUrl = form.videoUrl.trim()
  const files = videoUrl
    ? [
        {
          path: videoUrl,
          mime: videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? 'video/youtube' : 'video/mp4',
          copyright: { license: 'U' },
        },
      ]
    : []

  return {
    interactiveVideo: {
      video: {
        files,
        startScreenOptions: {
          title: form.title,
          hideStartTitle: false,
        },
      },
      assets: {
        interactions: form.interactions.map((interaction) => ({
          duration: { from: interaction.time, to: interaction.time + 10 },
          pause: true,
          displayType: 'button',
          buttonOnMobile: false,
          label: interaction.label,
          x: 10,
          y: 10,
          width: 40,
          height: 10,
          action: {
            library: 'H5P.Text 1.1',
            params: { text: interaction.text.startsWith('<') ? interaction.text : paragraphHtml(interaction.text) },
            metadata: { contentType: 'Text', license: 'U', title: interaction.label.slice(0, 80) },
            subContentId: createSubContentId(),
          },
        })),
        bookmarks: [],
        endscreens: [],
      },
    },
  }
}

export function buildH5PContent(
  form: H5PBuilderForm,
  options?: PackageH5POptions,
): Record<string, unknown> {
  switch (form.contentType) {
    case 'accordion':
      return buildAccordionContent(form)
    case 'blanks':
      return buildBlanksContent(form)
    case 'timeline':
      return buildTimelineContent(form)
    case 'drag-and-drop':
      return buildDragAndDropContent(form)
    case 'question-set':
      return buildQuestionSetContent(form, options)
    case 'course-presentation':
      return buildCoursePresentationContent(form)
    case 'interactive-video':
      return buildInteractiveVideoContent(form)
    case 'mark-the-words':
      return buildMarkTheWordsContent(form)
    case 'dialog-cards':
      return buildDialogCardsContent(form)
    case 'flashcards':
      return buildFlashcardsContent(form)
    case 'single-choice-set':
      return buildSingleChoiceSetContent(form)
    case 'crossword':
      return buildCrosswordContent(form)
    default:
      return {}
  }
}

export function sanitizeFilename(title: string, contentType: H5PContentTypeId): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${slug || contentType}.h5p`
}
