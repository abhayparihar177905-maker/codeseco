'use client'

import { useMemo, useState } from 'react'
import { Menu } from 'lucide-react'
import { PACKS } from '@/lib/packs'
import type { Pack, PackId, RightCard } from '@/lib/types'
import { AppSidebar, MobileDrawer } from '@/components/app-sidebar'
import { PackSelector } from '@/components/pack-selector'
import { ScoreTracker, type Stats } from '@/components/score-tracker'
import { CardStack } from '@/components/card-stack'
import { AdminPanel } from '@/components/admin-panel'
import { HazardReflex } from '@/components/hazard-reflex'

type View = 'game' | 'admin' | 'reflex'

export default function Page() {
  const [view, setView] = useState<View>('game')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activePackId, setActivePackId] = useState<PackId>('traffic')
  const [attempt, setAttempt] = useState(0)
  const [ingested, setIngested] = useState<RightCard[]>([])
  const [stats, setStats] = useState<Stats>({ correct: 0, answered: 0, streak: 0, best: 0 })

  const packs = useMemo<Pack[]>(() => {
    if (ingested.length === 0) return PACKS
    const ingestedPack: Pack = {
      id: 'ingested',
      name: 'Fresh Ingest',
      tagline: 'AI-generated from the news',
      icon: 'Sparkles',
      gradient: ['#a3e635', '#4d7c0f'],
      cards: ingested,
    }
    return [...PACKS, ingestedPack]
  }, [ingested])

  const activePack = packs.find((p) => p.id === activePackId) ?? PACKS[0]

  function selectPack(id: PackId) {
    setActivePackId(id)
    setView('game')
    setAttempt((a) => a + 1)
  }

  function handleAnswer(correct: boolean) {
    setStats((s) => {
      const streak = correct ? s.streak + 1 : 0
      return {
        correct: s.correct + (correct ? 1 : 0),
        answered: s.answered + 1,
        streak,
        best: Math.max(s.best, streak),
      }
    })
  }

  const sidebarProps = {
    packs,
    activePackId,
    view,
    onSelectPack: selectPack,
    onOpenAdmin: () => {
      setView('admin')
    },
    onOpenReflex: () => {
      setView('reflex')
    },
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AppSidebar {...sidebarProps} />
      <MobileDrawer {...sidebarProps} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate font-display text-lg uppercase leading-none tracking-wide text-foreground">
                {view === 'admin' ? 'AI Card Creator' : view === 'reflex' ? 'Hazard Reflex' : activePack.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {view === 'admin'
                  ? 'Turn news into swipe cards'
                  : view === 'reflex'
                    ? 'Live crisis drill · Legal Autopsy'
                    : activePack.tagline}
              </p>
            </div>
          </div>
          <ScoreTracker stats={stats} />
        </header>

        {/* Pack selector row — hidden during the live sim */}
        {view !== 'reflex' && (
          <div className="border-b border-border px-4 py-3">
            <PackSelector
              packs={packs}
              activePackId={activePackId}
              isGame={view === 'game'}
              onSelectPack={selectPack}
            />
          </div>
        )}

        {/* Main */}
        <main className="no-scrollbar flex-1 overflow-y-auto px-4 py-6">
          {view === 'admin' ? (
            <AdminPanel onAddCards={setIngestedAndFocus} />
          ) : view === 'reflex' ? (
            <HazardReflex onExit={() => setView('game')} />
          ) : (
            <div className="flex min-h-full flex-col items-center justify-center">
              <CardStack key={`${activePack.id}-${attempt}`} pack={activePack} onAnswer={handleAnswer} />
            </div>
          )}
        </main>
      </div>
    </div>
  )

  function setIngestedAndFocus(cards: RightCard[]) {
    setIngested((prev) => [...prev, ...cards])
  }
}
