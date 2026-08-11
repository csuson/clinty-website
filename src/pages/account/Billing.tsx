import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PLAN_DETAILS, type Plan } from '../../types/database'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: 'Free Trial', color: 'text-teal-500 bg-teal-400/10 border-teal-400/20' },
  active: { label: 'Active', color: 'text-teal-500 bg-teal-400/10 border-teal-400/20' },
  past_due: { label: 'Past Due', color: 'text-amber-500 bg-amber-400/10 border-amber-400/20' },
  canceled: { label: 'Canceled', color: 'text-navy-600 bg-navy-900/5 border-navy-900/10' },
}

export default function Billing() {
  const { profile } = useAuth()

  const plan = (profile?.plan ?? 'starter') as Plan
  const planInfo = PLAN_DETAILS[plan]
  const status = STATUS_LABELS[profile?.billing_status ?? 'trialing']

  const trialEnds = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-navy-900 mb-1">Current plan</h2>
            <p className="text-sm text-navy-600">Manage your subscription and billing details.</p>
          </div>
          <span className={`inline-flex text-xs font-semibold border rounded-full px-3 py-1 self-start ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="bg-cream rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-2xl font-bold text-navy-900">{planInfo.name}</div>
              <div className="text-sm text-navy-600 mt-1">{planInfo.description}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-navy-900">
                ${planInfo.price}
                <span className="text-sm font-normal text-navy-600">/mo</span>
              </div>
              {profile?.billing_status === 'trialing' && trialEnds && (
                <div className="text-xs text-navy-600 mt-1">Trial ends {trialEnds}</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
          <BillingDetail label="Billing email" value={profile?.email ?? '—'} />
          <BillingDetail label="Customer since" value={memberSince ?? '—'} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/#pricing"
            className="inline-flex items-center justify-center bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors text-sm"
          >
            Change Plan
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center border border-navy-900/15 text-navy-900 font-medium px-6 py-3 rounded-xl hover:bg-navy-900/5 transition-colors text-sm"
          >
            Contact Billing Support
          </Link>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Payment method</h2>
        <p className="text-sm text-navy-600 mb-6">
          No payment method on file. Add one before your trial ends to keep your agents running.
        </p>
        <button
          disabled
          className="border border-navy-900/15 text-navy-600 font-medium px-6 py-3 rounded-xl text-sm opacity-60 cursor-not-allowed"
        >
          Add Payment Method (coming soon)
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-4">Billing history</h2>
        <div className="text-center py-8 text-sm text-navy-600">
          No invoices yet. Your first charge will appear here after your trial ends.
        </div>
      </section>
    </div>
  )
}

function BillingDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cream rounded-xl px-4 py-3">
      <div className="text-navy-600 text-xs mb-1">{label}</div>
      <div className="font-medium text-navy-900">{value}</div>
    </div>
  )
}
