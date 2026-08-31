import { useEffect, useState, type FormEvent } from 'react'
import FormField from '../../components/FormField'
import { CAMPAIGN_GOALS, type CampaignPlan, type CampaignSnapshot } from '../../constants/adCampaigns'
import { inputClass, textareaClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import { createAdCampaign, isAdCampaignApiConfigured, resumeAdCampaign } from '../../lib/adCampaigns'
import { fetchUserPrompts } from '../../lib/prompts'

type Step = 'brief' | 'clarifying' | 'review' | 'complete'

type BriefForm = {
  businessName: string
  industry: string
  websiteUrl: string
  locations: string
  monthlyBudget: string
  goal: string
  offerings: string
  audience: string
  notes: string
}

const emptyBrief = (): BriefForm => ({
  businessName: '',
  industry: '',
  websiteUrl: '',
  locations: '',
  monthlyBudget: '',
  goal: 'leads',
  offerings: '',
  audience: '',
  notes: '',
})

function composeBrief(form: BriefForm): string {
  const lines: string[] = []
  if (form.businessName.trim()) lines.push(`Business name: ${form.businessName.trim()}`)
  if (form.industry.trim()) lines.push(`Industry: ${form.industry.trim()}`)
  if (form.websiteUrl.trim()) lines.push(`Website: ${form.websiteUrl.trim()}`)
  if (form.locations.trim()) lines.push(`Locations to target: ${form.locations.trim()}`)
  if (form.monthlyBudget.trim()) lines.push(`Monthly Google Ads budget: $${form.monthlyBudget.trim()} USD`)
  if (form.goal) lines.push(`Primary goal: ${form.goal.replaceAll('_', ' ')}`)
  if (form.offerings.trim()) lines.push(`Products or services: ${form.offerings.trim()}`)
  if (form.audience.trim()) lines.push(`Target audience: ${form.audience.trim()}`)
  if (form.notes.trim()) lines.push(`Additional background and goals:\n${form.notes.trim()}`)
  return lines.join('\n')
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function GoogleAds() {
  const { user } = useAuth()
  const apiReady = isAdCampaignApiConfigured()
  const [form, setForm] = useState<BriefForm>(emptyBrief)
  const [step, setStep] = useState<Step>('brief')
  const [snapshot, setSnapshot] = useState<CampaignSnapshot | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [revisionNotes, setRevisionNotes] = useState('')
  const [publish, setPublish] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchUserPrompts(user.id)
      .then((prompts) => {
        setForm((current) =>
          current.notes ? current : { ...current, notes: prompts.background },
        )
      })
      .catch(() => {
        /* Prompts are optional context for the brief. */
      })
  }, [user])

  function applySnapshot(next: CampaignSnapshot) {
    setSnapshot(next)
    if (next.status === 'clarification') {
      const fields = next.missing_fields.length
        ? next.missing_fields
        : (next.interrupt?.missing_fields ?? [])
      const nextAnswers: Record<string, string> = {}
      for (const field of fields) nextAnswers[field] = ''
      setAnswers(nextAnswers)
      setStep('clarifying')
      return
    }
    if (next.status === 'approval') {
      setStep('review')
      return
    }
    if (next.status === 'complete') {
      setStep('complete')
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    const brief = composeBrief(form)
    if (brief.length < 12) {
      setError('Add your business name, offer, locations, budget, and goal so we can draft ads.')
      return
    }

    setWorking(true)
    setError(null)
    try {
      applySnapshot(await createAdCampaign(brief))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draft the campaign')
    } finally {
      setWorking(false)
    }
  }

  async function handleClarify(event: FormEvent) {
    event.preventDefault()
    if (!snapshot) return
    setWorking(true)
    setError(null)
    try {
      applySnapshot(await resumeAdCampaign(snapshot.thread_id, { answers }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue')
    } finally {
      setWorking(false)
    }
  }

  async function handleApproval(approved: boolean) {
    if (!snapshot) return
    if (!approved && !revisionNotes.trim()) {
      setError('Tell us what to change before sending the draft back.')
      return
    }
    setWorking(true)
    setError(null)
    try {
      applySnapshot(
        await resumeAdCampaign(snapshot.thread_id, {
          approved,
          publish: approved ? publish : false,
          notes: revisionNotes,
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit your decision')
    } finally {
      setWorking(false)
    }
  }

  function handleReset() {
    setStep('brief')
    setSnapshot(null)
    setAnswers({})
    setRevisionNotes('')
    setPublish(false)
    setError(null)
  }

  function update<K extends keyof BriefForm>(key: K, value: BriefForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  if (!apiReady) {
    return (
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Google Ads</h2>
        <p className="text-sm text-navy-600">
          Set <code className="text-xs bg-cream px-1 py-0.5 rounded">VITE_AD_CAMPAIGN_API_URL</code> to
          your campaign agent (for local dev, run <code className="text-xs bg-cream px-1 py-0.5 rounded">ad-campaign-api</code> and
          leave the Vite proxy at <code className="text-xs bg-cream px-1 py-0.5 rounded">/api/ad-campaigns</code>).
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} />}
      {working && (
        <Alert
          type="info"
          message="Drafting strategy, keywords, and ads. This usually takes under a minute."
        />
      )}

      {step === 'brief' && (
        <form onSubmit={handleCreate} className="space-y-6">
          <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900 mb-1">Google Ads campaign</h2>
            <p className="text-sm text-navy-600 mb-6">
              Tell us about the business and the outcome you want. Clinty will draft a Search campaign
              — ad groups, keywords, Responsive Search Ads, and budget — for you to review before
              anything is created in Google Ads.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Business name" id="ads-business" required>
                <input
                  id="ads-business"
                  value={form.businessName}
                  onChange={(e) => update('businessName', e.target.value)}
                  className={inputClass}
                  disabled={working}
                  required
                />
              </FormField>
              <FormField label="Industry" id="ads-industry" required>
                <input
                  id="ads-industry"
                  value={form.industry}
                  onChange={(e) => update('industry', e.target.value)}
                  className={inputClass}
                  placeholder="Dentistry, e-commerce bedding, HVAC…"
                  disabled={working}
                  required
                />
              </FormField>
              <FormField label="Website / landing page" id="ads-website" required>
                <input
                  id="ads-website"
                  type="text"
                  inputMode="url"
                  value={form.websiteUrl}
                  onChange={(e) => update('websiteUrl', e.target.value)}
                  className={inputClass}
                  placeholder="https://"
                  disabled={working}
                  required
                />
              </FormField>
              <FormField label="Locations" id="ads-locations" required>
                <input
                  id="ads-locations"
                  value={form.locations}
                  onChange={(e) => update('locations', e.target.value)}
                  className={inputClass}
                  placeholder="Austin, TX and nearby suburbs"
                  disabled={working}
                  required
                />
              </FormField>
              <FormField label="Monthly budget (USD)" id="ads-budget" required>
                <input
                  id="ads-budget"
                  type="number"
                  min="50"
                  step="50"
                  value={form.monthlyBudget}
                  onChange={(e) => update('monthlyBudget', e.target.value)}
                  className={inputClass}
                  disabled={working}
                  required
                />
              </FormField>
              <FormField label="Primary goal" id="ads-goal" required>
                <select
                  id="ads-goal"
                  value={form.goal}
                  onChange={(e) => update('goal', e.target.value)}
                  className={inputClass}
                  disabled={working}
                >
                  {CAMPAIGN_GOALS.map((goal) => (
                    <option key={goal.value} value={goal.value}>
                      {goal.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="mt-4 space-y-4">
              <FormField label="Products or services to advertise" id="ads-offerings" required>
                <input
                  id="ads-offerings"
                  value={form.offerings}
                  onChange={(e) => update('offerings', e.target.value)}
                  className={inputClass}
                  placeholder="Exams, Invisalign, teeth whitening"
                  disabled={working}
                  required
                />
              </FormField>
              <FormField label="Who should see these ads?" id="ads-audience">
                <input
                  id="ads-audience"
                  value={form.audience}
                  onChange={(e) => update('audience', e.target.value)}
                  className={inputClass}
                  placeholder="Families and professionals in the service area"
                  disabled={working}
                />
              </FormField>
              <FormField label="Business background and extra goals" id="ads-notes">
                <textarea
                  id="ads-notes"
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  className={textareaClass}
                  rows={8}
                  disabled={working}
                  placeholder="Differentiator, brand voice, claims to avoid, competitors…"
                />
              </FormField>
            </div>

            <button
              type="submit"
              disabled={working}
              className="mt-8 bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
            >
              {working ? 'Drafting campaign…' : 'Draft campaign'}
            </button>
          </section>
        </form>
      )}

      {step === 'clarifying' && snapshot && (
        <form onSubmit={handleClarify} className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900 mb-1">A few more details</h2>
          <p className="text-sm text-navy-600 mb-6">
            We need this before we can build keywords and ads.
          </p>
          <div className="space-y-4">
            {clarifyingFields(snapshot).map(({ field, question }) => (
              <FormField key={field} label={question} id={`ads-q-${field}`} required>
                <input
                  id={`ads-q-${field}`}
                  value={answers[field] ?? ''}
                  onChange={(e) => setAnswers((current) => ({ ...current, [field]: e.target.value }))}
                  className={inputClass}
                  disabled={working}
                  required
                />
              </FormField>
            ))}
          </div>
          <div className="flex gap-3 mt-8">
            <button
              type="submit"
              disabled={working}
              className="bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
            >
              {working ? 'Continuing…' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={working}
              className="border border-navy-900/15 text-navy-900 font-medium px-6 py-3 rounded-xl hover:bg-navy-900/5 transition-colors"
            >
              Start over
            </button>
          </div>
        </form>
      )}

      {step === 'review' && snapshot?.campaign_plan && (
        <div className="space-y-6">
          <CampaignPlanView plan={snapshot.campaign_plan} review={snapshot.review} />
          <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
            <h3 className="text-base font-semibold text-navy-900 mb-1">Approve this draft?</h3>
            <p className="text-sm text-navy-600 mb-4">
              Nothing is enabled in Google Ads automatically. Publishing creates the campaign paused
              so you can QA first.
            </p>
            <FormField label="What should change? (required if you send it back)" id="ads-revision">
              <textarea
                id="ads-revision"
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className={`${textareaClass} min-h-[6rem]`}
                rows={4}
                disabled={working}
              />
            </FormField>
            <label className="flex items-center gap-2 mt-4 text-sm text-navy-800">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                disabled={working}
              />
              Create this campaign paused in Google Ads after I approve
            </label>
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="button"
                onClick={() => handleApproval(true)}
                disabled={working}
                className="bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
              >
                {working ? 'Submitting…' : 'Approve draft'}
              </button>
              <button
                type="button"
                onClick={() => handleApproval(false)}
                disabled={working}
                className="border border-navy-900/15 text-navy-900 font-medium px-6 py-3 rounded-xl hover:bg-navy-900/5 transition-colors disabled:opacity-60"
              >
                Send back with notes
              </button>
            </div>
          </section>
        </div>
      )}

      {step === 'complete' && snapshot && (
        <div className="space-y-6">
          {snapshot.publish_result && (
            <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-navy-900 mb-1">Campaign ready</h2>
              <p className="text-sm text-navy-600 mb-2">
                Status: <span className="font-medium text-navy-900">{snapshot.publish_result.status}</span>
              </p>
              <p className="text-sm text-navy-600">{snapshot.publish_result.detail}</p>
            </section>
          )}
          {snapshot.campaign_plan && (
            <CampaignPlanView plan={snapshot.campaign_plan} review={snapshot.review} />
          )}
          <div className="flex flex-wrap gap-3">
            {snapshot.campaign_plan && (
              <button
                type="button"
                onClick={() =>
                  downloadJson(
                    `${snapshot.campaign_plan?.strategy.campaign_name ?? 'campaign'}.json`,
                    snapshot.campaign_plan,
                  )
                }
                className="bg-teal-500 text-white font-medium px-6 py-3 rounded-xl hover:bg-teal-600 transition-colors"
              >
                Download JSON
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="border border-navy-900/15 text-navy-900 font-medium px-6 py-3 rounded-xl hover:bg-navy-900/5 transition-colors"
            >
              Draft another campaign
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function clarifyingFields(snapshot: CampaignSnapshot): { field: string; question: string }[] {
  const fields = snapshot.missing_fields.length
    ? snapshot.missing_fields
    : (snapshot.interrupt?.missing_fields ?? [])
  const questions = snapshot.clarifying_questions.length
    ? snapshot.clarifying_questions
    : (snapshot.interrupt?.questions ?? [])
  if (fields.length === 0) {
    return questions.map((question, index) => ({ field: `q${index + 1}`, question }))
  }
  return fields.map((field, index) => ({
    field,
    question: questions[index] ?? field.replaceAll('_', ' '),
  }))
}

function CampaignPlanView({
  plan,
  review,
}: {
  plan: CampaignPlan
  review: CampaignSnapshot['review']
}) {
  return (
    <>
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">{plan.strategy.campaign_name}</h2>
        <p className="text-sm text-navy-600 mb-4">{plan.strategy.objective}</p>
        <p className="text-sm text-navy-800 mb-6">{plan.strategy.positioning}</p>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <Info label="Monthly budget" value={`$${plan.budget.monthly_budget_usd.toLocaleString()}`} />
          <Info label="Daily budget" value={`$${plan.budget.daily_budget_usd.toFixed(2)}`} />
          <Info label="Bidding" value={plan.budget.bidding_strategy.replaceAll('_', ' ')} />
          <Info label="Expected CPC" value={plan.budget.expected_cpc_range_usd} />
          <Info label="Geo" value={plan.strategy.geo_targets.join(', ')} />
          <Info label="Campaign type" value={plan.strategy.campaign_type.replaceAll('_', ' ')} />
        </dl>
        <p className="text-sm text-navy-600 mt-4">{plan.budget.notes}</p>
      </section>

      {plan.ad_groups.map((group) => (
        <section key={group.name} className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
          <h3 className="text-base font-semibold text-navy-900 mb-1">{group.name}</h3>
          <p className="text-sm text-navy-600 mb-4">
            {group.theme} · {group.landing_page_url}
          </p>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-navy-900 mb-2">Keywords</h4>
              <ul className="space-y-1 text-navy-700">
                {group.keywords.map((keyword) => (
                  <li key={`${keyword.match_type}-${keyword.text}`}>
                    <span className="text-xs uppercase tracking-wide text-navy-500 mr-2">
                      {keyword.match_type}
                    </span>
                    {keyword.text}
                  </li>
                ))}
              </ul>
              {group.negatives.length > 0 && (
                <p className="text-xs text-navy-500 mt-3">Negatives: {group.negatives.join(', ')}</p>
              )}
            </div>
            <div>
              <h4 className="font-medium text-navy-900 mb-2">Responsive Search Ad</h4>
              <ul className="space-y-1 text-navy-700">
                {group.rsa.headlines.map((headline) => (
                  <li key={headline}>
                    {headline}{' '}
                    <span className="text-xs text-navy-400">({headline.length})</span>
                  </li>
                ))}
              </ul>
              <ul className="mt-3 space-y-2 text-navy-600">
                {group.rsa.descriptions.map((description) => (
                  <li key={description}>{description}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}

      {plan.campaign_negatives.length > 0 && (
        <p className="text-sm text-navy-600 px-1">
          Campaign negatives: {plan.campaign_negatives.join(', ')}
        </p>
      )}

      {review && review.issues.length > 0 && (
        <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
          <h3 className="text-base font-semibold text-navy-900 mb-3">Review notes</h3>
          <ul className="space-y-2 text-sm">
            {review.issues.map((issue) => (
              <li
                key={`${issue.field}-${issue.message}`}
                className={issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'}
              >
                [{issue.severity}] {issue.field}: {issue.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.launch_checklist.length > 0 && (
        <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
          <h3 className="text-base font-semibold text-navy-900 mb-3">Launch checklist</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-navy-700">
            {plan.launch_checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-navy-500">{label}</dt>
      <dd className="text-navy-900 font-medium">{value}</dd>
    </div>
  )
}

function Alert({ type, message }: { type: 'error' | 'info'; message: string }) {
  const styles =
    type === 'error'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-teal-400/10 border-teal-400/20 text-teal-700'

  return <div className={`rounded-xl border text-sm px-4 py-3 ${styles}`}>{message}</div>
}
