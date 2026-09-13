'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ArrowRight, Check, Loader2, Sparkles, X, Zap } from 'lucide-react'
import type { RightCard, Verdict } from '@/lib/types'

const SAMPLE = `NEW DELHI — A commuter has alleged that a traffic constable pulled the keys out of his scooter at a checkpoint near Connaught Place and demanded Rs 500 in cash to "settle" the matter without a challan. When the rider asked for a receipt, the officer refused and threatened to seize the vehicle. Legal experts point out that officers below Assistant Sub-Inspector rank cannot issue fines, that removing a vehicle's keys is not permitted, and that on-the-spot cash demands amount to bribery under the Prevention of Corruption Act.`

interface IngestResponse {
  mode: 'live' | 'simulated'
  request: Record<string, unknown>
  response: {
    cards: Array<{
      scenario: string
      verdict: Verdict
      law: string
      rule: string
      illustrationPrompt: string
    }>
  }
  usage?: unknown
  note?: string
  latencyMs: number
}

export function AdminPanel({ onAddCards }: { onAddCards: (cards: RightCard[]) => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<IngestResponse | null>(null)
  const [added, setAdded] = useState(false)

  async function ingest() {
    setLoading(true)
    setError(null)
    setResult(null)
    setAdded(false)
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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
    const cards: RightCard[] = result.response.cards.map((c, i) => ({
      id: `ingested-${Date.now()}-${i}`,
      scenario: c.scenario,
      verdict: c.verdict,
      law: c.law,
      rule: c.rule,
      illustrationPrompt: c.illustrationPrompt,
      generated: true,
    }))
    onAddCards(cards)
    setAdded(true)
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
          <Sparkles className="size-5 text-primary" strokeWidth={2.5} />
        </span>
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">AI Card Ingestor</h1>
          <p className="text-sm text-muted-foreground">
            Paste a messy news article. The LLM parses it into game-ready cards and maps the exact law.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* INPUT */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Raw news input</p>
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
            placeholder="Paste a news article or type a real-life story about a citizen's rights being tested…"
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
                <Loader2 className="size-5 animate-spin" /> Ingesting…
              </>
            ) : (
              <>
                <Zap className="size-5" strokeWidth={2.5} /> Ingest with AI
              </>
            )}
          </button>
          {error && <p className="mt-3 text-sm text-illegal">{error}</p>}
        </div>

        {/* OUTPUT */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Generated swipe cards</p>

          <div className="no-scrollbar mt-3 min-h-56 flex-1 overflow-y-auto">
            {!result && !loading && (
              <div className="flex h-56 items-center justify-center text-center text-sm text-muted-foreground">
                Cards generated by the model will appear here.
              </div>
            )}
            {loading && (
              <div className="flex h-56 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-sm">Parsing article → JSON cards…</span>
              </div>
            )}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3"
                >
                  {result.response.cards.map((c, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{c.scenario}</p>
                        <span
                          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase"
                          style={{
                            color: c.verdict === 'legal' ? 'var(--legal)' : 'var(--illegal)',
                            backgroundColor:
                              c.verdict === 'legal' ? 'color-mix(in oklab, var(--legal) 15%, transparent)' : 'color-mix(in oklab, var(--illegal) 15%, transparent)',
                          }}
                        >
                          {c.verdict === 'legal' ? <Check className="size-3" /> : <X className="size-3" />}
                          {c.verdict}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-primary">{c.law}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.rule}</p>
                      <p className="mt-2 border-t border-border pt-2 text-[0.7rem] italic text-muted-foreground">
                        Illustration: {c.illustrationPrompt}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {result && (
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
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">API request / response</p>
              <span
                className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase"
                style={{
                  color: result.mode === 'live' ? 'var(--legal)' : 'var(--primary)',
                  backgroundColor:
                    result.mode === 'live'
                      ? 'color-mix(in oklab, var(--legal) 15%, transparent)'
                      : 'color-mix(in oklab, var(--primary) 15%, transparent)',
                }}
              >
                {result.mode}
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
                  {JSON.stringify(result.response, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
