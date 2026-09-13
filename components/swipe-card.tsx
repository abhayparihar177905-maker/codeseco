'use client'

import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useState } from 'react'
import { Check, ImageOff, X } from 'lucide-react'
import type { RightCard, Verdict } from '@/lib/types'

function ScenarioImage({ card }: { card: RightCard }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const keyword = card.imageKeyword || card.scenario
  const src = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    keyword + ' dramatic cinematic editorial illustration',
  )}?width=600&height=350&nologo=true`

  return (
    <div className="relative h-full w-full overflow-hidden bg-black/30">
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 to-black/20" />
      )}
      {error ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/50">
          <ImageOff className="size-7" />
          <span className="text-xs font-medium">Scene unavailable</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src || '/placeholder.svg'}
          alt={card.imageKeyword ? `Illustration: ${card.imageKeyword}` : 'Scenario illustration'}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          draggable={false}
        />
      )}
      {/* legibility gradient into the card body */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  )
}

interface SwipeCardProps {
  card: RightCard
  gradient: [string, string]
  packName: string
  index: number
  total: number
  answered: boolean
  userVerdict: Verdict | null
  onCommit: (verdict: Verdict) => void
  onNext: () => void
}

const THRESHOLD = 110

export function SwipeCard({
  card,
  gradient,
  packName,
  index,
  total,
  answered,
  userVerdict,
  onCommit,
  onNext,
}: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-260, 0, 260], [-16, 0, 16])
  const legalStamp = useTransform(x, [30, 130], [0, 1])
  const illegalStamp = useTransform(x, [-130, -30], [1, 0])

  const correct = userVerdict === card.verdict

  function commit(verdict: Verdict) {
    if (answered) return
    animate(x, 0, { duration: 0.18 })
    onCommit(verdict)
  }

  return (
    <div className="relative h-full w-full [perspective:1600px]">
      <motion.div
        className="relative h-full w-full touch-none"
        style={{ x, rotate }}
        drag={answered ? false : 'x'}
        dragSnapToOrigin
        dragElastic={0.6}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (answered) return
          if (info.offset.x > THRESHOLD || info.velocity.x > 700) commit('legal')
          else if (info.offset.x < -THRESHOLD || info.velocity.x < -700) commit('illegal')
          else animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
        }}
        whileTap={{ scale: answered ? 1 : 0.985 }}
      >
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: answered ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* FRONT */}
          <div
            className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl [backface-visibility:hidden]"
            style={{
              backgroundImage: `linear-gradient(155deg, ${gradient[0]} 0%, ${gradient[1]} 60%, #0f1014 140%)`,
            }}
          >
            {/* TOP HALF — scenario banner image */}
            <div className="relative h-[46%] shrink-0 overflow-hidden">
              <ScenarioImage card={card} />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                  {card.category || packName}
                </span>
                <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-bold text-white/90 backdrop-blur-sm">
                  {String(index + 1).padStart(2, '0')} / {total > 0 ? String(total).padStart(2, '0') : '∞'}
                </span>
              </div>
            </div>

            {/* BOTTOM HALF — scenario statement + instructions */}
            <div className="relative flex flex-1 flex-col justify-between p-6">
              <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay [background-image:repeating-linear-gradient(135deg,#000_0_2px,transparent_2px_16px)]" />

              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-black/60">
                  Scenario #{String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="mt-2 text-balance font-display text-2xl leading-[1.05] text-black drop-shadow-sm sm:text-3xl">
                  {card.scenario}
                </h2>
              </div>

              <div className="relative flex items-center justify-between text-black/70">
                <span className="flex items-center gap-1.5 text-sm font-bold uppercase">
                  <X className="size-4" strokeWidth={3} /> Illegal
                </span>
                <span className="text-xs font-medium text-black/50">Swipe or tap to judge</span>
                <span className="flex items-center gap-1.5 text-sm font-bold uppercase">
                  Legal <Check className="size-4" strokeWidth={3} />
                </span>
              </div>
            </div>

            {/* Drag stamps */}
            <motion.div
              style={{ opacity: legalStamp }}
              className="pointer-events-none absolute left-6 top-6 -rotate-12 rounded-xl border-4 border-legal px-4 py-1.5 font-display text-3xl uppercase tracking-wide text-legal"
            >
              Legal
            </motion.div>
            <motion.div
              style={{ opacity: illegalStamp }}
              className="pointer-events-none absolute right-6 top-6 rotate-12 rounded-xl border-4 border-illegal px-4 py-1.5 font-display text-3xl uppercase tracking-wide text-illegal"
            >
              Illegal
            </motion.div>
          </div>

          {/* BACK / REVEAL */}
          <div
            className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-card p-6 shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <div
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest"
              style={{ color: correct ? 'var(--legal)' : 'var(--illegal)' }}
            >
              {correct ? <Check className="size-5" strokeWidth={3} /> : <X className="size-5" strokeWidth={3} />}
              {correct ? 'Right! You nailed it' : 'Wrong! Now you know'}
            </div>

            <h3
              className="mt-3 font-display text-6xl uppercase leading-none sm:text-7xl"
              style={{ color: card.verdict === 'legal' ? 'var(--legal)' : 'var(--illegal)' }}
            >
              {card.verdict}!
            </h3>

            <div className="mt-5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/80">The law that applies</p>
              <p className="mt-1 font-semibold text-foreground">{card.law}</p>
            </div>

            <p className="mt-4 flex-1 text-pretty text-[0.95rem] leading-relaxed text-muted-foreground">
              {card.rule}
            </p>

            <button
              type="button"
              onClick={onNext}
              className="mt-4 w-full rounded-xl bg-primary py-3.5 font-display text-xl uppercase tracking-wide text-primary-foreground transition-transform active:scale-[0.98]"
            >
              {total > 0 && index + 1 >= total ? 'See your score' : 'Next card'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
