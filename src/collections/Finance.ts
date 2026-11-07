import { APIError, type Access, type CollectionConfig, type Field } from 'payload'
import {
  categories,
  methods,
  summarize,
  repaymentBalance,
  type Movement,
  type Loan,
} from '@/components/claro/finance'
import { movementIdentity } from '@/lib/claro/idempotency'

const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'
const ownerRead: Access = ({ req }) => {
  if (req.user?.collection === 'admins') return true
  if (req.user?.collection !== 'users') return false
  return { 'workspace.owner': { equals: req.user.id } }
}
const appWrite: Access = ({ req }) =>
  req.user?.collection === 'users' && req.context.financeWrite === true
const workspaceField: Field = {
  name: 'workspace',
  type: 'relationship',
  relationTo: 'finance-workspaces',
  required: true,
  index: true,
  access: { update: () => false },
}
const base = (slug: string, title: string): CollectionConfig => ({
  slug,
  labels: { singular: title, plural: title },
  admin: { group: 'Mis finanzas', useAsTitle: 'name' },
  access: { read: ownerRead, create: appWrite, update: appWrite, delete: isAdmin },
  fields: [workspaceField],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (req.user?.collection !== 'users') return data
        if (operation === 'update' && originalDoc)
          data!.workspace =
            typeof originalDoc.workspace === 'object'
              ? originalDoc.workspace.id
              : originalDoc.workspace
        const id = typeof data?.workspace === 'object' ? data.workspace.id : data?.workspace
        if (!id) throw new APIError('Falta tu espacio financiero.', 400)
        const workspace = await req.payload.findByID({
          collection: 'finance-workspaces',
          id,
          user: req.user,
          overrideAccess: false,
          depth: 0,
          req,
        })
        if (!workspace) throw new APIError('No tienes acceso a este espacio.', 403)
        return data
      },
    ],
  },
})
const amount = (name = 'amount', label = 'Monto COP'): Field => ({
  name,
  label,
  type: 'number',
  min: 1,
  max: 999999999999,
  required: true,
  validate: (value: unknown) => (Number.isSafeInteger(value) ? true : 'Usa pesos enteros.'),
})

export const FinanceWorkspaces: CollectionConfig = {
  slug: 'finance-workspaces',
  labels: { singular: 'Espacio financiero', plural: 'Espacios financieros' },
  admin: { useAsTitle: 'name', group: 'Mis finanzas' },
  access: {
    read: ({ req }) =>
      req.user?.collection === 'admins'
        ? true
        : req.user?.collection === 'users'
          ? { owner: { equals: req.user.id } }
          : false,
    create: isAdmin,
    update: isAdmin,
    delete: () => false,
  },
  versions: { maxPerDoc: 30 },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'key', type: 'text', required: true, unique: true },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      access: { create: () => false, update: () => false },
    },
    { name: 'openingCash', label: 'Saldo real confirmado COP', type: 'number', required: true },
    { name: 'balanceConfirmedOn', type: 'date', required: true },
    { name: 'monthlyIncome', label: 'Ingreso esperado COP', type: 'number', required: true },
    { name: 'motoPrincipal', type: 'number', required: true },
    { name: 'motoMarketValue', type: 'number', required: true },
    { name: 'motoRate', type: 'number', required: true },
    { name: 'nuAdvance', type: 'number', required: true },
    { name: 'operationalStart', type: 'text', required: true },
    { name: 'notes', type: 'textarea' },
    { name: 'history', label: 'Archivo histórico original (celdas preservadas)', type: 'json' },
  ],
}

