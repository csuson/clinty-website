import { useEffect, useMemo, useState, type FormEvent } from 'react'
import H5PContentEditor from '../../components/h5p/H5PContentEditor'
import H5PFileImportPanel from '../../components/h5p/H5PFileImportPanel'
import H5PAiPromptPanel from '../../components/h5p/H5PAiPromptPanel'
import H5PPreviewModal from '../../components/h5p/H5PPreviewModal'
import { inputClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import { useAiUsage } from '../../hooks/useAiUsage'
import { defaultLanguageTeacherForm } from '../../lib/h5p/defaults'
import {
  isCsvOrTxtFile,
  readBlanksFile,
  parseVocabPairs,
  readVocabFile,
  vocabPairsToAccordionPanels,
  vocabPairsToDragPairs,
  vocabPairsToMarkTheWordsText,
  vocabPairsToQuizQuestions,
  vocabPairsToVocabCards,
} from '../../lib/h5p/languageImport'
import { downloadH5P, packageH5P } from '../../lib/h5p/packager'
import { ensurePreviewServiceWorker } from '../../lib/h5p/previewStorage'
import { parseQuizCsv } from '../../lib/h5p/quizCsvImport'
import { readCsvFile } from '../../lib/h5p/csvParse'
import { applyLanguageLessonToForm } from '../../lib/h5p/teacherDefaults'
import {
  H5P_MORE_CONTENT_TYPES,
  H5P_TEACHER_EXERCISES,
} from '../../lib/h5p/types'
import type { H5PBuilderForm, H5PContentTypeId } from '../../lib/h5p/types'

export default function H5PBuilder() {
  const { user } = useAuth()
  const [form, setForm] = useState<H5PBuilderForm>(() => defaultLanguageTeacherForm('question-set'))
  const [loading, setLoading] = useState(false)
  const [packaging, setPackaging] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewForm, setPreviewForm] = useState<H5PBuilderForm | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showMoreTypes, setShowMoreTypes] = useState(false)
  const [showAdvancedAi, setShowAdvancedAi] = useState(false)
  const { usage: aiUsage, loading: aiUsageLoading, refresh: refreshAiUsage, limitReached } = useAiUsage(user?.id)

  const selectedExercise = useMemo(
    () => H5P_TEACHER_EXERCISES.find((entry) => entry.id === form.contentType),
    [form.contentType],
  )

  useEffect(() => {
    void ensurePreviewServiceWorker()
    setLoading(false)
  }, [])

  function updateForm(patch: Partial<H5PBuilderForm>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function handleExerciseTypeChange(contentType: H5PContentTypeId) {
    const exerciseLabel =
      H5P_TEACHER_EXERCISES.find((entry) => entry.id === contentType)?.label ??
      H5P_MORE_CONTENT_TYPES.find((entry) => entry.id === contentType)?.label ??
      'Exercise'

    setForm((current) =>
      applyLanguageLessonToForm(
        { ...defaultLanguageTeacherForm(contentType), languageLesson: current.languageLesson },
        current.languageLesson,
        exerciseLabel,
      ),
    )
    setMessage(null)
    setError(null)
  }

  function handleLessonChange(patch: Partial<H5PBuilderForm['languageLesson']>) {
    setForm((current) => {
      const languageLesson = { ...current.languageLesson, ...patch }
      const exerciseLabel = selectedExercise?.label ?? 'Exercise'
      return applyLanguageLessonToForm(current, languageLesson, exerciseLabel)
    })
  }

  async function importContentFile(file: File) {
    setMessage(null)
    setError(null)

    if (!isCsvOrTxtFile(file)) {
      setError('Please upload a .csv or .txt file.')
      return
    }

    try {
      switch (form.contentType) {
        case 'question-set': {
          const text = await readCsvFile(file)
          let quizQuestions
          try {
            quizQuestions = parseQuizCsv(text)
          } catch {
            quizQuestions = vocabPairsToQuizQuestions(await readVocabFile(file))
          }
          updateForm({ quizQuestions, contentType: 'question-set' })
          setMessage(`Imported ${quizQuestions.length} quiz question${quizQuestions.length === 1 ? '' : 's'}.`)
          break
        }
        case 'drag-and-drop': {
          const pairs = await readVocabFile(file)
          const dragPairs = vocabPairsToDragPairs(pairs)
          updateForm({ dragPairs, contentType: 'drag-and-drop' })
          setMessage(`Imported ${dragPairs.length} matching pair${dragPairs.length === 1 ? '' : 's'}.`)
          break
        }
        case 'blanks': {
          const blanksText = await readBlanksFile(file)
          updateForm({ blanksText, contentType: 'blanks' })
          setMessage('Imported fill-in-the-blank exercise from your file.')
          break
        }
        case 'accordion': {
          const pairs = await readVocabFile(file)
          const accordionPanels = vocabPairsToAccordionPanels(pairs)
          updateForm({ accordionPanels, contentType: 'accordion' })
          setMessage(`Imported ${accordionPanels.length} glossary term${accordionPanels.length === 1 ? '' : 's'}.`)
          break
        }
        case 'dialog-cards':
        case 'flashcards': {
          const pairs = await readVocabFile(file)
          const vocabCards = vocabPairsToVocabCards(pairs)
          updateForm({ vocabCards, contentType: form.contentType })
          setMessage(`Imported ${vocabCards.length} card${vocabCards.length === 1 ? '' : 's'}.`)
          break
        }
        case 'single-choice-set': {
          const pairs = await readVocabFile(file)
          const quizQuestions = vocabPairsToQuizQuestions(pairs)
          updateForm({ quizQuestions, contentType: 'single-choice-set' })
          setMessage(`Imported ${quizQuestions.length} question${quizQuestions.length === 1 ? '' : 's'}.`)
          break
        }
        case 'mark-the-words': {
          const text = await readCsvFile(file)
          if (text.includes('*')) {
            updateForm({ markTheWordsText: text, contentType: 'mark-the-words' })
            setMessage('Imported mark-the-words passage from your file.')
          } else {
            const pairs = parseVocabPairs(text)
            updateForm({
              markTheWordsText: vocabPairsToMarkTheWordsText(pairs),
              contentType: 'mark-the-words',
            })
            setMessage(`Built find-the-words task from ${pairs.length} term${pairs.length === 1 ? '' : 's'}.`)
          }
          break
        }
        default:
          setError('File import is not available for this exercise type.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file')
    }
  }

  async function handleQuizCsvImport(file: File) {
    setMessage(null)
    setError(null)
    try {
      const text = await readCsvFile(file)
      let quizQuestions
      try {
        quizQuestions = parseQuizCsv(text)
      } catch {
        quizQuestions = vocabPairsToQuizQuestions(parseVocabPairs(text))
      }
      updateForm({ quizQuestions, contentType: 'question-set' })
      setMessage(`Imported ${quizQuestions.length} question${quizQuestions.length === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file')
    }
  }

  async function handleDragDropCsvImport(file: File) {
    setMessage(null)
    setError(null)
    try {
      const pairs = await readVocabFile(file)
      updateForm({ dragPairs: vocabPairsToDragPairs(pairs), contentType: 'drag-and-drop' })
      setMessage(`Imported ${pairs.length} pair${pairs.length === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV')
    }
  }

  async function handleBlanksFileImport(file: File) {
    setMessage(null)
    setError(null)
    try {
      const blanksText = await readBlanksFile(file)
      updateForm({ blanksText })
      setMessage('Imported cloze text from file.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file')
    }
  }

  async function handleAccordionFileImport(file: File) {
    setMessage(null)
    setError(null)
    try {
      const pairs = await readVocabFile(file)
      updateForm({ accordionPanels: vocabPairsToAccordionPanels(pairs) })
      setMessage(`Imported ${pairs.length} glossary entries.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file')
    }
  }

  async function handleVocabFileImport(file: File) {
    setMessage(null)
    setError(null)
    try {
      const pairs = await readVocabFile(file)
      updateForm({ vocabCards: vocabPairsToVocabCards(pairs) })
      setMessage(`Imported ${pairs.length} card${pairs.length === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file')
    }
  }

  async function handleMarkTheWordsFileImport(file: File) {
    setMessage(null)
    setError(null)
    try {
      const text = await readCsvFile(file)
      if (text.includes('*')) {
        updateForm({ markTheWordsText: text })
        setMessage('Imported mark-the-words passage from your file.')
      } else {
        const pairs = parseVocabPairs(text)
        updateForm({ markTheWordsText: vocabPairsToMarkTheWordsText(pairs) })
        setMessage(`Built find-the-words task from ${pairs.length} term${pairs.length === 1 ? '' : 's'}.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file')
    }
  }

  async function handlePreview() {
    setPreviewForm(structuredClone(form))
    setPreviewOpen(true)
    setError(null)
  }

  async function handleDownload(e: FormEvent) {
    e.preventDefault()
    setPackaging(true)
    setMessage(null)
    setError(null)

    try {
      const { blob, filename } = await packageH5P(form)
      downloadH5P(blob, filename)
      setMessage(`Downloaded ${filename}. Upload to Moodle, WordPress, Canvas, or any H5P-enabled LMS.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build H5P package')
    } finally {
      setPackaging(false)
    }
  }

  if (loading) {
    return <p className="text-navy-600">Loading exercise builder…</p>
  }

  return (
    <div className="space-y-8 pb-24">
      <div>
        <h2 className="font-serif text-2xl text-navy-900 mb-2">Language Exercise Builder</h2>
        <p className="text-sm text-navy-600 leading-relaxed max-w-2xl">
          Create H5P activities for your students — quizzes, matching, flashcards, fill-in-the-blank, glossaries, and more.
          Import a word list from CSV or TXT, preview in the browser, then download an{' '}
          <code className="text-xs bg-navy-900/5 px-1.5 py-0.5 rounded">.h5p</code> file for your LMS.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      )}

      <form onSubmit={handleDownload} className="space-y-8">
        <section className="rounded-2xl border border-navy-900/10 bg-white/70 p-6 space-y-5">
          <div>
            <h3 className="font-medium text-navy-900">Lesson details</h3>
            <p className="text-sm text-navy-600 mt-1">Used for titles and instructions shown to students.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-xs font-medium text-navy-600 mb-1">Unit / lesson name</span>
              <input
                className={inputClass}
                value={form.languageLesson.unitName}
                onChange={(e) => handleLessonChange({ unitName: e.target.value })}
                placeholder="Unit 3 — Food"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-navy-600 mb-1">Target language</span>
              <input
                className={inputClass}
                value={form.languageLesson.targetLanguage}
                onChange={(e) => handleLessonChange({ targetLanguage: e.target.value })}
                placeholder="French"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-navy-600 mb-1">Students&apos; language</span>
              <input
                className={inputClass}
                value={form.languageLesson.sourceLanguage}
                onChange={(e) => handleLessonChange({ sourceLanguage: e.target.value })}
                placeholder="English"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-navy-600 mb-1">Activity title</span>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => updateForm({ title: e.target.value })}
              required
            />
          </label>
        </section>

        <section className="rounded-2xl border border-navy-900/10 bg-white/70 p-6 space-y-4">
          <div>
            <h3 className="font-medium text-navy-900">Exercise type</h3>
            <p className="text-sm text-navy-600 mt-1">{selectedExercise?.description ?? 'Choose how students practice.'}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {H5P_TEACHER_EXERCISES.map((exercise) => (
              <label
                key={exercise.id}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  form.contentType === exercise.id
                    ? 'border-teal-400 bg-teal-50/60'
                    : 'border-navy-900/10 hover:border-navy-900/20'
                }`}
              >
                <input
                  type="radio"
                  name="exerciseType"
                  checked={form.contentType === exercise.id}
                  onChange={() => handleExerciseTypeChange(exercise.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-navy-900">{exercise.label}</span>
                  <span className="block text-xs text-navy-600 mt-0.5">{exercise.description}</span>
                </span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowMoreTypes((open) => !open)}
            className="text-sm font-medium text-navy-700 hover:text-navy-900"
          >
            {showMoreTypes ? 'Hide additional formats' : 'More formats (slides, video, timeline)…'}
          </button>

          {showMoreTypes ? (
            <div className="grid sm:grid-cols-3 gap-3 pt-1">
              {H5P_MORE_CONTENT_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                    form.contentType === type.id
                      ? 'border-teal-400 bg-teal-50/60'
                      : 'border-navy-900/10 hover:border-navy-900/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="exerciseType"
                    checked={form.contentType === type.id}
                    onChange={() => handleExerciseTypeChange(type.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-navy-900">{type.label}</span>
                    <span className="block text-xs text-navy-600 mt-0.5">{type.description}</span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}
        </section>

        <H5PFileImportPanel contentType={form.contentType} onImportFile={importContentFile} />

        <H5PContentEditor
          form={form}
          onChange={updateForm}
          simpleMode
          onImportQuizCsv={handleQuizCsvImport}
          onImportDragDropCsv={handleDragDropCsvImport}
          onImportBlanksFile={handleBlanksFileImport}
          onImportAccordionFile={handleAccordionFileImport}
          onImportVocabFile={handleVocabFileImport}
          onImportMarkTheWordsFile={handleMarkTheWordsFileImport}
        />

        <section className="rounded-2xl border border-navy-900/10 bg-white/70 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvancedAi((open) => !open)}
            className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-navy-900/[0.02]"
          >
            <span>
              <span className="block font-medium text-navy-900">Advanced: AI-assisted creation</span>
              <span className="block text-sm text-navy-600 mt-0.5">
                Describe a complex activity or paste a prompt for ChatGPT / Claude.
              </span>
            </span>
            <span className="text-sm text-navy-500 shrink-0">{showAdvancedAi ? 'Hide' : 'Show'}</span>
          </button>
          {showAdvancedAi ? (
            <div className="px-6 pb-6 border-t border-navy-900/5">
              <H5PAiPromptPanel
                contentType={form.contentType}
                languageLesson={form.languageLesson}
                form={form}
                usage={aiUsage}
                usageLoading={aiUsageLoading}
                limitReached={limitReached}
                onUsageChange={() => void refreshAiUsage()}
                onGenerated={(nextForm) => {
                  setForm(nextForm)
                  setMessage('Applied AI-generated content. Review and edit before downloading.')
                  setError(null)
                }}
                embedded
              />
            </div>
          ) : null}
        </section>

        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-navy-900/10 bg-cream/95 backdrop-blur-sm px-4 py-3">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => void handlePreview()}
              className="px-5 py-2.5 rounded-xl border border-navy-900/15 bg-white text-navy-900 text-sm font-medium hover:bg-navy-900/5"
            >
              Preview
            </button>
            <button
              type="submit"
              disabled={packaging}
              className="px-5 py-2.5 rounded-xl bg-navy-900 text-cream text-sm font-medium hover:bg-navy-800 disabled:opacity-60"
            >
              {packaging ? 'Building…' : 'Download .h5p'}
            </button>
          </div>
        </div>
      </form>

      {previewForm && (
        <H5PPreviewModal
          form={previewForm}
          open={previewOpen}
          onClose={() => {
            setPreviewOpen(false)
            setPreviewForm(null)
          }}
        />
      )}
    </div>
  )
}
