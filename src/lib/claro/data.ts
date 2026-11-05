import 'server-only'
import { appAuth } from '@/lib/app-auth'
import { toMovement } from '@/collections/Finance'
import type { FinanceData, Fixed } from '@/components/claro/finance'

export async function financeSession() {
  const session = await appAuth.session()
  if (!session) return null
  const { payload, user } = session
  const result = await payload.find({
    collection: 'finance-workspaces',
    overrideAccess: false,
    user,
    limit: 1,
    depth: 0,
  })
  if (!result.docs[0])
    throw new Error('No se encontró tu espacio financiero. Tu información no se ha reemplazado.')
  return { ...session, workspace: result.docs[0] }
}
export async function loadFinanceData(): Promise<FinanceData | null> {
  const session = await financeSession()
  if (!session) return null
  const { payload, user, workspace } = session
  const options = {
    overrideAccess: false as const,
    user,
    depth: 0,
    pagination: false,
    limit: 10000,
    where: { workspace: { equals: workspace.id } },
  }
  const [movements, fixed, goals, loans, months] = await Promise.all([
    payload.find({ ...options, collection: 'finance-movements', sort: 'createdAt' }),
    payload.find({ ...options, collection: 'recurring-expenses', sort: 'recurringKey' }),
    payload.find({ ...options, collection: 'financial-goals', sort: 'goalKey' }),
    payload.find({ ...options, collection: 'receivables', sort: 'loanKey' }),
    payload.find({ ...options, collection: 'finance-months', sort: 'period' }),
  ])
  return {
    name: user.name,
    config: {
      openingCash: workspace.openingCash,
      monthlyIncome: workspace.monthlyIncome,
      motoPrincipal: workspace.motoPrincipal,
      motoMarketValue: workspace.motoMarketValue,
      motoRate: workspace.motoRate,
      nuAdvance: workspace.nuAdvance,
      balanceConfirmedOn: workspace.balanceConfirmedOn,
    },
    movements: movements.docs.map(toMovement),
    fixed: fixed.docs.map((d) => ({
      id: d.recurringKey,
      name: d.name,
      amount: d.amount,
      day: d.day ?? null,
      category: d.category,
      essential: Boolean(d.essential),
      active: Boolean(d.active),
    })),
    goals: goals.docs.map((d) => ({
      id: d.goalKey,
      name: d.name,
      target: d.target,
      monthly: d.monthly,
      deadline: d.deadline.slice(0, 10),
    })),
    loans: loans.docs.map((d) => ({
      id: d.loanKey,
      description: d.description,
      amount: d.amount,
      due: d.due?.slice(0, 10) || '',
      debtor: d.debtor,
    })),
    plans: Object.fromEntries(
      months.docs.map((d) => [
        d.period,
        (d.expenses ?? []).map(
          (f) =>
            ({
              id: f.id,
              name: f.name,
              amount: f.amount,
              day: f.day ?? null,
              category: f.category,
              essential: Boolean(f.essential),
              active: Boolean(f.active),
            }) satisfies Fixed,
        ),
      ]),
    ),
    history: Array.isArray(workspace.history) ? (workspace.history as FinanceData['history']) : [],
  }
}
