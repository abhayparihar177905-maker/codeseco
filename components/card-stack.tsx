'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, Sparkles, X } from 'lucide-react'
import type { Pack, RightCard, Verdict } from '@/lib/types'
import { SwipeCard, scenarioSrc } from './swipe-card'

interface CardStackProps {
  pack: Pack
  onAnswer: (correct: boolean) => void
}

/** How many cards must remain ahead before we quietly fetch the next batch. */
const PREFETCH_THRESHOLD = 2

export function CardStack({ pack, onAnswer }: CardStackProps) {
  // Start with up to 3 pre-cached cards for zero initial delay.
  const [deck, setDeck] = useState<RightCard[]>(() => pack.cards.slice(0, 3))
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [userVerdict, setUserVerdict] = useState<Verdict | null>(null)
  const [flash, setFlash] = useState<{ id: number; correct: boolean } | null>(null)
  const [fetching, setFetching] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const fetchingRef = useRef(false)
  const seenIds = useRef(new Set(pack.cards.slice(0, 3).map((c) => c.id)))
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const card = deck[index]

  const flashNotice = useCallback((msg: string) => {
    setNotice(msg)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 3500)
  }, [])

  // Last-resort failover: reshuffle the pack's own cards with fresh ids so the deck never runs dry.
  const recycle = useCallback(() => {
    const shuffled = [...pack.cards]
      .sort(() => Math.random() - 0.5)
      .map((c) => ({
        ...c,
        id: `recycle-${c.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }))
    shuffled.forEach((c) => seenIds.current.add(c.id))
    setDeck((d) => [...d, ...shuffled])
  }, [pack.cards])

  const fetchMore = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setFetching(true)
    try {
      const res = await fetch('/api/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: pack.name }),
      })
      const data = (await res.json()) as { cards?: RightCard[]; mode?: string }
      const fresh = (data.cards ?? []).filter((c) => !seenIds.current.has(c.id))
      fresh.forEach((c) => seenIds.current.add(c.id))
      if (fresh.length > 0) setDeck((d) => [...d, ...fresh])
      else recycle()
      if (data.mode === 'fallback') flashNotice('Live AI stream paused — serving curated cards.')
    } catch (err) {
      console.log('[v0] prefetch failed:', (err as Error)?.message)
      recycle()
      flashNotice('Offline — recycling curated cards.')
    } finally {
      fetchingRef.current = false
      setFetching(false)
    }
  }, [pack.name, recycle, flashNotice])

  // Kick off the first background batch as soon as the pack mounts.
  useEffect(() => {
    void fetchMore()
  }, [fetchMore])

  // Warm the browser cache for the current + upcoming banners so they render instantly on swipe.
  useEffect(() => {
    if (typeof window === 'undefined') return
    deck.slice(index, index + 3).forEach((c) => {
      const img = new window.Image()
      img.src = scenarioSrc(c)
    })
  }, [deck, index])

  // If the player caught up to a still-loading batch, advance the moment it lands.
  useEffect(() => {
    if (waiting && index + 1 < deck.length) {
      setIndex((i) => i + 1)
      setAnswered(false)
      setUserVerdict(null)
      setWaiting(false)
    }
  }, [deck.length, waiting, index])

  const commit = useCallback(
    (verdict: Verdict) => {
      if (answered || !card) return
      const isCorrect = verdict === card.verdict
      setUserVerdict(verdict)
      setAnswered(true)
      setFlash({ id: Date.now(), correct: isCorrect })
      onAnswer(isCorrect)
    },
    [answered, card, onAnswer],
  )

  const next = useCallback(() => {
    const target = index + 1
    // Prefetch well before the deck runs dry.
    if (deck.length - target <= PREFETCH_THRESHOLD) void fetchMore()

    if (target < deck.length) {
      setIndex(target)
      setAnswered(false)
      setUserVerdict(null)
    } else {
      // Batch not here yet — show the loader and advance via the effect above.
      setWaiting(true)
    }
  }, [index, deck.length, fetchMore])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (answered) {
        if (e.key === 'Enter' || e.key === ' ') next()
        return
      }
      if (e.key === 'ArrowLeft') commit('illegal')
      if (e.key === 'ArrowRight') commit('legal')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answered, commit, next])

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {/* Card area */}
      <div className="relative mx-auto aspect-[3/4.15] w-full max-w-sm">
        {/* peek cards behind */}
        {deck.slice(index + 1, index + 3).map((c, i) => (
          <div
            key={c.id}
            aria-hidden
            className="absolute inset-0 rounded-3xl border border-white/5 bg-card"
            style={{
              transform: `translateY(${(i + 1) * 14}px) scale(${1 - (i + 1) * 0.045})`,
              opacity: 0.5 - i * 0.2,
              zIndex: 0,
            }}
          />
        ))}

        {/* waiting-for-AI loader (only if the player outran the fetch) */}
        {waiting && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-card">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-primary" /> AI generating next batch…
            </p>
          </div>
        )}

        {/* colored feedback flash */}
        <AnimatePresence>
          {flash && (
            <motion.div
              key={flash.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, times: [0, 0.25, 1] }}
              onAnimationComplete={() => setFlash(null)}
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-3xl"
              style={{ backgroundColor: flash.correct ? 'var(--legal)' : 'var(--illegal)' }}
            >
              {flash.correct ? (
                <Check className="size-24 text-black/70" strokeWidth={3} />
              ) : (
                <X className="size-24 text-white/80" strokeWidth={3} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {card && (
            <motion.div
              key={card.id}
              className="absolute inset-0 z-10"
              initial={{ opacity: 0, scale: 0.9, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -40 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              <SwipeCard
                card={card}
                gradient={pack.gradient}
                packName={pack.name}
                icon={pack.icon}
                index={index}
                answered={answered}
                userVerdict={userVerdict}
                onCommit={commit}
                onNext={next}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Big action buttons */}
      <div className="flex w-full max-w-sm items-stretch gap-4">
        <button
          type="button"
          disabled={answered || !card}
          onClick={() => commit('illegal')}
          className="group flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-illegal/60 bg-illegal/10 py-4 font-display text-2xl uppercase tracking-wide text-illegal transition-all active:scale-95 disabled:opacity-30"
        >
          <X className="size-6" strokeWidth={3} /> Illegal
        </button>
        <button
          type="button"
          disabled={answered || !card}
          onClick={() => commit('legal')}
          className="group flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-legal/60 bg-legal/10 py-4 font-display text-2xl uppercase tracking-wide text-legal transition-all active:scale-95 disabled:opacity-30"
        >
          <Check className="size-6" strokeWidth={3} /> Legal
        </button>
      </div>
      <p className="flex items-center gap-2 text-center text-xs text-muted-foreground">
        {fetching && <Loader2 className="size-3 animate-spin text-primary" />}
        Swipe the card, tap a button, or use <span className="text-foreground">←</span> /{' '}
        <span className="text-foreground">→</span> keys
      </p>

      {/* Subtle failover notice */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-0 bottom-5 z-50 mx-auto flex w-fit max-w-[90vw] items-center gap-2 rounded-full border border-white/10 bg-card/95 px-4 py-2 text-xs font-medium text-muted-foreground shadow-xl backdrop-blur"
          >
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
