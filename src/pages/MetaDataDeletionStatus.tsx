import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LegalPageLayout from '../components/LegalPageLayout'

type DeletionStatus = {
  confirmation_code: string
  status: 'pending' | 'completed' | 'no_data'
  message: string
  created_at?: string
  completed_at?: string
}

export default function MetaDataDeletionStatus() {
  const [params] = useSearchParams()
  const code = params.get('code')?.trim() ?? ''
  const [status, setStatus] = useState<DeletionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(code))

  useEffect(() => {
    if (!code) {
      setLoading(false)
      return
    }

    const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
    if (!base) {
      setError('Status lookup is unavailable.')
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadStatus() {
      try {
        const response = await fetch(
          `${base}/functions/v1/meta-data-deletion?code=${encodeURIComponent(code)}`,
        )
        const payload = await response.json() as DeletionStatus & { error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load deletion status')
        }
        if (!cancelled) setStatus(payload)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load deletion status')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadStatus()
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <LegalPageLayout title="Meta Data Deletion Status" lastUpdated="September 3, 2026" noindex>
      {!code ? (
        <p className="text-navy-600">
          Provide the confirmation code from your Meta data deletion request, or use the link Meta
          returned after you removed the Clinty app from your Facebook account.
        </p>
      ) : loading ? (
        <p className="text-navy-600">Loading deletion status…</p>
      ) : error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      ) : status ? (
        <div className="space-y-4">
          <p className="text-navy-900">{status.message}</p>
          <dl className="text-sm text-navy-600 space-y-2">
            <div>
              <dt className="font-medium text-navy-900">Confirmation code</dt>
              <dd>{status.confirmation_code}</dd>
            </div>
            <div>
              <dt className="font-medium text-navy-900">Status</dt>
              <dd className="capitalize">{status.status.replace('_', ' ')}</dd>
            </div>
            {status.completed_at ? (
              <div>
                <dt className="font-medium text-navy-900">Completed</dt>
                <dd>{new Date(status.completed_at).toLocaleString()}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      <p className="mt-8 text-sm text-navy-600">
        To delete your full Clinty account and all connected data,{' '}
        <Link to="/contact" className="text-teal-500 hover:underline">
          contact us
        </Link>
        .
      </p>
    </LegalPageLayout>
  )
}
