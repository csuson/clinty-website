import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../../components/FormField'
import { CAMPAIGN_GOALS, CREATIVE_FORMATS, type CampaignMediaAsset, type CampaignPlan, type CampaignSnapshot, type CreativeFormat, type FacebookCampaignPlan, type RedditCampaignPlan, type YelpCampaignPlan } from '../../constants/adCampaigns'
import {
  AD_CAMPAIGN_BUDGET_DEFAULT,
  AD_CAMPAIGN_BUDGET_MAX,
  AD_CAMPAIGN_BUDGET_MIN,
  AD_CAMPAIGN_BUDGET_STEP,
  parseMonthlyBudget,
} from '../../constants/googleAds'
import { inputClass, textareaClass } from '../../constants/forms'
import {
  DEFAULT_LOCATION_SCOPE,
  LOCATION_SCOPE_DEFAULTS,
  LOCATION_SCOPE_LABELS,
  LOCATION_SCOPES,
  type LocationScope,
} from '../../constants/locationScope'
import { useAuth } from '../../context/AuthContext'
import CampaignAnalytics from './CampaignAnalytics'
import { createAdCampaign, configureAdCampaignApi, isAdCampaignApiConfigured, resumeAdCampaign } from '../../lib/adCampaigns'
import { fetchPlatformCredentialsForPublish } from '../../lib/googleAds/credentials'
import {
  campaignBriefFieldsFromBackground,
  combineAdBriefForm,
  OFFERING_CUSTOM_SELECT_VALUE,
  offeringOptionsForSelect,
  selectedOfferingValue,
} from '../../lib/googleAds/briefFromBackground'
import { detectLocalArea } from '../../lib/googleAds/geolocation'
import {
  fetchGoogleAdsSettings,
  saveGoogleAdsCampaignBrief,
  saveGoogleAdsCampaignDraft,
  clearGoogleAdsCampaignDraft,
  type GoogleAdsCampaignBrief,
} from '../../lib/googleAds/settings'
import {
  AD_PLATFORM_LABELS,
  DEFAULT_AD_PLATFORMS,
  AD_PLATFORMS,
  activeBudgetSplit,
  budgetSplitForPlatforms,
  composePlatformsBriefLines,
  formatBudgetSplitLine,
  parseAdPlatforms,
  toggleAdPlatform,
  updatePlatformBudgetShare,
  type AdPlatform,
  type PlatformBudgetSplit,
} from '../../lib/googleAds/budgetSplit'
import { clarifyingFieldHint } from '../../lib/googleAds/clarifyingHints'
import { fetchUserPrompts } from '../../lib/prompts'

type Step = 'brief' | 'clarifying' | 'review' | 'complete'
type PageView = 'draft' | 'performance'

type BriefForm = GoogleAdsCampaignBrief

function emptyBrief(): BriefForm {
  const platforms = [...DEFAULT_AD_PLATFORMS]
  return {
    businessName: '',
    industry: '',
    websiteUrl: '',
    locationScope: DEFAULT_LOCATION_SCOPE,
    locations: '',
    monthlyBudget: String(AD_CAMPAIGN_BUDGET_DEFAULT),
    goal: 'leads',
    offerings: '',
    audience: '',
    notes: '',
    platforms,
    platformBudgetSplit: budgetSplitForPlatforms(platforms),
    mediaAssets: [],
    creativeFormats: ['image', 'video', 'carousel'],
  }
}

function mergeCampaignBrief(
  ...sources: Array<Partial<BriefForm> | null | undefined>
): BriefForm {
  const stringFields = combineAdBriefForm(...sources)
  const platforms =
    [...sources].reverse().find((source) => source?.platforms?.length)?.platforms
    ?? [...DEFAULT_AD_PLATFORMS]
  const savedSplit = sources.find((source) => source?.platformBudgetSplit)?.platformBudgetSplit
  const locationScope =
    [...sources].reverse().find((source) => source?.locationScope)?.locationScope
    ?? DEFAULT_LOCATION_SCOPE
  const clarifyingAnswers = mergeClarifyingAnswers(...sources)

  return {
    ...stringFields,
    locationScope,
    platforms,
    platformBudgetSplit: budgetSplitForPlatforms(platforms, savedSplit),
    mediaAssets: [...sources].reverse().find((source) => source?.mediaAssets)?.mediaAssets ?? [],
    creativeFormats:
      [...sources].reverse().find((source) => source?.creativeFormats?.length)?.creativeFormats
      ?? ['image', 'video', 'carousel'],
    ...(Object.keys(clarifyingAnswers).length > 0 ? { clarifyingAnswers } : {}),
  }
}

function mergeClarifyingAnswers(
  ...sources: Array<Partial<BriefForm> | null | undefined>
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const source of sources) {
    if (!source?.clarifyingAnswers) continue
    for (const [key, value] of Object.entries(source.clarifyingAnswers)) {
      const trimmed = value.trim()
      if (trimmed) result[key] = trimmed
    }
  }

  return result
}

/** Saved campaign/draft brief wins over business-background defaults. */
function defaultBriefForNewCampaign(
  ...sources: Array<Partial<BriefForm> | null | undefined>
): BriefForm {
  return mergeCampaignBrief(...sources)
}