const recurringBase = base('recurring-expenses', 'Gastos fijos')
export const RecurringExpenses: CollectionConfig = {
  ...recurringBase,
  versions: { maxPerDoc: 30 },
  fields: [
    workspaceField,
    { name: 'recurringKey', type: 'text', required: true, unique: true },
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    amount(),
    { name: 'day', label: 'Día de pago, sin confirmar si vacío', type: 'number', min: 1, max: 31 },
    { name: 'category', type: 'select', options: categories, required: true },
    { name: 'essential', type: 'checkbox', required: true },
    { name: 'active', type: 'checkbox', required: true },
  ],
}
export const FinancialGoals: CollectionConfig = {
  ...base('financial-goals', 'Metas financieras'),
  versions: { maxPerDoc: 30 },
  fields: [
    workspaceField,
    { name: 'goalKey', type: 'text', required: true, unique: true },
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    amount('target', 'Objetivo COP'),
    { name: 'monthly', type: 'number', min: 0, max: 999999999999, required: true },
    { name: 'deadline', type: 'date', required: true },
  ],
}
export const Receivables: CollectionConfig = {
  ...base('receivables', 'Cuentas por cobrar'),
  admin: { group: 'Mis finanzas', useAsTitle: 'description' },
  fields: [
    workspaceField,
    { name: 'loanKey', type: 'text', required: true, unique: true },
    { name: 'debtor', type: 'text', required: true },
    { name: 'description', type: 'text', required: true },
    amount(),
    { name: 'dateLent', type: 'date' },
    { name: 'due', type: 'date' },
    { name: 'notes', type: 'textarea' },
  ],
}
const snapshotFields: Field[] = [
  { name: 'id', type: 'text', required: true },
  { name: 'name', type: 'text', required: true },
  amount(),
  { name: 'day', type: 'number', min: 1, max: 31 },
  { name: 'category', type: 'text', required: true },
  { name: 'essential', type: 'checkbox' },
  { name: 'active', type: 'checkbox' },
]
export const FinanceMonths: CollectionConfig = {
  ...base('finance-months', 'Meses generados'),
  admin: { group: 'Mis finanzas', useAsTitle: 'period' },
  access: { ...base('finance-months', '').access, update: isAdmin },
  fields: [
    workspaceField,
    {
      name: 'period',
      type: 'text',
      required: true,
      unique: true,
      validate: (value: unknown) =>
        typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value >= '2026-11'
          ? true
          : 'Mes inválido.',
    },
    { name: 'salary', type: 'number', required: true },
    { name: 'expenses', type: 'array', fields: snapshotFields, required: true },
  ],
}

