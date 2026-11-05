import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  summarize as summarizeCore,
  amortize,
  repaymentBalance as repaymentBalanceCore,
  forecast,
  goalBalance,
  type Movement,
} from './finance.ts'
import { initialFixed, debts } from './finance-fixtures.ts'
import { movementIdentity } from '../../lib/claro/idempotency.ts'
const summarize = (rows: Movement[], month: string) =>
  summarizeCore(rows, month, undefined, [
    ...debts,
    ...rows
      .filter((m) => m.type === 'Préstamo')
      .map((m) => ({ id: m.id, description: m.description, amount: m.amount, due: '' })),
  ])
const repaymentBalance = (id: string, rows: Movement[]) => repaymentBalanceCore(id, rows, debts)

let sequence = 0
const movement = (
  type: Movement['type'],
  amount: number,
  reference = '',
  method = 'Débito Bancolombia',
  date = '2026-11-15',
): Movement => ({
  id: `QA-${++sequence}`,
  type,
  amount,
  reference,
  method,
  date,
  description: 'Solo prueba',
  category: 'Otros',
  created: '2026-11-15T12:00:00Z',
})

test('initial configuration reconciles without treating expectations as cash', () => {
  assert.equal(
    initialFixed.reduce((s, f) => s + f.amount, 0),
    2385000,
  )
  assert.equal(
    debts.reduce((s, d) => s + d.amount, 0),
    5885000,
  )
  const s = summarize([], '2026-11')
  assert.equal(s.cash, 1000000)
  assert.equal(s.received, 0)
  assert.equal(s.liabilities, 15915000)
  assert.equal(s.netWorth, 4820000)
})

test('received salary increases cash and net worth exactly once', () => {
  const s = summarize([movement('Ingreso', 1800000)], '2026-11')
  assert.equal(s.cash, 2800000)
  assert.equal(s.netWorth, 6620000)
})

test('debit purchases reduce cash and net worth', () => {
  const s = summarize([movement('Gasto', 100000)], '2026-11')
  assert.equal(s.cash, 900000)
  assert.equal(s.expenses, 100000)
  assert.equal(s.netWorth, 4720000)
})

test('Nu purchases create debt, not a second cash outflow', () => {
  const rows = [movement('Gasto', 10000, '', 'Tarjeta Nu')]
  const purchase = summarize(rows, '2026-11')
  assert.equal(purchase.cash, 1000000)
  assert.equal(purchase.liabilities, 15925000)
  const settled = summarize([...rows, movement('Pago de deuda', 10000, 'NU')], '2026-11')
  assert.equal(settled.cash, 990000)
  assert.equal(settled.expenses, 10000)
  assert.equal(settled.netWorth, purchase.netWorth)
})

test('partial repayment converts a receivable to cash without creating income', () => {
  const rows = [movement('Abono recibido', 500000, 'CXC-08')]
  const s = summarize(rows, '2026-11')
  assert.equal(repaymentBalance('CXC-08', rows), 1565000)
  assert.equal(s.cash, 1500000)
  assert.equal(s.receivables, 5385000)
  assert.equal(s.received, 0)
  assert.equal(s.liabilities, 15915000)
  assert.equal(s.netWorth, 4820000)
})

test('lending money transfers cash into a new receivable', () => {
  const loan = movement('Préstamo', 120000)
  const rows = [loan, movement('Abono recibido', 20000, loan.id)]
  const s = summarize(rows, '2026-11')
  assert.equal(s.cash, 900000)
  assert.equal(s.receivables, 5985000)
  assert.equal(repaymentBalance(loan.id, rows), 100000)
  assert.equal(s.netWorth, 4820000)
})

test('contributions are transfers, interest is a real return, withdrawals are not salary', () => {
  const rows = [
    movement('Ahorro', 300000, 'META-01'),
    movement('Interés', 1200, 'META-01'),
    movement('Retiro de ahorro', 50000, 'META-01'),
  ]
  const s = summarize(rows, '2026-11')
  assert.equal(s.cash, 750000)
  assert.equal(s.savings, 251200)
  assert.equal(s.expenses, 0)
  assert.equal(s.received, 0)
  assert.equal(s.netWorth, 4821200)
  assert.equal(goalBalance('META-01', rows), 251200)
  assert.equal(goalBalance('META-other', rows), 0)
})

