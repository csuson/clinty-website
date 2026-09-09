import { useEffect, useMemo, useState, type FormEvent } from 'react'
import H5PContentEditor from '../../components/h5p/H5PContentEditor'
import H5PAiPromptPanel from '../../components/h5p/H5PAiPromptPanel'
import H5PPreviewModal from '../../components/h5p/H5PPreviewModal'
import { useAuth } from '../../context/AuthContext'
import { useAiUsage } from '../../hooks/useAiUsage'
import { applyBusinessBackgroundToForm, defaultH5PBuilderForm } from '../../lib/h5p/defaults'
import { readDragDropCsvFile } from '../../lib/h5p/dragDropCsvImport'
import { downloadH5P, packageH5P } from '../../lib/h5p/packager'
import { ensurePreviewServiceWorker } from '../../lib/h5p/previewStorage'
import { readQuizCsvFile } from '../../lib/h5p/quizCsvImport'
import { H5P_CONTENT_TYPES } from '../../lib/h5p/types'
import type { H5PBuilderForm, H5PContentTypeId } from '../../lib/h5p/types'
import { defaultPromptFields, fetchUserPrompts, type PromptFields } from '../../lib/prompts'

export default function H5PBuilder() {
  const { user } = useAuth()
  const [prompts, setPrompts] = useState<PromptFields>(defaultPromptFields())
  const [form, setForm] = useState<H5PBuilderForm>(() => defaultH5PBuilderForm('question-set', defaultPromptFields()))
  const [loading, setLoading] = useState(true)
  const [packaging, setPackaging] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewForm, setPreviewForm] = useState<H5PBuilderForm | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { usage: aiUsage, loading: aiUsageLoading, refresh: refreshAiUsage, limitReached } = useAiUsage(user?.id)

  const selectedType = useMemo(
    () => H5P_CONTENT_TYPES.find((type) => type.id === form.contentType),
    [form.contentType],
  )

  useEffect(() => {
    void ensurePreviewServiceWorker()
  }, [])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchUserPrompts(user.id)
      .then((loadedPrompts) => {
        setPrompts(loadedPrompts)
        setForm(defaultH5PBuilderForm('question-set', loadedPrompts))
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load business background')
      })
      .finally(() => setLoading(false))
  }, [user])

  function updateForm(patch: Partial<H5PBuilderForm>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function handleContentTypeChange(contentType: H5PContentTypeId) {
    setForm(defaultH5PBuilderForm(contentType, prompts))
    setMessage(null)
    setError(null)
  }

  function handleApplyBackground() {
    setForm((current) => applyBusinessBackgroundToForm(current, prompts))
    setMessage('Applied your business background as defaults.')
    setError(null)
  }

  async function handleQuizCsvImport(file: File) {
    setMessage(null)
    setError(null)

    try {
      const quizQuestions = await readQuizCsvFile(file)
      updateForm({ quizQuestions, contentType: 'question-set' })
      setMessage(`Imported ${quizQuestions.length} question${quizQuestions.length === 1 ? '' : 's'} from CSV.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV')
    }
  }

  async function handleDragDropCsvImport(file: File) {
    setMessage(null)
    setError(null)

    try {
      const dragPairs = await readDragDropCsvFile(file)
      updateForm({ dragPairs, contentType: 'drag-and-drop' })
      setMessage(`Imported ${dragPairs.length} drag and drop pair${dragPairs.length === 1 ? '' : 's'} from CSV.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV')
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
      setMessage(`Downloaded ${filename}. Upload it to Moodle, WordPress, or any H5P-enabled platform.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build H5P package')
    } finally {
      setPackaging(false)
    }
  }

  if (loading) {
    return <p className="text-navy-600">Loading H5P builder…</p>
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl text-navy-900 mb-2">H5P Content Builder</h2>
        <p className="text-sm text-navy-600 leading-relaxed">
          Create downloadable <code className="text-xs bg-navy-900/5 px-1.5 py-0.5 rounded">.h5p</code> files for
          training, onboarding, and customer education. Defaults are pulled from your business background in Prompts.
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-medium text-navy-900">Content type</h3>
              <p className="text-sm text-navy-600 mt-1">{selectedType?.description}</p>
            </div>
            <button
              type="button"
              onClick={handleApplyBackground}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium border border-navy-900/10 text-navy-800 hover:bg-navy-900/5"
            >
              Use business background
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {H5P_CONTENT_TYPES.map((type) => (
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
                  name="contentType"
                  value={type.id}
                  checked={form.contentType === type.id}
                  onChange={() => handleContentTypeChange(type.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-navy-900">{type.label}</span>
                  <span className="block text-xs text-navy-600 mt-0.5">{type.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <H5PAiPromptPanel
          contentType={form.contentType}
          businessBackground={prompts.background}
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
        />

        <H5PContentEditor
          form={form}
          onChange={updateForm}
          onImportQuizCsv={handleQuizCsvImport}
          onImportDragDropCsv={handleDragDropCsvImport}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handlePreview()}
            className="px-5 py-3 rounded-xl border border-navy-900/15 bg-white text-navy-900 text-sm font-medium hover:bg-navy-900/5"
          >
            Preview
          </button>
          <button
            type="submit"
            disabled={packaging}
            className="px-5 py-3 rounded-xl bg-navy-900 text-cream text-sm font-medium hover:bg-navy-800 disabled:opacity-60"
          >
            {packaging ? 'Building…' : 'Download .h5p file'}
          </button>
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
