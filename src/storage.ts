import { Person, SalaryRecord } from './types/salary'

const KEYS = { persons: 'salary_persons', records: 'salary_records' }

// ── ユーティリティ ──────────────────────────────────────
function loadPersons(): Person[] {
  try { return JSON.parse(localStorage.getItem(KEYS.persons) ?? '[]') } catch { return [] }
}
function savePersons(p: Person[]) { localStorage.setItem(KEYS.persons, JSON.stringify(p)) }

function loadRecords(): SalaryRecord[] {
  try { return JSON.parse(localStorage.getItem(KEYS.records) ?? '[]') } catch { return [] }
}
function saveRecords(r: SalaryRecord[]) { localStorage.setItem(KEYS.records, JSON.stringify(r)) }

function nextId<T extends { id: number }>(arr: T[]): number {
  return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1
}

export const PERSON_COLORS = [
  '#f59e0b', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
]

// ── 人物管理 ──────────────────────────────────────────
export function getPersons(): Person[] { return loadPersons() }

export function addPerson(name: string): Person {
  const persons = loadPersons()
  const color = PERSON_COLORS[persons.length % PERSON_COLORS.length]
  const person: Person = { id: nextId(persons), name, color }
  persons.push(person)
  savePersons(persons)
  return person
}

export function updatePerson(id: number, name: string): void {
  const persons = loadPersons()
  const p = persons.find(p => p.id === id)
  if (p) { p.name = name; savePersons(persons) }
}

export function deletePerson(id: number): void {
  savePersons(loadPersons().filter(p => p.id !== id))
  saveRecords(loadRecords().filter(r => r.person_id !== id))
}

// ── 給与レコード ──────────────────────────────────────
export function getYears(personId?: number): number[] {
  const records = personId
    ? loadRecords().filter(r => r.person_id === personId)
    : loadRecords()
  return [...new Set(records.map(r => r.year))].sort()
}

export function getRecords(personId: number, year: number): SalaryRecord[] {
  return loadRecords().filter(r => r.person_id === personId && r.year === year)
}

export function getAllRecordsByYear(year: number): SalaryRecord[] {
  return loadRecords().filter(r => r.year === year)
}

export function upsertRecord(record: Omit<SalaryRecord, 'id'>): SalaryRecord {
  const records = loadRecords()
  const idx = records.findIndex(r =>
    r.person_id === record.person_id && r.year === record.year && r.month === record.month
  )
  if (idx >= 0) {
    records[idx] = { ...record, id: records[idx].id }
    saveRecords(records)
    return records[idx]
  }
  const newRecord = { ...record, id: nextId(records) }
  records.push(newRecord)
  saveRecords(records)
  return newRecord
}

export function deleteRecord(id: number): void {
  saveRecords(loadRecords().filter(r => r.id !== id))
}

export function importRecords(records: Omit<SalaryRecord, 'id'>[]): void {
  for (const r of records) upsertRecord(r)
}

// ── CSVエクスポート ────────────────────────────────────
export function exportCSV(): void {
  const records = loadRecords()
  const persons = loadPersons()
  if (records.length === 0) return

  const getName = (id: number) => persons.find(p => p.id === id)?.name ?? `人物${id}`
  const headers = ['氏名', '年', '月', '種別', '支給金額', '所得税', '住民税',
    '健康保険', '厚生年金', '雇用保険', '諸控除', '非課税支給', '差引支給額', '交通費']
  const rows = [...records]
    .sort((a, b) => a.person_id - b.person_id || a.year - b.year)
    .map(r => [
      getName(r.person_id), r.year, r.month, r.type === 'bonus' ? '賞与' : '月次',
      r.gross_pay ?? '', r.income_tax ?? '', r.resident_tax ?? '',
      r.health_insurance ?? '', r.pension ?? '', r.employment_insurance ?? '',
      r.misc_deductions ?? '', r.non_taxable ?? '', r.net_pay ?? '', r.transportation ?? ''
    ])

  const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `給与データ_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── CSVパーサー ────────────────────────────────────────
function parseLine(line: string): string[] {
  const result: string[] = []
  let i = 0
  while (i <= line.length) {
    if (line[i] === '"') {
      i++; let field = ''
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { field += line[i++] }
      }
      result.push(field)
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) { result.push(line.slice(i).replace(/\r$/, '')); break }
      result.push(line.slice(i, end)); i = end + 1
    }
  }
  return result
}

function parseAmount(val: string): number | null {
  if (!val || val.trim() === '' || val.trim() === '¥0') return null
  const n = parseInt(val.replace(/[¥,\s]/g, ''), 10)
  return isNaN(n) ? null : n
}

const MONTH_ORDER = [
  '１月', '２月', '３月', '４月', '５月', '６月', '夏季賞与',
  '７月', '８月', '９月', '１０月', '１１月', '冬期賞与', '１２月'
]

// 旧フォーマット（スプレッドシートCSV）のパース
export function parseCSVContent(content: string, personId: number): Omit<SalaryRecord, 'id'>[] {
  const lines = content.split('\n').map(parseLine)
  const result: Omit<SalaryRecord, 'id'>[] = []
  let currentYear: number | null = null

  for (const cols of lines) {
    const yearMatch = cols[2]?.trim().match(/^(\d{4})年?$/)
    if (yearMatch) currentYear = parseInt(yearMatch[1], 10)
    const monthCell = cols[3]?.trim()
    if (!currentYear || !monthCell || !MONTH_ORDER.includes(monthCell)) continue
    const grossPay = parseAmount(cols[4])
    if (grossPay === null) continue
    result.push({
      person_id: personId,
      year: currentYear, month: monthCell,
      type: monthCell.includes('賞与') ? 'bonus' : 'monthly',
      gross_pay: grossPay,
      income_tax: parseAmount(cols[5]),
      resident_tax: parseAmount(cols[6]),
      health_insurance: parseAmount(cols[7]),
      pension: parseAmount(cols[8]),
      employment_insurance: parseAmount(cols[9]),
      misc_deductions: parseAmount(cols[10]),
      non_taxable: parseAmount(cols[11]),
      net_pay: parseAmount(cols[12]),
      transportation: parseAmount(cols[13])
    })
  }
  return result
}
