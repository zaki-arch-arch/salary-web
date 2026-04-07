import { useEffect, useState } from 'react'
import { Person, SalaryRecord } from '../types/salary'
import { getYears, getRecords } from '../storage'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

interface Props {
  persons: Person[]
  onSelectPerson: (p: Person) => void
}

interface PersonSummary {
  person: Person
  years: number[]
  latestYear: number | null
  latestNet: number
  latestGross: number
  latestBonus: number
}

function fmt(n: number): string {
  if (n === 0) return '—'
  return `¥${n.toLocaleString()}`
}

function fmtMan(n: number): string {
  return `${Math.round(n / 10000)}万円`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-amber-100 rounded-2xl px-4 py-3 text-sm shadow-lg">
      <p className="font-bold text-amber-800 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-6">
          <span>{p.name}</span>
          <span className="font-black">{fmtMan(p.value * 10000)}</span>
        </p>
      ))}
    </div>
  )
}

const CHART_COLORS = ['#f59e0b', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']

export default function Dashboard({ persons, onSelectPerson }: Props) {
  const [summaries, setSummaries] = useState<PersonSummary[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    if (persons.length === 0) return

    const allYears = [...new Set(persons.flatMap(p => getYears(p.id)))].sort()

    const summaryList: PersonSummary[] = persons.map(person => {
      const years = getYears(person.id)
      const latestYear = years.length > 0 ? years[years.length - 1] : null
      let latestNet = 0, latestGross = 0, latestBonus = 0
      if (latestYear) {
        const records = getRecords(person.id, latestYear)
        latestNet = records.reduce((s, r) => s + (r.net_pay ?? 0), 0)
        latestGross = records.reduce((s, r) => s + (r.gross_pay ?? 0), 0)
        latestBonus = records.filter(r => r.type === 'bonus').reduce((s, r) => s + (r.gross_pay ?? 0), 0)
      }
      return { person, years, latestYear, latestNet, latestGross, latestBonus }
    })
    setSummaries(summaryList)

    // 世帯合計グラフデータ
    const data = allYears.map(year => {
      const entry: any = { year: `${year}年` }
      let totalNet = 0
      persons.forEach(p => {
        const records = getRecords(p.id, year)
        const net = records.reduce((s, r) => s + (r.net_pay ?? 0), 0)
        entry[p.name] = Math.round(net / 10000)
        totalNet += net
      })
      if (persons.length > 1) entry['世帯合計'] = Math.round(totalNet / 10000)
      return entry
    })
    setChartData(data)
  }, [persons])

  if (persons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-amber-400">
        <div className="text-5xl mb-4">👋</div>
        <p className="text-lg font-bold text-amber-700">メンバーを登録してください</p>
      </div>
    )
  }

  const totalNet = summaries.reduce((s, x) => s + x.latestNet, 0)
  const totalGross = summaries.reduce((s, x) => s + x.latestGross, 0)
  const latestYearLabel = summaries[0]?.latestYear ? `${summaries[0].latestYear}年` : ''

  return (
    <div className="space-y-6">
      {/* タイトル */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-amber-800">ホーム</h2>
          {latestYearLabel && <p className="text-sm text-amber-500 mt-0.5">{latestYearLabel} の概要</p>}
        </div>
      </div>

      {/* 世帯合計カード（複数人の場合） */}
      {summaries.length > 1 && totalNet > 0 && (
        <div className="card p-6 bg-gradient-to-br from-amber-400 to-orange-400 border-0 text-white">
          <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">世帯合計手取り</p>
          <p className="text-4xl font-black mb-3">{fmt(totalNet)}</p>
          <div className="flex gap-4 text-sm opacity-90">
            <span>総支給 {fmt(totalGross)}</span>
          </div>
        </div>
      )}

      {/* メンバーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {summaries.map(({ person, latestYear, latestNet, latestGross, latestBonus }) => (
          <button
            key={person.id}
            onClick={() => onSelectPerson(person)}
            className="card card-hover p-5 text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm"
                style={{ backgroundColor: person.color }}
              >
                {person.name[0]}
              </div>
              <div>
                <p className="font-black text-gray-800">{person.name}</p>
                <p className="text-xs text-amber-500">{latestYear ? `${latestYear}年` : 'データなし'}</p>
              </div>
              <span className="ml-auto text-amber-300 text-lg">›</span>
            </div>

            {latestNet > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-gray-400">年間手取り</span>
                  <span className="text-xl font-black text-emerald-500">{fmt(latestNet)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-gray-400">年間総支給</span>
                  <span className="text-base font-bold text-gray-600">{fmt(latestGross)}</span>
                </div>
                {latestBonus > 0 && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-gray-400">賞与合計</span>
                    <span className="text-base font-bold text-orange-500">{fmt(latestBonus)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-300 font-medium">データをインポートしてください</p>
            )}
          </button>
        ))}
      </div>

      {/* 推移グラフ */}
      {chartData.length > 1 && (
        <div className="card p-6">
          <h3 className="font-black text-amber-800 mb-1">手取り推移</h3>
          <p className="text-xs text-amber-400 mb-5">年間手取り（万円）</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                {persons.map((p, i) => (
                  <linearGradient key={p.id} id={`grad${p.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
              <XAxis dataKey="year" tick={{ fill: '#d97706', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#d97706', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}万`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#92400e', fontSize: 13 }} />
              {persons.map((p, i) => (
                <Area key={p.id} type="monotone" dataKey={p.name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={`url(#grad${p.id})`} strokeWidth={2.5}
                  dot={{ fill: CHART_COLORS[i % CHART_COLORS.length], r: 4, strokeWidth: 0 }}
                />
              ))}
              {persons.length > 1 && (
                <Area type="monotone" dataKey="世帯合計" stroke="#374151"
                  fill="none" strokeWidth={2} strokeDasharray="6 3"
                  dot={{ fill: '#374151', r: 3, strokeWidth: 0 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
