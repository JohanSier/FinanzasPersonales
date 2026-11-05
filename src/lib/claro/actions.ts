'use server'

import { appAuth } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'
import { financeSession, loadFinanceData } from './data'
import {
  categories,
  methods,
  type FinanceData,
  type Fixed,
  type Goal,
  type Movement,
} from '@/components/claro/finance'
import type { FinanceMovement, RecurringExpense } from '@/payload-types'
import { movementIdentity } from './idempotency'

type Result = { ok: true; data?: FinanceData; message?: string } | { ok: false; error: string }
const fail = (e: unknown): Result => ({
  ok: false,
  error:
    e instanceof Error && !/password|hash|salt|JWT|token/i.test(e.message)
      ? e.message
      : 'No se pudo guardar. Revisa los datos e inténtalo de nuevo.',
})
const string = (x: unknown, max = 200) => (typeof x === 'string' ? x.trim().slice(0, max) : '')
const integer = (x: unknown, min = 1) =>
  typeof x === 'number' && Number.isSafeInteger(x) && x >= min && x <= 999999999999
function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  )
}

export async function signIn(input: { email: string; password: string }): Promise<Result> {
  try {
    const email = string(input.email, 254).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof input.password !== 'string')
      return { ok: false, error: 'Revisa el correo y la contraseña.' }
    await appAuth.login(email, input.password)
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'Correo o contraseña incorrectos. Si hubo varios intentos, espera unos minutos.',
    }
  }
}
export async function createAccount(input: {
  email: string
  password: string
  name: string
}): Promise<Result> {
  try {
    const email = string(input.email, 254).toLowerCase(),
      name = string(input.name, 80)
    if (
      !name ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof input.password !== 'string' ||
      input.password.length < 10 ||
      input.password.length > 128
    )
      return {
        ok: false,
        error: 'Escribe tu nombre, un correo válido y una contraseña de 10 a 128 caracteres.',
      }
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'users',
      overrideAccess: false,
      context: { appSignup: true },
      data: { email, password: input.password, name, ownerKey: 'personal-owner' },
    })
    await appAuth.login(email, input.password)
    return { ok: true }
  } catch {
    return {
      ok: false,
      error:
        'No se pudo activar la cuenta. Si ya configuraste tu espacio, inicia sesión con tu correo.',
    }
  }
}
export async function signOut(): Promise<Result> {
  try {
    await appAuth.logout()
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo cerrar la sesión. Inténtalo de nuevo.' }
  }
}
export async function refreshSession(): Promise<Result> {
  try {
    return (await appAuth.refresh())
      ? { ok: true }
      : { ok: false, error: 'Vuelve a iniciar sesión.' }
  } catch {
    return { ok: false, error: 'Vuelve a iniciar sesión.' }
  }
}
async function updated(): Promise<Result> {
  const data = await loadFinanceData()
  return data
    ? { ok: true, data }
    : { ok: false, error: 'Tu sesión terminó. Inicia sesión de nuevo.' }
}
export async function saveMovement(input: Movement): Promise<Result> {
  try {
    const session = await financeSession()
    if (!session) return { ok: false, error: 'Inicia sesión para guardar tu movimiento.' }
    const { payload, user, workspace } = session
    const types = [
      'Ingreso',
      'Gasto',
      'Abono recibido',
      'Ahorro',
      'Retiro de ahorro',
      'Interés',
      'Inversión',
      'Pago de deuda',
      'Préstamo',
    ]
    if (
      !/^TX-[a-f0-9-]{36}$/i.test(input.id) ||
      !validDate(input.date) ||
      input.date < '2026-11-01' ||
      !types.includes(input.type) ||
      !integer(input.amount) ||
      !string(input.description) ||
      !methods.includes(input.method)
    )
      return { ok: false, error: 'Revisa el monto, la fecha, el tipo y la descripción.' }
    if (
      input.balanceAfter !== undefined &&
      input.balanceAfter !== null &&
      (!integer(input.balanceAfter, 0) || !string(input.reconciliationNote))
    )
      return { ok: false, error: 'Indica tu saldo real y por qué estás conciliando este pago.' }
    const transactionId = movementIdentity(
      String(workspace.id),
      string(input.reference, 100),
      input.id,
    )
    const duplicate = await payload.find({
      collection: 'finance-movements',
      user,
      overrideAccess: false,
      where: { transactionId: { equals: transactionId } },
      limit: 1,
    })
    if (!duplicate.docs.length) {
      await payload.create({
        collection: 'finance-movements',
        overrideAccess: false,
        user,
        context: { financeWrite: true },
        data: {
          workspace: workspace.id,
          transactionId,
          date: input.date + 'T12:00:00.000Z',
          type: input.type,
          description: string(input.description),
          amount: input.amount,
          category: string(input.category, 100) || 'Otros',
          method: input.method as FinanceMovement['method'],
          reference: string(input.reference, 100),
          balanceAfter: input.balanceAfter ?? null,
          reconciliationNote: string(input.reconciliationNote, 300),
        },
      })
    }
    return await updated()
  } catch (e) {
    return fail(e)
  }
}
export async function saveFixed(input: Fixed): Promise<Result> {
  try {
    const session = await financeSession()
    if (!session) return { ok: false, error: 'Tu sesión terminó.' }
    if (
      !/^REC-[A-Za-z0-9-]+$/.test(input.id) ||
      !string(input.name, 120) ||
      !integer(input.amount) ||
      !categories.includes(input.category) ||
      typeof input.active !== 'boolean' ||
      typeof input.essential !== 'boolean' ||
      (input.day !== null && (!Number.isInteger(input.day) || input.day < 1 || input.day > 31))
    )
      return { ok: false, error: 'Revisa el nombre, el monto, la categoría y el día de pago.' }
    const { payload, user, workspace } = session
    const found = await payload.find({
      collection: 'recurring-expenses',
      user,
      overrideAccess: false,
      where: { recurringKey: { equals: input.id } },
      limit: 1,
    })
    const data = {
      name: string(input.name, 120),
      amount: input.amount,
      category: input.category as RecurringExpense['category'],
      day: input.day,
      essential: input.essential,
      active: input.active,
    }
    if (found.docs[0])
      await payload.update({
        collection: 'recurring-expenses',
        id: found.docs[0].id,
        user,
        overrideAccess: false,
        context: { financeWrite: true },
        data,
      })
    else
      await payload.create({
        collection: 'recurring-expenses',
        user,
        overrideAccess: false,
        context: { financeWrite: true },
        data: { ...data, workspace: workspace.id, recurringKey: input.id },
      })
    return await updated()
  } catch (e) {
    return fail(e)
  }
}
export async function saveGoal(input: Goal): Promise<Result> {
  try {
    const session = await financeSession()
    if (!session) return { ok: false, error: 'Tu sesión terminó.' }
    if (
      !/^META-[A-Za-z0-9-]+$/.test(input.id) ||
      !string(input.name, 120) ||
      !integer(input.target) ||
      !integer(input.monthly, 0) ||
      !validDate(input.deadline)
    )
      return { ok: false, error: 'Revisa el objetivo, la fecha y el aporte mensual.' }
    const { payload, user, workspace } = session
    const found = await payload.find({
      collection: 'financial-goals',
      user,
      overrideAccess: false,
      where: { goalKey: { equals: input.id } },
      limit: 1,
    })
    const data = {
      name: string(input.name, 120),
      target: input.target,
      monthly: input.monthly,
      deadline: input.deadline + 'T12:00:00.000Z',
    }
    if (found.docs[0])
      await payload.update({
        collection: 'financial-goals',
        id: found.docs[0].id,
        user,
        overrideAccess: false,
        context: { financeWrite: true },
        data,
      })
    else
      await payload.create({
        collection: 'financial-goals',
        user,
        overrideAccess: false,
        context: { financeWrite: true },
        data: { ...data, workspace: workspace.id, goalKey: input.id },
      })
    return await updated()
  } catch (e) {
    return fail(e)
  }
}
export async function generateMonth(period: string): Promise<Result> {
  try {
    const session = await financeSession()
    if (!session) return { ok: false, error: 'Tu sesión terminó.' }
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) ||
      period < '2026-11' ||
      Number(period.slice(0, 4)) > 9999
    )
      return { ok: false, error: 'Selecciona un mes válido.' }
    const { payload, user, workspace } = session
    const exists = await payload.find({
      collection: 'finance-months',
      user,
      overrideAccess: false,
      where: { period: { equals: period } },
      limit: 1,
    })
    if (exists.docs.length)
      return {
        ...(await updated()),
        message: 'Este mes ya existe. No se generaron duplicados.',
      } as Result
    const current = await loadFinanceData()
    if (!current) return { ok: false, error: 'Vuelve a iniciar sesión.' }
    await payload.create({
      collection: 'finance-months',
      user,
      overrideAccess: false,
      context: { financeWrite: true },
      data: {
        workspace: workspace.id,
        period,
        salary: workspace.monthlyIncome,
        expenses: current.fixed,
      },
    })
    const result = await updated()
    return result.ok
      ? { ...result, message: 'Mes guardado. Tu historial y tus saldos se mantienen.' }
      : result
  } catch (e) {
    return fail(e)
  }
}
