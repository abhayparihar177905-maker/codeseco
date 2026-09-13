'use client'

import type { Pack, PackId } from '@/lib/types'
import { PackIcon } from './pack-icon'
import { cn } from '@/lib/utils'

interface PackSelectorProps {
  packs: Pack[]
  activePackId: PackId
  isGame: boolean
  onSelectPack: (id: PackId) => void
}

export function PackSelector({ packs, activePackId, isGame, onSelectPack }: PackSelectorProps) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {packs.map((pack) => {
        const active = isGame && pack.id === activePackId
        return (
          <button
            key={pack.id}
            type="button"
            onClick={() => onSelectPack(pack.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
              active
                ? 'border-transparent text-black'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
            style={
              active
                ? { backgroundImage: `linear-gradient(140deg, ${pack.gradient[0]}, ${pack.gradient[1]})` }
                : undefined
            }
          >
            <PackIcon name={pack.icon} className="size-4" strokeWidth={2.5} />
            <span className="whitespace-nowrap">{pack.name}</span>
          </button>
        )
      })}
    </div>
  )
}
