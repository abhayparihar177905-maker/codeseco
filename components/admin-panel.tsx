'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ArrowRight, BadgeCheck, Check, Loader2, ScanSearch, ShieldAlert, X, Zap } from 'lucide-react'
import type { IngestedCard, LegitimacyStatus, RightCard } from '@/lib/types'

const SAMPLE = `NEW DELHI — A commuter has alleged that a traffic constable pulled the keys out of his scooter at a checkpoint near Connaught Place and demanded Rs 500 in cash to "settle" the matter without a challan. When the rider asked for a receipt, the officer refused and threatened to seize the vehicle. Legal experts point out that officers below Assistant Sub-Inspector rank cannot issue fines, that removing a vehicle's keys is not permitted, and that on-the-spot cash demands amount to bribery under the Prevention of Corruption Act.`

interface IngestResponse {
  mode: 'live' | 'fallback'
  request: Record<string, unknown>
  card: IngestedCard
  note?: string
  latencyMs: number
}

const STATUS_META: Record<
  LegitimacyStatus,
  { color: string; icon: typeof BadgeCheck }
> = {
  VERIFIED_LAW: { color: 'var(--legal)', icon: BadgeCheck },
  BUSTED_MYTH: { color: 'var(--illegal)', icon: ShieldAlert },
  CRIMINAL_VIOLATION: { color: 'var(--illegal)', icon: ShieldAlert },
}

function tint(color: string, pct: number) {
  return `color-mix(in oklab, ${color} ${pct}%, transparent)`
}

