export interface Person {
  id: number
  name: string
  color: string // カードやバッジの識別色
}

export interface SalaryRecord {
  id: number
  person_id: number
  year: number
  month: string
  type: 'monthly' | 'bonus'
  gross_pay: number | null
  income_tax: number | null
  resident_tax: number | null
  health_insurance: number | null
  pension: number | null
  employment_insurance: number | null
  misc_deductions: number | null
  non_taxable: number | null
  net_pay: number | null
  transportation: number | null
}