test('investment capital is not consumption or a fabricated return', () => {
  const s = summarize([movement('Inversión', 100000)], '2026-11')
  assert.equal(s.cash, 900000)
  assert.equal(s.investments, 100000)
  assert.equal(s.expenses, 0)
  assert.equal(s.netWorth, 4820000)
})

test('future transactions do not affect prior-month balances', () => {
  const s = summarize([movement('Ingreso', 1800000, '', 'Transferencia', '2026-12-15')], '2026-11')
  assert.equal(s.cash, 1000000)
  assert.equal(s.received, 0)
})

test('motorcycle amortization reconciles principal, interest and payments', () => {
  const rows = amortize()
  assert.equal(rows[0].interest, 290850)
  assert.equal(rows[0].principal, 509150)
  assert.equal(rows[0].closing, 13340850)
  assert.equal(rows[rows.length - 1].closing, 0)
  assert.equal(
    rows.reduce((s, r) => s + r.principal, 0),
    13850000,
  )
  assert.equal(
    rows.reduce((s, r) => s + r.payment, 0),
    13850000 + rows.reduce((s, r) => s + r.interest, 0),
  )
})

test('early payoff and additional capital reduce interest without changing initial principal', () => {
  const standard = amortize()
  const early = amortize(13850000, 0.021, 800000, 0, 4)
  const extra = amortize(13850000, 0.021, 800000, 100000)
  assert.equal(early.length, 5)
  assert.equal(early[early.length - 1].closing, 0)
  assert.ok(early[early.length - 1].accumulated < standard[standard.length - 1].accumulated)
  assert.ok(extra.length < standard.length)
})

test('forecasts exclude uncertain receivables unless the scenario explicitly includes them', () => {
  assert.equal(forecast(1000000, 2385000, 1, 'Realista'), 1815000)
  assert.equal(forecast(1000000, 2385000, 3, 'Realista', true), 9330000)
  assert.equal(forecast(1000000, 2385000, 3, 'Realista'), 3445000)
})

test('university already paid: records the expense and preserves confirmed bank cash', () => {
  const config = {
    openingCash: 1100000,
    motoPrincipal: 13850000,
    motoMarketValue: 13850000,
    nuAdvance: 2065000,
  }
  const university = {
    ...movement('Gasto', 1100000, 'REC-01-2026-11'),
    balanceAfter: 1100000,
    cashAdjustment: 1100000,
    reconciliationNote: 'Pago ya incluido en el saldo confirmado.',
  }
  const s = summarizeCore([university], '2026-11', config, debts)
  assert.equal(s.cash, 1100000)
  assert.equal(s.expenses, 1100000)
  assert.equal(s.received, 0)
  assert.equal(s.savings, 0)
  assert.equal(s.netWorth, 4920000)
})

test('normal expenses after reconciliation still reduce cash exactly once', () => {
  const config = {
    openingCash: 1100000,
    motoPrincipal: 13850000,
    motoMarketValue: 13850000,
    nuAdvance: 2065000,
  }
  const university = {
    ...movement('Gasto', 1100000),
    balanceAfter: 1100000,
    cashAdjustment: 1100000,
  }
  assert.equal(
    summarizeCore([university, movement('Gasto', 50000)], '2026-11', config, debts).cash,
    1050000,
  )
  assert.equal(summarizeCore([movement('Gasto', 1100000)], '2026-11', config, debts).cash, 0)
})

test('original $1.000.000 opening balance can reconcile the university to $1.100.000, not -$100.000', () => {
  const university = {
    ...movement('Gasto', 1100000),
    balanceAfter: 1100000,
    cashAdjustment: 1200000,
  }
  const s = summarize([university], '2026-11')
  assert.equal(s.cash, 1100000)
  assert.equal(s.received, 0)
  assert.equal(s.expenses, 1100000)
})

test('expected transactions have one durable identity across sessions and devices', () => {
  const a = movementIdentity('workspace', 'REC-01-2026-11', 'TX-request-a')
  const b = movementIdentity('workspace', 'REC-01-2026-11', 'TX-request-b')
  assert.equal(a, b)
  assert.match(a, /^TX-[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/)
  assert.notEqual(a, movementIdentity('workspace', 'REC-01-2026-12', 'TX-request-c'))
  assert.notEqual(a, movementIdentity('other-workspace', 'REC-01-2026-11', 'TX-request-a'))
  assert.equal(movementIdentity('workspace', 'CXC-08', 'TX-partial-one'), 'TX-partial-one')
})
