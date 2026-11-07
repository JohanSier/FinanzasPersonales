'use client'

import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveMovement,
  updateMovement,
  saveFixed,
  saveGoal,
  saveLoan,
  deleteMovement,
  generateMonth,
  saveAccountBalances,
} from '@/lib/claro/actions'
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ArrowUpDown,
  Wallet,
  Landmark,
  CreditCard,
  HandCoins,
  PiggyBank,
  TrendingUp,
  FolderKanban,
  Bike,
  Target,
  ChartNoAxesCombined,
  CalendarDays,
  Settings2,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Download,
  Search,
  ArrowRight,
  Check,
  CheckCheck,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  X,
  Menu,
  FileArchive,
  Clock3,
  CircleDollarSign,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Ellipsis,
  CircleCheck,
  Pencil,
  Trash2,
  CircleAlert,
  CloudCheck,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import {
  cop,
  months,
  categories,
  methods,
  accounts,
  accountFor,
  methodForAccount,
  selectableMethods,
  summarize as calculateSummary,
  repaymentBalance as calculateRepaymentBalance,
  amortize,
  forecast,
  goalBalance,
  type Movement,
  type MovementType,
  type Fixed,
  type Goal,
  type Loan,
  type FinanceData,
} from './finance'
import { Panel, Badge, IconTile, Empty, Modal, Note, Progress } from './components'
import { userGuide } from './automation'

const downloadWorkbook = async (
  ...args: Parameters<typeof import('./workbook').downloadWorkbook>
) => (await import('./workbook')).downloadWorkbook(...args)
const downloadAutomation = async () => (await import('./workbook')).downloadAutomation()

const primaryNav: {
  title: string
  items: {
    name: string
    icon: LucideIcon
    count?: string
  }[]
}[] = [
  {
    title: 'GENERAL',
    items: [
      { name: 'Resumen', icon: LayoutDashboard },
      { name: 'Movimientos', icon: ArrowLeftRight },
      { name: 'Quincenas', icon: CalendarDays },
    ],
  },
  {
    title: 'MI DINERO',
    items: [
      { name: 'Ingresos', icon: ArrowDownLeft },
      { name: 'Gastos', icon: ArrowUpRight },
      { name: 'Próximos Gastos', icon: RefreshCw },
      { name: 'Cuentas por cobrar', icon: HandCoins, count: '8' },
      { name: 'Cuentas por pagar', icon: CreditCard },
    ],
  },
  {
    title: 'MI FUTURO',
    items: [
      { name: 'Ahorros y cajitas', icon: PiggyBank },
      { name: 'Inversiones', icon: TrendingUp },
      { name: 'Proyectos', icon: FolderKanban },
      { name: 'Mi moto', icon: Bike },
      { name: 'Metas financieras', icon: Target },
    ],
  },
  {
    title: 'ANÁLISIS',
    items: [
      { name: 'Patrimonio', icon: Landmark },
      { name: 'Proyecciones', icon: ChartNoAxesCombined },
      { name: 'Reportes', icon: FileSpreadsheet },
    ],
  },
]
const descriptions: Record<string, string> = {
  Movimientos: 'Cada movimiento cuenta. Todo tu dinero, en un solo lugar.',
  Ingresos: 'Distingue lo que esperas de lo que ya está en tu cuenta.',
  Gastos: 'Entiende en qué se va tu dinero, sin perder el detalle.',
  'Próximos Gastos': 'Menos sorpresas. Más control sobre tus compromisos.',
  Quincenas: 'Dale un propósito a cada quincena, antes de gastarla.',
  'Cuentas por cobrar': 'Lo que te deben también importa. Pero todavía no es efectivo.',
  'Cuentas por pagar': 'Un plan claro para vivir con menos deudas.',
  'Ahorros y cajitas': 'Pequeños pasos hoy. Más tranquilidad mañana.',
  Inversiones: 'Haz crecer tu patrimonio con decisiones informadas.',
  Proyectos: 'Invierte en las ideas que pueden construir tu futuro.',
  'Mi moto': 'Disfruta el camino. Ten claro cuánto cuesta.',
  'Metas financieras': 'Ponle fecha y un plan a lo que quieres lograr.',
  Patrimonio: 'La foto completa de tu salud financiera.',
  Proyecciones: 'Explora tu futuro sin confundir supuestos con certezas.',
  Reportes: 'Convierte tus números en mejores decisiones.',
  'Archivo histórico': 'Tu historia está a salvo. Sin inventar lo que falta.',
}
const dateLabel = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  })

