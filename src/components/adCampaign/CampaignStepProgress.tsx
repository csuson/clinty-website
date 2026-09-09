import { WIZARD_STEPS, type CampaignWizardStep } from '../../lib/googleAds/campaignWizardCopy'

export default function CampaignStepProgress({ currentStep }: { currentStep: CampaignWizardStep }) {
  const currentIndex = WIZARD_STEPS.findIndex((step) => step.id === currentStep)
  const active = WIZARD_STEPS[currentIndex] ?? WIZARD_STEPS[0]

  return (
    <section className="bg-white rounded-2xl border border-navy-900/5 p-6 shadow-sm space-y-4">
      <ol className="flex flex-wrap gap-2">
        {WIZARD_STEPS.map((step, index) => {
          const done = index < currentIndex
          const current = step.id === currentStep
          return (
            <li
              key={step.id}
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                current
                  ? 'bg-navy-900 text-cream'
                  : done
                    ? 'bg-teal-400/15 text-teal-800'
                    : 'bg-navy-900/5 text-navy-500'
              }`}
            >
              {index + 1}. {step.title}
            </li>
          )
        })}
      </ol>
      <div>
        <h2 className="text-lg font-semibold text-navy-900">{active.title}</h2>
        <p className="text-sm text-navy-600 mt-1">{active.description}</p>
      </div>
    </section>
  )
}
