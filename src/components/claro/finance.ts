export const cop = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CO')
export const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
export const categories = [
  'Educación',
  'Transporte',
  'Moto',
  'Alimentación',
  'Familia',
  'Entretenimiento',
  'Suscripciones',
  'Compras',
  'Salud',
  'Cuidado personal',
  'Tecnología',
  'Viajes',
  'Otros',
]
export const methods = [
  'Débito Bancolombia',
  'Débito Nu',
  'Nequi',
  'Tarjeta Nu',
  'Efectivo',
]
export const accounts = ['Efectivo', 'Nequi', 'Bancolombia', 'Nu']
export const accountFor = (method: string, account?: string | null) =>
  account && accounts.includes(account)
    ? account
    : method === 'Efectivo'
      ? 'Efectivo'
      : method === 'Nequi'
        ? 'Nequi'
        : method === 'Débito Nu'
          ? 'Nu'
          : 'Bancolombia'
export type MovementType =
  | 'Ingreso'
  | 'Gasto'
  | 'Abono recibido'
  | 'Ahorro'
  | 'Retiro de ahorro'
  | 'Retiro'
  | 'Interés'
  | 'Inversión'
  | 'Pago de deuda'
  | 'Préstamo'
export type Movement = {
  id: string
  date: string
  type: MovementType
  description: string
  amount: number
  category: string
  method: string
  account?: string
  reference: string
  created: string
  debtor?: string
  balanceAfter?: number | null
  cashAdjustment?: number | null
  reconciliationNote?: string
}
export type Loan = {
  id: string
  description: string
  amount: number
  due: string
  debtor?: string
  dateLent?: string
}
export type FinanceConfig = {
  openingCash: number
  motoPrincipal: number
  motoMarketValue: number
  nuAdvance: number
}
export type FinanceData = {
  name: string
  email: string
  config: FinanceConfig & { monthlyIncome: number; motoRate: number; balanceConfirmedOn: string }
  movements: Movement[]
  fixed: Fixed[]
  goals: Goal[]
  loans: Loan[]
  plans: Record<string, Fixed[]>
  history: { cell: string; value: string; formula: string }[]
}
export type Fixed = {
  id: string
  name: string
  amount: number
  day: number | null
  category: string
  essential: boolean
  active: boolean
}
export type Goal = {
  id: string
  name: string
  target: number
  monthly: number
  deadline: string
}
export function summarize(
  movements: Movement[],
  month: string,
  config: FinanceConfig = {
    openingCash: 1000000,
    motoPrincipal: 13850000,
    motoMarketValue: 13850000,
    nuAdvance: 2065000,
  },
  loans?: Loan[],
) {
  movements = movements.filter((m) => m.date.slice(0, 7) <= month)
  const current = movements.filter((m) => m.date.startsWith(month))
  const total = (type: MovementType, rows = movements) =>
    rows.filter((m) => m.type === type).reduce((a, m) => a + m.amount, 0)
  const cashImpact = (m: Movement) => {
    if (['Ingreso', 'Abono recibido', 'Retiro de ahorro'].includes(m.type)) return m.amount
    if (m.type === 'Retiro' || m.type === 'Interés') return 0
    if (m.type === 'Gasto' && m.method === 'Tarjeta Nu') return 0
    return -m.amount
  }
  const savings = total('Ahorro') + total('Interés') - total('Retiro de ahorro')
  const received = total('Ingreso', current)
  const expenses = total('Gasto', current)
  const cardPurchases = movements
    .filter((m) => m.type === 'Gasto' && m.method === 'Tarjeta Nu')
    .reduce((s, m) => s + m.amount, 0)
  const cardPaid = movements
    .filter((m) => m.type === 'Pago de deuda' && m.reference === 'NU')
    .reduce((s, m) => s + m.amount, 0)
  const motoPaid = movements
    .filter((m) => m.type === 'Pago de deuda' && m.reference === 'MOTO')
    .reduce((s, m) => s + m.amount, 0)
  const cash =
    config.openingCash + movements.reduce((s, m) => s + cashImpact(m) + (m.cashAdjustment || 0), 0)
  const cashByAccount: Record<string, number> = {
    Efectivo: 0,
    Nequi: 0,
    Bancolombia: config.openingCash,
    Nu: 0,
  }
  for (const m of movements) {
    if (m.type === 'Retiro') {
      const destination = m.account && accounts.includes(m.account) ? m.account : 'Efectivo'
      cashByAccount.Bancolombia -= m.amount
      cashByAccount[destination] += m.amount
      continue
    }
    cashByAccount[accountFor(m.method, m.account)] += cashImpact(m)
    if (m.cashAdjustment) cashByAccount.Bancolombia += m.cashAdjustment
  }
  const receivables =
    (loans ? loans.reduce((a, d) => a + d.amount, 0) : total('Préstamo')) - total('Abono recibido')
  // Payments must be split into principal and interest before reducing moto principal.
  const liabilities = config.motoPrincipal + config.nuAdvance + cardPurchases - cardPaid
  return {
    cash,
    cashByAccount,
    received,
    expenses,
    savings,
    investments: total('Inversión'),
    receivables,
    liabilities,
    netWorth:
      cash + savings + total('Inversión') + receivables + config.motoMarketValue - liabilities,
    savingsRate: received ? (total('Ahorro', current) / received) * 100 : 0,
    motoPaid,
  }
}
export function amortize(
  principal = 13850000,
  rate = 0.021,
  payment = 800000,
  extra = 0,
  payoffMonth = -1,
) {
  const rows: {
    month: number
    opening: number
    interest: number
    payment: number
    principal: number
    closing: number
    accumulated: number
  }[] = []
  let balance = principal,
    accumulated = 0
  for (let i = 0; i < 120 && balance > 0.01; i++) {
    const interest = Math.round(balance * rate)
    const paid =
      i === payoffMonth ? balance + interest : Math.min(balance + interest, payment + extra)
    const capital = paid - interest
    accumulated += interest
    rows.push({
      month: i,
      opening: balance,
      interest,
      payment: paid,
      principal: capital,
      closing: Math.max(0, balance - capital),
      accumulated,
    })
    balance = Math.max(0, balance - capital)
    if (capital <= 0) break
  }
  return rows
}
export function repaymentBalance(id: string, movements: Movement[], loans: Loan[] = []) {
  return (
    (loans.find((d) => d.id === id)?.amount ||
      movements.find((m) => m.id === id && m.type === 'Préstamo')?.amount ||
      0) -
    movements
      .filter((m) => m.type === 'Abono recibido' && m.reference === id)
      .reduce((s, m) => s + m.amount, 0)
  )
}
export function forecast(
  cash: number,
  recurring: number,
  horizon: number,
  scenario: string,
  fatherEarly = false,
  motoEarly = false,
  expectedRepayment = 5885000,
) {
  let value = cash
  for (let i = 0; i < horizon; i++) {
    value += 3600000 - recurring
    if (scenario !== 'Conservador') value -= 400000
    if (fatherEarly && i === 1) value += expectedRepayment
    if (motoEarly && i === 4) value -= amortize()[4].closing
    if (motoEarly && i > 4) value += 800000
  }
  return value
}
export function goalBalance(id: string, movements: Movement[]) {
  if (id === 'META-02') return 0
  if (id === 'META-03')
    return movements.filter((m) => m.type === 'Inversión').reduce((a, m) => a + m.amount, 0)
  return movements
    .filter((m) => m.reference === id || (!m.reference && id === 'META-01'))
    .reduce(
      (a, m) =>
        a +
        (['Ahorro', 'Interés'].includes(m.type)
          ? m.amount
          : m.type === 'Retiro de ahorro'
            ? -m.amount
            : 0),
      0,
    )
}