export default function App({
  data,
  onData,
  onSignOut,
}: {
  data: FinanceData
  onData: (data: FinanceData) => void
  onSignOut: () => Promise<void>
}) {
  const router = useRouter()
  const config = data.config
  const history = data.history
  const debts = data.loans
  const summarize = (rows: Movement[], period: string) =>
    calculateSummary(rows, period, config, debts)
  const repaymentBalance = (id: string, rows: Movement[]) =>
    calculateRepaymentBalance(id, rows, debts)
  const [page, setPage] = useState('Resumen')
  const [month, setMonth] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 7),
  )
  const movements = data.movements
  const fixed = page === 'Próximos Gastos' || page === 'Proyecciones' ? data.fixed : (data.plans[month] ?? data.fixed)
  const goals = data.goals
  const [modal, setModal] = useState<
    | 'transaction'
    | 'download'
    | 'guide'
    | 'month'
    | 'goal'
    | 'fixed'
    | 'loan'
    | 'edit-movement'
    | 'balances'
    | 'notifications'
    | 'account'
    | null
  >(null)
  const [type, setType] = useState<MovementType>('Gasto')
  const [reference, setReference] = useState('')
  const [editFixed, setEditFixed] = useState<Fixed | null>(null)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [editLoan, setEditLoan] = useState<Loan | null>(null)
  const [editMovement, setEditMovement] = useState<Movement | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [toastError, setToastError] = useState(false)
  const [search, setSearch] = useState('')
  const [sidebar, setSidebar] = useState(false)
  const [scenario, setScenario] = useState('Realista')
  const [fatherEarly, setFatherEarly] = useState(false)
  const [motoEarly, setMotoEarly] = useState(false)
  const [chartView, setChartView] = useState('Mes')
  const [loanSort, setLoanSort] = useState<'oldest' | 'newest'>('oldest')
  const [movementSort, setMovementSort] = useState<'oldest' | 'recent'>('recent')
  const [period, setPeriod] = useState(1)
  const generated = Object.keys(data.plans)
  const plans = data.plans
  const [saving, setSaving] = useState(false)
  const [reconcile, setReconcile] = useState(false)
  const [entryAmount, setEntryAmount] = useState(0)
  const [entryMethod, setEntryMethod] = useState(methods[0])
  const [entryAccount, setEntryAccount] = useState(accounts[2])
  const [entryFrom, setEntryFrom] = useState('Bancolombia')
  const [confirmedBalance, setConfirmedBalance] = useState(0)
  const inFlight = useRef(false)
  const transactionKey = useRef('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const s = summarize(movements, month)
  const monthly = movements.filter((m) => m.date.startsWith(month))
  const isFixedPaid = (f: Fixed) =>
    monthly.some(
      (m) =>
        m.reference === `${f.id}-${month}` ||
        (f.id === 'REC-05' && m.type === 'Pago de deuda' && m.reference === 'MOTO'),
    )
  const totalFixed = fixed.filter((f) => f.active).reduce((a, f) => a + f.amount, 0)
  const essential = fixed.filter((f) => f.active && f.essential).reduce((a, f) => a + f.amount, 0)
  const declaredAccountTotal = ['Efectivo', 'Caja Fuerte', 'Nequi', 'Nu'].reduce(
    (a, k) => a + (config.accountBalances?.[k] || 0),
    0,
  )
  const debtAllocation = fixed
    .filter((f) => f.active && f.id === 'REC-05')
    .reduce((a, f) => a + f.amount, 0)
  const distribution = [
    Math.max(0, essential - debtAllocation),
    debtAllocation,
    totalFixed - essential,
  ]
  const arc = (i: number) => (totalFixed ? (distribution[i] / totalFixed) * 440 : 0)
  const matchedFixed = fixed.find((f) => reference === `${f.id}-${month}`)
  const salaryReference = reference.startsWith('NOM-')
  const salaryReceived = monthly
    .filter((m) => m.type === 'Ingreso' && m.category === 'Salario')
    .reduce((a, m) => a + m.amount, 0)
  const remainingIncome = Math.max(0, config.monthlyIncome - salaryReceived)
  const pendingFixed = fixed
    .filter(
      (f) =>
        f.active &&
        !monthly.some(
          (m) =>
            m.reference === `${f.id}-${month}` ||
            (f.id === 'REC-05' && m.type === 'Pago de deuda' && m.reference === 'MOTO'),
        ),
    )
    .reduce((a, f) => a + f.amount, 0)
  const projectionHorizon = chartView === 'Trimestre' ? 3 : 1
  const closingProjection =
    s.cash +
    remainingIncome -
    pendingFixed +
    (projectionHorizon - 1) * (config.monthlyIncome - totalFixed)
  const reportedUniversityDate = new Date(new Date(config.balanceConfirmedOn).getTime() - 86400000).toLocaleDateString('en-CA', {
    timeZone: 'America/Bogota',
  })
  const defaultDate =
    matchedFixed?.id === 'REC-01' && reportedUniversityDate.startsWith(month)
      ? reportedUniversityDate
      : matchedFixed?.day
        ? `${month}-${String(matchedFixed.day).padStart(2, '0')}`
        : salaryReference
          ? `${month}-${reference.slice(-2)}`
          : new Date().toLocaleDateString('en-CA').startsWith(month)
            ? new Date().toLocaleDateString('en-CA')
            : `${month}-01`
  const [year, monthNum] = month.split('-').map(Number)
  const loans = [...debts].sort((a, b) =>
    loanSort === 'oldest'
      ? (a.dateLent || '9999-12-31').localeCompare(b.dateLent || '9999-12-31')
      : (b.dateLent || '0000-01-01').localeCompare(a.dateLent || '0000-01-01'),
  )
  const currentGoalBalance = (id: string) =>
    goalBalance(
      id,
      movements.filter((m) => m.date.slice(0, 7) <= month),
    )
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModal(null)
        setSidebar(false)
      }
      if (
        e.key.toLowerCase() === 'n' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(
          e.target instanceof HTMLElement &&
          e.target.closest('input, select, textarea, [contenteditable]')
        )
      ) {
        e.preventDefault()
        setType('Gasto')
        setReference('')
        setReconcile(false)
        setEntryAmount(0)
        transactionKey.current = 'TX-' + crypto.randomUUID().toUpperCase()
        setModal('transaction')
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])
  const notify = (message: string, error = false) => {
    setToast(message)
    setToastError(error)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 5000)
  }
  const navigate = (p: string) => {
    setPage(p)
    setSidebar(false)
    setSearch('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openTransaction = (t: MovementType = 'Gasto', ref = '') => {
    setType(t)
    setReference(ref)
    setReconcile(t === 'Gasto' && ref === `REC-01-${reportedUniversityDate.slice(0, 7)}`)
    transactionKey.current = 'TX-' + crypto.randomUUID().toUpperCase()
    const preset = fixed.find((f) => ref === `${f.id}-${month}`)
    setEntryAmount(preset?.amount || (ref.startsWith('NOM-') ? config.monthlyIncome / 2 : 0))
    setEntryMethod(preset?.id === 'REC-04' ? 'Tarjeta Nu' : methods[0])
    setEntryAccount(t === 'Retiro' ? 'Efectivo' : accountFor(preset?.id === 'REC-04' ? 'Tarjeta Nu' : methods[0]))
    setEntryFrom('Bancolombia')
    setConfirmedBalance(s.cash)
    setModal('transaction')
  }
  const commit = async (
    operation: () => Promise<{ ok: boolean; data?: FinanceData; error?: string; message?: string }>,
    success: string,
  ) => {
    if (inFlight.current) return false
    inFlight.current = true
    setSaving(true)
    try {
      const result = await operation()
      if (!result.ok || !result.data) {
        notify(result.error || 'No se pudo guardar. Intenta de nuevo.', true)
        return false
      }
      onData(result.data)
      router.refresh()
      notify(result.message || success)
      return true
    } catch {
      notify(
        'No se pudo conectar. El formulario se mantiene abierto para que puedas reintentar.',
        true,
      )
      return false
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }
  const download = async () => {
    setBusy(true)
    try {
      await downloadWorkbook(movements, fixed, goals, month, plans, data)
      notify('Tu sistema financiero está listo. Revisa tus descargas.')
    } catch {
      notify('No se pudo generar el archivo. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }
  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const d = new FormData(event.currentTarget)
    const amount = Number(d.get('amount'))
    const ref = String(d.get('reference') || '')
    const fromAccount =
      type === 'Retiro' ? String(d.get('fromAccount') || 'Bancolombia') : ''
    if (!Number.isFinite(amount) || amount <= 0) return
    if (
      reference &&
      (reference.startsWith('NOM-') || reference.startsWith('REC-')) &&
      movements.some((m) => m.reference === reference)
    ) {
      notify('Esta expectativa ya tiene un movimiento confirmado. No se creó un duplicado.')
      return
    }
    if (type === 'Abono recibido' && amount > repaymentBalance(ref, movements)) {
      notify('El abono no puede superar el saldo pendiente.')
      return
    }
    if (type === 'Retiro de ahorro' && amount > s.savings) {
      notify('El retiro supera el saldo de tus ahorros.')
      return
    }
    if (type === 'Retiro' && amount > (s.cashByAccount[fromAccount] ?? 0)) {
      notify(`El movimiento supera tu saldo en ${fromAccount}.`)
      return
    }
    if (
      type === 'Pago de deuda' &&
      ref === 'NU' &&
      amount >
        config.nuAdvance +
          movements
            .filter((m) => m.method === 'Tarjeta Nu' && m.type === 'Gasto')
            .reduce((a, m) => a + m.amount, 0) -
          movements
            .filter((m) => m.type === 'Pago de deuda' && m.reference === 'NU')
            .reduce((a, m) => a + m.amount, 0)
    ) {
      notify('El pago supera el saldo de la tarjeta.')
      return
    }
    const record: Movement = {
      id: transactionKey.current || 'TX-' + crypto.randomUUID().toUpperCase(),
      date: String(d.get('date')),
      type,
      description:
        type === 'Retiro'
          ? `De ${fromAccount} a ${String(d.get('account') || 'Efectivo')}`
          : String(d.get('description')).trim(),
      amount,
      category:
        type === 'Retiro' ? 'Transferencias' : String(d.get('category') || 'Otros'),
      method: type === 'Retiro' ? methodForAccount(fromAccount) : String(d.get('method')),
      account: String(d.get('account')),
      ...(type === 'Retiro' ? { fromAccount } : {}),
      reference: ref,
      created: new Date().toISOString(),
      ...(type === 'Préstamo' ? { debtor: String(d.get('debtor') || '').trim() } : {}),
      ...(reconcile
        ? {
            balanceAfter: Number(d.get('balanceAfter')),
            reconciliationNote:
              'Movimiento ya incluido en el saldo bancario confirmado por el usuario.',
          }
        : {}),
    }
    if (!record.description) return
    if (type === 'Préstamo' && !record.debtor) {
      notify('Indica el nombre de quien recibe el préstamo.')
      return
    }
    if (
      await commit(
        () => saveMovement(record),
        reconcile
          ? 'Gasto guardado y saldo real conciliado. No se descontó dos veces.'
          : 'Movimiento guardado en tu base de datos.',
      )
    )
      setModal(null)
  }
  const editFixedSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const d = new FormData(event.currentTarget)
    const item: Fixed = {
      id: editFixed?.id || 'REC-' + crypto.randomUUID().slice(0, 6),
      name: String(d.get('name')),
      amount: Number(d.get('amount')),
      day: d.get('day') ? Number(d.get('day')) : null,
      category: String(d.get('category')),
      essential: d.get('essential') === 'on',
      active: true,
    }
    if (
      await commit(
        () => saveFixed(item),
        'Gasto fijo guardado. Los meses anteriores conservan sus importes.',
      )
    )
      setModal(null)
  }
  const loanSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const d = new FormData(event.currentTarget)
    const item = {
      id: editLoan?.id || '',
      description: String(d.get('description')),
      debtor: String(d.get('debtor')),
      amount: Number(d.get('amount')),
      dateLent: String(d.get('dateLent') || ''),
      due: String(d.get('due') || ''),
    }
    if (
      await commit(() => saveLoan(item), 'Préstamo actualizado. Los abonos registrados se conservan.')
    )
      setModal(null)
  }
  const editMovementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const d = new FormData(event.currentTarget)
    if (!editMovement) return
    const item: Movement = {
      ...editMovement,
      date: String(d.get('date')),
      description: String(d.get('description')).trim(),
      amount: Number(d.get('amount')),
      category: String(d.get('category') || 'Otros'),
      method: String(d.get('method')),
      account: String(d.get('account')),
      fromAccount: String(d.get('fromAccount') || ''),
    }
    if (item.type === 'Retiro') {
      item.method = methodForAccount(item.fromAccount || 'Bancolombia')
      item.category = 'Transferencias'
      item.description = `De ${item.fromAccount || 'Bancolombia'} a ${item.account || 'Efectivo'}`
    }
    if (await commit(() => updateMovement(item), 'Movimiento actualizado.')) setModal(null)
  }
  const stat = (
    label: string,
    value: number,
    icon: LucideIcon,
    sub: string,
    tone = 'green',
    extra?: string,
    dark = false,
    children?: React.ReactNode,
  ) => (
    <article className={`stat-card${dark ? ' dark' : ''}`}>
      <div className="stat-top">
        <span>{label}</span>
        <IconTile icon={icon} tone={tone} />
      </div>
      <div className="stat-number">
        {cop(value)}
        <span>COP</span>
      </div>
      <div className="stat-bottom">
        {extra ? <Badge tone={tone}>{extra}</Badge> : <span className={`stat-dot ${tone}`} />}
        <span>{sub}</span>
      </div>
      {children}
    </article>
  )
  const actionButton = (label = 'Nuevo movimiento', t: MovementType = 'Gasto') => (
    <button className="button primary" onClick={() => openTransaction(t)}>
      <Plus size={17} />
      {label}
    </button>
  )
  const table = (headers: string[], rows: React.ReactNode[][]) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} data-label={headers[j]}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
  const movementTable = (rows: Movement[]) =>
    rows.length ? (
      table(
        ['Movimiento', 'Categoría', 'Fecha', 'Método', 'Monto', 'Estado', ''],
        rows
          .filter((m) =>
            (m.description + m.category + m.type).toLowerCase().includes(search.toLowerCase()),
          )
          .map((m) => [
            <div className="table-name">
              <IconTile
                icon={
                  m.type === 'Préstamo'
                    ? HandCoins
                    : ['Ingreso', 'Abono recibido', 'Interés'].includes(m.type)
                      ? ArrowUpRight
                      : ArrowDownLeft
                }
                tone={
                  ['Ingreso', 'Abono recibido', 'Interés'].includes(m.type)
                    ? 'green'
                    : m.type === 'Gasto'
                      ? 'red'
                      : m.type === 'Préstamo'
                        ? 'yellow'
                        : 'neutral'
                }
              />
              <span>
                <strong>{m.description}</strong>
                <span className="detail">{m.type}</span>
              </span>
            </div>,
            m.category,
            dateLabel(m.date),
            m.method,
            <strong className={['Ingreso', 'Abono recibido'].includes(m.type) ? 'green-text' : ''}>
              {cop(m.amount)}
            </strong>,
            <Badge tone="green">Confirmado</Badge>,
            m.type === 'Préstamo' ? null : (
              <button
                className="text-button"
                onClick={() => {
                  setEditMovement(m)
                  setModal('edit-movement')
                }}
              >
                Editar <Pencil size={13} />
              </button>
            ),
          ]),
      )
    ) : (
      <Empty
        icon={ArrowLeftRight}
        title="Tu historia comienza con un movimiento"
        text="Registra tu primer ingreso o gasto. Aquí verás solo operaciones reales, nunca proyecciones."
        action={
          <button className="button secondary small" onClick={() => openTransaction()}>
            Registrar mi primer movimiento <ArrowRight size={15} />
          </button>
        }
      />
    )

  const renderDashboard = () => (
    <>
      <section
        aria-label="Tu saldo disponible"
        className="mobile-hero overflow-hidden rounded-[24px] bg-[#245e43] p-6 text-white shadow-[0_12px_30px_#245e4315] min-[681px]:hidden"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#c8ddbb]">Tu dinero disponible</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[9px] text-[#c6ddb7]">
            <CloudCheck size={12} />
            Guardado en la nube
          </span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <strong className="font-[Manrope] text-[38px] leading-tight font-semibold tracking-[-1.5px]">
            {cop(s.cash)}
          </strong>
          <span className="text-[10px] text-[#a9c296]">COP</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#b6cea4]">
          <ShieldCheck size={12} />
          Saldo real + movimientos. Nunca dinero esperado.
        </div>
        <div
          className="balance-accounts balance-accounts-edit"
          role="button"
          aria-label="Ajustar saldos por cuenta"
          onClick={() => setModal('balances')}
        >
          {accounts.map((a) => (
            <div key={a} className={a === 'Caja Fuerte' ? 'sub-account' : undefined}>
              <span>
                <i className={`balance-dot ${a.toLowerCase().replace(/\s+/g, '-')}`} />
                {a}
              </span>
              <strong>{cop(s.cashByAccount[a] ?? 0)}</strong>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/12 pt-5">
          {(
            [
              { label: 'Gasto', icon: ArrowUpRight, type: 'Gasto' },
              { label: 'Ingreso', icon: ArrowDownLeft, type: 'Ingreso' },
              { label: 'Ahorrar', icon: PiggyBank, type: 'Ahorro' },
            ] as const
          ).map((a) => (
            <button
              key={a.label}
              onClick={() => openTransaction(a.type)}
              className="flex min-h-[66px] flex-col items-center justify-center gap-2 rounded-2xl bg-white/8 text-[11px] text-[#deebd4] active:bg-white/15"
            >
              <a.icon size={19} strokeWidth={1.7} />
              {a.label}
            </button>
          ))}
        </div>
      </section>
      {month === reportedUniversityDate.slice(0, 7) && fixed.some((f) => f.id === 'REC-01') &&
        !monthly.some((m) => m.reference === `REC-01-${month}`) && (
          <button
            onClick={() => openTransaction('Gasto', `REC-01-${month}`)}
            className="university-banner flex w-full items-center gap-3 rounded-2xl border border-[#e5e8d7] bg-[#f4f5e9] p-4 text-left transition active:bg-[#e8f0df] sm:gap-4 sm:px-5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e0e7cd] bg-[#eaf0db] text-[#8ba66b]">
              <Landmark size={20} strokeWidth={1.5} />
            </span>
            <span className="flex-1">
              <span className="block text-[11px] font-semibold text-[#6b8053] sm:text-xs">
                Tu universidad, sin descontar dos veces.
              </span>
              <span className="mt-1 block text-[10px] leading-5 text-[#9ba888]">
                Registra el pago ya realizado y confirma tu saldo real.
              </span>
            </span>
            <ArrowRight size={17} className="shrink-0 text-[#8da66c]" />
          </button>
        )}
      <div className="section-label">
        <h2>Tu mes en un vistazo</h2>
        <span>
          <span className="live-dot" />
          Actualizado con tus movimientos
        </span>
      </div>
      <div className="stats-grid" data-dashboard="true">
        {stat(
          'Dinero disponible',
          s.cash,
          Wallet,
          'Saldo inicial + movimientos reales',
          'green',
          undefined,
          true,
          <div
          className="balance-accounts balance-accounts-edit"
          role="button"
          aria-label="Ajustar saldos por cuenta"
          onClick={() => setModal('balances')}
        >
            {accounts.map((a) => (
              <div key={a} className={a === 'Caja Fuerte' ? 'sub-account' : undefined}>
                <span>
                  <i className={`balance-dot ${a.toLowerCase().replace(/\s+/g, '-')}`} />
                  {a}
                </span>
                <strong>{cop(s.cashByAccount[a] ?? 0)}</strong>
              </div>
            ))}
          </div>,
        )}
        {stat(
          'Ingresos del mes',
          s.received,
          ArrowDownLeft,
          `${cop(config.monthlyIncome)} esperados`,
          'blue',
        )}
        {stat('Gastos del mes', s.expenses, ArrowUpRight, `${cop(totalFixed)} previstos`, 'orange')}
        {stat(
          'Patrimonio neto',
          s.netWorth,
          Landmark,
          'Incluye activos no líquidos',
          'purple',
          'Estimado',
        )}
      </div>
      <div className="dashboard-middle">
        <Panel
          title="Tu flujo de caja"
          subtitle="Un panorama de lo que entra, sale y permanece."
          action={
            <div className="segmented">
              {['Mes', 'Trimestre'].map((v) => (
                <button
                  key={v}
                  className={chartView === v ? 'active' : ''}
                  onClick={() => setChartView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          }
        >
          <div className="chart-summary">
            <div>
              <span>
                Saldo proyectado al cierre {chartView === 'Trimestre' ? 'del trimestre' : 'del mes'}
              </span>
              <strong>{cop(closingProjection)}</strong>
            </div>
            <Badge tone="green">
              <TrendingUp size={12} />
              {cop(config.monthlyIncome - totalFixed)} de margen
            </Badge>
          </div>
          <CashChart
            cash={s.cash}
            month={month}
            quarter={chartView === 'Trimestre'}
            totalFixed={totalFixed}
            remainingIncome={remainingIncome}
            pendingFixed={pendingFixed}
            monthlyIncome={config.monthlyIncome}
            loanDue={
              monthly.some((m) => m.type === 'Pago de deuda' && m.reference === 'MOTO')
                ? 0
                : debtAllocation
            }
          />
          <div className="chart-legend">
            <span>
              <i className="legend-line solid" />
              Saldo registrado
            </span>
            <span>
              <i className="legend-line dashed" />
              Proyección de caja
            </span>
            <span className="chart-assumption">No incluye cobros inciertos</span>
          </div>
        </Panel>
        <Panel
          title="Así se distribuye tu mes"
          subtitle="Presupuesto mensual, no gastos realizados."
          action={
            <button
              className="icon-button"
              title="Editar presupuesto"
              onClick={() => navigate('Próximos Gastos')}
            >
              <SlidersHorizontal size={17} />
            </button>
          }
        >
          <div className="donut-wrap">
            <svg viewBox="0 0 190 190" className="donut">
              <circle cx="95" cy="95" r="70" fill="none" stroke="#edf2ef" strokeWidth="22" />
              <circle
                cx="95"
                cy="95"
                r="70"
                fill="none"
                stroke="#18866b"
                strokeWidth="22"
                strokeDasharray={`${Math.max(0, arc(0) - 3)} 440`}
                transform="rotate(-90 95 95)"
              />
              <circle
                cx="95"
                cy="95"
                r="70"
                fill="none"
                stroke="#a8cdb9"
                strokeWidth="22"
                strokeDasharray={`${Math.max(0, arc(1) - 3)} 440`}
                strokeDashoffset={-arc(0)}
                transform="rotate(-90 95 95)"
              />
              <circle
                cx="95"
                cy="95"
                r="70"
                fill="none"
                stroke="#e7b975"
                strokeWidth="22"
                strokeDasharray={`${Math.max(0, arc(2))} 440`}
                strokeDashoffset={-arc(0) - arc(1)}
                transform="rotate(-90 95 95)"
              />
            </svg>
            <div className="donut-label">
              <span>Total previsto</span>
              <strong>{cop(totalFixed)}</strong>
              <small>
                {((totalFixed / config.monthlyIncome) * 100).toLocaleString('es-CO', {
                  maximumFractionDigits: 1,
                })}
                % del ingreso esperado
              </small>
            </div>
          </div>
          <div className="distribution-legend">
            <div>
              <span>
                <i className="bg-[#18866b]" />
                Fijos
              </span>
              <strong>{cop(distribution[0])}</strong>
            </div>
            <div>
              <span>
                <i className="bg-[#a8cdb9]" />
                Pago de deuda
              </span>
              <strong>{cop(debtAllocation)}</strong>
            </div>
            <div>
              <span>
                <i className="bg-[#e7b975]" />
                Personales
              </span>
              <strong>{cop(totalFixed - essential)}</strong>
            </div>
          </div>
          <div className="distribution-bottom">
            <span>Por asignar a tus objetivos</span>
            <strong>{cop(config.monthlyIncome - totalFixed)}</strong>
          </div>
        </Panel>
      </div>
      <div className="dashboard-bottom">
        <Panel
          title="Tus metas, más cerca"
          subtitle="Cada aporte es un paso hacia lo que importa."
          action={
            <button className="text-button" onClick={() => navigate('Metas financieras')}>
              Ver todas <ArrowRight size={14} />
            </button>
          }
        >
          <div className="goal-list">
            {goals.slice(0, 3).map((g, i) => {
              const balance = currentGoalBalance(g.id)
              return (
                <div className="goal-item" key={g.id}>
                  <div className="goal-title">
                    <IconTile
                      icon={[ShieldCheck, Bike, TrendingUp][i]}
                      tone={['green', 'blue', 'purple'][i]}
                    />
                    <div>
                      <strong>{g.name}</strong>
                      <span>
                        {cop(balance)} <i>de {cop(g.target)}</i>
                      </span>
                    </div>
                    <b>{Math.min(100, Math.round((balance / g.target) * 100))}%</b>
                  </div>
                  <Progress
                    value={(balance / g.target) * 100}
                    color={i === 1 ? 'blue' : i === 2 ? 'purple' : 'green'}
                  />
                </div>
              )
            })}
          </div>
        </Panel>
        <Panel
          title="Próximos pagos"
          subtitle="Tus compromisos, siempre a la vista."
          className="upcoming-panel"
          action={
            <button className="text-button" onClick={() => navigate('Próximos Gastos')}>
              Ver todos <ArrowRight size={14} />
            </button>
          }
        >
          <div className="payment-list">
            {[...fixed]
              .filter((f) => f.active)
              .sort((a, b) => (a.day || 99) - (b.day || 99))
              .slice(0, 3)
              .map((f) => {
                const paid = isFixedPaid(f)
                return (
                <div className="payment-item" key={f.id}>
                  <div className="date-tile">
                    {f.day ? (
                      <>
                        <span>{months[monthNum - 1].slice(0, 3).toUpperCase()}</span>
                        <strong>{String(f.day).padStart(2, '0')}</strong>
                      </>
                    ) : (
                      <CalendarDays size={20} />
                    )}
                  </div>
                  <div>
                    <strong>{f.name}</strong>
                    <span>
                      {paid
                        ? 'Pagado este mes'
                        : f.day
                          ? 'Pago mensual · por confirmar'
                          : 'Fecha por definir'}
                    </span>
                  </div>
                  <div>
                    <strong>{cop(f.amount)}</strong>
                    <Badge tone={paid ? 'green' : f.day ? 'orange' : 'neutral'}>
                      {paid ? 'Pagado' : f.day ? 'Pendiente' : 'Sin fecha'}
                    </Badge>
                  </div>
                </div>
                )
              })}
          </div>
          <div className="subtle-foot">
            <Clock3 size={13} /> Son pagos previstos, no movimientos realizados.
          </div>
        </Panel>
        <Panel
          title="Dinero por recibir"
          subtitle="Fuera de tu saldo disponible."
          action={
            <span className="small-arrow">
              <ArrowDownLeft size={18} />
            </span>
          }
        >
          <div className="receivable-highlight">
            <span>Total pendiente</span>
            <strong>{cop(s.receivables)}</strong>
            <Badge tone="neutral">8 conceptos · Padre</Badge>
          </div>
          <div className="expected-callout">
            <span className="expected-icon">
              <CalendarDays size={17} />
            </span>
            <div>
              <strong>Reembolso avance Nu</strong>
              <span>27 nov – 3 dic, 2026</span>
            </div>
            <strong>{cop(repaymentBalance('CXC-08', movements))}</strong>
          </div>
          <button className="button secondary full" onClick={() => navigate('Cuentas por cobrar')}>
            Gestionar cuentas por cobrar <ArrowRight size={15} />
          </button>
        </Panel>
      </div>
      <Panel
        title="Últimos movimientos"
        subtitle="El detalle detrás de tus números."
        action={
          <button className="text-button" onClick={() => navigate('Movimientos')}>
            Ver movimientos <ArrowRight size={14} />
          </button>
        }
        className="recent-panel"
      >
        {monthly.length ? (
          movementTable(
            [...monthly]
              .sort((a, b) => b.date.localeCompare(a.date) || b.created.localeCompare(a.created))
              .slice(0, 5),
          )
        ) : (
          <div className="recent-empty">
            <span className="recent-empty-icon">
              <ArrowLeftRight size={23} />
            </span>
            <div>
              <strong>Este mes es una página en blanco.</strong>
              <p>Registra tu primer movimiento y empieza a ver tu progreso.</p>
            </div>
            <button className="button secondary small" onClick={() => openTransaction()}>
              Registrar movimiento <Plus size={15} />
            </button>
          </div>
        )}
      </Panel>
      <div className="mini-metrics">
        <div>
          <PiggyBank size={17} />
          <span>Ahorros</span>
          <strong>{cop(s.savings)}</strong>
        </div>
        <div>
          <TrendingUp size={17} />
          <span>Inversiones</span>
          <strong>{cop(s.investments)}</strong>
        </div>
        <div>
          <CreditCard size={17} />
          <span>Pasivos estimados</span>
          <strong>{cop(s.liabilities)}</strong>
        </div>
        <div>
          <Target size={17} />
          <span>Tasa de ahorro</span>
          <strong>{s.received ? s.savingsRate.toFixed(1) + '%' : 'Sin ingresos recibidos'}</strong>
        </div>
      </div>
    </>
  )

  const renderPage = () => {
    if (page === 'Resumen') return renderDashboard()
    if (['Movimientos', 'Ingresos', 'Gastos'].includes(page)) {
      const rows = monthly.filter((m) =>
        page === 'Ingresos' ? m.type === 'Ingreso' : page === 'Gastos' ? m.type === 'Gasto' : true,
      )
      const sortedRows = [...rows].sort((a, b) =>
        movementSort === 'recent'
          ? b.date.localeCompare(a.date) || b.created.localeCompare(a.created)
          : a.date.localeCompare(b.date) || a.created.localeCompare(b.created),
      )
      return (
        <>
          <div className="stats-grid three">
            {stat('Ingresos recibidos', s.received, ArrowDownLeft, 'Dinero realmente recibido')}
            {stat('Gastos registrados', s.expenses, ArrowUpRight, 'Consumo del mes', 'orange')}
            {stat('Saldo disponible', s.cash, Wallet, 'No incluye cuentas por cobrar')}
          </div>
          <Panel
            title={
              page === 'Movimientos'
                ? 'Tu actividad financiera'
                : page === 'Ingresos'
                  ? 'Ingresos confirmados'
                  : 'Gastos confirmados'
            }
            action={actionButton(
              page === 'Ingresos'
                ? 'Registrar ingreso'
                : page === 'Gastos'
                  ? 'Registrar gasto'
                  : 'Nuevo movimiento',
              page === 'Ingresos' ? 'Ingreso' : 'Gasto',
            )}
          >
            <div className="table-toolbar">
              <label className="search-input">
                <Search size={17} />
                <input
                  aria-label="Buscar movimientos"
                  placeholder="Buscar un movimiento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="flex items-center gap-3">
                <label className="table-sort">
                  <ArrowUpDown size={15} />
                  <select
                    aria-label="Ordenar movimientos"
                    value={movementSort}
                    onChange={(e) => setMovementSort(e.target.value as 'oldest' | 'recent')}
                  >
                    <option value="oldest">Más antiguos primero</option>
                    <option value="recent">Más recientes primero</option>
                  </select>
                </label>
                <span>
                  {rows.length} movimientos · {months[monthNum - 1]}
                </span>
              </div>
            </div>
            {movementTable(sortedRows)}
          </Panel>
          {page === 'Ingresos' && (
            <Panel
              title="Tu nómina esperada"
              subtitle="No afecta tu saldo hasta que registres el ingreso."
            >
              {table(
                ['Concepto', 'Fecha esperada', 'Monto', 'Estado', 'Acción'],
                [15, Math.min(30, new Date(year, monthNum, 0).getDate())].map((day) => [
                  'Nómina · ' + (day === 15 ? 'primera' : 'segunda') + ' quincena',
                  dateLabel(`${month}-${day}`),
                  cop(config.monthlyIncome / 2),
                  <Badge
                    tone={
                      movements.some((m) => m.reference === `NOM-${month}-${day}`)
                        ? 'green'
                        : 'blue'
                    }
                  >
                    {movements.some((m) => m.reference === `NOM-${month}-${day}`)
                      ? 'Recibido'
                      : 'Esperado'}
                  </Badge>,
                  <button
                    className="text-button"
                    disabled={movements.some((m) => m.reference === `NOM-${month}-${day}`)}
                    onClick={() => openTransaction('Ingreso', `NOM-${month}-${day}`)}
                  >
                    Registrar recibido <Plus size={14} />
                  </button>,
                ]),
              )}
              <Note>
                Salario base: $ 2.340.000 + auxilios: $ 1.260.000. Los abonos de préstamos no se
                contabilizan como salario.
              </Note>
            </Panel>
          )}
        </>
      )
    }
    if (page === 'Próximos Gastos')
      return (
        <>
          <div className="stats-grid three">
            {stat('Compromisos mensuales', totalFixed, RefreshCw, 'Estimaciones editables')}
            {stat('Fijos', essential, ShieldCheck, 'Base para el fondo de emergencia', 'blue')}
            {stat(
              'Margen mensual previsto',
              config.monthlyIncome - totalFixed,
              Wallet,
              'Antes de ahorro y gastos variables',
            )}
          </div>
          <Panel
            title="Próximos gastos"
            subtitle="Programa lo que se repite cada mes."
            action={
              <button
                className="button primary"
                onClick={() => {
                  setEditFixed(null)
                  setModal('fixed')
                }}
              >
                <Plus size={17} />
                Agregar gasto
              </button>
            }
          >
            {table(
              [
                'Concepto',
                'Categoría',
                'Monto mensual',
                'Día de pago',
                'Tipo',
                'Estado',
                'Acciones',
              ],
              fixed.map((f) => [
                <strong>{f.name}</strong>,
                f.category,
                cop(f.amount),
                f.day ? `Día ${f.day}` : 'Por definir',
                f.essential ? 'Fijo' : 'Variable',
                <div className="flex items-center gap-2">
                  {isFixedPaid(f) && (
                    <Badge tone="green">
                      <Check size={10} /> Pagado
                    </Badge>
                  )}
                  <button
                    className={`badge ${f.active ? 'blue' : 'neutral'}`}
                    disabled={saving}
                    onClick={() =>
                      void commit(
                        () => saveFixed({ ...f, active: !f.active }),
                        'Estado del gasto fijo guardado.',
                      )
                    }
                  >
                    {f.active ? 'Activo' : 'Pausado'}
                  </button>
                </div>,
                <div className="button-row">
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditFixed(f)
                      setModal('fixed')
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="text-button"
                    disabled={isFixedPaid(f)}
                    onClick={() =>
                      openTransaction(
                        f.id === 'REC-05' ? 'Pago de deuda' : 'Gasto',
                        f.id === 'REC-05' ? 'MOTO' : `${f.id}-${month}`,
                      )
                    }
                  >
                    Registrar pago <Plus size={13} />
                  </button>
                </div>,
              ]),
            )}
            <Note>
              El transporte en bus fue retirado del presupuesto operativo, pero se conserva en tu
              archivo histórico. La cuota de moto incluye capital e interés; no es totalmente gasto
              de consumo.
            </Note>
          </Panel>
        </>
      )
    if (page === 'Cuentas por cobrar')
      return (
        <>
          <div className="stats-grid three">
            {stat('Pendiente por recibir', s.receivables, HandCoins, 'Activo no líquido')}
            {stat(
              'Abonos recibidos',
              movements
                .filter((m) => m.type === 'Abono recibido')
                .reduce((a, m) => a + m.amount, 0),
              ArrowDownLeft,
              'Ya incluidos en caja',
            )}
            {stat(
              'Reembolso avance Nu',
              repaymentBalance('CXC-08', movements),
              CreditCard,
              '27 nov – 3 dic, 2026',
              'purple',
            )}
          </div>
          <Note>
            El dinero de tu padre destinado a Nu no paga la tarjeta automáticamente. Primero
            registra el abono; después, el pago de la deuda.
          </Note>
          <Panel
            title="Préstamos"
            subtitle="Cada concepto se conserva por separado."
            action={
              <div className="heading-actions">
                <div className="month-select">
                  <ArrowUpDown size={16} />
                  <select
                    aria-label="Ordenar préstamos por fecha"
                    value={loanSort}
                    onChange={(e) => setLoanSort(e.target.value as 'oldest' | 'newest')}
                  >
                    <option value="oldest">Más antiguos primero</option>
                    <option value="newest">Más recientes primero</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
                {actionButton('Registrar préstamo', 'Préstamo')}
              </div>
            }
          >
            {loans.some((d) => repaymentBalance(d.id, movements) > 0) ? (
              table(
                ['Concepto', 'Fecha', 'Monto original', 'Reintegrado', 'Pendiente', 'Pago esperado', ''],
                loans
                  .filter((d) => repaymentBalance(d.id, movements) > 0)
                  .map((d) => [
                <div className="table-name">
                  <IconTile icon={HandCoins} />
                  <span>
                    <strong>{d.debtor || 'Deudor'}</strong>
                    <span className="detail">{d.description}</span>
                  </span>
                </div>,
                d.dateLent
                  ? new Date(d.dateLent + 'T12:00:00').toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—',
                cop(d.amount),
                cop(d.amount - repaymentBalance(d.id, movements)),
                <strong>{cop(repaymentBalance(d.id, movements))}</strong>,
                d.due ? '27 nov – 3 dic 2026' : <Badge>Sin fecha confirmada</Badge>,
                <div className="flex items-center gap-3">
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditLoan(d)
                      setModal('loan')
                    }}
                  >
                    Editar <Pencil size={13} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => openTransaction('Abono recibido', d.id)}
                  >
                    Registrar abono <Plus size={14} />
                  </button>
                </div>,
              ]),
              )
            ) : (
              <Note>No tienes préstamos pendientes por cobrar.</Note>
            )}
          </Panel>
          <Panel title="Historial de abonos">
            {movementTable(movements.filter((m) => m.type === 'Abono recibido'))}
          </Panel>
        </>
      )
    if (page === 'Cuentas por pagar')
      return (
        <>
          <div className="stats-grid three">
            {stat(
              'Pasivos estimados',
              s.liabilities,
              CreditCard,
              'Pendiente conciliación de extractos',
              'orange',
            )}
            {stat(
              'Financiación moto',
              config.motoPrincipal,
              Bike,
              'Saldo inicial provisional',
              'blue',
            )}
            {stat(
              'Nu · saldo pendiente',
              s.liabilities - config.motoPrincipal,
              CreditCard,
              'Avance incluido una sola vez',
              'purple',
            )}
          </div>
          <Panel title="Mis obligaciones" action={actionButton('Registrar pago', 'Pago de deuda')}>
            {table(
              ['Acreedor', 'Concepto', 'Saldo estimado', 'Cuota', 'Vencimiento', ''],
              [
                [
                  <strong>Financiera · por confirmar</strong>,
                  'Suzuki Gixxer SF 150 FI',
                  cop(config.motoPrincipal),
                  cop(800000),
                  'Día 5',
                  <button className="text-button" onClick={() => navigate('Mi moto')}>
                    Ver detalle <ArrowRight size={14} />
                  </button>,
                ],
                [
                  <strong>Nu</strong>,
                  'Avance para padre + compras confirmadas',
                  cop(s.liabilities - config.motoPrincipal),
                  'Por confirmar',
                  'Consultar extracto',
                  <button
                    className="text-button"
                    onClick={() => openTransaction('Pago de deuda', 'NU')}
                  >
                    Registrar pago <Plus size={14} />
                  </button>,
                ],
              ],
            )}
            <Note>
              El saldo moto no se reduce sin confirmar el desglose capital/interés. Completa PAGOS
              DEUDA en el Excel con tu extracto. Límite, corte, interés y fecha de pago Nu están
              pendientes; no se han supuesto valores.
            </Note>
          </Panel>
          <Panel title="Pagos registrados">
            {movementTable(movements.filter((m) => m.type === 'Pago de deuda'))}
          </Panel>
        </>
      )
    if (page === 'Ahorros y cajitas')
      return (
        <>
          <div className="stats-grid three">
            {stat('Total en cajitas', s.savings, PiggyBank, 'Aportes + interés − retiros')}
            {stat(
              'Interés real registrado',
              movements.filter((m) => m.type === 'Interés').reduce((a, m) => a + m.amount, 0),
              TrendingUp,
              'Sin asumir tasas vigentes',
              'blue',
            )}
            {stat(
              'Meta de emergencia',
              essential * 3,
              ShieldCheck,
              'Tres meses de gastos fijos',
              'purple',
            )}
          </div>
          <Panel
            title="Tu tranquilidad tiene un fondo"
            subtitle="Fondo de emergencia · Nu Cajitas"
            action={<Badge tone="green">Prioridad alta</Badge>}
          >
            <div className="savings-feature">
              <div className="savings-illustration">
                <ShieldCheck size={64} strokeWidth={1} />
              </div>
              <div>
                <h2>
                  {cop(s.savings)} <span>de {cop(essential * 3)}</span>
                </h2>
                <Progress value={(s.savings / (essential * 3)) * 100} />
                <div className="savings-detail">
                  <span>{((s.savings / (essential * 3)) * 100).toFixed(1)}% completado</span>
                  <span>Faltan {cop(Math.max(0, essential * 3 - s.savings))}</span>
                </div>
                <p>
                  Con $ 300.000 mensuales: aproximadamente{' '}
                  {Math.ceil(Math.max(0, essential * 3 - s.savings) / 300000)} meses. Meta
                  extendida: {cop(essential * 6)}.
                </p>
                <div className="button-row">
                  {actionButton('Agregar aporte', 'Ahorro')}
                  <button className="button secondary" onClick={() => openTransaction('Interés')}>
                    Registrar interés
                  </button>
                  <button
                    className="text-button"
                    onClick={() => openTransaction('Retiro de ahorro')}
                  >
                    Retirar ahorro
                  </button>
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Actividad de tus ahorros">
            {movementTable(
              movements.filter((m) => ['Ahorro', 'Retiro de ahorro', 'Interés'].includes(m.type)),
            )}
          </Panel>
        </>
      )
    if (page === 'Inversiones')
      return (
        <>
          <div className="stats-grid three">
            {stat('Capital invertido', s.investments, TrendingUp, 'Contribuciones reales')}
            {stat(
              'Valor al costo',
              s.investments,
              Landmark,
              'Actualiza el valor de mercado en Excel',
              'blue',
            )}
            {stat(
              'Rendimiento confirmado',
              0,
              ChartNoAxesCombined,
              'Sin valoraciones de mercado registradas',
              'purple',
            )}
          </div>
          <Panel
            title="Tu portafolio"
            subtitle="Sin precios en vivo ni rentabilidades inventadas."
            action={actionButton('Registrar inversión', 'Inversión')}
          >
            {s.investments ? (
              movementTable(movements.filter((m) => m.type === 'Inversión'))
            ) : (
              <Empty
                icon={TrendingUp}
                title="El futuro de tu patrimonio empieza aquí"
                text="Registra acciones, ETFs u otros instrumentos. Tus aportes se separan de los rendimientos y de tus gastos cotidianos."
                action={actionButton('Mi primera inversión', 'Inversión')}
              />
            )}
          </Panel>
        </>
      )
    if (page === 'Proyectos')
      return (
        <>
          <div className="stats-grid three">
            {stat('Capital en proyectos', 0, FolderKanban, 'Sin inversiones registradas')}
            {stat('Ingresos reales', 0, ArrowDownLeft, 'No incluye proyecciones', 'blue')}
            {stat('Beneficio neto', 0, TrendingUp, 'Ingresos − inversión − operación', 'purple')}
          </div>
          <Panel title="Tu próxima fuente de ingresos">
            <Empty
              icon={FolderKanban}
              title="Las buenas ideas necesitan un plan"
              text="El Excel incluye un registro independiente para cada proyecto: inversión, costos, ingresos reales, proyecciones y ROI. Completa sus datos en la hoja PROYECTOS."
              action={
                <button className="button primary" onClick={() => setModal('download')}>
                  <Download size={17} />
                  Abrir mi plantilla de proyectos
                </button>
              }
            />
          </Panel>
          <Note>
            Una valoración estimada de un negocio nunca se suma a tu efectivo. Este módulo está
            preparado en la hoja de cálculo; no registra proyectos desde la web.
          </Note>
        </>
      )
    if (page === 'Mi moto') {
      const schedule = amortize(
        config.motoPrincipal,
        config.motoRate,
        800000,
        0,
        motoEarly ? 4 : -1,
      )
      const interest = schedule.reduce((a, r) => a + r.interest, 0)
      return (
        <>
          <div className="moto-hero">
            <div>
              <span className="eyebrow">TU COMPAÑERA DE CAMINO</span>
              <h2>Suzuki Gixxer SF 150 FI</h2>
              <p>Modelo 2027 · Valor de referencia {cop(config.motoMarketValue)}</p>
              <Badge tone="blue">Financiación por validar con contrato</Badge>
            </div>
            <Bike size={115} strokeWidth={0.8} />
          </div>
          <div className="stats-grid three">
            {stat(
              'Capital inicial',
              config.motoPrincipal,
              Bike,
              'Saldo real pendiente de confirmar',
              'blue',
            )}
            {stat('Cuota mensual prevista', 800000, CalendarDays, 'Cada día 5 · incluye intereses')}
            {stat(
              'Interés simulado total',
              interest,
              ChartNoAxesCombined,
              `${schedule.length} pagos estimados · tasa 2,1% mensual`,
              'orange',
            )}
          </div>
          <Note>
            La cuota estándar a 24 meses sería aproximadamente{' '}
            {cop(
              (config.motoPrincipal * config.motoRate) / (1 - Math.pow(1 + config.motoRate, -24)),
            )}
            . La cuota de $ 800.000 no equivale exactamente a ese plan. El cronograma parte
            provisionalmente de noviembre 2026 y no sustituye el contrato.
          </Note>
          <Panel
            title="Tu camino a cero deudas"
            subtitle="Simulación, no pagos realizados."
            action={
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={motoEarly}
                  onChange={(e) => setMotoEarly(e.target.checked)}
                />
                Liquidar en marzo 2027
              </label>
            }
          >
            {table(
              ['Cuota', 'Mes', 'Saldo inicial', 'Interés', 'Pago', 'Capital', 'Saldo final'],
              schedule.map((r, i) => [
                i + 1,
                new Date(2026, 10 + i, 5).toLocaleDateString('es-CO', {
                  month: 'short',
                  year: 'numeric',
                }),
                cop(r.opening),
                cop(r.interest),
                cop(r.payment),
                cop(r.principal),
                <strong>{cop(r.closing)}</strong>,
              ]),
            )}
          </Panel>
        </>
      )
    }
    if (page === 'Metas financieras')
      return (
        <>
          <div className="goals-intro">
            <div>
              <Target size={23} />
              <span>No necesitas hacerlo todo hoy. Solo dar el siguiente paso.</span>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setEditGoal(null)
                setModal('goal')
              }}
            >
              <Plus size={17} />
              Crear meta
            </button>
          </div>
          <div className="goals-grid">
            {goals.map((g, i) => {
              const current = currentGoalBalance(g.id)
              return (
                <Panel
                  key={g.id}
                  title={g.name}
                  action={
                    <button
                      className="icon-button"
                      aria-label={`Editar ${g.name}`}
                      onClick={() => {
                        setEditGoal(g)
                        setModal('goal')
                      }}
                    >
                      <Ellipsis size={20} />
                    </button>
                  }
                >
                  <div className="goal-big-icon">
                    <IconTile
                      icon={i === 0 ? ShieldCheck : i === 1 ? Bike : Target}
                      tone={i === 1 ? 'blue' : 'green'}
                    />
                    <Badge tone={i === 0 ? 'orange' : 'neutral'}>
                      {i === 0 ? 'Prioridad alta' : 'En progreso'}
                    </Badge>
                  </div>
                  <h3 className="goal-amount">
                    {cop(current)} <small>de {cop(g.target)}</small>
                  </h3>
                  <Progress value={(current / g.target) * 100} />
                  <div className="savings-detail">
                    <span>{((current / g.target) * 100).toFixed(0)}% completado</span>
                    <span>
                      {dateLabel(g.deadline)} {g.deadline.slice(0, 4)}
                    </span>
                  </div>
                  <div className="goal-monthly">
                    <span>Aporte mensual previsto</span>
                    <strong>{cop(g.monthly)}</strong>
                  </div>
                  <button
                    className="button secondary full"
                    onClick={() =>
                      openTransaction(
                        i === 2 ? 'Inversión' : i === 1 ? 'Pago de deuda' : 'Ahorro',
                        i === 1 ? 'MOTO' : g.id,
                      )
                    }
                  >
                    Dar el siguiente paso <ArrowRight size={15} />
                  </button>
                </Panel>
              )
            })}
          </div>
        </>
      )
    if (page === 'Patrimonio') {
      const assets = s.cash + s.savings + s.investments + s.receivables + config.motoMarketValue
      return (
        <>
          <div className="stats-grid three">
            {stat('Activos totales estimados', assets, Landmark, 'Líquidos y no líquidos')}
            {stat(
              'Pasivos estimados',
              s.liabilities,
              CreditCard,
              'Sin duplicar el avance Nu',
              'orange',
            )}
            {stat(
              'Patrimonio neto estimado',
              s.netWorth,
              ChartNoAxesCombined,
              'Activos menos pasivos',
              'purple',
            )}
          </div>
          <Panel
            title="La foto completa"
            subtitle="La moto se valora provisionalmente al precio de compra. Confirma su valor de mercado."
          >
            {table(
              ['Concepto', 'Clasificación', 'Valor'],
              [
                ['Bancolombia', <Badge tone="green">Efectivo disponible</Badge>, cop(s.cash)],
                ['Nu Cajitas', 'Ahorros', cop(s.savings)],
                ['Portafolio', 'Inversión · al costo', cop(s.investments)],
                ['Dinero que te deben', 'Activo no líquido', cop(s.receivables)],
                [
                  'Moto · valor estimado',
                  <Badge tone="orange">Valor estimado</Badge>,
                  cop(config.motoMarketValue),
                ],
                ['Financiación de moto', 'Pasivo · provisional', '− ' + cop(config.motoPrincipal)],
                ['Tarjeta Nu + avance', 'Pasivo', '− ' + cop(s.liabilities - config.motoPrincipal)],
              ],
            )}
          </Panel>
          <Note>
            Los snapshots mensuales se guardan desde el menú MI FINANZAS en Google Sheets. No se han
            creado saldos históricos de patrimonio a partir de las notas originales.
          </Note>
        </>
      )
    }
    if (page === 'Proyecciones')
      return (
        <>
          <div className="forecast-controls">
            <div>
              <span className="eyebrow">ELIGE UN ESCENARIO</span>
              <div className="segmented">
                {['Conservador', 'Realista', 'Optimista'].map((x) => (
                  <button
                    className={scenario === x ? 'active' : ''}
                    onClick={() => setScenario(x)}
                    key={x}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </div>
            <div className="forecast-toggles">
              <label>
                <input
                  type="checkbox"
                  checked={fatherEarly}
                  onChange={(e) => setFatherEarly(e.target.checked)}
                />
                Mi padre paga todo en el mes 2
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={motoEarly}
                  onChange={(e) => setMotoEarly(e.target.checked)}
                />
                Liquido la moto en marzo 2027
              </label>
            </div>
          </div>
          <div className="stats-grid">
            {[1, 3, 6, 12].map((h) =>
              stat(
                `Caja en ${h === 1 ? '30 días' : h === 3 ? '90 días' : h + ' meses'}`,
                forecast(
                  s.cash,
                  scenario === 'Conservador' ? essential : totalFixed,
                  h,
                  scenario,
                  fatherEarly || scenario === 'Optimista',
                  motoEarly,
                  debts.reduce((a, d) => a + repaymentBalance(d.id, movements), 0),
                ),
                ChartNoAxesCombined,
                'Proyección basada en supuestos',
                h === 12 ? 'purple' : 'green',
              ),
            )}
          </div>
          <Panel
            title="Tus supuestos, a la vista"
            subtitle="Ninguna proyección modifica tus movimientos reales."
          >
            {table(
              ['Variable', 'Supuesto aplicado'],
              [
                ['Salario', '$ 3.600.000 mensuales esperados, no garantizados'],
                [
                  'Gastos recurrentes',
                  cop(scenario === 'Conservador' ? essential : totalFixed) + ' mensuales',
                ],
                [
                  'Ahorro e inversión',
                  scenario === 'Conservador'
                    ? 'Sin asignaciones adicionales'
                    : '$ 400.000 mensuales, reducen caja pero no patrimonio',
                ],
                [
                  'Cobro a padre',
                  fatherEarly || scenario === 'Optimista'
                    ? `${cop(debts.reduce((a, d) => a + repaymentBalance(d.id, movements), 0))} en el mes 2, supuesto no confirmado`
                    : 'Excluido: no se garantiza ningún abono',
                ],
                [
                  'Moto anticipada',
                  motoEarly
                    ? 'Abono del saldo después de la cuota 5; cuotas futuras eliminadas. Modelo desde noviembre 2026.'
                    : 'Cuota de $ 800.000 incluida en fijos',
                ],
                ['Ingresos extra', 'No se han supuesto ingresos sin un monto definido'],
              ],
            )}
          </Panel>
        </>
      )
    if (page === 'Quincenas') {
      const periodRows = monthly.filter((m) => (Number(m.date.slice(-2)) <= 15 ? 1 : 2) === period)
      const before = movements.filter((m) => m.date < `${month}-${period === 1 ? '01' : '16'}`)
      const opening = summarize(before, month).cash
      const received = periodRows
        .filter((m) => m.type === 'Ingreso')
        .reduce((a, m) => a + m.amount, 0)
      const periodFixed = fixed
        .filter((f) => f.active && f.day !== null && (f.day <= 15 ? 1 : 2) === period)
        .reduce((a, f) => a + f.amount, 0)
      const unknown = fixed
        .filter((f) => f.active && f.day === null)
        .reduce((a, f) => a + f.amount, 0)
      return (
        <>
          <div className="payday-banner">
            <IconTile icon={CalendarDays} />
            <div>
              <h2>Que tu quincena trabaje para ti.</h2>
              <p>Reserva primero para lo que debes pagar antes del siguiente ingreso.</p>
            </div>
            <div className="segmented">
              {[1, 2].map((p) => (
                <button
                  key={p}
                  className={period === p ? 'active' : ''}
                  onClick={() => setPeriod(p)}
                >
                  {p === 1 ? '1–15' : '16–fin de mes'}
                </button>
              ))}
            </div>
          </div>
          <div className="stats-grid three">
            {stat('Saldo de apertura real', opening, Wallet, 'Arrastre de movimientos anteriores')}
            {stat(
              'Nómina esperada',
              config.monthlyIncome / 2,
              CalendarDays,
              'No disponible hasta recibirla',
              'blue',
            )}
            {stat('Ingreso recibido', received, ArrowDownLeft, 'Solo registros confirmados')}
          </div>
          <Panel
            title={`Plan de la ${period === 1 ? 'primera' : 'segunda'} quincena`}
            action={actionButton('Recibí mi nómina', 'Ingreso')}
          >
            {table(
              ['Asignación', 'Monto', 'Tratamiento'],
              [
                [
                  'Compromisos con fecha en esta quincena',
                  cop(periodFixed),
                  'Reservar antes de gastar',
                ],
                ['Fijos sin fecha de pago', cop(unknown), 'Asignar fechas para un plan exacto'],
                ['Ahorro sugerido', cop(150000), 'Planeado, no debitado'],
                ['Inversión sugerida', cop(50000), 'Planeado, no debitado'],
                ['Negocios', cop(0), 'Sin asignación confirmada'],
                [
                  'Cuota moto siguiente mes',
                  period === 2 ? cop(800000) : 'Ya considerada en día 5',
                  'Reservar del pago del 30 antes del próximo día 15',
                ],
              ],
            )}
            <Note>
              Tu saldo restante no se considera libre mientras existan compromisos sin fecha. La
              nómina del 30 debe cubrir la cuota de moto del 5 del mes siguiente.
            </Note>
          </Panel>
          <Panel title="Movimientos de esta quincena">{movementTable(periodRows)}</Panel>
        </>
      )
    }
    if (page === 'Reportes')
      return (
        <>
          <div className="stats-grid three">
            {stat(
              'Ingresos reales del mes',
              s.received,
              ArrowDownLeft,
              months[monthNum - 1] + ' ' + year,
            )}
            {stat(
              'Gastos de consumo',
              s.expenses,
              ArrowUpRight,
              'Sin transferencias a activos',
              'orange',
            )}
            {stat(
              'Flujo de caja mensual',
              s.cash -
                summarize(
                  movements.filter((m) => m.date < month + '-01'),
                  month,
                ).cash,
              ArrowLeftRight,
              'Movimiento real de efectivo',
              'blue',
            )}
          </div>
          <Panel title="Consumo por categoría" subtitle="Solo gastos registrados, no presupuesto.">
            {monthly.some((m) => m.type === 'Gasto') ? (
              table(
                ['Categoría', 'Total', 'Participación'],
                categories
                  .filter((c) => monthly.some((m) => m.type === 'Gasto' && m.category === c))
                  .map((c) => {
                    const a = monthly
                      .filter((m) => m.type === 'Gasto' && m.category === c)
                      .reduce((a, m) => a + m.amount, 0)
                    return [
                      c,
                      cop(a),
                      <div className="table-progress">
                        <Progress value={(a / s.expenses) * 100} />
                        <span>{Math.round((a / s.expenses) * 100)}%</span>
                      </div>,
                    ]
                  }),
              )
            ) : (
              <Empty
                icon={ChartNoAxesCombined}
                title="Tus datos van a contar una historia"
                text="Cuando registres movimientos, podrás identificar tus categorías de consumo. El Excel incluye un reporte anual que se actualiza con los registros."
              />
            )}
          </Panel>
          <Panel title="Conserva un reporte de tu avance">
            <div className="report-download">
              <FileSpreadsheet size={40} strokeWidth={1} />
              <div>
                <h3>Tu información, siempre contigo</h3>
                <p>Descarga tus datos guardados con las fórmulas y el reporte del año {year}.</p>
              </div>
              <button className="button primary" onClick={download} disabled={busy}>
                <Download size={17} />
                Exportar reporte
              </button>
            </div>
          </Panel>
        </>
      )
    if (page === 'Archivo histórico')
      return (
        <>
          <Note>
            Inspeccionamos la única hoja original, “Hoja 1”. Los registros de enero–octubre 2026 se
            conservan como fuente, no como movimientos reconstruidos. Marzo no tiene registro;
            octubre no tiene detalle.
          </Note>
          <div className="stats-grid three">
            {stat(
              'Celdas preservadas',
              history.length,
              FileArchive,
              'Se conserva el contenido original',
              'blue',
            )}
            {stat('Transacciones inventadas', 0, ShieldCheck, 'La integridad es primero')}
            {stat(
              'Hojas originales',
              1,
              FileSpreadsheet,
              'Hoja 1 · Gastos Personales.xlsx',
              'purple',
            )}
          </div>
          <Panel
            title="Archivo original, sin modificaciones"
            action={
              <a className="button secondary small" href="/api/respaldo" download>
                <Download size={16} />
                Descargar original
              </a>
            }
          >
            {table(
              ['Celda original', 'Contenido preservado', 'Estado'],
              history
                .filter(
                  (h) =>
                    Number(h.cell.replace(/\D/g, '')) >= 11 &&
                    Number(h.cell.replace(/\D/g, '')) <= 20,
                )
                .map((h) => [
                  <strong>{h.cell}</strong>,
                  <span className="history-content">{h.value}</span>,
                  <Badge tone="orange">Verificar contexto</Badge>,
                ]),
            )}
          </Panel>
        </>
      )
    return null
  }

  return (
    <div className="app-shell">
      {sidebar && <div className="sidebar-overlay" onClick={() => setSidebar(false)} />}
      <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
        <button
          aria-label="Cerrar navegación"
          onClick={() => setSidebar(false)}
          className="absolute top-5 right-4 grid size-11 place-items-center rounded-xl text-[#98aa85] min-[681px]:hidden"
        >
          <X size={21} />
        </button>
        <button className="brand" onClick={() => navigate('Resumen')}>
          <img src="/bonsai.png" alt="Bonsai" className="h-9 w-auto shrink-0" />
          <span>
            Bonsai<span className="brand-period">.</span>
            <small>FINANZAS PERSONALES</small>
          </span>
        </button>
        <div className="sidebar-scroll">
        <nav>
          {primaryNav.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-label">{group.title}</div>
              {group.items.map((item) => (
                <button
                  key={item.name}
                  aria-label={item.name}
                  aria-current={page === item.name ? 'page' : undefined}
                  className={`nav-item ${page === item.name ? 'active' : ''}`}
                  onClick={() => navigate(item.name)}
                >
                  <item.icon size={18} strokeWidth={1.65} />
                  <span>{item.name}</span>
                  {item.count && (
                    <small>
                      {loans.filter((d) => repaymentBalance(d.id, movements) > 0).length}
                    </small>
                  )}
                  {page === item.name && <span className="nav-active-dot" />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setModal('guide')}>
            <CircleHelp size={17} />
            <span>Guía y ayuda</span>
            <ExternalLink size={13} />
          </button>
          <button type="button" className="profile" onClick={() => setModal('account')}>
            <span className="profile-avatar">{data.name.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{data.name}</strong>
              <span>Colombia · COP</span>
            </div>
            <span className="profile-status" />
          </button>
        </div>
        </div>
      </aside>
      <div className="main-wrapper">
        <main>
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                {page === 'Resumen' ? 'TU TRANQUILIDAD EMPIEZA AQUÍ' : 'TU SISTEMA FINANCIERO'}
              </div>
              <h1>{page === 'Resumen' ? 'Tu dinero, con claridad.' : page}</h1>
              <p>
                {page === 'Resumen'
                  ? 'Todo bajo control. Un paso más cerca de tus metas.'
                  : descriptions[page]}
              </p>
            </div>
            <div className="heading-actions">
              <div className="month-select">
                <CalendarDays size={16} />
                <select
                  aria-label="Seleccionar mes y año"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value)
                  }}
                >
                  {Array.from({ length: Math.max(51, (year - 2026 + 4) * 12 - 9) }, (_, i) => {
                    const d = new Date(2026, 9 + i, 1)
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                    return (
                      <option value={key} key={key}>
                        {months[d.getMonth()]} {d.getFullYear()}
                      </option>
                    )
                  })}
                </select>
                <ChevronDown size={14} />
              </div>
              <button className="button primary" onClick={() => openTransaction()}>
                <CircleDollarSign size={16} />
                Nuevo movimiento
              </button>
            </div>
          </div>
          <div className="content-stack">{renderPage()}</div>
          <footer>
            <span>
              <span className="tiny-brand">Bonsai.</span> Menos incertidumbre. Más futuro.
            </span>
            <span>
              <ShieldCheck size={13} />
              Tus datos se guardan en tu base de datos privada.
              <button onClick={() => setModal('guide')}>
                Guía de uso <ArrowUpRight size={12} />
              </button>
            </span>
          </footer>
        </main>
      </div>
      <button
        className="floating-add"
        aria-label="Nuevo movimiento"
        onClick={() => openTransaction()}
      >
        <Plus size={22} />
      </button>
      <nav
        aria-label="Navegación principal móvil"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center border-t border-[#e5eadc] bg-white/95 px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] backdrop-blur-xl min-[681px]:hidden"
      >
        {(
          [
            { label: 'Inicio', page: 'Resumen', icon: LayoutDashboard },
            { label: 'Actividad', page: 'Movimientos', icon: ArrowLeftRight },
          ] as const
        ).map((a) => (
          <button
            key={a.page}
            aria-current={page === a.page ? 'page' : undefined}
            onClick={() => navigate(a.page)}
            className={`flex min-h-[54px] flex-col items-center justify-center gap-1.5 rounded-xl text-[9px] font-medium ${page === a.page ? 'text-[#267953]' : 'text-[#a3b192]'}`}
          >
            <a.icon size={21} strokeWidth={page === a.page ? 2 : 1.5} />
            {a.label}
          </button>
        ))}
        <button
          aria-label="Registrar nuevo movimiento"
          onClick={() => openTransaction()}
          className="mx-auto -mt-5 grid size-[52px] place-items-center rounded-[19px] border-[5px] border-[#f7f9f5] bg-[#267953] text-white shadow-[0_4px_14px_#26795322] active:scale-95"
        >
          <Plus size={23} strokeWidth={1.8} />
        </button>
        <button
          aria-current={page === 'Metas financieras' ? 'page' : undefined}
          onClick={() => navigate('Metas financieras')}
          className={`flex min-h-[54px] flex-col items-center justify-center gap-1.5 rounded-xl text-[9px] font-medium ${page === 'Metas financieras' ? 'text-[#267953]' : 'text-[#a3b192]'}`}
        >
          <Target size={21} strokeWidth={1.5} />
          Mis metas
        </button>
        <button
          aria-label="Ver todos los módulos"
          onClick={() => setSidebar(true)}
          className="flex min-h-[54px] flex-col items-center justify-center gap-1.5 rounded-xl text-[9px] font-medium text-[#a3b192]"
        >
          <Menu size={21} strokeWidth={1.5} />
          Más
        </button>
      </nav>
      {toast && (
        <div className="toast" role={toastError ? 'alert' : 'status'} data-error={toastError}>
          {toastError ? <CircleAlert size={19} /> : <CircleCheck size={19} />}
          <span>{toast}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {modal === 'transaction' && (
        <Modal
          title="Un movimiento. Todo en orden."
          subtitle="Registra lo que realmente ocurrió. Nosotros hacemos las cuentas."
          onClose={() => setModal(null)}
        >
          <form onSubmit={register}>
            <div className="field">
              <label>Tipo de movimiento</label>
              <select
                className="type-select"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as MovementType)
                  setReference('')
                  setReconcile(false)
                  setEntryMethod(methods[0])
                }}
              >
                {(
                  [
                    'Gasto',
                    'Ingreso',
                    'Préstamo',
                    'Abono recibido',
                    'Ahorro',
                    'Retiro',
                    'Interés',
                    'Inversión',
                    'Pago de deuda',
                    ...(type === 'Retiro de ahorro' ? (['Retiro de ahorro'] as MovementType[]) : []),
                  ] as MovementType[]
                ).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="amount">Monto en COP</label>
                <div className="money-input">
                  <span>$</span>
                  <input
                    autoFocus={!matchedFixed && !salaryReference}
                    data-autofocus={!matchedFixed && !salaryReference ? 'true' : undefined}
                    id="amount"
                    name="amount"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    required
                    placeholder="0"
                    defaultValue={
                      matchedFixed?.amount ||
                      (salaryReference ? config.monthlyIncome / 2 : undefined)
                    }
                    onChange={(e) => setEntryAmount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="date">Fecha</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={defaultDate}
                  min="2026-01-01"
                  required
                />
              </div>
            </div>
            {type === 'Préstamo' && (
              <div className="field">
                <label htmlFor="debtor">Nombre de quien recibe el préstamo</label>
                <input
                  id="debtor"
                  name="debtor"
                  maxLength={80}
                  required
                  placeholder="Ej. Padre, Juan, María..."
                />
              </div>
            )}
            {type !== 'Retiro' && (
              <div className="field">
                <label htmlFor="description">
                  {type === 'Préstamo' ? 'Motivo del préstamo' : 'Descripción'}
                </label>
                <input
                  id="description"
                  name="description"
                  maxLength={200}
                  required
                  defaultValue={
                    matchedFixed?.name || (salaryReference ? 'Nómina recibida' : undefined)
                  }
                  placeholder={
                    type === 'Gasto'
                      ? 'Ej. Almuerzo, gasolina, universidad...'
                      : '¿A qué corresponde este movimiento?'
                  }
                />
              </div>
            )}
            <div className="form-grid">
              {type !== 'Retiro' && (
                <div className="field">
                  <label>Categoría</label>
                  <select
                    key={type}
                    name="category"
                    defaultValue={
                      matchedFixed?.category ||
                      (type === 'Ingreso' ? 'Salario' : type === 'Inversión' ? 'ETF' : 'Otros')
                    }
                  >
                    {(type === 'Ingreso'
                      ? ['Salario', 'Freelance', 'Monetización web', 'Negocios', 'Intereses', 'Otros']
                      : type === 'Inversión'
                        ? ['ETF', 'Acciones', 'Otro instrumento']
                        : categories
                    ).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
              {type !== 'Retiro' && (
                <div className="field">
                  <label>Método de pago</label>
                  <select
                    name="method"
                    key={type}
                    onChange={(e) => {
                      setEntryMethod(e.target.value)
                      setEntryAccount(accountFor(e.target.value))
                    }}
                    defaultValue={
                      matchedFixed?.id === 'REC-04' ? 'Tarjeta Nu' : 'Débito Bancolombia'
                    }
                  >
                    {selectableMethods
                      .filter((m) => type === 'Gasto' || m !== 'Tarjeta Nu')
                      .map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                  </select>
                </div>
              )}
              {type === 'Retiro' && (
                <div className="field">
                  <label>Cuenta origen</label>
                  <select
                    name="fromAccount"
                    value={entryFrom}
                    onChange={(e) => setEntryFrom(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field">
                <label>{type === 'Retiro' ? 'Cuenta destino' : 'Cuenta'}</label>
                <select
                  name="account"
                  value={entryAccount}
                  onChange={(e) => setEntryAccount(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {type === 'Abono recibido' ? (
              <div className="field">
                <label>Préstamo que se abona</label>
                <select name="reference" defaultValue={reference || 'CXC-08'} required>
                  {loans
                    .filter((d) => repaymentBalance(d.id, movements) > 0)
                    .map((d) => (
                      <option value={d.id} key={d.id}>
                        {d.description} · {cop(repaymentBalance(d.id, movements))}
                      </option>
                    ))}
                </select>
              </div>
            ) : type === 'Pago de deuda' ? (
              <div className="field">
                <label>Obligación</label>
                <select name="reference" defaultValue={reference || 'NU'}>
                  <option value="NU">Nu · tarjeta y avance</option>
                  <option value="MOTO">Financiación de moto</option>
                </select>
              </div>
            ) : ['Ahorro', 'Interés', 'Retiro de ahorro'].includes(type) ? (
              <div className="field">
                <label>Cajita / meta</label>
                <select name="reference" defaultValue={reference || 'META-01'}>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input name="reference" type="hidden" value={reference} />
            )}
            {type !== 'Interés' && type !== 'Retiro' && (
              <div className="mb-4 rounded-2xl border border-[#e2ead8] bg-[#f7f9f2] p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={reconcile}
                    onChange={(e) => {
                      setReconcile(e.target.checked)
                      setConfirmedBalance(s.cash)
                    }}
                    className="mt-0.5 size-5 shrink-0 accent-[#267953]"
                  />
                  <span>
                    <strong className="block text-xs font-semibold text-[#6a8455]">
                      Este movimiento ya está incluido en mi saldo
                    </strong>
                    <span className="mt-1 block text-[11px] leading-5 text-[#98a987]">
                      Úsalo si el banco ya descontó el pago. Se registra el gasto, no se vuelve a
                      descontar de tu saldo confirmado.
                    </span>
                  </span>
                </label>
                {reconcile && (
                  <div className="field mt-4 !mb-0">
                    <label htmlFor="balanceAfter">Mi saldo real actual en Bancolombia (COP)</label>
                    <div className="money-input">
                      <span>$</span>
                      <input
                        id="balanceAfter"
                        name="balanceAfter"
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={confirmedBalance}
                        onChange={(e) => setConfirmedBalance(Number(e.target.value))}
                      />
                    </div>
                    <p className="mt-2 text-[10px] leading-5 text-[#a1b18e]">
                      La diferencia queda como conciliación auditable. No se registra como ingreso.
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[#eef4e7] px-4 py-3.5">
              <span className="text-[11px] text-[#87a070]">
                {reconcile ? 'Saldo confirmado al guardar' : 'Saldo estimado después'}
              </span>
              <strong className="font-[Manrope] text-lg font-semibold tracking-tight text-[#5c7c46]">
                {cop(
                  reconcile
                    ? confirmedBalance
                    : s.cash +
                        (['Ingreso', 'Abono recibido', 'Retiro de ahorro'].includes(type)
                          ? entryAmount
                          : type === 'Retiro' ||
                              type === 'Interés' ||
                              (type === 'Gasto' && entryMethod === 'Tarjeta Nu')
                            ? 0
                            : -entryAmount),
                )}
              </strong>
            </div>
            <Note>
              {type === 'Abono recibido'
                ? 'El abono aumenta tu caja. No paga automáticamente tu obligación con Nu.'
                : type === 'Pago de deuda'
                  ? 'Reduce caja. Para la moto, confirma capital e interés en PAGOS DEUDA del Excel antes de reducir el principal.'
                  : type === 'Retiro'
                    ? 'Mueve plata entre tus cuentas. Tu dinero disponible total no cambia.'
                    : type === 'Interés'
                      ? 'Solo registra el interés real de Nu. No es salario ni un nuevo aporte.'
                      : 'Guardado seguro en la nube. Encontrarás tus registros cuando vuelvas.'}
            </Note>
            <button className="button primary full submit-button" type="submit" disabled={saving}>
              <Check size={17} />
              {saving ? 'Guardando en tu espacio...' : 'Guardar movimiento'}
            </button>
          </form>
        </Modal>
      )}
      {modal === 'download' && (
        <Modal
          title="Tu sistema. Siempre contigo."
          subtitle="Un archivo diseñado para acompañarte por muchos años."
          onClose={() => setModal(null)}
        >
          <div className="download-preview">
            <span>
              <FileSpreadsheet size={34} strokeWidth={1.3} />
            </span>
            <div>
              <strong>Bonsai · Finanzas personales</strong>
              <p>Excel .xlsx · COP · Desde noviembre 2026</p>
              <Badge tone="green">
                <CheckCheck size={12} />
                Fórmulas + historial + movimientos
              </Badge>
            </div>
          </div>
          <div className="download-features">
            {[
              'Más de 16 módulos financieros conectados',
              'Historia original preservada sin reinterpretar',
              'Expectativas separadas de movimientos reales',
              `${movements.length} movimientos guardados en tu base de datos`,
            ].map((f) => (
              <div key={f}>
                <Check size={16} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <button className="button primary full download-main" disabled={busy} onClick={download}>
            {busy ? <RefreshCw className="spinning" size={18} /> : <Download size={18} />}
            {busy ? 'Preparando tu sistema...' : 'Descargar mi sistema en Excel'}
          </button>
          <div className="download-extras">
            <button
              onClick={async () => {
                try {
                  await downloadAutomation()
                  notify('ZIP de automatización descargado. Incluye instrucciones de instalación.')
                } catch {
                  notify('No se pudo generar el ZIP.')
                }
              }}
            >
              <div>
                <span className="extra-icon">
                  <Sparkles size={18} />
                </span>
                <span>
                  <strong>Automatización Google Sheets</strong>
                  <small>Código Apps Script + formulario + guía</small>
                </span>
              </div>
              <Download size={17} />
            </button>
            <a href="/api/respaldo" download>
              <div>
                <span className="extra-icon">
                  <FileArchive size={18} />
                </span>
                <span>
                  <strong>Tu archivo original</strong>
                  <small>Gastos Personales.xlsx · sin modificaciones</small>
                </span>
              </div>
              <Download size={17} />
            </a>
          </div>
          <Note>
            No tenemos acceso directo a Google Sheets. Importa el Excel en tu cuenta y sigue la guía
            del ZIP para instalar la automatización. El código no se ha ejecutado en tu cuenta.
          </Note>
        </Modal>
      )}
      {modal === 'guide' && (
        <Modal
          title="Haz espacio para un futuro más claro."
          subtitle="Tu guía para empezar, un paso a la vez."
          onClose={() => setModal(null)}
        >
          <div className="guide-content">
            {userGuide.map(([title, text]) => (
              <details key={title}>
                <summary>
                  {title}
                  <ChevronDown size={15} />
                </summary>
                <p>{text}</p>
              </details>
            ))}
          </div>
          <button className="button primary full" onClick={() => setModal('download')}>
            <Download size={17} />
            Descargar mi sistema
          </button>
        </Modal>
      )}
      {modal === 'notifications' && (
        <Modal
          title="Un par de cosas por confirmar."
          subtitle="Tu claridad financiera también depende de buenos datos."
          onClose={() => setModal(null)}
        >
          <div className="notifications-list">
            {[
              [
                'Contrato de la moto',
                'Confirma saldo, fecha de inicio, seguros y tasa con tu financiera.',
              ],
              [
                'Fechas de gastos recurrentes',
                'Universidad, ayuda familiar y servicios todavía no tienen día de pago.',
              ],
              ['Extracto y cupo Nu', 'Verifica corte, fecha de pago, cupo y cargos del avance.'],
              [
                'Historia preservada',
                'Las cifras abreviadas del original necesitan revisión antes de normalizarlas.',
              ],
            ].map(([a, b]) => (
              <div key={a}>
                <IconTile icon={Clock3} tone="orange" />
                <div>
                  <strong>{a}</strong>
                  <p>{b}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            className="button secondary full"
            onClick={() => {
              setModal(null)
              navigate('Archivo histórico')
            }}
          >
            Revisar mi información <ArrowRight size={15} />
          </button>
        </Modal>
      )}
      {modal === 'fixed' && (
        <Modal
          title={editFixed ? 'Ajusta tu compromiso.' : 'Un compromiso, sin sorpresas.'}
          subtitle="Las expectativas no se convierten en gastos pagados."
          onClose={() => setModal(null)}
        >
          <form onSubmit={editFixedSubmit}>
            <div className="field">
              <label>Nombre</label>
              <input name="name" defaultValue={editFixed?.name} required />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Monto mensual COP</label>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  defaultValue={editFixed?.amount}
                  required
                />
              </div>
              <div className="field">
                <label>Día de pago (opcional)</label>
                <input
                  name="day"
                  type="number"
                  min="1"
                  max="28"
                  defaultValue={editFixed?.day || ''}
                  placeholder="Sin confirmar"
                />
              </div>
            </div>
            <div className="field">
              <label>Categoría</label>
              <select name="category" defaultValue={editFixed?.category}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <label className="checkbox-label">
              <input
                name="essential"
                type="checkbox"
                defaultChecked={editFixed?.essential ?? true}
              />
              Es un gasto fijo que se repite cada mes
            </label>
            <button className="button primary full submit-button" disabled={saving}>
              Guardar configuración <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
      {modal === 'goal' && (
        <Modal
          title={editGoal ? 'Dale forma a tu meta.' : '¿Qué quieres hacer posible?'}
          subtitle="Un objetivo concreto, un paso cada mes."
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const d = new FormData(e.currentTarget)
              const item: Goal = {
                id: editGoal?.id || 'META-' + crypto.randomUUID().slice(0, 6),
                name: String(d.get('name')),
                target: Number(d.get('target')),
                monthly: Number(d.get('monthly')),
                deadline: String(d.get('deadline')),
              }
              if (
                await commit(
                  () => saveGoal(item),
                  'Tu meta está guardada. Los aportes no se debitan automáticamente.',
                )
              )
                setModal(null)
            }}
          >
            <div className="field">
              <label>Nombre de la meta</label>
              <input
                name="name"
                required
                defaultValue={editGoal?.name}
                placeholder="Ej. Mi próximo viaje"
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Objetivo COP</label>
                <input
                  name="target"
                  type="number"
                  min="1"
                  required
                  defaultValue={editGoal?.target}
                />
              </div>
              <div className="field">
                <label>Aporte mensual COP</label>
                <input
                  name="monthly"
                  type="number"
                  min="0"
                  required
                  defaultValue={editGoal?.monthly || 100000}
                />
              </div>
            </div>
            <div className="field">
              <label>Fecha objetivo</label>
              <input
                name="deadline"
                type="date"
                required
                defaultValue={editGoal?.deadline || '2027-12-31'}
              />
            </div>
            <button className="button primary full submit-button" disabled={saving}>
              Guardar mi meta <Target size={17} />
            </button>
          </form>
        </Modal>
      )}
      {modal === 'edit-movement' && editMovement && (
        <Modal
          title="Edita el movimiento."
          subtitle="Los saldos se recalculan automáticamente."
          onClose={() => setModal(null)}
        >
          <form onSubmit={editMovementSubmit}>
            {editMovement.type !== 'Retiro' && (
              <div className="field">
                <label>Descripción</label>
                <input
                  name="description"
                  required
                  maxLength={200}
                  defaultValue={editMovement.description}
                />
              </div>
            )}
            <div className="form-grid">
              <div className="field">
                <label>Monto COP</label>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue={editMovement.amount}
                />
              </div>
              <div className="field">
                <label>Fecha</label>
                <input
                  name="date"
                  type="date"
                  min="2026-01-01"
                  required
                  defaultValue={editMovement.date.slice(0, 10)}
                />
              </div>
            </div>
            <div className="form-grid">
              {editMovement.type !== 'Retiro' && (
                <div className="field">
                  <label>Categoría</label>
                  <select name="category" defaultValue={editMovement.category}>
                    {[
                      ...new Set([
                        ...(editMovement.type === 'Ingreso'
                          ? ['Salario', 'Freelance', 'Monetización web', 'Negocios', 'Intereses']
                          : editMovement.type === 'Inversión'
                            ? ['ETF', 'Acciones', 'Otro instrumento']
                            : categories),
                        editMovement.category,
                      ]),
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editMovement.type !== 'Retiro' && (
                <div className="field">
                  <label>Método de pago</label>
                  <select name="method" defaultValue={editMovement.method}>
                    {[...new Set([...methods, editMovement.method])].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editMovement.type === 'Retiro' && (
                <div className="field">
                  <label>Cuenta origen</label>
                  <select name="fromAccount" defaultValue={editMovement.fromAccount || 'Bancolombia'}>
                    {accounts.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field">
                <label>Cuenta</label>
                <select
                  name="account"
                  defaultValue={
                    editMovement.type === 'Retiro'
                      ? editMovement.account || 'Efectivo'
                      : accountFor(editMovement.method, editMovement.account)
                  }
                >
                  {accounts.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button className="button primary full submit-button" disabled={saving}>
              Guardar cambios <Check size={17} />
            </button>
            <button
              type="button"
              className="text-button mx-auto mt-3 flex items-center gap-1.5 text-[#b06a63]"
              disabled={saving}
              onClick={async () => {
                if (
                  !window.confirm(
                    '¿Eliminar este movimiento? Esta acción no se puede deshacer.',
                  )
                )
                  return
                if (await commit(() => deleteMovement(editMovement.id), 'Movimiento eliminado.'))
                  setModal(null)
              }}
            >
              <Trash2 size={14} /> Eliminar movimiento
            </button>
          </form>
        </Modal>
      )}
      {modal === 'loan' && editLoan && (
        <Modal
          title="Ajusta los detalles del préstamo."
          subtitle="Los abonos ya registrados no se modifican."
          onClose={() => setModal(null)}
        >
          <form onSubmit={loanSubmit}>
            <div className="field">
              <label>Nombre de quien recibe el préstamo</label>
              <input
                name="debtor"
                required
                maxLength={80}
                defaultValue={editLoan.debtor || ''}
                placeholder="Ej. Padre, Juan, María..."
              />
            </div>
            <div className="field">
              <label>Motivo</label>
              <input
                name="description"
                required
                maxLength={200}
                defaultValue={editLoan.description}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Monto original COP</label>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  required
                  defaultValue={editLoan.amount}
                />
              </div>
              <div className="field">
                <label>Fecha del préstamo</label>
                <input name="dateLent" type="date" defaultValue={editLoan.dateLent || ''} />
              </div>
            </div>
            <div className="field">
              <label>Pago esperado (opcional)</label>
              <input name="due" type="date" defaultValue={editLoan.due || ''} />
            </div>
            <button className="button primary full submit-button" disabled={saving}>
              Guardar préstamo <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
      {modal === 'balances' && (
        <Modal
          title="Saldos por cuenta."
          subtitle="Cuánto tienes en cada lugar. Bancolombia conserva el resto."
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const d = new FormData(e.currentTarget)
              const input: Record<string, unknown> = {}
              for (const a of ['Efectivo', 'Caja Fuerte', 'Nequi', 'Nu']) input[a] = d.get(a)
              if (await commit(() => saveAccountBalances(input), 'Saldos por cuenta guardados.'))
                setModal(null)
            }}
          >
            {['Efectivo', 'Caja Fuerte', 'Nequi', 'Nu'].map((a) => (
              <div className="field" key={a}>
                <label>{a}</label>
                <div className="money-input">
                  <span>$</span>
                  <input
                    name={a}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    defaultValue={config.accountBalances?.[a] ?? ''}
                  />
                </div>
              </div>
            ))}
            <div className="mb-4 flex items-center justify-between rounded-xl bg-[#eef4e7] px-4 py-3">
              <span className="text-[11px] text-[#87a070]">Bancolombia (resto)</span>
              <strong className="font-[Manrope] text-sm font-semibold text-[#5c7c46]">
                {cop(config.openingCash - declaredAccountTotal)}
              </strong>
            </div>
            <Note>
              Estos son los saldos base de cada cuenta; los movimientos los ajustan después.
            </Note>
            <button className="button primary full submit-button" disabled={saving}>
              Guardar saldos <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
      {modal === 'account' && (
        <Modal
          title="Tu cuenta."
          subtitle="Solo tú puedes ver este espacio."
          onClose={() => setModal(null)}
        >
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#efe0db] bg-[#fbf5f3] p-4">
            <span className="profile-avatar">{data.name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0">
              <strong className="block truncate text-sm text-[#385d3e]">{data.name}</strong>
              <span className="block truncate text-xs text-[#8d997f]">{data.email}</span>
            </div>
          </div>
          <button
            className="button full"
            disabled={busy}
            onClick={() => {
              setModal(null)
              void onSignOut().catch(() =>
                notify(
                  'No se pudo cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.',
                  true,
                ),
              )
            }}
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </Modal>
      )}
      {modal === 'month' && (
        <Modal
          title="Un nuevo mes. El mismo plan."
          subtitle="Las expectativas se generan sin borrar tu historia."
          onClose={() => setModal(null)}
        >
          <Note>
            Se generarán dos nóminas esperadas y {fixed.filter((f) => f.active).length} compromisos
            activos. Ningún ingreso se marcará como recibido.
          </Note>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const d = new FormData(e.currentTarget)
              const next = String(d.get('month'))
              if (
                await commit(() => generateMonth(next), 'Mes guardado sin duplicar expectativas.')
              ) {
                setMonth(next)
                setModal(null)
              }
            }}
          >
            <div className="field">
              <label>Mes de operación</label>
              <input name="month" type="month" min="2026-11" defaultValue={month} required />
            </div>
            <button className="button primary full submit-button" disabled={saving}>
              Generar nuevo mes <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
      {page !== 'Resumen' && (
        <button className="new-month-button" onClick={() => setModal('month')}>
          <CalendarDays size={15} />
          Generar nuevo mes
        </button>
      )}
    </div>
  )
}

function CashChart({
  cash,
  quarter,
  month,
  totalFixed,
  remainingIncome,
  pendingFixed,
  loanDue,
  monthlyIncome,
}: {
  cash: number
  quarter: boolean
  month: string
  totalFixed: number
  remainingIncome: number
  pendingFixed: number
  loanDue: number
  monthlyIncome: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const margin = monthlyIncome - totalFixed
  const closing = cash + remainingIncome - pendingFixed
  const middle = cash - loanDue + Math.min(monthlyIncome / 2, remainingIncome)
  const values = quarter
    ? [cash, closing, closing + margin, closing + margin * 2]
    : [cash, cash - loanDue, cash - loanDue, middle, middle, middle, closing]
  const max = quarter ? Math.max(5000000, ...values) : Math.max(4000000, ...values)
  const min = Math.min(0, ...values)
  const y = (n: number) => 175 - ((n - min) / (max - min)) * 148
  const x = (i: number) => 49 + (i / (values.length - 1)) * 595
  const path = values.map((n, i) => `${i ? 'L' : 'M'}${x(i)},${y(n)}`).join(' ')
  const labels = quarter
    ? ['Inicio', 'Mes 1', 'Mes 2', 'Mes 3']
    : [
        '01',
        '05',
        '10',
        '15',
        '20',
        '25',
        String(new Date(Number(month.slice(0, 4)), Number(month.slice(-2)), 0).getDate()),
      ]
  return (
    <div className="cash-chart">
      <svg
        viewBox="0 0 670 216"
        role="img"
        aria-label="Saldo registrado frente a proyección de caja. La proyección asume pagos sin fecha al cierre del mes."
      >
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#63ab8a" stopOpacity=".13" />
            <stop offset="100%" stopColor="#63ab8a" stopOpacity=".005" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => {
          const yy = 27 + i * 37
          return (
            <g key={i}>
              <line x1="49" y1={yy} x2="645" y2={yy} stroke="#edf0ed" strokeDasharray="3 4" />
              <text x="0" y={yy + 4} fill="#99a39e" fontSize="10">
                {((max - ((max - min) * i) / 4) / 1000000).toFixed(1).replace('.0', '')} M
              </text>
            </g>
          )
        })}
        <path d={`${path} L644,175 L49,175 Z`} fill="url(#chartFill)" />
        <path
          d={path}
          fill="none"
          stroke="#92b9a6"
          strokeWidth="2.3"
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />
        <line x1="49" y1={y(cash)} x2="644" y2={y(cash)} stroke="#16836b" strokeWidth="2.6" />
        {labels.map((label, i) => (
          <g key={label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={x(i) - 25} y="15" width="50" height="165" fill="transparent" />
            <text x={x(i)} y="205" textAnchor="middle" fill="#8c9791" fontSize="10">
              {label}
              {!quarter && i === labels.length - 1
                ? ' ' + months[Number(month.slice(-2)) - 1].slice(0, 3).toLowerCase()
                : ''}
            </text>
            {hover === i && (
              <>
                <line x1={x(i)} y1="22" x2={x(i)} y2="178" stroke="#c7d5cc" />
                <circle cx={x(i)} cy={y(values[i])} r="4" fill="#16836b" />
                <rect
                  x={Math.min(526, Math.max(49, x(i) - 59))}
                  y={Math.max(0, y(values[i]) - 35)}
                  width="118"
                  height="25"
                  rx="5"
                  fill="#173f32"
                />
                <text
                  x={Math.min(585, Math.max(108, x(i)))}
                  y={Math.max(16, y(values[i]) - 18)}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                >
                  {cop(values[i])}
                </text>
              </>
            )}
          </g>
        ))}
      </svg>
      <span className="chart-disclaimer">
        Proyección: fijos sin fecha asignados al cierre del mes.
      </span>
    </div>
  )
}
