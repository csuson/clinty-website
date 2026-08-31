import { useEffect, useRef, useState, type FormEvent } from 'react'
import FormField from '../../components/FormField'
import { CAMPAIGN_GOALS, type CampaignPlan, type CampaignSnapshot, type FacebookCampaignPlan, type YelpCampaignPlan } from '../../constants/adCampaigns'
import { inputClass, textareaClass } from '../../constants/forms'
import { useAuth } from '../../context/AuthContext'
import { createAdCampaign, configureAdCampaignApi, isAdCampaignApiConfigured, resumeAdCampaign } from '../../lib/adCampaigns'
import {
  fetchGoogleAdsSettings,
  saveGoogleAdsCampaignBrief,
} from '../../lib/googleAds/settings'
import { briefFormFromBackground, combineAdBriefForm } from '../../lib/googleAds/briefFromBackground'
import { clarifyingFieldHint } from '../../lib/googleAds/clarifyingHints'
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
  if (form.monthlyBudget.trim()) lines.push(`Monthly paid media budget: $${form.monthlyBudget.trim()} USD`)
  if (form.goal) lines.push(`Primary goal: ${form.goal.replaceAll('_', ' ')}`)
  if (form.offerings.trim()) lines.push(`Products or services: ${form.offerings.trim()}`)
  if (form.audience.trim()) lines.push(`Target audience: ${form.audience.trim()}`)
  if (form.notes.trim()) lines.push(`Additional background and goals:\n${form.notes.trim()}`)
  return lines.join('\n')
}

function togglePlatform(current: string[], name: string): string[] {
  return current.includes(name)
    ? current.filter((item) => item !== name)
    : [...current, name]
}

function budgetSplitHint(platforms: string[]): string | null {
  const google = platforms.includes('google')
  const facebook = platforms.includes('facebook')
  const yelp = platforms.includes('yelp')
  const selected = Number(google) + Number(facebook) + Number(yelp)
  if (selected < 2) return null
  if (google && facebook && yelp) {
    return 'The monthly budget is split 40% Google / 35% Meta / 25% Yelp when all three are selected.'
  }
  if (google && facebook) return 'The monthly budget is split 55% Google / 45% Meta when both are selected.'
  if (google && yelp) return 'The monthly budget is split 60% Google / 40% Yelp when both are selected.'
  if (facebook && yelp) return 'The monthly budget is split 55% Meta / 45% Yelp when both are selected.'
  return null
}

function hasAnyPlan(snapshot: CampaignSnapshot): boolean {
  return Boolean(snapshot.campaign_plan || snapshot.facebook_plan || snapshot.yelp_plan)
}

