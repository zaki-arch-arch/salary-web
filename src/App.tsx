import { useState, useEffect, useCallback } from 'react'
import { Person } from './types/salary'
import { getPersons, addPerson, exportCSV, getYears } from './storage'
import Dashboard from './pages/Dashboard'
import PersonView from './pages/PersonView'
import ImportCSV from './pages/ImportCSV'
import PersonSetup from './pages/PersonSetup'

type Page = 'dashboard' | 'person' | 'import' | 'setup'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [persons, setPersons] = useState<Person[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [hasData, setHasData] = useState(false)

  const reload = useCallback(() => {
    const p = getPersons()
    setPersons(p)
    setHasData(getYears().length > 0)
    if (p.length > 0 && !selectedPerson) setSelectedPerson(p[0])
  }, [])

  useEffect(() => { reload() }, [])

  const navTo = (p: Page, person?: Person) => {
    if (person) setSelectedPerson(person)
    setPage(p)
  }

  // 人物がいない場合は初期設定画面へ
  if (persons.length === 0 && page !== 'setup') {
    return <PersonSetup onDone={() => { reload(); setPage('dashboard') }} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-amber-50/40">
      {/* ヘッダー */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          {/* ロゴ */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-sm">¥</span>
            </div>
            <span className="font-black text-amber-800 tracking-wide text-base">給与管理</span>
          </div>

          {/* ナビ */}
          <nav className="flex gap-1.5 flex-1 flex-wrap">
            <button onClick={() => navTo('dashboard')}
              className={page === 'dashboard' ? 'nav-link-active' : 'nav-link-inactive'}>
              ホーム
            </button>
            {persons.map(p => (
              <button key={p.id}
                onClick={() => navTo('person', p)}
                className={page === 'person' && selectedPerson?.id === p.id ? 'nav-link-active' : 'nav-link-inactive'}
                style={page === 'person' && selectedPerson?.id === p.id ? { backgroundColor: p.color } : {}}
              >
                {p.name}
              </button>
            ))}
            <button onClick={() => navTo('import')}
              className={page === 'import' ? 'nav-link-active' : 'nav-link-inactive'}>
              インポート
            </button>
            <button onClick={() => navTo('setup')}
              className={page === 'setup' ? 'nav-link-active' : 'nav-link-inactive'}>
              メンバー設定
            </button>
          </nav>

          {/* エクスポート */}
          {hasData && (
            <button onClick={exportCSV}
              className="text-xs font-bold text-amber-500 hover:text-amber-700 border-2 border-amber-200
                         hover:border-amber-400 rounded-xl px-3 py-1.5 transition-all">
              ↓ エクスポート
            </button>
          )}
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {page === 'dashboard' && (
          <Dashboard
            persons={persons}
            onSelectPerson={(p) => navTo('person', p)}
          />
        )}
        {page === 'person' && selectedPerson && (
          <PersonView
            person={selectedPerson}
            onDataChange={reload}
          />
        )}
        {page === 'import' && (
          <ImportCSV
            persons={persons}
            onImported={() => { reload(); navTo('dashboard') }}
          />
        )}
        {page === 'setup' && (
          <PersonSetup
            persons={persons}
            onDone={() => { reload(); navTo('dashboard') }}
          />
        )}
      </main>
    </div>
  )
}
