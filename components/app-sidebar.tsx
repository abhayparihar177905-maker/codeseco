'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Gavel, Sparkles, X } from 'lucide-react'
import type { Pack, PackId } from '@/lib/types'
import { PackIcon } from './pack-icon'
import { cn } from '@/lib/utils'

interface SidebarProps {
  packs: Pack[]
  activePackId: PackId
  view: 'game' | 'admin'
  onSelectPack: (id: PackId) => void
  onOpenAdmin: () => void
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Gavel className="size-5" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <p className="font-display text-xl uppercase tracking-wide text-foreground">Swipe Rights</p>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-primary">The Tinder for Law</p>
      </div>
    </div>
  )
}

function SidebarBody({ packs, activePackId, view, onSelectPack, onOpenAdmin }: SidebarProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Brand />

      <div className="flex flex-col gap-1">
        <p className="px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Rights Packs
        </p>
        {packs.map((pack) => {
          const active = view === 'game' && pack.id === activePackId
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => onSelectPack(pack.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                active ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/50',
              )}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundImage: `linear-gradient(140deg, ${pack.gradient[0]}, ${pack.gradient[1]})` }}
              >
                <PackIcon name={pack.icon} className="size-4 text-black/80" strokeWidth={2.5} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-foreground">{pack.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {pack.cards.length} {pack.cards.length === 1 ? 'card' : 'cards'}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        <p className="px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <button
          type="button"
          onClick={onOpenAdmin}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
            view === 'admin'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent/50',
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
            <Sparkles className="size-4 text-primary" strokeWidth={2.5} />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">AI Card Creator</span>
            <span className="text-xs text-muted-foreground">Ingest news → cards</span>
          </span>
        </button>
      </div>
    </div>
  )
}

export function AppSidebar(props: SidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
      <SidebarBody {...props} />
    </aside>
  )
}

export function MobileDrawer({
  open,
  onClose,
  ...props
}: SidebarProps & { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar lg:hidden"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            <SidebarBody
              {...props}
              onSelectPack={(id) => {
                props.onSelectPack(id)
                onClose()
              }}
              onOpenAdmin={() => {
                props.onOpenAdmin()
                onClose()
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
