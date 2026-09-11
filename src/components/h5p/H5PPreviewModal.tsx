import { useEffect, useRef, useState } from 'react'
import type { H5PBuilderForm } from '../../lib/h5p/types'
import { packageH5P } from '../../lib/h5p/packager'
import { mountH5PPreview } from '../../lib/h5p/previewPlayer'
import {
  assertPreviewAssets,
  clearActivePreview,
  storeH5PPreviewPackage,
} from '../../lib/h5p/previewStorage'

export default function H5PPreviewModal({
  form,
  open,
  onClose,
}: {
  form: H5PBuilderForm
  open: boolean
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const unmountRef = useRef<(() => void) | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      unmountRef.current?.()
      unmountRef.current = null
      return
    }

    let cancelled = false

    async function loadPreview() {
      setLoading(true)
      setError(null)

      try {
        if (form.contentType === 'question-set' || form.contentType === 'single-choice-set') {
          const validQuestions = form.quizQuestions.filter(
            (question) => question.question.trim() && question.answers.some((answer) => answer.trim()),
          )
          if (!validQuestions.length) {
            throw new Error('Add at least one question with answers before previewing your quiz.')
          }
        }

        if (form.contentType === 'dialog-cards' || form.contentType === 'flashcards') {
          const validCards = form.vocabCards.filter((card) => card.term.trim() && card.translation.trim())
          if (!validCards.length) {
            throw new Error('Add at least one vocabulary card before previewing.')
          }
        }

        if (form.contentType === 'crossword') {
          const validWords = form.vocabCards.filter((card) => card.term.trim() && card.translation.trim())
          if (validWords.length < 2) {
            throw new Error('Add at least two clue/answer pairs before previewing the crossword.')
          }
        }

        if (form.contentType === 'mark-the-words') {
          if (!form.markTheWordsText.trim() || !/\*[^*]+\*/.test(form.markTheWordsText)) {
            throw new Error('Add text with at least one word wrapped in *asterisks* before previewing.')
          }
        }

        if (form.contentType === 'drag-and-drop') {
          const validPairs = form.dragPairs.filter(
            (pair) => pair.draggable.trim() && pair.dropZone.trim(),
          )
          if (!validPairs.length) {
            throw new Error('Add at least one matching pair before previewing.')
          }
        }

        const { blob } = await packageH5P(form, { forPreview: true })
        const previewId = await storeH5PPreviewPackage(blob)
        assertPreviewAssets(previewId, form.contentType)

        if (cancelled || !containerRef.current) return

        unmountRef.current?.()
        unmountRef.current = await mountH5PPreview(containerRef.current, previewId)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load preview')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
      unmountRef.current?.()
      unmountRef.current = null
    }
  }, [form, open])

  useEffect(() => {
    if (open) return
    void clearActivePreview()
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
        aria-label="Close preview"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="h5p-preview-title"
        className="relative z-10 flex w-full max-w-5xl max-h-[90vh] flex-col rounded-2xl border border-slate-200 bg-[#ececec] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <div>
            <p id="h5p-preview-title" className="text-sm font-semibold text-slate-900">
              Preview
            </p>
            <p className="text-xs text-slate-500 truncate max-w-md">{form.title || 'Untitled H5P content'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="relative flex-1 overflow-auto p-4 min-h-[24rem]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#ececec]/80 z-10">
              <p className="text-sm text-slate-600">Loading preview…</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
          )}

          <div ref={containerRef} className="h5p-preview-container min-h-[20rem] bg-white rounded-lg border border-slate-200" />
        </div>
      </div>
    </div>
  )
}
