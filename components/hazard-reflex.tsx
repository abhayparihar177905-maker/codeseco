'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Quote,
  RotateCcw,
  ShieldCheck,
  Siren,
  SkipForward,
  Sparkles,
} from 'lucide-react'
import type { ReflexReport, ReflexScenario, ReflexTone } from '@/lib/types'
import { cn } from '@/lib/utils'

const SCENARIOS: ReflexScenario[] = [
  {
    id: 'police-stop',
    title: 'The Midnight Phone Grab',
    tag: 'Police Stop',
    prompt:
      'A police officer stops you at 11:30 PM, reaches into your car to grab your phone, and demands your passcode to check your WhatsApp chats, claiming you will be locked up if you refuse.',
    presets: [
      {
        tone: 'harsh',
        label: 'Aggressive',
        text: 'Snatch the phone back, scream at the cop, and try to drive away immediately.',
      },
      {
        tone: 'medium',
        label: 'Passive',
        text: 'Apologise, unlock the phone immediately, and let them read everything so you do not get arrested.',
      },
      {
        tone: 'lawful',
        label: 'Strategic',
        text: 'State clearly that you do not consent to a search without a warrant under privacy rights, keep your hands on the steering wheel, and ask for a senior officer.',
      },
    ],
  },
  {
    id: 'landlord-lockout',
    title: 'The Padlock Ambush',
    tag: 'Landlord Lockout',
    prompt:
      'Your landlord cuts off your apartment’s power and puts a padlock on your door while you are at work because your rent was delayed by 3 days.',
    presets: [
      {
        tone: 'harsh',
        label: 'Aggressive',
        text: 'Break the padlock off yourself, bang on the landlord’s door, and threaten to smash their car if power is not back in an hour.',
      },
      {
        tone: 'medium',
        label: 'Passive',
        text: 'Just pay whatever extra penalty they demand on the spot and promise never to be late again so they remove the lock.',
      },
      {
        tone: 'lawful',
        label: 'Strategic',
        text: 'Photograph the padlock and cut power, tell the landlord this is an illegal eviction under the Model Tenancy Act, and file a written complaint demanding restoration.',
      },
    ],
  },
  {
    id: 'mall-detention',
    title: 'The Exit Blockade',
    tag: 'Mall Detention',
    prompt:
      'A shopping mall private security guard blocks the exit, grabs your arm, and insists on dumping out your backpack to search for unbilled items.',
    presets: [
      {
        tone: 'harsh',
        label: 'Aggressive',
        text: 'Shove the guard out of the way, empty your bag on the floor in anger, and shout that you will hit them if they touch you again.',
      },
      {
        tone: 'medium',
        label: 'Passive',
        text: 'Let them grab your arm, hand over the backpack, and stay silent while they rummage through all your personal belongings.',
      },
      {
        tone: 'lawful',
        label: 'Strategic',
        text: 'Calmly say a private guard cannot detain or search me without police, ask them to call the police if they suspect theft, and request the store manager.',
      },
    ],
  },
]

const TONE_STYLES: Record<ReflexTone, string> = {
  harsh: 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
  lawful: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
}

const TONE_DOT: Record<ReflexTone, string> = {
  harsh: 'bg-red-500',
  medium: 'bg-amber-500',
  lawful: 'bg-emerald-500',
}

interface VerdictTheme {
  label: string
  badge: string
  ring: string
  bar: string
  icon: typeof AlertTriangle
}

const VERDICT_THEME: Record<ReflexReport['verdictType'], VerdictTheme> = {
  CRITICAL: {
    label: 'Critical Backfire',
    badge: 'border-red-500/50 bg-red-500/15 text-red-300',
    ring: 'border-red-500/60',
    bar: 'bg-red-500',
    icon: AlertTriangle,
  },
  TRAP: {
    label: 'Compliance Trap',
    badge: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
    ring: 'border-amber-500/50',
    bar: 'bg-amber-500',
    icon: Siren,
  },
  SHIELD: {
    label: 'Legal Shield',
    badge: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
    ring: 'border-emerald-500/50',
    bar: 'bg-emerald-500',
    icon: ShieldCheck,
  },
}

