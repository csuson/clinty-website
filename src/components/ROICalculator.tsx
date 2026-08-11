import { useState, useMemo } from 'react'

export default function ROICalculator() {
  const [teamSize, setTeamSize] = useState(3)
  const [emailsPerDay, setEmailsPerDay] = useState(25)
  const [appointmentsPerWeek, setAppointmentsPerWeek] = useState(15)
  const [hourlyRate, setHourlyRate] = useState(45)

  const results = useMemo(() => {
    const minutesPerEmail = 8
    const minutesPerAppointment = 12

    const emailHoursWeek = (emailsPerDay * minutesPerEmail * 5) / 60
    const appointmentHoursWeek = (appointmentsPerWeek * minutesPerAppointment) / 60
    const totalHoursWeek = emailHoursWeek + appointmentHoursWeek

    const automationRate = 0.85
    const hoursSavedWeek = totalHoursWeek * automationRate
    const hoursSavedMonth = hoursSavedWeek * 4.33
    const hoursSavedYear = hoursSavedWeek * 52

    const moneySavedWeek = hoursSavedWeek * hourlyRate
    const moneySavedMonth = hoursSavedWeek * 4.33 * hourlyRate
    const moneySavedYear = hoursSavedWeek * 52 * hourlyRate

    const clintyCostMonth = teamSize <= 2 ? 29 : teamSize <= 5 ? 59 : 99
    const netSavingsMonth = moneySavedMonth - clintyCostMonth
    const roi = ((netSavingsMonth / clintyCostMonth) * 100).toFixed(0)

    const workdaysFreed = (hoursSavedMonth / 8).toFixed(1)

    return {
      hoursSavedWeek: hoursSavedWeek.toFixed(1),
      hoursSavedMonth: hoursSavedMonth.toFixed(0),
      hoursSavedYear: hoursSavedYear.toFixed(0),
      moneySavedWeek: moneySavedWeek.toFixed(0),
      moneySavedMonth: moneySavedMonth.toFixed(0),
      moneySavedYear: moneySavedYear.toFixed(0),
      clintyCostMonth,
      netSavingsMonth: netSavingsMonth.toFixed(0),
      roi,
      workdaysFreed,
    }
  }, [teamSize, emailsPerDay, appointmentsPerWeek, hourlyRate])

  return (
    <section id="roi" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-navy-900 mb-4">
            See your <em className="text-amber-500 not-italic">real</em> ROI
          </h2>
          <p className="text-navy-600 text-lg">
            Adjust the sliders to match your business. See exactly how much time and money
            Clinty saves your team.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm space-y-8">
            <h3 className="text-lg font-semibold text-navy-900">Your business profile</h3>

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
              label="Customer emails per day"
              value={emailsPerDay}
              min={5}
              max={100}
              step={5}
              display={`${emailsPerDay} emails`}
              onChange={setEmailsPerDay}
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

          <div className="space-y-4">
            <div className="bg-navy-900 rounded-2xl p-8 text-cream">
              <div className="text-sm text-cream/60 mb-2">Estimated annual savings</div>
              <div className="text-5xl md:text-6xl font-bold text-teal-400 mb-1">
                ${Number(results.moneySavedYear).toLocaleString()}
              </div>
              <div className="text-cream/60 text-sm">
                {results.roi}% ROI · ${results.netSavingsMonth}/mo net after Clinty
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
              <h4 className="font-semibold text-navy-900 mb-4">Cost comparison</h4>
              <div className="space-y-3">
                <ComparisonRow
                  label="Manual email & scheduling"
                  value={`$${Number(results.moneySavedMonth).toLocaleString()}/mo`}
                  sub="in staff time"
                  negative
                />
                <ComparisonRow
                  label="Clinty subscription"
                  value={`$${results.clintyCostMonth}/mo`}
                  sub="all features included"
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
        <span>{min}</span>
        <span>{max}</span>
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
    <div className="flex justify-between items-center">
      <div>
        <div className={`text-sm ${highlight ? 'font-semibold text-navy-900' : 'text-navy-600'}`}>
          {label}
        </div>
        <div className="text-xs text-navy-600">{sub}</div>
      </div>
      <div
        className={`text-sm font-semibold ${
          negative ? 'text-red-500' : highlight ? 'text-teal-500' : 'text-navy-900'
        }`}
      >
        {negative ? `−${value}` : value}
      </div>
    </div>
  )
}
