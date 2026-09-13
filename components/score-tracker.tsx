'use client'

import { Flame, Trophy } from 'lucide-react'
import { motion } from 'motion/react'

export interface Stats {
  correct: number
  answered: number
  streak: number
  best: number
}

export function ScoreTracker({ stats }: { stats: Stats }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        key={`score-${stats.correct}`}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.18, 1] }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5"
      >
        <Trophy className="size-4 text-primary" strokeWidth={2.5} />
        <span className="font-display text-lg leading-none text-primary">{stats.correct}</span>
        <span className="text-xs text-muted-foreground">pts</span>
      </motion.div>

      <motion.div
        key={`streak-${stats.streak}`}
        initial={{ scale: 1 }}
        animate={{ scale: stats.streak > 0 ? [1, 1.18, 1] : 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-1.5 rounded-full border border-illegal/30 bg-illegal/10 px-3 py-1.5"
        style={{ opacity: stats.streak > 0 ? 1 : 0.55 }}
      >
        <Flame
          className="size-4"
          strokeWidth={2.5}
          style={{ color: stats.streak > 0 ? 'var(--illegal)' : 'var(--muted-foreground)' }}
        />
        <span
          className="font-display text-lg leading-none"
          style={{ color: stats.streak > 0 ? 'var(--illegal)' : 'var(--muted-foreground)' }}
        >
          {stats.streak}
        </span>
      </motion.div>
    </div>
  )
}
