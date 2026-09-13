'use client'

import { motion } from 'motion/react'
import { RotateCcw, ArrowRight } from 'lucide-react'
import type { Pack } from '@/lib/types'

interface ScoreSummaryProps {
  pack: Pack
  result: { correct: number; total: number }
  hasNextPack: boolean
  onReplay: () => void
  onNextPack: () => void
}

function verdictLine(ratio: number) {
  if (ratio === 1) return { title: 'Untouchable.', sub: 'Perfect score — you know your rights cold.' }
  if (ratio >= 0.8) return { title: 'You know your rights!', sub: 'Sharp. A cop would think twice around you.' }
  if (ratio >= 0.6) return { title: 'Solid citizen.', sub: 'Good instincts — a few gaps left to close.' }
  if (ratio >= 0.4) return { title: 'Know just enough.', sub: 'Time to run this pack again and level up.' }
  return { title: 'Easy to bluff.', sub: 'Someone could walk all over these rights. Retry!' }
}

export function ScoreSummary({ pack, result, hasNextPack, onReplay, onNextPack }: ScoreSummaryProps) {
  const ratio = result.total > 0 ? result.correct / result.total : 0
  const { title, sub } = verdictLine(ratio)

  const shareText = `I scored ${result.correct}/${result.total} on the "${pack.name}" pack in Swipe Rights — the Tinder for Indian law. Think you know your rights better? 🇮🇳⚖️`
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-white/10 bg-card p-8 text-center shadow-2xl"
    >
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
        {pack.name} · Complete
      </span>

      <div className="relative flex size-40 items-center justify-center">
        <svg className="size-40 -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--secondary)" strokeWidth="8" />
          <motion.circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - ratio) }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display text-5xl text-foreground">
            {result.correct}
            <span className="text-2xl text-muted-foreground">/{result.total}</span>
          </span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Correct</span>
        </div>
      </div>

      <div>
        <h2 className="text-balance font-display text-3xl uppercase text-foreground">{title}</h2>
        <p className="mt-2 text-pretty text-sm text-muted-foreground">{sub}</p>
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-legal py-3.5 font-display text-lg uppercase tracking-wide text-legal-foreground transition-transform active:scale-[0.98]"
      >
        Share on WhatsApp
      </a>

      <div className="flex w-full gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-3 text-sm font-semibold text-foreground transition-transform active:scale-[0.98]"
        >
          <RotateCcw className="size-4" /> Replay
        </button>
        {hasNextPack && (
          <button
            type="button"
            onClick={onNextPack}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            Next pack <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
