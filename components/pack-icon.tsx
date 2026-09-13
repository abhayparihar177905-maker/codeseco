import { KeyRound, Scale, Shield, ShoppingCart, Sparkles, TrafficCone } from 'lucide-react'
import type { ComponentProps } from 'react'

const ICONS = {
  TrafficCone,
  KeyRound,
  ShoppingCart,
  Shield,
  Sparkles,
  Scale,
} as const

export function PackIcon({
  name,
  ...props
}: { name: string } & ComponentProps<typeof Scale>) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Scale
  return <Icon {...props} />
}
