import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  MoreHorizontal,
  X,
  Check,
  Info,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cop } from './finance'

export function IconTile({ icon: Icon, tone = 'green' }: { icon: LucideIcon; tone?: string }) {
  return (
    <span className={`icon-tile ${tone}`}>
      <Icon size={19} strokeWidth={1.65} />
    </span>
  )
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>
}
export function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={28} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const initialFocus = dialog.current?.querySelector<HTMLElement>('[data-autofocus="true"]') ?? dialog.current
    initialFocus?.focus({ preventScroll: true })
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const elements = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,a[href],summary',
        ) ?? [],
      )
      if (!elements.length) return
      const first = elements[0],
        last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', trap)
      previous?.focus({ preventScroll: true })
    }
  }, [])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={dialog}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" aria-label="Cerrar" onClick={onClose}>
          <X size={20} />
        </button>
        <div className="modal-head">
          <span className="eyebrow">CLARO / FINANZAS PERSONALES</span>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </section>
    </div>
  )
}
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <Info size={16} />
      <span>{children}</span>
    </div>
  )
}
export function Progress({ value, color = 'green' }: { value: number; color?: string }) {
  return (
    <div className={`progress ${color}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}
export function Amount({ value, incoming = false }: { value: number; incoming?: boolean }) {
  return (
    <span className={incoming ? 'amount incoming' : 'amount'}>
      {incoming ? '+' : ''}
      {cop(value)}
    </span>
  )
}
export { ArrowDownLeft, ArrowUpRight, ChevronDown, MoreHorizontal, Check }
