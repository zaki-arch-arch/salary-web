import { useState } from 'react'
import { SalaryRecord } from '../types/salary'

interface Props {
  record: SalaryRecord
  onSave: (record: Omit<SalaryRecord, 'id'>) => void
  onClose: () => void
}

const MONTHS = [
  '１月', '２月', '３月', '４月', '５月', '６月', '夏季賞与',
  '７月', '８月', '９月', '１０月', '１１月', '冬期賞与', '１２月'
]

function toNum(s: string): number | null {
  const n = parseInt(s.replace(/[,¥\s]/g, ''), 10)
  return isNaN(n) ? null : n
}

export default function EditModal({ record, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    month: record.month,
    type: record.type,
    gross_pay: record.gross_pay?.toString() ?? '',
    income_tax: record.income_tax?.toString() ?? '',
    resident_tax: record.resident_tax?.toString() ?? '',
    health_insurance: record.health_insurance?.toString() ?? '',
    pension: record.pension?.toString() ?? '',
    employment_insurance: record.employment_insurance?.toString() ?? '',
    misc_deductions: record.misc_deductions?.toString() ?? '',
    non_taxable: record.non_taxable?.toString() ?? '',
    net_pay: record.net_pay?.toString() ?? '',
    transportation: record.transportation?.toString() ?? '',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const m = e.target.value
    setForm(f => ({ ...f, month: m, type: m.includes('賞与') ? 'bonus' : 'monthly' }))
  }

  const handleSave = () => {
    onSave({
      person_id: record.person_id,
      year: record.year,
      month: form.month,
      type: form.type as 'monthly' | 'bonus',
      gross_pay: toNum(form.gross_pay),
      income_tax: toNum(form.income_tax),
      resident_tax: toNum(form.resident_tax),
      health_insurance: toNum(form.health_insurance),
      pension: toNum(form.pension),
      employment_insurance: toNum(form.employment_insurance),
      misc_deductions: toNum(form.misc_deductions),
      non_taxable: toNum(form.non_taxable),
      net_pay: toNum(form.net_pay),
      transportation: toNum(form.transportation),
    })
  }

  const fields: [string, string][] = [
    ['支給金額', 'gross_pay'], ['所得税', 'income_tax'], ['住民税', 'resident_tax'],
    ['健康保険', 'health_insurance'], ['厚生年金', 'pension'], ['雇用保険', 'employment_insurance'],
    ['諸控除', 'misc_deductions'], ['非課税支給', 'non_taxable'],
    ['手取り（差引支給額）', 'net_pay'], ['交通費', 'transportation'],
  ]

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-amber-50">
          <h3 className="font-black text-gray-800 text-lg">
            {record.id === 0 ? '新規追加' : '編集'} — {record.year}年
          </h3>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors text-2xl leading-none">×</button>
        </div>

        {/* フォーム */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-black text-amber-500 mb-1.5 uppercase tracking-wide">月</label>
            <select value={form.month} onChange={handleMonthChange} className="input-field">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-black text-amber-500 mb-1.5 uppercase tracking-wide">{label}</label>
                <input
                  type="text"
                  value={form[key as keyof typeof form]}
                  onChange={set(key)}
                  className="input-field"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* フッター */}
        <div className="flex gap-3 px-6 py-5 border-t border-amber-50 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button onClick={handleSave} className="btn-primary">保存</button>
        </div>
      </div>
    </div>
  )
}
