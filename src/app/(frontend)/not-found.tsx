import Link from 'next/link'
import { ArrowLeft, Compass } from 'lucide-react'

/**
 * Custom not-found page for the frontend.
 * This renders when `notFound()` is called from any page in the (frontend) route group.
 *
 * Customize this component to match your app's design and provide helpful navigation.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[85dvh] max-w-lg flex-col items-center justify-center px-7 py-16 text-center">
      <span className="mb-7 grid size-20 place-items-center rounded-3xl border border-[#e2ead6] bg-[#ecf3e3] text-[#91ab76]">
        <Compass size={34} strokeWidth={1.25} />
      </span>
      <span className="mb-3 text-[10px] font-semibold tracking-[.2em] text-[#9aad87]">
        CLARO / 404
      </span>
      <h1 className="text-3xl leading-tight font-semibold tracking-[-1px]">
        Volvamos a un lugar más claro.
      </h1>
      <p className="mt-4 text-sm leading-7 text-[#94a283]">
        Esta página no está disponible. Tu espacio financiero y tus datos siguen en su lugar.
      </p>
      <Link
        className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#267953] px-6 py-3 text-xs font-medium text-white hover:bg-[#1f6846]"
        href="/"
      >
        <ArrowLeft size={16} />
        Volver a mi espacio
      </Link>
    </main>
  )
}
