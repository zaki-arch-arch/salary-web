import { useState } from 'react'
import { Person, SalaryRecord } from '../types/salary'
import { parseCSVContent, importRecords } from '../storage'

interface Props {
  persons: Person[]
  onImported: () => void
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return `¥${n.toLocaleString()}`
}

export default function ImportCSV({ persons, onImported }: Props) {
  const [selectedPersonId, setSelectedPersonId] = useState<number>(persons[0]?.id ?? 0)
  const [preview, setPreview] = useState<Omit<SalaryRecord, 'id'>[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError('')
    setLoading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const buf = ev.target?.result as ArrayBuffer
      // UTF-8で試し、月名が取れなければShift-JISで再試行
      let content = new TextDecoder('utf-8').decode(buf)
      let records = parseCSVContent(content, selectedPersonId)
      if (records.length === 0) {
        content = new TextDecoder('shift-jis').decode(buf)
        records = parseCSVContent(content, selectedPersonId)
      }
      setPreview(records)
      if (records.length === 0) setParseError('データが見つかりませんでした。CSVの形式を確認してください。')
      setLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = () => {
    if (!preview) return
    setLoading(true)
    importRecords(preview)
    setDone(true)
    setLoading(false)
    setTimeout(() => onImported(), 1200)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <p className="text-lg font-black text-emerald-600">インポート完了！</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-5">
      <h2 className="text-2xl font-black text-amber-800">CSVインポート</h2>

      <div className="card p-6 space-y-5">
        {/* メンバー選択 */}
        <div>
          <label className="block text-sm font-black text-amber-700 mb-2">誰のデータですか？</label>
          <div className="flex gap-2 flex-wrap">
            {persons.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPersonId(p.id); setPreview(null) }}
                className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all border-2 ${
                  selectedPersonId === p.id
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white border-amber-200 text-amber-600 hover:border-amber-400'
                }`}
                style={selectedPersonId === p.id ? { backgroundColor: p.color, borderColor: p.color } : {}}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* ファイル選択 */}
        <div>
          <label className="block text-sm font-black text-amber-700 mb-2">CSVファイルを選択</label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="btn-primary inline-flex items-center gap-2">
              <span>↑</span> ファイルを選択
            </div>
            {fileName && <span className="text-sm text-gray-500">{fileName}</span>}
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
          <p className="text-xs text-amber-400 mt-2">
            スプレッドシートからエクスポートしたCSV、またはこのアプリでエクスポートしたCSVに対応しています。
          </p>
        </div>
      </div>

      {parseError && (
        <div className="card p-4 border-2 border-red-200 bg-red-50">
          <p className="text-sm font-bold text-red-500">{parseError}</p>
        </div>
      )}

      {/* プレビュー */}
      {preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-600">
              <span className="text-amber-500 font-black">{preview.length}</span> 件が見つかりました
            </p>
            <button onClick={handleImport} disabled={loading}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-sm shadow-sm transition-all disabled:opacity-50">
              ✓ インポート実行
            </button>
          </div>

          <div className="card overflow-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-amber-50 text-amber-400 font-bold uppercase tracking-wide">
                <tr>
                  {['年', '月', '支給金額', '所得税', '住民税', '健保', '厚生年金', '雇用保険', '諸控除', '手取り', '交通費'].map(h => (
                    <th key={h} className={`px-3 py-2.5 ${h === '年' || h === '月' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className={`border-b border-amber-50 hover:bg-amber-50/50 ${r.type === 'bonus' ? 'bg-orange-50/40' : ''}`}>
                    <td className="px-3 py-2 text-gray-500">{r.year}</td>
                    <td className="px-3 py-2 font-bold text-gray-700">
                      {r.month}
                      {r.type === 'bonus' && <span className="ml-1 badge-bonus">賞与</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmt(r.gross_pay)}</td>
                    <td className="px-3 py-2 text-right text-red-400">{fmt(r.income_tax)}</td>
                    <td className="px-3 py-2 text-right text-red-400">{fmt(r.resident_tax)}</td>
                    <td className="px-3 py-2 text-right text-red-400">{fmt(r.health_insurance)}</td>
                    <td className="px-3 py-2 text-right text-red-400">{fmt(r.pension)}</td>
                    <td className="px-3 py-2 text-right text-red-400">{fmt(r.employment_insurance)}</td>
                    <td className="px-3 py-2 text-right text-red-400">{fmt(r.misc_deductions)}</td>
                    <td className="px-3 py-2 text-right font-black text-emerald-500">{fmt(r.net_pay)}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{fmt(r.transportation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