function reviewForPlan(
  plan: 'google' | 'facebook' | 'yelp',
  snapshot: CampaignSnapshot,
): CampaignSnapshot['review'] | null {
  const last = snapshot.yelp_plan ? 'yelp' : snapshot.facebook_plan ? 'facebook' : 'google'
  return plan === last ? snapshot.review : null
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
  const { user, profile } = useAuth()
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const apiReady = settingsLoaded && isAdCampaignApiConfigured()
  const [form, setForm] = useState<BriefForm>(emptyBrief)
  const [step, setStep] = useState<Step>('brief')
  const [snapshot, setSnapshot] = useState<CampaignSnapshot | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [revisionNotes, setRevisionNotes] = useState('')
  const [publish, setPublish] = useState(false)
  const [platforms, setPlatforms] = useState<string[]>(['google', 'facebook'])
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [briefLoaded, setBriefLoaded] = useState(false)
  const [reloadingBackground, setReloadingBackground] = useState(false)
  const skipBriefSaveRef = useRef(true)

  useEffect(() => {
    if (!user) {
      setSettingsLoaded(true)
      return
    }

    let cancelled = false
    const userId = user.id

    async function loadCampaignData() {
      try {
        const [settings, prompts] = await Promise.all([
          fetchGoogleAdsSettings(),
          fetchUserPrompts(userId),
        ])

        if (cancelled) return

        configureAdCampaignApi(settings.adCampaignApiUrl)

        const parsed = briefFormFromBackground(prompts.background, {
          companyName: profile?.company_name,
        })
        setForm(combineAdBriefForm(parsed, settings.campaignBrief))
      } catch {
        if (!cancelled) {
          configureAdCampaignApi(null)
        }
      } finally {
        if (!cancelled) {
          skipBriefSaveRef.current = false
          setBriefLoaded(true)
          setSettingsLoaded(true)
        }
      }
    }

    loadCampaignData()

    return () => {
      cancelled = true
    }
  }, [user, profile?.company_name])

  useEffect(() => {
    if (!briefLoaded || skipBriefSaveRef.current) return

    const timer = window.setTimeout(() => {
      saveGoogleAdsCampaignBrief(form).catch(() => {
        /* Best-effort autosave for campaign brief fields. */
      })
    }, 900)

    return () => window.clearTimeout(timer)
  }, [form, briefLoaded])

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
    if (platforms.length === 0) {
      setError('Select at least one platform: Google Ads, Facebook / Instagram, or Yelp.')
      return
    }

    setWorking(true)
    setError(null)
    try {
      await saveGoogleAdsCampaignBrief(form)
      applySnapshot(await createAdCampaign(brief, platforms))
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

  async function handleReloadFromBackground() {
    if (!user) return

    setReloadingBackground(true)
    setError(null)
    skipBriefSaveRef.current = true

    try {
      const prompts = await fetchUserPrompts(user.id)
      const parsed = briefFormFromBackground(prompts.background, {
        companyName: profile?.company_name,
      })
      const nextForm = combineAdBriefForm(parsed, {
        monthlyBudget: form.monthlyBudget,
        goal: form.goal,
      })
      setForm(nextForm)
      await saveGoogleAdsCampaignBrief(nextForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload business background')
    } finally {
      skipBriefSaveRef.current = false
      setReloadingBackground(false)
    }
  }

  function handleReset() {
    setStep('brief')
    setSnapshot(null)
    setAnswers({})
    setRevisionNotes('')
    setPublish(false)
    setPlatforms(['google', 'facebook'])
    setError(null)
    if (!user) {
      setForm(emptyBrief())
      return
    }

    skipBriefSaveRef.current = true
    Promise.all([fetchGoogleAdsSettings(), fetchUserPrompts(user.id)])
      .then(([settings, prompts]) => {
        const parsed = briefFormFromBackground(prompts.background, {
          companyName: profile?.company_name,
        })
        setForm(combineAdBriefForm(parsed, settings.campaignBrief))
      })
      .catch(() => {
        setForm(emptyBrief())
      })
      .finally(() => {
        skipBriefSaveRef.current = false
      })
  }

  function update<K extends keyof BriefForm>(key: K, value: BriefForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  if (!settingsLoaded) {
    return (
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <p className="text-sm text-navy-600">Loading ad campaign settings...</p>
      </section>
    )
  }

  if (!apiReady) {
    return (
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Ad campaigns</h2>
        <p className="text-sm text-navy-600 mb-4">
          Save your ad campaign AI URL in{' '}
          <a href="/account/integrations" className="text-[#4285F4] hover:underline">
            Integrations
          </a>{' '}
          before drafting campaigns. For local development you can also set{' '}
          <code className="text-xs bg-cream px-1 py-0.5 rounded">VITE_AD_CAMPAIGN_API_URL</code> or
          use the Vite proxy at{' '}
          <code className="text-xs bg-cream px-1 py-0.5 rounded">/api/ad-campaigns</code>.
        </p>
      </section>
    )
  }

  const splitHint = budgetSplitHint(platforms)

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} />}
      {working && (
        <Alert
          type="info"
          message="Drafting Google, Meta, and/or Yelp campaigns. This usually takes under a minute."
        />
      )}

      {step === 'brief' && (
        <form onSubmit={handleCreate} className="space-y-6">
          <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-navy-900 mb-1">Paid media campaign</h2>
                <p className="text-sm text-navy-600">
                  Tell us about the business and the outcome you want. Clinty will draft Google Search,
                  Meta, and/or Yelp campaigns — targeting, ads, and budget — for you to review before
                  anything is created in the ad accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReloadFromBackground}
                disabled={working || reloadingBackground}
                className="inline-flex items-center justify-center shrink-0 border border-navy-900/15 text-navy-900 font-medium px-4 py-2.5 rounded-xl hover:bg-navy-900/5 transition-colors text-sm disabled:opacity-60"
              >
                {reloadingBackground ? 'Reloading…' : 'Reload from background'}
              </button>
            </div>

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
              <fieldset>
                <legend className="text-sm font-medium text-navy-800 mb-2">Platforms</legend>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-navy-800">
                    <input
                      type="checkbox"
                      checked={platforms.includes('google')}
                      onChange={() => setPlatforms((current) => togglePlatform(current, 'google'))}
                      disabled={working}
                    />
                    Google Search
                  </label>
                  <label className="flex items-center gap-2 text-sm text-navy-800">
                    <input
                      type="checkbox"
                      checked={platforms.includes('facebook')}
                      onChange={() => setPlatforms((current) => togglePlatform(current, 'facebook'))}
                      disabled={working}
                    />
                    Facebook / Instagram
                  </label>
                  <label className="flex items-center gap-2 text-sm text-navy-800">
                    <input
                      type="checkbox"
                      checked={platforms.includes('yelp')}
                      onChange={() => setPlatforms((current) => togglePlatform(current, 'yelp'))}
                      disabled={working}
                    />
                    Yelp
                  </label>
                </div>
                {splitHint && (
                  <p className="text-xs text-navy-500 mt-2">{splitHint}</p>
                )}
              </fieldset>
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
              {working ? 'Drafting campaigns…' : 'Draft campaigns'}
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
            {clarifyingFields(snapshot).map(({ field, question, hint }) => (
              <FormField
                key={field}
                label={question}
                hint={hint}
                id={`ads-q-${field}`}
                required
              >
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

      {step === 'review' && snapshot && hasAnyPlan(snapshot) && (
        <div className="space-y-6">
          {snapshot.campaign_plan && (
            <CampaignPlanView
              plan={snapshot.campaign_plan}
              review={reviewForPlan('google', snapshot)}
            />
          )}
          {snapshot.facebook_plan && (
            <FacebookPlanView
              plan={snapshot.facebook_plan}
              review={reviewForPlan('facebook', snapshot)}
            />
          )}
          {snapshot.yelp_plan && (
            <YelpPlanView plan={snapshot.yelp_plan} review={reviewForPlan('yelp', snapshot)} />
          )}
          <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
            <h3 className="text-base font-semibold text-navy-900 mb-1">Approve this draft?</h3>
            <p className="text-sm text-navy-600 mb-4">
              Nothing is enabled automatically. Publishing creates campaigns paused so you can QA first.
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
              Create paused campaigns in Google Ads, Meta Ads Manager, and/or Yelp Ads after I approve
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
            <CampaignPlanView
              plan={snapshot.campaign_plan}
              review={reviewForPlan('google', snapshot)}
            />
          )}
          {snapshot.facebook_plan && (
            <FacebookPlanView
              plan={snapshot.facebook_plan}
              review={reviewForPlan('facebook', snapshot)}
            />
          )}
          {snapshot.yelp_plan && (
            <YelpPlanView plan={snapshot.yelp_plan} review={reviewForPlan('yelp', snapshot)} />
          )}
          <div className="flex flex-wrap gap-3">
            {hasAnyPlan(snapshot) && (
              <button
                type="button"
                onClick={() =>
                  downloadJson(
                    'media-plan.json',
                    snapshot.media_plan ?? {
                      google: snapshot.campaign_plan,
                      facebook: snapshot.facebook_plan,
                      yelp: snapshot.yelp_plan,
                    },
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

function clarifyingFields(
  snapshot: CampaignSnapshot,
): { field: string; question: string; hint: string }[] {
  const fields = snapshot.missing_fields.length
    ? snapshot.missing_fields
    : (snapshot.interrupt?.missing_fields ?? [])
  const questions = snapshot.clarifying_questions.length
    ? snapshot.clarifying_questions
    : (snapshot.interrupt?.questions ?? [])
  if (fields.length === 0) {
    return questions.map((question, index) => {
      const field = `q${index + 1}`
      return {
        field,
        question,
        hint: clarifyingFieldHint(field, question),
      }
    })
  }
  return fields.map((field, index) => {
    const question = questions[index] ?? field.replaceAll('_', ' ')
    return {
      field,
      question,
      hint: clarifyingFieldHint(field, question),
    }
  })
}

function CampaignPlanView({
  plan,
  review,
}: {
  plan: CampaignPlan
  review: CampaignSnapshot['review'] | null
}) {
  return (
    <>
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">{plan.strategy.campaign_name}</h2>
        <p className="text-xs uppercase tracking-wide text-navy-500 mb-2">Google Search</p>
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

function FacebookPlanView({
  plan,
  review,
}: {
  plan: FacebookCampaignPlan
  review: CampaignSnapshot['review'] | null
}) {
  return (
    <>
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">{plan.campaign_name}</h2>
        <p className="text-xs uppercase tracking-wide text-navy-500 mb-2">Facebook / Instagram</p>
        <p className="text-sm text-navy-600 mb-4">{plan.objective.replaceAll('_', ' ')}</p>
        <p className="text-sm text-navy-800 mb-6">{plan.rationale}</p>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <Info label="Monthly budget" value={`$${plan.monthly_budget_usd.toLocaleString()}`} />
          <Info label="Daily budget" value={`$${plan.daily_budget_usd.toFixed(2)}`} />
          <Info label="Bidding" value={plan.bid_strategy.replaceAll('_', ' ')} />
        </dl>
      </section>

      {plan.ad_sets.map((adSet) => (
        <section key={adSet.name} className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
          <h3 className="text-base font-semibold text-navy-900 mb-1">{adSet.name}</h3>
          <p className="text-sm text-navy-600 mb-4">
            {adSet.theme} · ages {adSet.age_min}–{adSet.age_max} · ${adSet.daily_budget_usd.toFixed(2)}/day
          </p>
          {adSet.interests.length > 0 && (
            <p className="text-xs text-navy-500 mb-4">Interests: {adSet.interests.join(', ')}</p>
          )}
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            {adSet.ads.map((ad) => (
              <div key={ad.name} className="rounded-xl border border-navy-900/10 p-4">
                <h4 className="font-medium text-navy-900 mb-2">{ad.name}</h4>
                <p className="text-navy-700 mb-2">{ad.primary_text}</p>
                <p className="font-medium text-navy-900">
                  {ad.headline}{' '}
                  <span className="text-xs text-navy-400">({ad.headline.length})</span>
                </p>
                {ad.description && <p className="text-navy-600 mt-1">{ad.description}</p>}
                <p className="text-xs text-navy-500 mt-3">CTA: {ad.call_to_action.replaceAll('_', ' ')}</p>
                <p className="text-xs text-navy-500 mt-1">Image: {ad.image_concept}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

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
          <h3 className="text-base font-semibold text-navy-900 mb-3">Meta launch checklist</h3>
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

function YelpPlanView({
  plan,
  review,
}: {
  plan: YelpCampaignPlan
  review: CampaignSnapshot['review'] | null
}) {
  return (
    <>
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">{plan.campaign_name}</h2>
        <p className="text-xs uppercase tracking-wide text-navy-500 mb-2">Yelp CPC</p>
        <p className="text-sm text-navy-600 mb-4">
          {plan.program_type} · {plan.ad_goal.replaceAll('_', ' ')}
        </p>
        <p className="text-sm text-navy-800 mb-6">{plan.rationale}</p>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <Info label="Monthly budget" value={`$${plan.monthly_budget_usd.toLocaleString()}`} />
          <Info label="Daily budget" value={`$${plan.daily_budget_usd.toFixed(2)}`} />
          <Info label="Autobid" value={plan.is_autobid ? 'Yes' : 'No'} />
          {plan.max_bid_usd != null && (
            <Info label="Max bid" value={`$${plan.max_bid_usd.toFixed(2)}`} />
          )}
          <Info label="Pacing" value={plan.pacing_method.replaceAll('_', ' ')} />
          <Info label="Fee period" value={plan.fee_period.replaceAll('_', ' ')} />
          <Info label="Geo" value={plan.geo_targets.join(', ')} />
          {plan.radius_miles != null && (
            <Info label="Radius" value={`${plan.radius_miles} miles`} />
          )}
          {plan.categories.length > 0 && (
            <Info label="Categories" value={plan.categories.join(', ')} />
          )}
        </dl>
      </section>

      {plan.programs.map((program) => (
        <section key={program.name} className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
          <h3 className="text-base font-semibold text-navy-900 mb-1">{program.name}</h3>
          <p className="text-sm text-navy-600 mb-4">
            {program.theme} · ${program.monthly_budget_usd.toLocaleString()}/month
          </p>
          {program.categories.length > 0 && (
            <p className="text-xs text-navy-500 mb-4">Categories: {program.categories.join(', ')}</p>
          )}
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium text-navy-900 mb-1">Specialties</h4>
              <p className="text-navy-700">
                {program.specialties_text}{' '}
                <span className="text-xs text-navy-400">({program.specialties_text.length})</span>
              </p>
            </div>
            <div>
              <h4 className="font-medium text-navy-900 mb-1">Ad text</h4>
              <p className="text-navy-700">
                {program.custom_ad_text}{' '}
                <span className="text-xs text-navy-400">({program.custom_ad_text.length})</span>
              </p>
            </div>
            <p className="text-xs text-navy-500">CTA: {program.ad_goal.replaceAll('_', ' ')}</p>
            {program.photo_concept && (
              <p className="text-xs text-navy-500">Photo: {program.photo_concept}</p>
            )}
            {program.negatives.length > 0 && (
              <p className="text-xs text-navy-500">Negatives: {program.negatives.join(', ')}</p>
            )}
          </div>
        </section>
      ))}

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
          <h3 className="text-base font-semibold text-navy-900 mb-3">Yelp launch checklist</h3>
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
