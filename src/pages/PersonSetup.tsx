import { useState } from 'react'
import { Person } from '../types/salary'
import { addPerson, updatePerson, deletePerson, PERSON_COLORS } from '../storage'

interface Props {
  persons?: Person[]
  onDone: () => void
}

export default function PersonSetup({ persons = [], onDone }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('名前を入力してください'); return }
    if (persons.some(p => p.name === trimmed)) { setError('同じ名前がすでに登録されています'); return }
    addPerson(trimmed)
    setName('')
    setError('')
    onDone()
  }

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`「${name}」とそのデータをすべて削除しますか？`)) return
    deletePerson(id)
    onDone()
  }

  const isInitial = persons.length === 0

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-md">
          <span className="text-3xl">👥</span>
        </div>
        <h2 className="text-2xl font-black text-amber-800">
          {isInitial ? 'はじめましょう！' : 'メンバー設定'}
        </h2>
        {isInitial && (
          <p className="text-sm text-amber-600 mt-2">
            まず管理するメンバーの名前を登録してください
          </p>
        )}
      </div>

      {/* 既存メンバー一覧 */}
      {persons.length > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="font-black text-amber-800 text-sm">登録済みメンバー</h3>
          {persons.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-amber-50 last:border-0">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm"
                style={{ backgroundColor: PERSON_COLORS[i % PERSON_COLORS.length] }}>
                {p.name[0]}
              </div>
              <span className="flex-1 font-bold text-gray-700">{p.name}</span>
              <button
                onClick={() => handleDelete(p.id, p.name)}
                className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">
                削除
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 追加フォーム */}
      <div className="card p-5 space-y-4">
        <h3 className="font-black text-amber-800 text-sm">
          {isInitial ? 'メンバーを追加' : '新しいメンバーを追加'}
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="input-field flex-1"
            placeholder="名前を入力"
          />
          <button onClick={handleAdd} className="btn-primary whitespace-nowrap">追加</button>
        </div>
        {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
      </div>

      {persons.length > 0 && (
        <div className="text-center">
          <button onClick={onDone} className="btn-secondary">
            完了
          </button>
        </div>
      )}
    </div>
  )
}