export function AdminPanel({ onAddCards }: { onAddCards: (cards: RightCard[]) => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<IngestResponse | null>(null)
  const [added, setAdded] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  async function ingest() {
    setLoading(true)
    setError(null)
    setResult(null)
    setAdded(false)
    try {
      const res = await fetch('/api/ingest-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }
      setResult(data as IngestResponse)
    } catch {
      setError('Network error — could not reach the ingestor.')
    } finally {
      setLoading(false)
    }
  }

  function addToStack() {
    if (!result) return
    const c = result.card
    const card: RightCard = {
      id: `ingested-${Date.now()}`,
      scenario: c.scenario,
      verdict: c.isLegal ? 'legal' : 'illegal',
      law: c.mappedLaw,
      rule: c.shortExplanation,
      category: c.category,
      generated: true,
    }
    onAddCards([card])
    setAdded(true)
    setToast(`Card saved to "${c.category}" · now live in the swipe stack`)
    window.setTimeout(() => setToast(null), 3200)
  }

  const card = result?.card
  const wordInRange = card ? card.wordCount >= 10 && card.wordCount <= 15 : false
  const statusMeta = card ? STATUS_META[card.legitimacyStatus] : STATUS_META.BUSTED_MYTH

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
          <ScanSearch className="size-5 text-primary" strokeWidth={2.5} />
        </span>
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">AI Card Ingestor</h1>
          <p className="text-sm text-muted-foreground">
            Paste any messy claim. Gemini condenses it to a 10–15 word swipe, fact-checks the myth, and maps the law.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* INPUT */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              News · forward · encounter claim
            </p>
            <button
              type="button"
              onClick={() => setText(SAMPLE)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Load sample
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a news article, a viral WhatsApp forward, or a police-encounter claim to condense and verify…"
            className="no-scrollbar mt-3 min-h-56 flex-1 resize-none rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
          <button
            type="button"
            onClick={ingest}
            disabled={loading || text.trim().length < 20}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-display text-xl uppercase tracking-wide text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin" /> Condensing…
              </>
            ) : (
              <>
                <Zap className="size-5" strokeWidth={2.5} /> Condense & Verify
              </>
            )}
          </button>
          {error && <p className="mt-3 text-sm text-illegal">{error}</p>}
        </div>

        {/* OUTPUT */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Condensed swipe card</p>

          <div className="no-scrollbar mt-3 min-h-56 flex-1 overflow-y-auto">
            {!card && !loading && (
              <div className="flex h-56 items-center justify-center text-center text-sm text-muted-foreground">
                Your condensed, fact-checked card will appear here.
              </div>
            )}
            {loading && (
              <div className="flex h-56 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-sm">Condensing → fact-checking → mapping statute…</span>
              </div>
            )}
            <AnimatePresence>
              {card && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  {/* legitimacy + verdict row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide"
                      style={{ color: statusMeta.color, backgroundColor: tint(statusMeta.color, 15) }}
                    >
                      <statusMeta.icon className="size-3.5" strokeWidth={2.5} />
                      {card.legitimacyLabel}
                    </span>
                    <span
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase"
                      style={{
                        color: card.isLegal ? 'var(--legal)' : 'var(--illegal)',
                        backgroundColor: card.isLegal ? tint('var(--legal)', 15) : tint('var(--illegal)', 15),
                      }}
                    >
                      {card.isLegal ? <Check className="size-3" /> : <X className="size-3" />}
                      {card.isLegal ? 'LEGAL' : 'ILLEGAL'}
                    </span>
                  </div>

                  {/* the condensed scenario */}
                  <p className="mt-3 font-display text-lg leading-snug text-foreground">{card.scenario}</p>

                  {/* word-count meter */}
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
                      style={{
                        color: wordInRange ? 'var(--legal)' : 'var(--illegal)',
                        backgroundColor: wordInRange ? tint('var(--legal)', 15) : tint('var(--illegal)', 15),
                      }}
                    >
                      [{card.wordCount} WORDS]
                    </span>
                    <span className="text-[0.7rem] text-muted-foreground">
                      {wordInRange ? 'within the 10–15 word target' : 'outside the 10–15 word target'}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-semibold text-primary">{card.mappedLaw}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.shortExplanation}</p>
                  <p className="mt-2 border-t border-border pt-2 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    Category · {card.category}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {card && (
            <button
              type="button"
              onClick={addToStack}
              disabled={added}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-legal py-3.5 font-display text-lg uppercase tracking-wide text-legal-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {added ? (
                <>
                  <Check className="size-5" strokeWidth={3} /> Added to Fresh Ingest pack
                </>
              ) : (
                <>
                  Save to swipe stack <ArrowRight className="size-5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* API FLOW */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Gemini request / response
              </p>
              <span
                className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
                style={{
                  color: result.mode === 'live' ? 'var(--legal)' : 'var(--primary)',
                  backgroundColor:
                    result.mode === 'live' ? tint('var(--legal)', 15) : tint('var(--primary)', 15),
                }}
              >
                {result.mode === 'live'
                  ? 'LIVE GEMINI API // 2.5 FLASH CONNECTED'
                  : 'OFFLINE FALLBACK // ADD GEMINI_API_KEY'}
              </span>
              <span className="text-[0.7rem] text-muted-foreground">{result.latencyMs} ms</span>
            </div>
            {result.note && <p className="mt-2 text-xs text-muted-foreground">{result.note}</p>}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-primary">Request →</p>
                <pre className="no-scrollbar max-h-64 overflow-auto rounded-xl border border-border bg-background p-3 text-[0.7rem] leading-relaxed text-muted-foreground">
                  {JSON.stringify(result.request, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-legal">← Response</p>
                <pre className="no-scrollbar max-h-64 overflow-auto rounded-xl border border-border bg-background p-3 text-[0.7rem] leading-relaxed text-muted-foreground">
                  {JSON.stringify(result.card, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save confirmation toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[90vw] items-center gap-2.5 rounded-full border border-legal/40 bg-card px-4 py-2.5 shadow-lg"
            role="status"
            aria-live="polite"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-legal/15">
              <Check className="size-3.5 text-legal" strokeWidth={3} />
            </span>
            <span className="text-sm font-medium text-foreground">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