function composeBrief(form: BriefForm): string {
  const lines: string[] = []
  if (form.businessName.trim()) lines.push(`Business name: ${form.businessName.trim()}`)
  if (form.industry.trim()) lines.push(`Industry: ${form.industry.trim()}`)
  if (form.websiteUrl.trim()) lines.push(`Website: ${form.websiteUrl.trim()}`)
  lines.push(`Location targeting: ${LOCATION_SCOPE_LABELS[form.locationScope]}`)
  if (form.locations.trim()) lines.push(`Locations to target: ${form.locations.trim()}`)
  if (form.monthlyBudget.trim()) lines.push(`Monthly paid media budget: $${form.monthlyBudget.trim()} USD`)
  lines.push(...composePlatformsBriefLines(form.platforms))
  if (form.platforms.length > 1) {
    lines.push(
      `Platform budget split: ${formatBudgetSplitLine(
        form.platforms,
        form.platformBudgetSplit,
        parseMonthlyBudget(form.monthlyBudget),
      )}`,
    )
  }
  if (form.goal) lines.push(`Primary goal: ${form.goal.replaceAll('_', ' ')}`)
  if (form.offerings.trim()) lines.push(`Products or services: ${form.offerings.trim()}`)
  if (form.audience.trim()) lines.push(`Target audience: ${form.audience.trim()}`)
  if (form.notes.trim()) lines.push(`Additional background and goals:\n${form.notes.trim()}`)
  const formats = form.creativeFormats?.length ? form.creativeFormats : ['image', 'video', 'carousel']
  lines.push(`Creative formats to include: ${formats.join(', ')}`)
  const assets = (form.mediaAssets ?? []).filter((asset) => asset.url.trim())
  if (assets.length > 0) {
    lines.push('Creative media assets (use these URLs in image, video, and carousel ads):')
    for (const asset of assets) {
      const label = asset.name.trim() || asset.kind
      lines.push(`- ${asset.kind}: ${label} ${asset.url}`)
    }
  }
  return lines.join('\n')
}

function hasAnyPlan(snapshot: CampaignSnapshot): boolean {
  return Boolean(
    snapshot.campaign_plan || snapshot.facebook_plan || snapshot.yelp_plan || snapshot.reddit_plan,
  )
}

function reviewForPlan(
  plan: 'google' | 'facebook' | 'yelp' | 'reddit',
  snapshot: CampaignSnapshot,
): CampaignSnapshot['review'] | null {
  const last = snapshot.reddit_plan
    ? 'reddit'
    : snapshot.yelp_plan
      ? 'yelp'
      : snapshot.facebook_plan
        ? 'facebook'
        : 'google'
  return plan === last ? snapshot.review : null
}

function emptyMediaAsset(): CampaignMediaAsset {
  return { name: '', kind: 'image', url: '' }
}

function kindFromUrl(url: string, fallback: CampaignMediaAsset['kind'] = 'image'): CampaignMediaAsset['kind'] {
  const lower = url.toLowerCase()
  if (/\.(mp4|mov|webm|m4v)(\?|$)/.test(lower)) return 'video'
  if (/\.(png|jpe?g|gif|webp)(\?|$)/.test(lower)) return 'image'
  return fallback
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

function normalizeClarifyingQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

function normalizeFieldKey(field: string): string {
  return field.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

function answersFromSnapshotBrief(snapshot: CampaignSnapshot | null | undefined): Record<string, string> {
  if (!snapshot?.brief || typeof snapshot.brief !== 'object' || Array.isArray(snapshot.brief)) {
    return {}
  }

  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(snapshot.brief)) {
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim()
    }
  }
  return out
}

function priorClarifyingAnswer(
  field: string,
  question: string,
  ...stores: Array<Record<string, string> | undefined>
): string {
  const keys = [
    field,
    field.toLowerCase(),
    normalizeFieldKey(field),
    normalizeClarifyingQuestion(question),
  ]

  for (const store of stores) {
    if (!store) continue
    for (const key of keys) {
      const value = store[key]?.trim()
      if (value) return value
    }

    const normalizedQuestion = normalizeClarifyingQuestion(question)
    for (const [storeKey, storeValue] of Object.entries(store)) {
      const trimmed = storeValue.trim()
      if (!trimmed) continue
      if (normalizeClarifyingQuestion(storeKey) === normalizedQuestion) return trimmed
      if (normalizeFieldKey(storeKey) === normalizeFieldKey(field)) return trimmed
    }
  }

  return ''
}

function resolveClarifyingAnswers(
  snapshot: CampaignSnapshot,
  ...stores: Array<Record<string, string> | undefined>
): Record<string, string> {
  const nextAnswers: Record<string, string> = {}
  for (const { field, question } of clarifyingFields(snapshot)) {
    nextAnswers[field] = priorClarifyingAnswer(field, question, ...stores)
  }
  return nextAnswers
}

