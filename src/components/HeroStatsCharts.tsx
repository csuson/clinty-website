import type { ReactNode } from 'react'

type ChartCardProps = {
  value: string
  label: string
  sub: string
  children: ReactNode
}

function ChartCard({ value, label, sub, children }: ChartCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 border border-navy-900/5 shadow-sm flex flex-col">
      <div className="mb-4">{children}</div>
      <div className="mt-auto">
        <div className="text-2xl md:text-3xl font-bold text-navy-900 mb-1">{value}</div>
        <div className="text-sm font-medium text-navy-900">{label}</div>
        <div className="text-xs text-navy-600 mt-1">{sub}</div>
      </div>
    </div>
  )
}

function HoursSavedChart() {
  const bars = [
    { label: 'Mon', manual: 7, withClinty: 4.5 },
    { label: 'Tue', manual: 6.5, withClinty: 4 },
    { label: 'Wed', manual: 7, withClinty: 4.5 },
    { label: 'Thu', manual: 6, withClinty: 3.5 },
    { label: 'Fri', manual: 6.5, withClinty: 4 },
  ]
  const max = 8

  return (
    <svg viewBox="0 0 240 100" className="w-full h-auto" role="img" aria-label="Weekly hours on messaging and scheduling drop from about 33 hours to 20 hours">
      <text x="0" y="10" className="fill-navy-600 text-[9px]">hrs / day on messaging & scheduling</text>
      {bars.map((bar, index) => {
        const x = index * 48 + 8
        const manualHeight = (bar.manual / max) * 58
        const clintyHeight = (bar.withClinty / max) * 58
        return (
          <g key={bar.label}>
            <rect x={x} y={82 - manualHeight} width="14" height={manualHeight} rx="3" className="fill-navy-900/10" />
            <rect x={x + 16} y={82 - clintyHeight} width="14" height={clintyHeight} rx="3" className="fill-teal-400" />
            <text x={x + 15} y="96" textAnchor="middle" className="fill-navy-600 text-[8px]">{bar.label}</text>
          </g>
        )
      })}
      <g transform="translate(196, 18)">
        <rect width="8" height="8" rx="2" className="fill-navy-900/10" />
        <text x="12" y="7" className="fill-navy-600 text-[8px]">Before</text>
        <rect y="14" width="8" height="8" rx="2" className="fill-teal-400" />
        <text x="12" y="21" className="fill-navy-600 text-[8px]">With Clinty</text>
      </g>
    </svg>
  )
}

function SavingsChart() {
  const points = [2, 4.5, 7, 10, 13, 16, 18.5, 21, 23.5, 25.5, 27, 28]
  const width = 240
  const height = 88
  const chartHeight = 58
  const step = width / (points.length - 1)

  const linePath = points
    .map((value, index) => {
      const x = index * step
      const y = height - 18 - (value / 28) * chartHeight
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  const areaPath = `${linePath} L ${width} ${height - 18} L 0 ${height - 18} Z`

  return (
    <svg viewBox="0 0 240 100" className="w-full h-auto" role="img" aria-label="Annual savings grow to twenty-eight thousand dollars for a five-person team">
      <text x="0" y="10" className="fill-navy-600 text-[9px]">annual savings ($K) · 5-person team</text>
      <path d={areaPath} className="fill-amber-400/20" />
      <path d={linePath} fill="none" strokeWidth="2.5" className="stroke-amber-500" />
      {points.map((value, index) => {
        const x = index * step
        const y = height - 18 - (value / 28) * chartHeight
        return (
          <circle
            key={value}
            cx={x}
            cy={y}
            r={index === points.length - 1 ? 4 : 2.5}
            className={index === points.length - 1 ? 'fill-amber-500' : 'fill-amber-400/60'}
          />
        )
      })}
      <text x="0" y={height - 4} className="fill-navy-600 text-[8px]">Jan</text>
      <text x={width / 2 - 8} y={height - 4} className="fill-navy-600 text-[8px]">Jun</text>
      <text x={width - 18} y={height - 4} className="fill-navy-600 text-[8px]">Dec</text>
    </svg>
  )
}

function ResponseTimeChart() {
  return (
    <svg viewBox="0 0 240 100" className="w-full h-auto" role="img" aria-label="Average response time drops from twenty minutes to under two minutes">
      <text x="0" y="10" className="fill-navy-600 text-[9px]">avg. response time (minutes)</text>
      <text x="0" y="34" className="fill-navy-600 text-[8px]">Manual</text>
      <rect x="42" y="24" width="180" height="12" rx="6" className="fill-navy-900/8" />
      <rect x="42" y="24" width="180" height="12" rx="6" className="fill-navy-900/20" />
      <text x="226" y="33" textAnchor="end" className="fill-navy-900 text-[8px] font-semibold">20 min</text>

      <text x="0" y="62" className="fill-navy-600 text-[8px]">Clinty</text>
      <rect x="42" y="52" width="180" height="12" rx="6" className="fill-navy-900/8" />
      <rect x="42" y="52" width="18" height="12" rx="6" className="fill-teal-400" />
      <text x="226" y="61" textAnchor="end" className="fill-teal-600 text-[8px] font-semibold">&lt; 2 min</text>

      <text x="42" y="84" className="fill-navy-600 text-[8px]">email · WhatsApp · inventory lookups</text>
    </svg>
  )
}

function AccuracyChart() {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const accuracy = 0.94
  const strokeDashoffset = circumference * (1 - accuracy)

  return (
    <svg viewBox="0 0 240 100" className="w-full h-auto" role="img" aria-label="Ninety-four percent scheduling accuracy with zero double-bookings">
      <text x="0" y="10" className="fill-navy-600 text-[9px]">scheduling accuracy</text>
      <g transform="translate(52, 58)">
        <circle r={radius} fill="none" strokeWidth="10" className="stroke-navy-900/8" />
        <circle
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className="stroke-teal-400"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90)"
        />
        <text y="5" textAnchor="middle" className="fill-navy-900 text-[18px] font-bold">94%</text>
      </g>
      <g transform="translate(118, 30)">
        <text className="fill-navy-900 text-[10px] font-semibold">Zero double-bookings</text>
        <text y="14" className="fill-navy-600 text-[8px]">Calendar sync across channels</text>
        <rect y="26" width="10" height="10" rx="2" className="fill-teal-400" />
        <text x="14" y="34" className="fill-navy-600 text-[8px]">Accurate bookings</text>
        <rect y="40" width="10" height="10" rx="2" className="fill-navy-900/10" />
        <text x="14" y="48" className="fill-navy-600 text-[8px]">Conflicts avoided</text>
      </g>
    </svg>
  )
}

export default function HeroStatsCharts() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
      <ChartCard value="15+ hrs" label="saved per week" sub="on messaging & scheduling">
        <HoursSavedChart />
      </ChartCard>
      <ChartCard value="$28K" label="avg. annual savings" sub="for a 5-person team">
        <SavingsChart />
      </ChartCard>
      <ChartCard value="< 2 min" label="response time" sub="email, WhatsApp & inventory">
        <ResponseTimeChart />
      </ChartCard>
      <ChartCard value="94%" label="scheduling accuracy" sub="zero double-bookings">
        <AccuracyChart />
      </ChartCard>
    </div>
  )
}
