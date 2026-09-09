import type { H5PBuilderForm, H5PLanguageLesson } from './types'

export function defaultLanguageLesson(): H5PLanguageLesson {
  return {
    unitName: 'Unit 1',
    targetLanguage: 'French',
    sourceLanguage: 'English',
  }
}

export function buildLessonTitle(lesson: H5PLanguageLesson, exerciseLabel: string): string {
  const unit = lesson.unitName.trim() || 'Lesson'
  const language = lesson.targetLanguage.trim()
  if (language) {
    return `${unit} — ${language} ${exerciseLabel}`
  }
  return `${unit} — ${exerciseLabel}`
}

export function applyLanguageLessonToForm(
  form: H5PBuilderForm,
  lesson: Partial<H5PLanguageLesson>,
  exerciseLabel: string,
): H5PBuilderForm {
  const nextLesson = { ...form.languageLesson, ...lesson }
  return {
    ...form,
    languageLesson: nextLesson,
    title: buildLessonTitle(nextLesson, exerciseLabel),
    intro: `Practice ${nextLesson.targetLanguage || 'vocabulary'} for ${nextLesson.unitName || 'this lesson'}.`,
    quizSettings: {
      ...form.quizSettings,
      showIntroPage: true,
      startButtonText: 'Start',
      resultHeading: 'Results',
    },
  }
}
