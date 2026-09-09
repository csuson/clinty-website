import { useEffect, useState } from 'react'
import FormField from '../FormField'
import { textareaClass } from '../../constants/forms'
import AiUsageMeter from '../AiUsageMeter'
import { applyGeneratedH5PContent, generateH5PContentWithAi } from '../../lib/h5p/generateWithAi'
import { buildAllTypesH5PAiPrompt, buildDefaultH5PAiPrompt } from '../../lib/h5p/aiPrompt'
import type { AiUsageSummary } from '../../lib/aiUsage'
import type { H5PBuilderForm, H5PContentTypeId } from '../../lib/h5p/types'

export default function H5PAiPromptPanel({
  contentType,
  businessBackground,
  form,
  usage,
  usageLoading,
  limitReached,
  onUsageChange,
  onGenerated,
}: {
  contentType: H5PContentTypeId
  businessBackground: string
  form: H5PBuilderForm
  usage: AiUsageSummary | null
  usageLoading?: boolean
  limitReached: boolean
  onUsageChange: () => void
  onGenerated: (form: H5PBuilderForm) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [edited, setEdited] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUsage, setLastUsage] = useState<number | null>(null)

  useEffect(() => {
    if (!edited) {
      setPrompt(buildDefaultH5PAiPrompt(contentType, businessBackground))
    }
  }, [contentType, businessBackground, edited])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function handleResetCurrent() {
    setPrompt(buildDefaultH5PAiPrompt(contentType, businessBackground))
    setEdited(false)
    setError(null)
  }

  function handleShowAllTypes() {
    setPrompt(buildAllTypesH5PAiPrompt(businessBackground))
    setEdited(true)
    setError(null)
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError('Enter a prompt before generating.')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const { content, usage: callUsage } = await generateH5PContentWithAi(contentType, prompt)
      onGenerated(applyGeneratedH5PContent(form, content))
      setLastUsage(callUsage.total_tokens)
      onUsageChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section className="rounded-2xl border border-navy-900/10 bg-white/70 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="font-medium text-navy-900">AI prompt</h3>
          <p className="text-sm text-navy-600 mt-1 leading-relaxed">
            Generate content with AI, or copy this prompt into ChatGPT or Claude. Token usage appears in Analytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetCurrent}
            className="px-3 py-2 rounded-xl text-sm font-medium border border-navy-900/10 text-navy-800 hover:bg-navy-900/5"
          >
            Reset example
          </button>
          <button
            type="button"
            onClick={handleShowAllTypes}
            className="px-3 py-2 rounded-xl text-sm font-medium border border-navy-900/10 text-navy-800 hover:bg-navy-900/5"
          >
            All types example
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="px-3 py-2 rounded-xl text-sm font-medium border border-navy-900/10 text-navy-800 hover:bg-navy-900/5"
          >
            {copied ? 'Copied' : 'Copy prompt'}
          </button>
        </div>
      </div>

      <AiUsageMeter
        usage={usage}
        loading={usageLoading}
        compact
        showFeatureBreakdown
        lastCallTokens={lastUsage}
      />

      <FormField
        label="Prompt for AI"
        id="h5p-ai-prompt"
        hint="Includes your business background from Prompts when available."
      >
        <textarea
          id="h5p-ai-prompt"
          className={`${textareaClass} min-h-[16rem] font-mono text-[13px] leading-relaxed`}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value)
            setEdited(true)
          }}
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating || limitReached || !prompt.trim()}
          className="px-5 py-3 rounded-xl bg-teal-700 text-cream text-sm font-medium hover:bg-teal-800 disabled:opacity-60"
        >
          {generating ? 'Generating…' : 'Generate with AI'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      )}
    </section>
  )
}
