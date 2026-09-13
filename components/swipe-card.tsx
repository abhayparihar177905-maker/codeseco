'use client'

import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { RightCard, Verdict } from '@/lib/types'
import { PackIcon } from './pack-icon'

/** Build the scenario banner image URL. Exported so the deck can preload upcoming cards. */
export function scenarioSrc(card: RightCard) {
  const keyword = card.imageKeyword || card.scenario
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    keyword + ' dramatic cinematic editorial photography high contrast',
  )}?width=600&height=350&nologo=true`
}

function ScenarioImage({
  card,
  gradient,
  icon,
}: {
  card: RightCard
  gradient: [string, string]
  icon: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const src = scenarioSrc(card)

  // Never let a slow or broken remote image stall a swipe: drop to the gradient after 2s.
  useEffect(() => {
    if (loaded || failed) return
    const timer = setTimeout(() => setFailed(true), 2000)
    return () => clearTimeout(timer)
  }, [loaded, failed])

  if (failed) {
    return (
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        style={{ backgroundImage: `linear-gradient(150deg, ${gradient[0]}, ${gradient[1]} 65%, #0f1014 130%)` }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay [background-image:repeating-linear-gradient(135deg,#000_0_2px,transparent_2px_16px)]" />
        <PackIcon name={icon} className="relative size-16 text-black/35" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black/30">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 to-black/20" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src || '/placeholder.svg'}
        alt={card.imageKeyword ? `Illustration: ${card.imageKeyword}` : 'Scenario illustration'}
        className="h-full w-full object-cover transition-opacity duration-500"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        draggable={false}
      />
      {/* legibility gradient into the card body */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  )
}

interface SwipeCardProps {
  card: RightCard
  gradient: [string, string]
  packName: string
  icon: string
  index: number
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
  icon,
  index,
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
              <ScenarioImage card={card} gradient={gradient} icon={icon} />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                  {card.category || packName}
                </span>
                <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                  Card #{index + 1}
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
              Next card
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
