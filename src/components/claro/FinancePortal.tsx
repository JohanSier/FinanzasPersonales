'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  Cloud,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { createAccount, signIn, signOut } from '@/lib/claro/actions'
import type { FinanceData } from './finance'
import App from './App'

export default function FinancePortal() {
  const router = useRouter()
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [setup, setSetup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/finanzas', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const result = await response.json()
      if (result.ok) {
        setData(result.data)
        setError('')
      } else if (result.signedOut) {
        setData(null)
        setSetup(result.setupAvailable)
        setError('')
      } else setError(result.error || 'No pudimos cargar tu espacio. Intenta de nuevo.')
    } catch {
      setError('No hay conexión. No se ha sustituido ni borrado tu información.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && data) void load()
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [data, load])
  const authenticate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      const credentials = {
        email: String(form.get('email')),
        password: String(form.get('password')),
      }
      const result = setup
        ? await createAccount({ ...credentials, name: String(form.get('name')) })
        : await signIn(credentials)
      if (!result.ok) {
        setError(result.error)
        return
      }
      await load()
      router.refresh()
    } catch {
      setError('No pudimos iniciar la sesión. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }
  const logout = async () => {
    const result = await signOut()
    if (result.ok) {
      setData(null)
      setSetup(false)
      router.refresh()
    } else throw new Error(result.error)
  }
  if (loading)
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f7f9f5] p-6">
        <div className="text-center">
          <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-[#e7f0df] text-[#267953]">
            <Wallet size={28} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">claro.</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-[#7a8d72]">
            <LoaderCircle size={15} className="animate-spin" />
            Conectando con tu espacio seguro
          </p>
        </div>
      </div>
    )
  if (data) return <App data={data} onData={setData} onSignOut={logout} />
  return (
    <div className="min-h-dvh bg-[#f5f7f0] p-5 pb-10 text-[#243d30] sm:p-10 lg:grid lg:grid-cols-2 lg:gap-16 lg:px-[8vw]">
      <section className="mx-auto flex w-full max-w-lg flex-col pt-5 lg:justify-center lg:py-16">
        <div className="mb-10 flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-[#267953] text-white">
            <Wallet size={22} strokeWidth={1.5} />
          </span>
          <span className="font-[Manrope] text-3xl font-extrabold tracking-[-1.5px]">
            claro<span className="text-[#267953]">.</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#dce5d3] bg-white/60 px-3 py-1.5 text-[10px] font-medium text-[#6e8759]">
            <Cloud size={12} />
            Ahora en la nube
          </span>
        </div>
        <div className="mb-3 text-[10px] font-semibold tracking-[.18em] text-[#7f9b66]">
          TU TRANQUILIDAD, SIEMPRE CONTIGO
        </div>
        <h1 className="max-w-md text-[38px] leading-[1.15] font-semibold tracking-[-1.7px] sm:text-5xl">
          Más presente.
          <br />
          Menos pendiente.
        </h1>
        <p className="mt-5 max-w-sm text-sm leading-7 text-[#89977b]">
          Tu dinero, tus metas y cada pequeño movimiento. En un solo espacio que te acompaña, desde
          cualquier pantalla.
        </p>
        <div className="mt-7 flex flex-wrap gap-5 text-[11px] text-[#75905d]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={15} />
            Acceso privado
          </span>
          <span className="flex items-center gap-1.5">
            <Smartphone size={15} />
            Pensado para tu celular
          </span>
        </div>
        <div className="mt-10 hidden rounded-3xl border border-[#dce7d3] bg-[#e8f0df] p-7 lg:block">
          <Sparkles size={22} className="mb-4 text-[#8ba96a]" />
          <p className="max-w-sm text-xl leading-8 font-medium tracking-tight text-[#5e7c48]">
            No se trata de controlar cada peso.
            <br />
            Se trata de elegir con más claridad.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#8a9d77]">
            <Check size={14} />
            Tus registros quedan guardados, aunque cierres la página.
          </div>
        </div>
      </section>
      <section className="mx-auto mt-9 w-full max-w-lg lg:my-auto">
        <div className="rounded-3xl border border-[#e1e8d8] bg-white p-6 shadow-[0_8px_45px_#35572e05] sm:p-9">
          <div className="mb-6 flex size-11 items-center justify-center rounded-2xl bg-[#f0f5e9] text-[#88a569]">
            <LockKeyhole size={21} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-semibold tracking-[-.7px]">
            {setup ? 'Tu espacio comienza contigo.' : 'Qué bueno tenerte de vuelta.'}
          </h2>
          <p className="mt-2 text-xs leading-6 text-[#94a284]">
            {setup
              ? 'Crea la única cuenta propietaria de este espacio. Hazlo antes de compartir o publicar tu sitio.'
              : 'Inicia sesión para encontrar todo tal como lo dejaste.'}
          </p>
          <form onSubmit={authenticate} className="mt-7 space-y-5">
            {setup && (
              <label className="block text-xs font-medium text-[#77915f]">
                ¿Cómo te llamas?
                <input
                  name="name"
                  autoComplete="given-name"
                  maxLength={80}
                  required
                  placeholder="Tu nombre"
                  className="mt-2 h-12 w-full rounded-xl border border-[#e0e8d7] bg-[#fcfdf9] px-4 text-base text-[#3c5c2f] outline-none focus:border-[#87a96b] focus:ring-4 focus:ring-[#a6c190]/10"
                />
              </label>
            )}
            <label className="block text-xs font-medium text-[#77915f]">
              Correo electrónico
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@correo.com"
                className="mt-2 h-12 w-full rounded-xl border border-[#e0e8d7] bg-[#fcfdf9] px-4 text-base text-[#3c5c2f] outline-none focus:border-[#87a96b] focus:ring-4 focus:ring-[#a6c190]/10"
              />
            </label>
            <label className="block text-xs font-medium text-[#77915f]">
              Contraseña
              <span className="relative mt-2 block">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={setup ? 10 : 1}
                  maxLength={128}
                  autoComplete={setup ? 'new-password' : 'current-password'}
                  required
                  placeholder={setup ? 'Al menos 10 caracteres' : 'Tu contraseña'}
                  className="h-12 w-full rounded-xl border border-[#e0e8d7] bg-[#fcfdf9] pr-12 pl-4 text-base text-[#3c5c2f] outline-none focus:border-[#87a96b] focus:ring-4 focus:ring-[#a6c190]/10"
                />
                <button
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#9baf85]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs leading-6 text-red-700"
              >
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#267953] px-4 text-sm font-medium text-white transition hover:bg-[#1c6443] disabled:opacity-60"
            >
              {busy ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <ArrowRight size={17} />
              )}
              {busy ? 'Conectando...' : setup ? 'Crear mi cuenta y empezar' : 'Entrar a mi espacio'}
            </button>
          </form>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[10px] text-[#a2b08f]">
            <ShieldCheck size={12} />
            Tus finanzas no son públicas. Tu sesión es independiente del panel admin.
          </p>
          {error && (
            <button
              onClick={() => void load()}
              className="mt-4 min-h-11 w-full rounded-xl border border-[#e0e8d7] text-xs text-[#789761]"
            >
              Reintentar conexión
            </button>
          )}
        </div>
        <p className="mt-6 text-center text-[10px] text-[#9ead90]">
          Hecho para avanzar a tu ritmo.{' '}
          <span className="font-semibold text-[#87a06f]">claro.</span>
        </p>
      </section>
    </div>
  )
}