export function HazardReflex({ onExit }: { onExit: () => void }) {
  const [index, setIndex] = useState(0)
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done'>('idle')
  const [report, setReport] = useState<ReflexReport | null>(null)
  const [mode, setMode] = useState<'live' | 'fallback' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scenario = SCENARIOS[index]
  const theme = report ? VERDICT_THEME[report.verdictType] : null

  function nextScenario() {
    setIndex((i) => (i + 1) % SCENARIOS.length)
    resetAll()
  }

  function resetAll() {
    setResponse('')
    setReport(null)
    setStatus('idle')
    setMode(null)
    setError(null)
  }

  function tryAnother() {
    setReport(null)
    setStatus('idle')
    setResponse('')
    setError(null)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  async function runAutopsy() {
    if (!response.trim() || status === 'analyzing') return
    setStatus('analyzing')
    setError(null)
    const startedAt = Date.now()
    try {
      const res = await fetch('/api/evaluate-reflex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenario.prompt, userResponse: response }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Evaluation failed')
      // Ensure the "analysing" beat lasts ~1s for a dramatic reveal.
      const elapsed = Date.now() - startedAt
      if (elapsed < 1000) await new Promise((r) => setTimeout(r, 1000 - elapsed))
      setReport(data.report as ReflexReport)
      setMode(data.mode ?? null)
      setStatus('done')
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Try again.')
      setStatus('idle')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* Emergency header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/40 via-zinc-950 to-amber-950/30 p-4">
        <div className="flex items-center gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-500/50 bg-red-500/15 text-red-400">
            <Siren className="size-5" strokeWidth={2.5} />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-ping rounded-full bg-red-500" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-red-500" />
          </span>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/15 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-red-300">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
              Live Crisis Drill
            </span>
            <p className="mt-1 font-display text-lg uppercase leading-none tracking-wide text-foreground">
              Hazard Reflex
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={nextScenario}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
          >
            <SkipForward className="size-3.5" />
            Next Emergency Scenario
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Swipe Rights Deck
          </button>
        </div>
      </div>

      {/* Scenario card */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-red-500/5 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-red-300">
            <AlertTriangle className="size-3.5" />
            {scenario.tag}
          </span>
          <span className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
            Scenario {index + 1} / {SCENARIOS.length}
          </span>
        </div>
        <div className="p-4">
          <p className="font-display text-sm uppercase tracking-wide text-amber-400">{scenario.title}</p>
          <p className="mt-2 text-pretty text-base leading-relaxed text-foreground">{scenario.prompt}</p>
        </div>
      </div>

      {/* Input panel — hidden once report is shown */}
      <AnimatePresence mode="wait">
        {!report ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <div className="flex flex-col gap-2">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                1-Click Demo Reaction
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {scenario.presets.map((preset) => (
                  <button
                    key={preset.tone}
                    type="button"
                    onClick={() => {
                      setResponse(preset.text)
                      setError(null)
                    }}
                    className={cn(
                      'flex flex-col gap-1 rounded-xl border p-3 text-left text-xs transition-colors',
                      TONE_STYLES[preset.tone],
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                      <span className={cn('size-2 rounded-full', TONE_DOT[preset.tone])} />
                      {preset.label}
                    </span>
                    <span className="leading-snug text-foreground/80">{preset.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="reflex-response"
                className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
              >
                Or type your own reaction
              </label>
              <textarea
                id="reflex-response"
                ref={textareaRef}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
                placeholder="What do you say or do in this exact moment?"
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={runAutopsy}
              disabled={!response.trim() || status === 'analyzing'}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-4 py-3 font-display text-sm uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === 'analyzing' ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Running Legal Autopsy…
                </>
              ) : (
                <>
                  <Siren className="size-4" />
                  Run Legal Autopsy
                </>
              )}
            </button>
          </motion.div>
        ) : (
          theme && (
            <Report
              key="report"
              report={report}
              theme={theme}
              mode={mode}
              onReset={tryAnother}
              onNext={nextScenario}
            />
          )
        )}
      </AnimatePresence>
    </div>
  )
}

function Report({
  report,
  theme,
  mode,
  onReset,
  onNext,
}: {
  report: ReflexReport
  theme: VerdictTheme
  mode: 'live' | 'fallback' | null
  onReset: () => void
  onNext: () => void
}) {
  const VerdictIcon = theme.icon
  const critical = report.verdictType === 'CRITICAL'
  const scoreLabel = useMemo(() => `${report.liabilityScore}% risk`, [report.liabilityScore])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={
        critical
          ? { opacity: 1, y: 0, boxShadow: ['0 0 0 0 rgba(239,68,68,0)', '0 0 0 4px rgba(239,68,68,0.35)', '0 0 0 0 rgba(239,68,68,0)'] }
          : { opacity: 1, y: 0 }
      }
      transition={critical ? { boxShadow: { duration: 1.1, repeat: 1 } } : undefined}
      className={cn('flex flex-col gap-4 rounded-2xl border-2 bg-zinc-950 p-4', theme.ring)}
    >
      {/* Verdict banner */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.15em]',
              theme.badge,
            )}
          >
            <VerdictIcon className="size-4" strokeWidth={2.5} />
            {theme.label}
          </span>
          <span className="font-display text-2xl tabular-nums text-foreground">{scoreLabel}</span>
        </div>
        <p className="mt-2 text-pretty font-display text-lg uppercase leading-tight tracking-wide text-foreground">
          {report.verdictTitle}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${report.liabilityScore}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={cn('h-full rounded-full', theme.bar)}
          />
        </div>
      </div>

      {/* What went wrong */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-red-300">
          <AlertTriangle className="size-3.5" />
          What You Did Wrong
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {report.whatWentWrong.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-foreground/90">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* What you should have done */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-emerald-300">
          <ShieldCheck className="size-3.5" />
          What You Should Have Done
        </p>
        <ol className="mt-2 flex flex-col gap-2">
          {report.whatYouShouldDo.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-foreground/90">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[0.7rem] font-bold text-emerald-300">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </section>

      {/* Exact script */}
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-amber-300">
          <Quote className="size-3.5" />
          The Exact Script — Say This Out Loud
        </p>
        <p className="mt-2 text-pretty text-base font-medium italic leading-relaxed text-amber-100">
          “{report.exactWordsToSay}”
        </p>
      </section>

      {/* Applicable law */}
      <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Applicable law:</span> {report.applicableLaw}
        </p>
      </div>

      {mode === 'fallback' && (
        <p className="text-center text-[0.7rem] text-muted-foreground">
          Live AI analysis paused — showing a curated autopsy.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/70"
        >
          <RotateCcw className="size-4" />
          Try Another Reaction
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <SkipForward className="size-4" />
          Next Emergency Scenario
        </button>
      </div>
    </motion.div>
  )
}