function expandedClarifyingAnswers(
  snapshot: CampaignSnapshot,
  answerValues: Record<string, string>,
): Record<string, string> {
  const expanded = { ...answerValues }
  for (const { field, question } of clarifyingFields(snapshot)) {
    const value = answerValues[field]?.trim()
    if (!value) continue
    expanded[field] = value
    expanded[normalizeClarifyingQuestion(question)] = value
    expanded[normalizeFieldKey(field)] = value
  }
  return expanded
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
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [briefLoaded, setBriefLoaded] = useState(false)
  const [reloadingBackground, setReloadingBackground] = useState(false)
  const [pageView, setPageView] = useState<PageView>('draft')
  const skipBriefSaveRef = useRef(true)
  const skipDraftSaveRef = useRef(true)
  const requestedPlatformsRef = useRef<AdPlatform[]>([...DEFAULT_AD_PLATFORMS])
  const [restoredDraft, setRestoredDraft] = useState(false)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [draftAction, setDraftAction] = useState<'save' | 'discard' | null>(null)
  const [geolocating, setGeolocating] = useState(false)
  const geolocateAttemptedRef = useRef(false)
  const formRef = useRef(form)
  const [offeringCustom, setOfferingCustom] = useState(false)
  const clarifyingAnswersRef = useRef<Record<string, string>>({})
  const answersRef = useRef(answers)

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  function briefForSave(brief: BriefForm = formRef.current): BriefForm {
    const clarifyingAnswers = mergeClarifyingAnswers(brief, {
      clarifyingAnswers: clarifyingAnswersRef.current,
    })
    return {
      ...brief,
      ...(Object.keys(clarifyingAnswers).length > 0 ? { clarifyingAnswers } : {}),
    }
  }

  useEffect(() => {
    formRef.current = form
  }, [form])

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

        configureAdCampaignApi(settings.adCampaignApiUrl || settings.defaultAdCampaignApiUrl)

        const parsed = campaignBriefFieldsFromBackground(prompts.background, {
          companyName: profile?.company_name,
        })
        const merged = defaultBriefForNewCampaign(
          parsed,
          settings.campaignBrief,
          settings.campaignDraft?.briefForm,
        )
        setForm((current) => {
          if (!skipBriefSaveRef.current && current.platforms.length > 0) {
            return {
              ...merged,
              platforms: current.platforms,
              platformBudgetSplit: budgetSplitForPlatforms(
                current.platforms,
                current.platformBudgetSplit,
              ),
            }
          }
          requestedPlatformsRef.current = merged.platforms
          return merged
        })

        clarifyingAnswersRef.current = mergeClarifyingAnswers(
          merged,
          { clarifyingAnswers: settings.campaignBrief?.clarifyingAnswers },
          { clarifyingAnswers: settings.campaignDraft?.answers },
          { clarifyingAnswers: answersFromSnapshotBrief(settings.campaignDraft?.snapshot) },
        )

        if (settings.campaignDraft?.snapshot) {
          skipDraftSaveRef.current = true
          requestedPlatformsRef.current = settings.campaignDraft.requestedPlatforms.length
            ? settings.campaignDraft.requestedPlatforms
            : merged.platforms
          setRevisionNotes(settings.campaignDraft.revisionNotes)
          setPublish(settings.campaignDraft.publish)

          const restoredAnswers = resolveClarifyingAnswers(
            settings.campaignDraft.snapshot,
            settings.campaignDraft.answers,
            clarifyingAnswersRef.current,
            answersFromSnapshotBrief(settings.campaignDraft.snapshot),
          )
          clarifyingAnswersRef.current = expandedClarifyingAnswers(
            settings.campaignDraft.snapshot,
            restoredAnswers,
          )
          setAnswers(restoredAnswers)

          applySnapshot(
            settings.campaignDraft.snapshot,
            requestedPlatformsRef.current,
            {
              persist: false,
              answers: restoredAnswers,
            },
          )

          if (settings.campaignDraft.step === 'clarifying') {
            setStep('clarifying')
          }

          setRestoredDraft(true)
        }
      } catch {
        if (!cancelled) {
          configureAdCampaignApi(null)
        }
      } finally {
        if (!cancelled) {
          skipBriefSaveRef.current = false
          skipDraftSaveRef.current = false
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
      saveGoogleAdsCampaignBrief(briefForSave()).catch(() => {
        /* Best-effort autosave for campaign brief fields. */
      })
    }, 900)

    return () => window.clearTimeout(timer)
  }, [form, briefLoaded])

  useEffect(() => {
    if (!briefLoaded || skipBriefSaveRef.current || step !== 'clarifying' || !snapshot) return

    const expanded = expandedClarifyingAnswers(snapshot, answersRef.current)
    clarifyingAnswersRef.current = expanded

    const timer = window.setTimeout(() => {
      saveGoogleAdsCampaignBrief(briefForSave()).catch(() => {
        /* Best-effort autosave for clarifying answers. */
      })
      saveGoogleAdsCampaignDraft({
        step: 'clarifying',
        snapshot,
        answers: expanded,
        revisionNotes,
        publish,
        requestedPlatforms: requestedPlatformsRef.current,
        savedAt: new Date().toISOString(),
        briefForm: formRef.current,
      }).catch(() => {
        /* Best-effort autosave for clarifying draft answers. */
      })
    }, 900)

    return () => window.clearTimeout(timer)
  }, [answers, step, briefLoaded, snapshot, revisionNotes, publish])

  useEffect(() => {
    if (!briefLoaded || geolocateAttemptedRef.current) return
    if (form.locationScope !== 'local' || form.locations.trim()) return

    geolocateAttemptedRef.current = true
    let cancelled = false

    setGeolocating(true)
    detectLocalArea()
      .then((location) => {
        if (cancelled || !location) return
        setForm((current) => ({ ...current, locations: location }))
      })
      .catch(() => {
        /* Best-effort auto-detect on first load. */
      })
      .finally(() => {
        if (!cancelled) setGeolocating(false)
      })

    return () => {
      cancelled = true
    }
  }, [briefLoaded, form.locationScope, form.locations])

  function persistDraft(
    next: CampaignSnapshot,
    step: Step,
    extras?: { answers?: Record<string, string> },
  ) {
    if (skipDraftSaveRef.current || step === 'brief') return
    saveGoogleAdsCampaignDraft({
      step,
      snapshot: next,
      answers: extras?.answers ?? answersRef.current,
      revisionNotes,
      publish,
      requestedPlatforms: requestedPlatformsRef.current,
      savedAt: new Date().toISOString(),
      briefForm: formRef.current,
    }).catch(() => {
      /* Best-effort draft persist. */
    })
  }

  async function handleSaveDraft() {
    if (!snapshot || step === 'brief') {
      setError('Nothing to save yet. Draft campaigns first.')
      return
    }

    setDraftAction('save')
    setError(null)
    setDraftNotice(null)
    try {
      const expanded = expandedClarifyingAnswers(snapshot, answersRef.current)
      await saveGoogleAdsCampaignDraft({
        step,
        snapshot,
        answers: expanded,
        revisionNotes,
        publish,
        requestedPlatforms: requestedPlatformsRef.current,
        savedAt: new Date().toISOString(),
        briefForm: formRef.current,
      })
      setRestoredDraft(true)
      setDraftNotice('Draft saved. You can leave and pick up where you left off.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setDraftAction(null)
    }
  }

  async function handleDiscardDraft() {
    if (!snapshot) {
      setError('No campaign draft to discard.')
      return
    }

    setDraftAction('discard')
    setError(null)
    setDraftNotice(null)
    try {
      await saveGoogleAdsCampaignBrief(briefForSave())
      await clearGoogleAdsCampaignDraft()
      setStep('brief')
      setSnapshot(null)
      setAnswers({})
      setRevisionNotes('')
      setPublish(false)
      setRestoredDraft(false)
      setDraftNotice('Draft discarded.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discard draft')
    } finally {
      setDraftAction(null)
    }
  }

  function applySnapshot(
    next: CampaignSnapshot,
    requestedPlatforms: AdPlatform[] = requestedPlatformsRef.current,
    options: { persist?: boolean; answers?: Record<string, string> } = {},
  ) {
    setSnapshot(next)
    if (next.status === 'clarification') {
      const nextAnswers = resolveClarifyingAnswers(
        next,
        options.answers,
        answersRef.current,
        clarifyingAnswersRef.current,
        answersFromSnapshotBrief(next),
      )
      setAnswers(nextAnswers)
      clarifyingAnswersRef.current = expandedClarifyingAnswers(next, nextAnswers)
      setStep('clarifying')
      if (options.persist !== false) persistDraft(next, 'clarifying', { answers: nextAnswers })
      return
    }
    if (next.status === 'approval') {
      if (requestedPlatforms.includes('yelp') && !next.yelp_plan) {
        const agentPlatforms = next.platforms?.length
          ? next.platforms.join(', ')
          : 'not returned'
        setError(
          `Yelp was selected, but the campaign agent did not return a Yelp plan (agent platforms: ${agentPlatforms}). Confirm your campaign AI service is up to date and supports Yelp, then try again.`,
        )
      }
      if (requestedPlatforms.includes('reddit') && !next.reddit_plan) {
        const agentPlatforms = next.platforms?.length
          ? next.platforms.join(', ')
          : 'not returned'
        setError(
          `Reddit was selected, but the campaign agent did not return a Reddit plan (agent platforms: ${agentPlatforms}). Confirm your campaign AI service is up to date and supports Reddit Ads, then try again.`,
        )
      }
      setStep('review')
      if (options.persist !== false) persistDraft(next, 'review')
      return
    }
    if (next.status === 'complete') {
      if (requestedPlatforms.includes('yelp') && !next.yelp_plan) {
        const agentPlatforms = next.platforms?.length
          ? next.platforms.join(', ')
          : 'not returned'
        setError(
          `Yelp was selected, but the campaign agent did not return a Yelp plan (agent platforms: ${agentPlatforms}).`,
        )
      }
      if (requestedPlatforms.includes('reddit') && !next.reddit_plan) {
        const agentPlatforms = next.platforms?.length
          ? next.platforms.join(', ')
          : 'not returned'
        setError(
          `Reddit was selected, but the campaign agent did not return a Reddit plan (agent platforms: ${agentPlatforms}).`,
        )
      }
      setStep('complete')
      if (options.persist !== false) persistDraft(next, 'complete')
    }
  }

  function readSelectedPlatforms(formElement: HTMLFormElement): AdPlatform[] {
    return parseAdPlatforms(
      AD_PLATFORMS.filter((platform) => {
        const input = formElement.querySelector<HTMLInputElement>(`#platform-${platform}`)
        return input?.checked
      }),
    )
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const selectedPlatforms = readSelectedPlatforms(event.currentTarget)
    const briefForm: BriefForm = {
      ...form,
      platforms: selectedPlatforms,
      platformBudgetSplit: budgetSplitForPlatforms(selectedPlatforms, form.platformBudgetSplit),
    }
    setForm(briefForm)
    requestedPlatformsRef.current = briefForm.platforms

    const brief = composeBrief(briefForm)
    if (brief.length < 12) {
      setError('Add your business name, offer, locations, budget, and goal so we can draft ads.')
      return
    }
    if (briefForm.platforms.length === 0) {
      setError('Select at least one platform: Google Ads, Facebook / Instagram, or Yelp.')
      return
    }

    setWorking(true)
    setError(null)
    try {
      await saveGoogleAdsCampaignBrief(briefForSave(briefForm))
      const created = await createAdCampaign(
        brief,
        briefForm.platforms,
        briefForm.platformBudgetSplit,
        briefForm.mediaAssets,
        briefForm.creativeFormats,
      )
      applySnapshot(created, briefForm.platforms, {
        answers: resolveClarifyingAnswers(created, clarifyingAnswersRef.current),
      })
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
      const expanded = expandedClarifyingAnswers(snapshot, answers)
      clarifyingAnswersRef.current = expanded
      await saveGoogleAdsCampaignBrief(briefForSave())
      applySnapshot(
        await resumeAdCampaign(snapshot.thread_id, { answers }, snapshot),
        undefined,
        { answers: expanded },
      )
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
      const resumeBody: Parameters<typeof resumeAdCampaign>[1] = {
        approved,
        publish: approved ? publish : false,
        notes: revisionNotes,
      }

      if (approved && publish) {
        const platformCredentials = await fetchPlatformCredentialsForPublish()
        if (platformCredentials) {
          resumeBody.platform_credentials = platformCredentials
        }
      }

      applySnapshot(await resumeAdCampaign(snapshot.thread_id, resumeBody, snapshot))
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
    setDraftNotice(null)
    skipBriefSaveRef.current = true

    try {
      const prompts = await fetchUserPrompts(user.id)
      const background = prompts.background.trim()
      if (!background) {
        setError('No business background saved yet. Add one under Account → Prompts.')
        return
      }

      const parsed = campaignBriefFieldsFromBackground(background, {
        companyName: profile?.company_name,
      })
      const nextForm = mergeCampaignBrief(parsed, {
        monthlyBudget: form.monthlyBudget,
        goal: form.goal,
        platforms: form.platforms,
        platformBudgetSplit: form.platformBudgetSplit,
        locationScope: form.locationScope,
      })
      setForm(nextForm)
      await saveGoogleAdsCampaignBrief(briefForSave(nextForm))
      setDraftNotice('Campaign brief updated from your saved business background.')
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
    setError(null)
    setRestoredDraft(false)
    void saveGoogleAdsCampaignBrief(briefForSave()).catch(() => {
      /* Best-effort. */
    })
    void clearGoogleAdsCampaignDraft().catch(() => {
      /* Best-effort. */
    })
    if (!user) {
      setForm(emptyBrief())
      return
    }

    const currentForm = formRef.current
    skipBriefSaveRef.current = true
    Promise.all([fetchGoogleAdsSettings(), fetchUserPrompts(user.id)])
      .then(([settings, prompts]) => {
        const parsed = campaignBriefFieldsFromBackground(prompts.background, {
          companyName: profile?.company_name,
        })
        setForm(defaultBriefForNewCampaign(parsed, settings.campaignBrief, currentForm))
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

  async function handleLocationScopeChange(scope: LocationScope) {
    if (scope === form.locationScope) return

    setError(null)

    if (scope === 'local') {
      setGeolocating(true)
      setForm((current) => ({ ...current, locationScope: scope }))
      try {
        const location = await detectLocalArea()
        setForm((current) => ({ ...current, locationScope: scope, locations: location }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not detect your location.')
      } finally {
        setGeolocating(false)
      }
      return
    }

    setForm((current) => ({
      ...current,
      locationScope: scope,
      locations: LOCATION_SCOPE_DEFAULTS[scope],
    }))
  }

  const locationPlaceholder =
    form.locationScope === 'local'
      ? 'City, ST and nearby suburbs'
      : form.locationScope === 'regional'
        ? 'Pacific Northwest, Texas Hill Country…'
        : form.locationScope === 'us'
          ? 'United States'
          : 'Worldwide'

  function toggleCreativeFormat(format: CreativeFormat) {
    setForm((current) => {
      const selected = current.creativeFormats ?? []
      const next = selected.includes(format)
        ? selected.filter((item) => item !== format)
        : [...selected, format]
      return { ...current, creativeFormats: next.length > 0 ? next : [format] }
    })
  }

  function addMediaAsset() {
    setForm((current) => ({
      ...current,
      mediaAssets: [...(current.mediaAssets ?? []), emptyMediaAsset()],
    }))
  }

  function updateMediaAsset(index: number, patch: Partial<CampaignMediaAsset>) {
    setForm((current) => ({
      ...current,
      mediaAssets: (current.mediaAssets ?? []).map((asset, itemIndex) => (
        itemIndex === index ? { ...asset, ...patch } : asset
      )),
    }))
  }

  function removeMediaAsset(index: number) {
    setForm((current) => ({
      ...current,
      mediaAssets: (current.mediaAssets ?? []).filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function handlePlatformToggle(platform: AdPlatform) {
    setForm((current) => {
      const next = toggleAdPlatform(current.platforms, current.platformBudgetSplit, platform)
      requestedPlatformsRef.current = next.platforms
      return {
        ...current,
        platforms: next.platforms,
        platformBudgetSplit: next.platformBudgetSplit,
      }
    })
  }

  function handleBudgetSplitChange(platform: AdPlatform, share: number) {
    setForm((current) => ({
      ...current,
      platformBudgetSplit: updatePlatformBudgetShare(
        current.platforms,
        current.platformBudgetSplit,
        platform,
        share,
      ),
    }))
  }

  const activeSplit = activeBudgetSplit(form.platforms, form.platformBudgetSplit)
  const monthlyBudgetAmount = parseMonthlyBudget(form.monthlyBudget)
  const offeringOptions = useMemo(
    () => offeringOptionsForSelect(form.notes, form.offerings),
    [form.notes, form.offerings],
  )
  const selectedOffering = selectedOfferingValue(form.offerings, offeringOptions)
  const offeringSelectValue = offeringCustom
    ? OFFERING_CUSTOM_SELECT_VALUE
    : selectedOffering

  useEffect(() => {
    if (!briefLoaded) return

    if (!form.offerings.trim()) {
      setOfferingCustom(offeringOptions.length === 0)
      return
    }

    setOfferingCustom(!offeringOptions.includes(selectedOffering))
  }, [briefLoaded, form.offerings, offeringOptions, selectedOffering])

  if (!settingsLoaded) {
    return (
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <p className="text-sm text-navy-600">Loading ad campaign settings...</p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {([
          { id: 'draft', label: 'Draft' },
          { id: 'performance', label: 'Performance' },
        ] as const).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setPageView(option.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pageView === option.id
                ? 'bg-navy-900 text-cream'
                : 'bg-navy-900/5 text-navy-700 hover:bg-navy-900/10'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {pageView === 'performance' ? <CampaignAnalytics /> : null}

      {pageView === 'draft' && restoredDraft && snapshot ? (
        <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 text-navy-800 text-sm px-4 py-3">
          Picked up your saved draft from this account. Approve, send back, save again, or discard it —
          it stays in Supabase until you discard it or draft another campaign.
        </div>
      ) : null}

      {pageView === 'draft' && draftNotice ? (
        <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 text-navy-800 text-sm px-4 py-3">
          {draftNotice}
        </div>
      ) : null}

      {pageView === 'draft' && !apiReady ? (
        <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900 mb-1">Ad campaigns</h2>
          <p className="text-sm text-navy-600 mb-4">
            Clinty hosts a shared campaign agent for every account. If this page cannot reach it,
            save the Campaign AI URL in{' '}
            <a href="/account/integrations" className="text-[#4285F4] hover:underline">
              Integrations
            </a>
            , or set{' '}
            <code className="text-xs bg-cream px-1 py-0.5 rounded">VITE_AD_CAMPAIGN_API_URL</code> /
            the Vite proxy at{' '}
            <code className="text-xs bg-cream px-1 py-0.5 rounded">/api/ad-campaigns</code> for local
            development.
          </p>
        </section>
      ) : null}

      {pageView === 'draft' && apiReady && (
      <>
      {error && <Alert type="error" message={error} />}
      {working && (
        <Alert
          type="info"
          message="Drafting Google, Meta, Yelp, and/or Reddit campaigns. This usually takes under a minute."
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
                  Meta, Yelp, and/or Reddit campaigns — targeting, ads, and budget — for you to review before
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
              <FormField label="Location targeting" id="ads-location-scope" required>
                <select
                  id="ads-location-scope"
                  value={form.locationScope}
                  onChange={(e) => void handleLocationScopeChange(e.target.value as LocationScope)}
                  className={inputClass}
                  disabled={working || geolocating}
                  required
                >
                  {LOCATION_SCOPES.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Locations"
                id="ads-locations"
                hint={
                  form.locationScope === 'local'
                    ? geolocating
                      ? 'Detecting your location…'
                      : 'Prefilled from your device when Local is selected. Edit as needed.'
                    : undefined
                }
                required
              >
                <input
                  id="ads-locations"
                  value={form.locations}
                  onChange={(e) => update('locations', e.target.value)}
                  className={inputClass}
                  placeholder={locationPlaceholder}
                  disabled={working || geolocating}
                  required
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Monthly budget (USD)" id="ads-budget" required>
                  <MonthlyBudgetSlider
                    value={form.monthlyBudget}
                    onChange={(monthlyBudget) => update('monthlyBudget', monthlyBudget)}
                    disabled={working}
                  />
                </FormField>
              </div>
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
                      id="platform-google"
                      type="checkbox"
                      checked={form.platforms.includes('google')}
                      onChange={() => handlePlatformToggle('google')}
                      disabled={working}
                    />
                    Google Search
                  </label>
                  <label className="flex items-center gap-2 text-sm text-navy-800">
                    <input
                      id="platform-facebook"
                      type="checkbox"
                      checked={form.platforms.includes('facebook')}
                      onChange={() => handlePlatformToggle('facebook')}
                      disabled={working}
                    />
                    Facebook / Instagram
                  </label>
                  <label className="flex items-center gap-2 text-sm text-navy-800">
                    <input
                      id="platform-yelp"
                      type="checkbox"
                      checked={form.platforms.includes('yelp')}
                      onChange={() => handlePlatformToggle('yelp')}
                      disabled={working}
                    />
                    Yelp
                  </label>
                  <label className="flex items-center gap-2 text-sm text-navy-800">
                    <input
                      id="platform-reddit"
                      type="checkbox"
                      checked={form.platforms.includes('reddit')}
                      onChange={() => handlePlatformToggle('reddit')}
                      disabled={working}
                    />
                    Reddit
                  </label>
                </div>
                {form.platforms.length > 1 && (
                  <PlatformBudgetSplitControls
                    platforms={form.platforms}
                    split={activeSplit}
                    monthlyBudgetUsd={monthlyBudgetAmount}
                    disabled={working}
                    onChange={handleBudgetSplitChange}
                  />
                )}
              </fieldset>
              <FormField
                label="Products or services to advertise"
                id="ads-offerings"
                hint="Choose from your business background, or select Other to enter manually. Reload from background to refresh the list."
                required
              >
                <select
                  id="ads-offerings"
                  value={offeringSelectValue}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === OFFERING_CUSTOM_SELECT_VALUE) {
                      setOfferingCustom(true)
                      return
                    }
                    setOfferingCustom(false)
                    update('offerings', value)
                  }}
                  className={inputClass}
                  disabled={working}
                  required={!offeringCustom}
                >
                  <option value="" disabled>
                    Select a product or service
                  </option>
                  {offeringOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  <option value={OFFERING_CUSTOM_SELECT_VALUE}>Other…</option>
                </select>
                {offeringCustom ? (
                  <input
                    id="ads-offerings-custom"
                    value={form.offerings}
                    onChange={(e) => update('offerings', e.target.value)}
                    className={`${inputClass} mt-2`}
                    placeholder="Describe the product or service to advertise"
                    disabled={working}
                    required
                  />
                ) : null}
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
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-navy-900">Creative formats</legend>
                <p className="text-xs text-navy-500">
                  Meta and Reddit can use image, video, and carousel ads. Google Search stays text-only.
                </p>
                <div className="flex flex-wrap gap-4">
                  {CREATIVE_FORMATS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-navy-800">
                      <input
                        type="checkbox"
                        checked={(form.creativeFormats ?? []).includes(option.value)}
                        onChange={() => toggleCreativeFormat(option.value)}
                        disabled={working}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-navy-900">Images, video, and carousel cards</h3>
                  <p className="text-xs text-navy-500 mt-1">
                    Paste public HTTPS URLs from your website or CDN. Carousel ads need at least two images.
                    Video ads need a public video file URL.
                  </p>
                </div>
                {(form.mediaAssets ?? []).map((asset, index) => (
                  <div key={`${asset.url}-${index}`} className="grid sm:grid-cols-[7rem_1fr_1fr_auto] gap-2 items-end">
                    <FormField label="Type" id={`media-kind-${index}`}>
                      <select
                        id={`media-kind-${index}`}
                        value={asset.kind}
                        onChange={(e) => updateMediaAsset(index, { kind: e.target.value === 'video' ? 'video' : 'image' })}
                        className={inputClass}
                        disabled={working}
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </FormField>
                    <FormField label="Name" id={`media-name-${index}`}>
                      <input
                        id={`media-name-${index}`}
                        value={asset.name}
                        onChange={(e) => updateMediaAsset(index, { name: e.target.value })}
                        className={inputClass}
                        placeholder="Storefront"
                        disabled={working}
                      />
                    </FormField>
                    <FormField label="Public URL" id={`media-url-${index}`}>
                      <input
                        id={`media-url-${index}`}
                        value={asset.url}
                        onChange={(e) => updateMediaAsset(index, { url: e.target.value, kind: kindFromUrl(e.target.value, asset.kind) })}
                        className={inputClass}
                        placeholder="https://…"
                        disabled={working}
                      />
                    </FormField>
                    <button
                      type="button"
                      onClick={() => removeMediaAsset(index)}
                      disabled={working}
                      className="text-sm text-navy-600 hover:text-navy-900 pb-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMediaAsset}
                  disabled={working}
                  className="text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  Add media URL
                </button>
              </div>
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
          <div className="flex flex-wrap gap-3 mt-8">
            <button
              type="submit"
              disabled={working || draftAction !== null}
              className="bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
            >
              {working ? 'Continuing…' : 'Continue'}
            </button>
            <DraftActionButtons
              onSave={handleSaveDraft}
              onDiscard={handleDiscardDraft}
              working={draftAction}
              disabled={working}
            />
            <button
              type="button"
              onClick={handleReset}
              disabled={working || draftAction !== null}
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
          {snapshot.reddit_plan && (
            <RedditPlanView plan={snapshot.reddit_plan} review={reviewForPlan('reddit', snapshot)} />
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
              Create paused campaigns in Google Ads, Meta Ads Manager, Yelp Ads, and/or Reddit Ads after I approve
            </label>
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="button"
                onClick={() => handleApproval(true)}
                disabled={working || draftAction !== null}
                className="bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60"
              >
                {working ? 'Submitting…' : 'Approve draft'}
              </button>
              <button
                type="button"
                onClick={() => handleApproval(false)}
                disabled={working || draftAction !== null}
                className="border border-navy-900/15 text-navy-900 font-medium px-6 py-3 rounded-xl hover:bg-navy-900/5 transition-colors disabled:opacity-60"
              >
                Send back with notes
              </button>
              <DraftActionButtons
                onSave={handleSaveDraft}
                onDiscard={handleDiscardDraft}
                working={draftAction}
                disabled={working}
              />
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
          {snapshot.reddit_plan && (
            <RedditPlanView plan={snapshot.reddit_plan} review={reviewForPlan('reddit', snapshot)} />
          )}
          <div className="flex flex-wrap gap-3 items-center">
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
                      reddit: snapshot.reddit_plan,
                    },
                  )
                }
                className="bg-teal-500 text-white font-medium px-6 py-3 rounded-xl hover:bg-teal-600 transition-colors"
              >
                Download JSON
              </button>
            )}
            <Link
              to="/faq/manual-ad-campaign-import"
              className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline"
            >
              How to import manually →
            </Link>
            <DraftActionButtons
              onSave={handleSaveDraft}
              onDiscard={handleDiscardDraft}
              working={draftAction}
            />
            <button
              type="button"
              onClick={() => setPageView('performance')}
              className="border border-navy-900/15 text-navy-900 font-medium px-6 py-3 rounded-xl hover:bg-navy-900/5 transition-colors"
            >
              View performance
            </button>
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
      </>
      )}
    </div>
  )
}

function DraftActionButtons({
  onSave,
  onDiscard,
  working,
  disabled = false,
}: {
  onSave: () => void
  onDiscard: () => void
  working: 'save' | 'discard' | null
  disabled?: boolean
}) {
  const busy = working !== null

  return (
    <>
      <button
        type="button"
        onClick={onSave}
        disabled={busy || disabled}
        className="border border-navy-900/15 text-navy-900 font-medium px-6 py-3 rounded-xl hover:bg-navy-900/5 transition-colors disabled:opacity-60"
      >
        {working === 'save' ? 'Saving…' : 'Save draft'}
      </button>
      <button
        type="button"
        onClick={onDiscard}
        disabled={busy || disabled}
        className="border border-red-200 text-red-700 font-medium px-6 py-3 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-60"
      >
        {working === 'discard' ? 'Discarding…' : 'Discard draft'}
      </button>
    </>
  )
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

function CreativeMediaPreview({
  format,
  concept,
  media,
}: {
  format?: string
  concept?: string
  media?: CampaignMediaAsset[]
}) {
  const assets = media ?? []
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs uppercase tracking-wide text-navy-500">
        {(format || 'image').replaceAll('_', ' ')}
      </p>
      {assets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {assets.map((asset) => (
            asset.kind === 'video' ? (
              <a
                key={asset.url}
                href={asset.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-teal-600 hover:underline"
              >
                Video{asset.name ? `: ${asset.name}` : ''}
              </a>
            ) : (
              <a key={asset.url} href={asset.url} target="_blank" rel="noreferrer">
                <img
                  src={asset.url}
                  alt={asset.name || 'Ad creative'}
                  className="h-16 w-16 rounded-lg object-cover border border-navy-900/10"
                />
              </a>
            )
          ))}
        </div>
      ) : concept ? (
        <p className="text-xs text-navy-500">Concept: {concept}</p>
      ) : null}
    </div>
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
                <CreativeMediaPreview format={ad.creative_format} concept={ad.image_concept} media={ad.media} />
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
            {(program.photo_url || program.photo_concept) && (
              <CreativeMediaPreview
                format="image"
                concept={program.photo_concept}
                media={program.photo_url ? [{ name: 'Yelp photo', kind: 'image', url: program.photo_url }] : []}
              />
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

function RedditPlanView({
  plan,
  review,
}: {
  plan: RedditCampaignPlan
  review: CampaignSnapshot['review'] | null
}) {
  return (
    <>
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">{plan.campaign_name}</h2>
        <p className="text-xs uppercase tracking-wide text-navy-500 mb-2">Reddit Ads</p>
        <p className="text-sm text-navy-600 mb-4">{plan.objective.replaceAll('_', ' ')}</p>
        <p className="text-sm text-navy-800 mb-6">{plan.rationale}</p>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <Info label="Monthly budget" value={`$${plan.monthly_budget_usd.toLocaleString()}`} />
          <Info label="Daily budget" value={`$${plan.daily_budget_usd.toFixed(2)}`} />
          <Info label="Bidding" value={plan.bid_strategy.replaceAll('_', ' ')} />
        </dl>
      </section>

      {plan.ad_groups.map((group) => (
        <section key={group.name} className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
          <h3 className="text-base font-semibold text-navy-900 mb-1">{group.name}</h3>
          <p className="text-sm text-navy-600 mb-4">
            {group.theme} · ${group.daily_budget_usd.toFixed(2)}/day
          </p>
          {group.communities.length > 0 && (
            <p className="text-xs text-navy-500 mb-2">
              Communities: {group.communities.map((name) => `r/${name}`).join(', ')}
            </p>
          )}
          {group.interests.length > 0 && (
            <p className="text-xs text-navy-500 mb-4">Interests: {group.interests.join(', ')}</p>
          )}
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            {group.ads.map((ad) => (
              <div key={ad.name} className="rounded-xl border border-navy-900/10 p-4">
                <h4 className="font-medium text-navy-900 mb-2">{ad.name}</h4>
                <p className="font-medium text-navy-900">
                  {ad.headline}{' '}
                  <span className="text-xs text-navy-400">({ad.headline.length})</span>
                </p>
                <p className="text-navy-700 mt-2">{ad.body}</p>
                <p className="text-xs text-navy-500 mt-3">CTA: {ad.call_to_action.replaceAll('_', ' ')}</p>
                <CreativeMediaPreview format={ad.creative_format} concept={ad.image_concept} media={ad.media} />
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
          <h3 className="text-base font-semibold text-navy-900 mb-3">Reddit launch checklist</h3>
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

function PlatformBudgetSplitControls({
  platforms,
  split,
  monthlyBudgetUsd,
  disabled,
  onChange,
}: {
  platforms: AdPlatform[]
  split: PlatformBudgetSplit
  monthlyBudgetUsd: number
  disabled?: boolean
  onChange: (platform: AdPlatform, share: number) => void
}) {
  return (
    <div className="mt-4 rounded-xl border border-navy-900/10 bg-cream/40 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-navy-900">Monthly budget split</p>
        <p className="text-xs text-navy-500 mt-1">
          Adjust how the ${monthlyBudgetUsd.toLocaleString()} monthly budget is allocated across platforms.
        </p>
      </div>
      {platforms.map((platform) => {
        const share = split[platform]
        const platformBudget = Math.round((monthlyBudgetUsd * share) / 100)

        return (
          <div key={platform}>
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-sm font-medium text-navy-800">{AD_PLATFORM_LABELS[platform]}</span>
              <span className="text-sm font-semibold text-teal-600 tabular-nums">
                {share}% · ${platformBudget.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={platforms.length === 2 ? 95 : 90}
              step={5}
              value={share}
              onChange={(e) => onChange(platform, Number(e.target.value))}
              className="w-full h-2 bg-cream-dark rounded-full appearance-none cursor-pointer accent-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
              aria-label={`${AD_PLATFORM_LABELS[platform]} budget share`}
            />
          </div>
        )
      })}
    </div>
  )
}

function MonthlyBudgetSlider({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (monthlyBudget: string) => void
  disabled?: boolean
}) {
  const amount = parseMonthlyBudget(value)
  const formatted = amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-2xl font-semibold text-navy-900 tabular-nums">{formatted}</span>
        <span className="text-xs text-navy-500">per month</span>
      </div>
      <input
        id="ads-budget"
        type="range"
        min={AD_CAMPAIGN_BUDGET_MIN}
        max={AD_CAMPAIGN_BUDGET_MAX}
        step={AD_CAMPAIGN_BUDGET_STEP}
        value={amount}
        onChange={(e) => onChange(String(e.target.value))}
        className="w-full h-2 bg-cream-dark rounded-full appearance-none cursor-pointer accent-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
        aria-valuemin={AD_CAMPAIGN_BUDGET_MIN}
        aria-valuemax={AD_CAMPAIGN_BUDGET_MAX}
        aria-valuenow={amount}
        aria-valuetext={formatted}
      />
      <div className="flex justify-between text-xs text-navy-500">
        <span>${AD_CAMPAIGN_BUDGET_MIN.toLocaleString()}</span>
        <span>${AD_CAMPAIGN_BUDGET_MAX.toLocaleString()}</span>
      </div>
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
