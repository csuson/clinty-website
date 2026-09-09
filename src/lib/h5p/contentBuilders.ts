import type { H5PBuilderForm, H5PContentTypeId, PackageH5POptions } from './types'

function createSubContentId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `sub-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function paragraphHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return `<p>${escaped.trim()}</p>`
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

function buildDragAndDropContent(form: H5PBuilderForm) {
  const pairs = form.dragPairs.filter((pair) => pair.draggable.trim() && pair.dropZone.trim())
  const dropZoneCount = Math.max(pairs.length, 1)
  const width = Math.min(90 / dropZoneCount, 40)

  const dropZones = pairs.map((pair, index) => ({
    label: `<div>${pair.dropZone}</div>`,
    showLabel: true,
    x: 1 + index * (width + 2),
    y: 18,
    width,
    height: 14,
    correctElements: [String(index)],
    backgroundOpacity: 100,
    tipsAndFeedback: { tip: '', feedbackOnCorrect: '', feedbackOnIncorrect: '' },
    single: true,
    autoAlign: false,
  }))

  const elements = pairs.map((pair, index) => ({
    type: {
      library: 'H5P.AdvancedText 1.1',
      params: { text: paragraphHtml(pair.draggable) },
      metadata: { contentType: 'Text', license: 'U', title: pair.draggable.slice(0, 80) },
      subContentId: createSubContentId(),
    },
    x: 1 + index * (width + 2),
    y: 72,
    width,
    height: 8,
    dropZones: [String(index)],
    backgroundOpacity: 100,
    multiple: false,
  }))

  return {
    question: {
      settings: {
        size: { width: 620, height: 310 },
        background: { path: '', mime: 'image/png', copyright: { license: 'U' } },
      },
      task: { elements, dropZones },
    },
    overallFeedback: [{ from: 0, to: 100 }],
    behaviour: {
      enableRetry: true,
      enableCheckButton: true,
      singlePoint: false,
      applyPenalty: false,
      enableScoreExplanation: true,
      dropZoneHighlighting: 'dragging',
      autoAlignSpacing: 2,
      enableFullScreen: false,
      showScorePoints: true,
      showTitle: false,
    },
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
