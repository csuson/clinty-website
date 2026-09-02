import { useState, useMemo } from 'react'

const MINUTES_PER_MESSAGE = 7
const MINUTES_PER_APPOINTMENT = 12
const HOURS_PER_CAMPAIGN_MANUAL = 5
const HOURS_PER_CAMPAIGN_WITH_CLINTY = 0.5
const AGENCY_MANAGEMENT_RATE = 0.12
const AUTOMATION_RATE = 0.85

export default function ROICalculator() {
  const [teamSize, setTeamSize] = useState(3)
  const [messagesPerDay, setMessagesPerDay] = useState(35)
  const [appointmentsPerWeek, setAppointmentsPerWeek] = useState(15)
  const [hourlyRate, setHourlyRate] = useState(45)
  const [campaignsPerMonth, setCampaignsPerMonth] = useState(2)
  const [monthlyAdSpend, setMonthlyAdSpend] = useState(2000)

  const results = useMemo(() => {
    const messageHoursWeek = (messagesPerDay * MINUTES_PER_MESSAGE * 5) / 60
    const appointmentHoursWeek = (appointmentsPerWeek * MINUTES_PER_APPOINTMENT) / 60
    const communicationHoursWeek = messageHoursWeek + appointmentHoursWeek
    const communicationHoursSavedWeek = communicationHoursWeek * AUTOMATION_RATE

    const hoursSavedPerCampaign = HOURS_PER_CAMPAIGN_MANUAL - HOURS_PER_CAMPAIGN_WITH_CLINTY
    const adHoursSavedMonth = campaignsPerMonth * hoursSavedPerCampaign
    const adAgencySavingsMonth = monthlyAdSpend * AGENCY_MANAGEMENT_RATE

    const communicationMoneyMonth = communicationHoursSavedWeek * 4.33 * hourlyRate
    const adTimeSavingsMonth = adHoursSavedMonth * hourlyRate
    const adMoneyMonth = adTimeSavingsMonth + adAgencySavingsMonth

    const hoursSavedWeek = communicationHoursSavedWeek + adHoursSavedMonth / 4.33
    const hoursSavedMonth = hoursSavedWeek * 4.33
    const hoursSavedYear = hoursSavedWeek * 52

    const moneySavedMonth = communicationMoneyMonth + adMoneyMonth
    const moneySavedYear = moneySavedMonth * 12

    const clintyCostMonth = teamSize <= 2 ? 29 : teamSize <= 5 ? 59 : 99
    const netSavingsMonth = moneySavedMonth - clintyCostMonth
    const roi = ((netSavingsMonth / clintyCostMonth) * 100).toFixed(0)
    const workdaysFreed = (hoursSavedMonth / 8).toFixed(1)

    return {
      hoursSavedWeek: hoursSavedWeek.toFixed(1),
      hoursSavedMonth: hoursSavedMonth.toFixed(0),
      hoursSavedYear: hoursSavedYear.toFixed(0),
      moneySavedMonth: moneySavedMonth.toFixed(0),
      moneySavedYear: moneySavedYear.toFixed(0),
      communicationMoneyMonth: communicationMoneyMonth.toFixed(0),
      adMoneyMonth: adMoneyMonth.toFixed(0),
      adTimeSavingsMonth: adTimeSavingsMonth.toFixed(0),
      adAgencySavingsMonth: adAgencySavingsMonth.toFixed(0),
      clintyCostMonth,
      netSavingsMonth: netSavingsMonth.toFixed(0),
      roi,
      workdaysFreed,
    }
  }, [teamSize, messagesPerDay, appointmentsPerWeek, hourlyRate, campaignsPerMonth, monthlyAdSpend])

  return (
    <section id="roi" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-navy-900 mb-4">
            See your <em className="text-amber-500 not-italic">real</em> ROI
          </h2>
          <p className="text-navy-600 text-lg">
            Adjust the sliders to match your business. See savings from communication,
            scheduling, and ad campaign creation in one place.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-navy-900 mb-1">Your business profile</h3>
                <p className="text-sm text-navy-600">Shared settings for all calculations</p>
              </div>

              <SliderInput
                label="Team size"
                value={teamSize}
                min={1}
                max={20}
                step={1}
                display={`${teamSize} ${teamSize === 1 ? 'person' : 'people'}`}
                onChange={setTeamSize}
              />
              <SliderInput
                label="Average hourly rate"
                value={hourlyRate}
                min={20}
                max={150}
                step={5}
                display={`$${hourlyRate}/hr`}
                onChange={setHourlyRate}
              />
            </div>

            <div className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-navy-900 mb-1">Communication & scheduling</h3>
                <p className="text-sm text-navy-600">Email and WhatsApp handled by one agent</p>
              </div>

              <SliderInput
                label="Email & WhatsApp messages per day"
                value={messagesPerDay}
                min={5}
                max={150}
                step={5}
                display={`${messagesPerDay} messages`}
                onChange={setMessagesPerDay}
              />
              <SliderInput
                label="Appointments per week"
                value={appointmentsPerWeek}
                min={1}
                max={50}
                step={1}
                display={`${appointmentsPerWeek} appointments`}
                onChange={setAppointmentsPerWeek}
              />
            </div>

            <div className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-navy-900 mb-1">Ad campaign creation</h3>
                <p className="text-sm text-navy-600">
                  Draft Google, Meta, and Yelp campaigns from one brief
                </p>
              </div>

              <SliderInput
                label="New campaigns per month"
                value={campaignsPerMonth}
                min={1}
                max={8}
                step={1}
                display={`${campaignsPerMonth} ${campaignsPerMonth === 1 ? 'campaign' : 'campaigns'}`}
                onChange={setCampaignsPerMonth}
              />
              <SliderInput
                label="Monthly ad spend"
                value={monthlyAdSpend}
                min={50}
                max={15000}
                step={50}
                display={`$${monthlyAdSpend.toLocaleString()}/mo`}
                onChange={setMonthlyAdSpend}
              />
              <p className="text-xs text-navy-600 leading-relaxed">
                Assumes ~{HOURS_PER_CAMPAIGN_MANUAL} hrs to build each campaign manually vs.{' '}
                {HOURS_PER_CAMPAIGN_WITH_CLINTY} hr to review Clinty&apos;s draft, plus{' '}
                {(AGENCY_MANAGEMENT_RATE * 100).toFixed(0)}% agency management fees avoided on ad spend.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-navy-900 rounded-2xl p-8 text-cream">
              <div className="text-sm text-cream/60 mb-2">Estimated annual savings</div>
              <div className="text-5xl md:text-6xl font-bold text-teal-400 mb-1">
                ${Number(results.moneySavedYear).toLocaleString()}
              </div>
              <div className="text-cream/60 text-sm">
                {results.roi}% ROI · ${Number(results.netSavingsMonth).toLocaleString()}/mo net after Clinty
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ResultCard
                label="Hours saved / week"
                value={results.hoursSavedWeek}
                unit="hrs"
                highlight
              />
              <ResultCard
                label="Hours saved / year"
                value={results.hoursSavedYear}
                unit="hrs"
              />
              <ResultCard
                label="Money saved / month"
                value={`$${Number(results.moneySavedMonth).toLocaleString()}`}
              />
              <ResultCard
                label="Workdays freed / month"
                value={results.workdaysFreed}
                unit="days"
              />
            </div>

            <div className="bg-white rounded-2xl border border-navy-900/5 p-6">
              <h4 className="font-semibold text-navy-900 mb-4">Savings breakdown</h4>
              <div className="space-y-3">
                <ComparisonRow
                  label="Email, WhatsApp & scheduling"
                  value={`$${Number(results.communicationMoneyMonth).toLocaleString()}/mo`}
                  sub="staff time recovered"
                />
                <ComparisonRow
                  label="Ad creation time"
                  value={`$${Number(results.adTimeSavingsMonth).toLocaleString()}/mo`}
                  sub={`${campaignsPerMonth} campaigns · ${HOURS_PER_CAMPAIGN_MANUAL - HOURS_PER_CAMPAIGN_WITH_CLINTY} hrs saved each`}
                />
                <ComparisonRow
                  label="Agency management fees"
                  value={`$${Number(results.adAgencySavingsMonth).toLocaleString()}/mo`}
                  sub={`${(AGENCY_MANAGEMENT_RATE * 100).toFixed(0)}% of $${monthlyAdSpend.toLocaleString()} ad spend`}
                />
                <div className="border-t border-navy-900/10 pt-3">
                  <ComparisonRow
                    label="Total ad campaign savings"
                    value={`$${Number(results.adMoneyMonth).toLocaleString()}/mo`}
                    sub="creation time + agency fees"
                    highlight
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-navy-900/5 p-6">
              <h4 className="font-semibold text-navy-900 mb-4">Cost comparison</h4>
              <div className="space-y-3">
                <ComparisonRow
                  label="Manual communication & ads"
                  value={`$${Number(results.moneySavedMonth).toLocaleString()}/mo`}
                  sub="in staff time and agency fees"
                  negative
                />
                <ComparisonRow
                  label="Clinty subscription"
                  value={`$${results.clintyCostMonth}/mo`}
                  sub="communication, scheduling & ad campaigns"
                />
                <div className="border-t border-navy-900/10 pt-3">
                  <ComparisonRow
                    label="Your net savings"
                    value={`$${Number(results.netSavingsMonth).toLocaleString()}/mo`}
                    sub={`$${(Number(results.netSavingsMonth) * 12).toLocaleString()}/year`}
                    highlight
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-navy-900">{label}</label>
        <span className="text-sm font-semibold text-teal-500">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-cream-dark rounded-full appearance-none cursor-pointer accent-teal-500"
      />
      <div className="flex justify-between text-xs text-navy-600 mt-1">
        <span>{typeof min === 'number' && min >= 50 && max >= 500 ? `$${min.toLocaleString()}` : min}</span>
        <span>{typeof max === 'number' && max >= 500 ? `$${max.toLocaleString()}` : max}</span>
      </div>
    </div>
  )
}

function ResultCard({
  label,
  value,
  unit,
  highlight,
}: {
  label: string
  value: string
  unit?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-5 border ${
        highlight
          ? 'bg-teal-400/10 border-teal-400/20'
          : 'bg-white border-navy-900/5'
      }`}
    >
      <div className="text-xs text-navy-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-teal-500' : 'text-navy-900'}`}>
        {value}
        {unit && <span className="text-sm font-normal text-navy-600 ml-1">{unit}</span>}
      </div>
    </div>
  )
}

function ComparisonRow({
  label,
  value,
  sub,
  negative,
  highlight,
}: {
  label: string
  value: string
  sub: string
  negative?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between items-center gap-4">
      <div>
        <div className={`text-sm ${highlight ? 'font-semibold text-navy-900' : 'text-navy-600'}`}>
          {label}
        </div>
        <div className="text-xs text-navy-600">{sub}</div>
      </div>
      <div
        className={`text-sm font-semibold shrink-0 ${
          negative ? 'text-red-500' : highlight ? 'text-teal-500' : 'text-navy-900'
        }`}
      >
        {negative ? `−${value}` : value}
      </div>
    </div>
  )
}
