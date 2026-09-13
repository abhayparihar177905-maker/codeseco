'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Pack, Verdict } from '@/lib/types'
import { SwipeCard } from './swipe-card'

interface CardStackProps {
  pack: Pack
  onAnswer: (correct: boolean) => void
  onComplete: (result: { correct: number; total: number }) => void
}

export function CardStack({ pack, onAnswer, onComplete }: CardStackProps) {
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [userVerdict, setUserVerdict] = useState<Verdict | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [flash, setFlash] = useState<{ id: number; correct: boolean } | null>(null)

  const total = pack.cards.length
  const card = pack.cards[index]

  const commit = useCallback(
    (verdict: Verdict) => {
      if (answered || !card) return
      const isCorrect = verdict === card.verdict
      setUserVerdict(verdict)
      setAnswered(true)
      setFlash({ id: Date.now(), correct: isCorrect })
      if (isCorrect) setCorrectCount((c) => c + 1)
      onAnswer(isCorrect)
    },
    [answered, card, onAnswer],
  )

  const next = useCallback(() => {
    if (index + 1 >= total) {
      onComplete({ correct: correctCount, total })
      return
    }
    setIndex((i) => i + 1)
    setAnswered(false)
    setUserVerdict(null)
  }, [index, total, correctCount, onComplete])

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
        {pack.cards.slice(index + 1, index + 3).map((c, i) => (
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
              index={index}
              total={total}
              answered={answered}
              userVerdict={userVerdict}
              onCommit={commit}
              onNext={next}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Big action buttons */}
      <div className="flex w-full max-w-sm items-stretch gap-4">
        <button
          type="button"
          disabled={answered}
          onClick={() => commit('illegal')}
          className="group flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-illegal/60 bg-illegal/10 py-4 font-display text-2xl uppercase tracking-wide text-illegal transition-all active:scale-95 disabled:opacity-30"
        >
          <X className="size-6" strokeWidth={3} /> Illegal
        </button>
        <button
          type="button"
          disabled={answered}
          onClick={() => commit('legal')}
          className="group flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-legal/60 bg-legal/10 py-4 font-display text-2xl uppercase tracking-wide text-legal transition-all active:scale-95 disabled:opacity-30"
        >
          <Check className="size-6" strokeWidth={3} /> Legal
        </button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Swipe the card, tap a button, or use <span className="text-foreground">←</span> /{' '}
        <span className="text-foreground">→</span> keys
      </p>
    </div>
  )
}
