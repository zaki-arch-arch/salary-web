import { useEffect, useState } from 'react'
import { Person, SalaryRecord } from '../types/salary'
import { getYears, getRecords, upsertRecord, deleteRecord } from '../storage'
import EditModal from '../components/EditModal'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  person: Person
  onDataChange: () => void
}

const MONTH_ORDER = [
  '１月', '２月', '３月', '４月', '５月', '６月', '夏季賞与',
  '７月', '８月', '９月', '１０月', '１１月', '冬期賞与', '１２月'
]
const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7']

function fmt(n: number | null | undefined): string {
  if (n == null || n === 0) return '—'
  return `¥${n.toLocaleString()}`
}

function sort(records: SalaryRecord[]) {
  return [...records].sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month))
}

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-amber-100 rounded-2xl px-3 py-2 text-sm shadow-lg">
      <p style={{ color: payload[0].payload.fill }} className="font-bold">{payload[0].name}</p>
      <p className="font-black text-gray-700">¥{payload[0].value.toLocaleString()}</p>
    </div>
  )
}

export default function PersonView({ person, onDataChange }: Props) {
  const [years, setYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [records, setRecords] = useState<SalaryRecord[]>([])
  const [editRecord, setEditRecord] = useState<SalaryRecord | null>(null)

  const load = () => {
    const y = getYears(person.id)
    setYears(y)
    if (y.length > 0 && !y.includes(selectedYear)) setSelectedYear(y[y.length - 1])
    setRecords(sort(getRecords(person.id, selectedYear)))
  }

  useEffect(() => { load() }, [person.id])
  useEffect(() => {
    setRecords(sort(getRecords(person.id, selectedYear)))
  }, [selectedYear, person.id])

  const totals = {
    gross: records.reduce((s, r) => s + (r.gross_pay ?? 0), 0),
    net: records.reduce((s, r) => s + (r.net_pay ?? 0), 0),
    income_tax: records.reduce((s, r) => s + (r.income_tax ?? 0), 0),
    resident_tax: records.reduce((s, r) => s + (r.resident_tax ?? 0), 0),
    health_insurance: records.reduce((s, r) => s + (r.health_insurance ?? 0), 0),
    pension: records.reduce((s, r) => s + (r.pension ?? 0), 0),
    employment_insurance: records.reduce((s, r) => s + (r.employment_insurance ?? 0), 0),
    misc_deductions: records.reduce((s, r) => s + (r.misc_deductions ?? 0), 0),
  }
  const totalDeductions = totals.income_tax + totals.resident_tax + totals.health_insurance +
    totals.pension + totals.employment_insurance + totals.misc_deductions
  const bonus = records.filter(r => r.type === 'bonus').reduce((s, r) => s + (r.gross_pay ?? 0), 0)

  const pieData = [
    { name: '所得税', value: totals.income_tax },
    { name: '住民税', value: totals.resident_tax },
    { name: '健康保険', value: totals.health_insurance },
    { name: '厚生年金', value: totals.pension },
    { name: '雇用保険', value: totals.employment_insurance },
    { name: '諸控除', value: totals.misc_deductions },
  ].filter(d => d.value > 0)

  const handleSave = async (r: Omit<SalaryRecord, 'id'>) => {
    upsertRecord({ ...r, person_id: person.id, year: selectedYear })
    setEditRecord(null)
    setRecords(sort(getRecords(person.id, selectedYear)))
    onDataChange()
  }

  const handleDelete = (id: number) => {
    if (!confirm('このレコードを削除しますか？')) return
    deleteRecord(id)
    setRecords(sort(getRecords(person.id, selectedYear)))
    onDataChange()
  }

  const openNew = () => setEditRecord({
    id: 0, person_id: person.id, year: selectedYear, month: '１月', type: 'monthly',
    gross_pay: null, income_tax: null, resident_tax: null, health_insurance: null,
    pension: null, employment_insurance: null, misc_deductions: null,
    non_taxable: null, net_pay: null, transportation: null
  })

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-sm"
          style={{ backgroundColor: person.color }}>
          {person.name[0]}
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-800">{person.name}</h2>
          <p className="text-xs text-amber-500">給与明細</p>
        </div>

        {/* 年タブ */}
        <div className="flex gap-1.5 ml-auto flex-wrap">
          {years.map(y => (
            <button key={y} onClick={() => setSelectedYear(y)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all ${
                y === selectedYear
                  ? 'text-white shadow-sm'
                  : 'bg-white text-amber-600 border border-amber-200 hover:border-amber-400'
              }`}
              style={y === selectedYear ? { backgroundColor: person.color } : {}}>
              {y}年
            </button>
          ))}
          <button onClick={openNew} className="btn-primary">+ 追加</button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '年間手取り', value: fmt(totals.net), color: 'text-emerald-500' },
          { label: '年間総支給', value: fmt(totals.gross), color: 'text-gray-700' },
          { label: '控除合計', value: fmt(totalDeductions), color: 'text-red-500' },
          { label: '賞与合計', value: fmt(bonus), color: 'text-orange-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-bold text-amber-400 mb-1">{label}</p>
            <p className={`text-lg font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* テーブル */}
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-50 text-xs font-bold text-amber-400 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">月</th>
              <th className="px-4 py-3 text-right">支給金額</th>
              <th className="px-4 py-3 text-right">所得税</th>
              <th className="px-4 py-3 text-right">住民税</th>
              <th className="px-4 py-3 text-right">健保</th>
              <th className="px-4 py-3 text-right">厚生年金</th>
              <th className="px-4 py-3 text-right">雇用保険</th>
              <th className="px-4 py-3 text-right">諸控除</th>
              <th className="px-4 py-3 text-right">手取り</th>
              <th className="px-4 py-3 text-right">交通費</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className={`border-b border-amber-50 hover:bg-amber-50/50 transition-colors ${r.type === 'bonus' ? 'bg-orange-50/50' : ''}`}>
                <td className="px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                  {r.month}
                  {r.type === 'bonus' && <span className="ml-2 badge-bonus">賞与</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{fmt(r.gross_pay)}</td>
                <td className="px-4 py-3 text-right text-red-500">{fmt(r.income_tax)}</td>
                <td className="px-4 py-3 text-right text-red-500">{fmt(r.resident_tax)}</td>
                <td className="px-4 py-3 text-right text-red-500">{fmt(r.health_insurance)}</td>
                <td className="px-4 py-3 text-right text-red-500">{fmt(r.pension)}</td>
                <td className="px-4 py-3 text-right text-red-500">{fmt(r.employment_insurance)}</td>
                <td className="px-4 py-3 text-right text-red-500">{fmt(r.misc_deductions)}</td>
                <td className="px-4 py-3 text-right font-black text-emerald-500">{fmt(r.net_pay)}</td>
                <td className="px-4 py-3 text-right text-gray-400">{fmt(r.transportation)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => setEditRecord(r)} className="text-amber-400 hover:text-amber-600 text-xs font-bold mr-2">編集</button>
                  <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-400 text-xs font-bold">削除</button>
                </td>
              </tr>
            ))}
            <tr className="bg-amber-50 font-black">
              <td className="px-4 py-3 text-amber-700">合計</td>
              <td className="px-4 py-3 text-right text-gray-700">{fmt(totals.gross)}</td>
              <td className="px-4 py-3 text-right text-red-500">{fmt(totals.income_tax)}</td>
              <td className="px-4 py-3 text-right text-red-500">{fmt(totals.resident_tax)}</td>
              <td className="px-4 py-3 text-right text-red-500">{fmt(totals.health_insurance)}</td>
              <td className="px-4 py-3 text-right text-red-500">{fmt(totals.pension)}</td>
              <td className="px-4 py-3 text-right text-red-500">{fmt(totals.employment_insurance)}</td>
              <td className="px-4 py-3 text-right text-red-500">{fmt(totals.misc_deductions)}</td>
              <td className="px-4 py-3 text-right text-emerald-500">{fmt(totals.net)}</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 控除内訳 */}
      {pieData.length > 0 && (
        <div className="card p-6">
          <h3 className="font-black text-amber-800 mb-1">控除内訳</h3>
          <p className="text-xs text-amber-400 mb-4">{selectedYear}年 合計</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#fde68a' }}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend wrapperStyle={{ fontSize: 13, color: '#92400e' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {editRecord && (
        <EditModal record={editRecord} onSave={handleSave} onClose={() => setEditRecord(null)} />
      )}
    </div>
  )
}