const movementsBase = base('finance-movements', 'Movimientos')
export const FinanceMovements: CollectionConfig = {
  ...movementsBase,
  admin: {
    group: 'Mis finanzas',
    useAsTitle: 'description',
    defaultColumns: ['date', 'type', 'description', 'amount', 'balanceAfter'],
  },
  access: { ...movementsBase.access, update: appWrite, delete: appWrite },
  fields: [
    workspaceField,
    {
      name: 'transactionId',
      type: 'text',
      required: true,
      unique: true,
      access: { update: () => false },
    },
    { name: 'date', type: 'date', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        'Ingreso',
        'Gasto',
        'Abono recibido',
        'Ahorro',
        'Retiro de ahorro',
        'Interés',
        'Inversión',
        'Pago de deuda',
        'Préstamo',
      ],
    },
    { name: 'description', type: 'text', required: true, maxLength: 200 },
    {
      name: 'debtor',
      label: 'Deudor (solo préstamos)',
      type: 'text',
      maxLength: 80,
      access: { update: () => false },
    },
    amount(),
    { name: 'category', type: 'text', required: true, maxLength: 100 },
    { name: 'method', type: 'select', required: true, options: methods },
    { name: 'reference', type: 'text', maxLength: 100 },
    {
      name: 'balanceAfter',
      label: 'Saldo real confirmado después del registro',
      type: 'number',
      min: 0,
      max: 999999999999,
    },
    {
      name: 'cashAdjustment',
      label: 'Conciliación de caja (no es un ingreso)',
      type: 'number',
      access: {
        create: ({ req }) => req.context.financeWrite === true && req.user?.collection === 'users',
        update: () => false,
      },
      admin: { readOnly: true },
    },
    { name: 'reconciliationNote', type: 'text', maxLength: 300 },
  ],
  hooks: {
    beforeValidate: [
      ...(movementsBase.hooks?.beforeValidate ?? []),
      async ({ data, req, operation }) => {
        if (!data || operation !== 'create') return data
        if (!Number.isSafeInteger(data.amount) || data.amount <= 0)
          throw new APIError('El monto debe ser un número positivo de pesos enteros.', 400)
        if (data.type === 'Préstamo' && !String(data.debtor || '').trim())
          throw new APIError('Indica el nombre de quien recibe el préstamo.', 400)
        const id = typeof data.workspace === 'object' ? data.workspace.id : data.workspace
        data.transactionId = movementIdentity(String(id), data.reference || '', data.transactionId)
        const workspace = await req.payload.findByID({
          collection: 'finance-workspaces',
          id,
          user: req.user,
          overrideAccess: req.user?.collection !== 'users',
          depth: 0,
          req,
        })
        const { docs: records } = await req.payload.find({
          collection: 'finance-movements',
          where: { workspace: { equals: id } },
          pagination: false,
          limit: 10000,
          user: req.user,
          overrideAccess: req.user?.collection !== 'users',
          depth: 0,
          req,
        })
        const { docs: loans } = await req.payload.find({
          collection: 'receivables',
          where: { workspace: { equals: id } },
          pagination: false,
          limit: 10000,
          user: req.user,
          overrideAccess: req.user?.collection !== 'users',
          depth: 0,
          req,
        })
        const rows = records.map(toMovement)
        const debtRows: Loan[] = loans.map((d) => ({
          id: d.loanKey,
          description: d.description,
          amount: d.amount,
          due: d.due?.slice(0, 10) || '',
        }))
        const s = summarize(
          rows,
          '9999-12',
          {
            openingCash: workspace.openingCash,
            motoPrincipal: workspace.motoPrincipal,
            motoMarketValue: workspace.motoMarketValue,
            nuAdvance: workspace.nuAdvance,
          },
          debtRows,
        )
        if (
          data.reference &&
          /^(NOM|REC)-/.test(data.reference) &&
          rows.some((m) => m.reference === data.reference)
        )
          throw new APIError('Ese pago esperado ya fue registrado.', 409)
        if (
          data.type === 'Abono recibido' &&
          (!debtRows.some((d) => d.id === data.reference) ||
            data.amount > repaymentBalance(data.reference, rows, debtRows))
        )
          throw new APIError(
            'El abono supera el saldo o el préstamo no pertenece a tu espacio.',
            400,
          )
        if (data.type === 'Retiro de ahorro' && data.amount > s.savings)
          throw new APIError('El retiro supera tus ahorros.', 400)
        if (data.type === 'Pago de deuda' && !['NU', 'MOTO'].includes(data.reference))
          throw new APIError('Selecciona una obligación válida.', 400)
        if (
          data.type === 'Pago de deuda' &&
          data.reference === 'NU' &&
          data.amount > s.liabilities - workspace.motoPrincipal
        )
          throw new APIError('El pago supera el saldo Nu.', 400)
        if (data.balanceAfter !== null && data.balanceAfter !== undefined) {
          if (
            !Number.isSafeInteger(data.balanceAfter) ||
            data.balanceAfter < 0 ||
            !String(data.reconciliationNote || '').trim()
          )
            throw new APIError('Confirma el saldo real y el motivo de la conciliación.', 400)
          const provisional = toMovement({
            ...data,
            transactionId: data.transactionId,
            createdAt: new Date().toISOString(),
          } as Parameters<typeof toMovement>[0])
          delete provisional.balanceAfter
          const after = summarize(
            [...rows, provisional],
            '9999-12',
            {
              openingCash: workspace.openingCash,
              motoPrincipal: workspace.motoPrincipal,
              motoMarketValue: workspace.motoMarketValue,
              nuAdvance: workspace.nuAdvance,
            },
            debtRows,
          )
          data.cashAdjustment = data.balanceAfter - after.cash
        } else {
          data.cashAdjustment = 0
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation === 'create' && doc.type === 'Préstamo') {
          await req.payload.create({
            collection: 'receivables',
            overrideAccess: true,
            req,
            data: {
              workspace: typeof doc.workspace === 'object' ? doc.workspace.id : doc.workspace,
              loanKey: doc.transactionId,
              debtor: doc.debtor || 'Consultar descripción',
              description: doc.description,
              amount: doc.amount,
              dateLent: doc.date,
              notes: 'Creado desde el movimiento ' + doc.transactionId,
            },
          })
        }
      },
    ],
  },
}

export function toMovement(d: {
  transactionId: string
  date: string
  type: string
  description: string
  amount: number
  category: string
  method: string
  reference?: string | null
  createdAt: string
  balanceAfter?: number | null
  cashAdjustment?: number | null
  reconciliationNote?: string | null
}): Movement {
  return {
    id: d.transactionId,
    date: d.date.slice(0, 10),
    type: d.type as Movement['type'],
    description: d.description,
    amount: d.amount,
    category: d.category,
    method: d.method,
    reference: d.reference || '',
    created: d.createdAt,
    balanceAfter: d.balanceAfter,
    cashAdjustment: d.cashAdjustment,
    reconciliationNote: d.reconciliationNote || '',
  }
}
