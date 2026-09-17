import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, Leaf, ShieldAlert } from 'lucide-react'
import { ROLES, modulePath, roleByEmail } from '../lib/dashboard/roles'
import { setAccountRoleId } from '../lib/session'
import { ADMIN } from '../lib/dashboard/systemAdmin'
import { ZONE } from '../lib/dashboard/zoneManager'

function DemoAccountsDisclosure() {
  return (
    <details className="group rounded-xl border border-bone/15 bg-forest-900/60 [&_summary]:list-none">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-[12.5px] font-medium text-sage-300 transition-colors hover:text-bone">
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sage-500" strokeWidth={2} aria-hidden="true" />
        Demo accounts, no invitation needed
      </summary>
      <div className="border-t border-bone/10 px-4 py-3">
        <div className="divide-y divide-bone/10">
          {ROLES.map((role) => (
            <div key={role.id} className="flex items-center justify-between gap-3 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-bone">{role.org.role}</p>
                <p className="truncate font-mono text-[11px] text-sage-500">{role.person.email}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-sage-500">
                any password
              </span>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}

export default function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  const handleSubmit = (event) => {
    event.preventDefault()
    const role = roleByEmail(email)
    if (!role) {
      setError('No account found for that email. Try one of the demo accounts below.')
      emailRef.current?.focus()
      return
    }
    if (!password) {
      setError('Enter a password to continue. Any value works in this prototype.')
      passwordRef.current?.focus()
      return
    }
    setError('')
    setSubmitting(true)
    setAccountRoleId(role.id)
    // Brief, honest UI feedback only — there is no network request behind this.
    window.setTimeout(() => navigate(modulePath(role, '')), 350)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-forest-950 text-bone">
      {/* Full-bleed South West Mau photograph, dark-graded to match the public
          site's cinematic treatment — the same image already shipping on
          forestos-qr-landing, not a stock placeholder. */}
      <img
        src="/media/mau.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover [filter:saturate(0.85)_brightness(0.55)]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-forest-950 via-forest-950/85 to-forest-950/25" />
      <div className="absolute inset-0 bg-gradient-to-b from-forest-950/50 via-transparent to-forest-950/80" />

      <div className="relative">
        <header className="border-b border-bone/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
            <div className="inline-flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-bone">
              <Leaf className="h-4 w-4 text-amber-400" strokeWidth={2.25} aria-hidden="true" />
              ForestOS
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sage-300">Operations Console</p>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="max-w-[62ch]">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">
              Forest Line · Operational Intelligence Platform
            </p>
            <h1 className="mt-4 font-display text-4xl italic leading-[1.06] text-bone sm:text-6xl">
              One system, every hand that touches the record.
            </h1>
            <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-sage-300">
              Block supervisors capture the work on their phones. This console is where zone managers
              sign a period off, and where system admins keep the registry, the people and the audit
              chain intact. NTZDC employees only.
            </p>

            <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-bone/15 pt-7 sm:grid-cols-4">
              <div>
                <dt className="font-display text-3xl text-bone">
                  940<span className="text-base text-sage-300"> km</span>
                </dt>
                <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-sage-500">Buffer belt</dd>
              </div>
              <div>
                <dt className="font-display text-3xl text-bone">{ZONE.blocks.length}</dt>
                <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-sage-500">Blocks · SW Mau</dd>
              </div>
              <div>
                <dt className="font-display text-3xl text-bone">{ZONE.workers.toLocaleString()}</dt>
                <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-sage-500">Workers on record</dd>
              </div>
              <div>
                <dt className="font-display text-3xl text-bone">
                  {ZONE.kpis.bufferVerifiedPct}
                  <span className="text-base text-sage-300">%</span>
                </dt>
                <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-sage-500">Buffer verified</dd>
              </div>
            </dl>

            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage-500">
              <span>Built on</span>
              {ADMIN.integrations.map((i) => (
                <span key={i.id}>{i.name.split(' · ')[0]}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-bone/15 bg-forest-900/55 p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
            <h2 className="font-display text-2xl text-bone">Sign in</h2>
            <p className="mt-1 text-[13px] text-sage-300">Use your ForestOS account to continue.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor={emailId} className="block text-[13px] font-medium text-bone">
                  Email or phone
                </label>
                <input
                  ref={emailRef}
                  id={emailId}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  placeholder="you@ntzdc.go.ke"
                  className="mt-1.5 w-full rounded-lg border border-bone/20 bg-forest-950/40 px-3 py-2.5 text-[14px] text-bone placeholder:text-sage-500 focus:border-amber-400 focus:outline focus:outline-2 focus:outline-amber-400/30"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor={passwordId} className="block text-[13px] font-medium text-bone">
                    Password
                  </label>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="Not wired up in this prototype. There is no real password to reset."
                    className="font-mono text-[11px] uppercase tracking-[0.08em] text-sage-500 disabled:cursor-default"
                  >
                    Forgot?
                  </button>
                </div>
                <input
                  ref={passwordRef}
                  id={passwordId}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  placeholder="Any value works in this prototype…"
                  className="mt-1.5 w-full rounded-lg border border-bone/20 bg-forest-950/40 px-3 py-2.5 text-[14px] text-bone placeholder:text-sage-500 focus:border-amber-400 focus:outline focus:outline-2 focus:outline-amber-400/30"
                />
              </div>

              {error && (
                <p id={errorId} role="alert" className="text-[12.5px] leading-relaxed text-amber-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-amber-400 py-2.5 text-[14px] font-semibold text-forest-950 transition-colors hover:bg-amber-500 disabled:cursor-default disabled:opacity-70"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 flex items-start gap-2.5 border-t border-bone/10 pt-5">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={2} aria-hidden="true" />
              <p className="text-[11.5px] leading-relaxed text-sage-300">
                Prototype. No real backend or authentication yet. This form resolves to a seeded demo
                account.
              </p>
            </div>

            <div className="mt-5">
              <DemoAccountsDisclosure />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
