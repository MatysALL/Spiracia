import {
  Crown,
  Skull,
  Shield,
  Ship,
  Scroll,
  type LucideIcon,
} from 'lucide-react'
import type { Character } from '../types/game'

const MAP: Record<Character, LucideIcon> = {
  DUCHESSE: Crown,
  ASSASSIN: Skull,
  COMTESSE: Shield,
  CAPITAINE: Ship,
  AMBASSADEUR: Scroll,
}

const LABELS: Record<Character, string> = {
  DUCHESSE: 'La Duchesse',
  ASSASSIN: "L'Assassin",
  COMTESSE: 'La Comtesse',
  CAPITAINE: 'Le Capitaine',
  AMBASSADEUR: "L'Ambassadeur",
}

interface CharacterIconProps {
  character: Character
  revealed?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
}

export function CharacterIcon({
  character,
  revealed = false,
  size = 'md',
  className = '',
  showLabel = false,
}: CharacterIconProps) {
  const Icon = MAP[character]
  const sizeClass =
    size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'
  return (
    <div
      className={`flex flex-col items-center ${className} ${
        revealed ? 'opacity-70' : ''
      }`}
    >
      <div
        className={`${sizeClass} rounded-lg flex items-center justify-center ${
          revealed ? 'bg-stone-700' : 'bg-stone-800 border border-stone-600'
        }`}
      >
        <Icon className={sizeClass} strokeWidth={1.5} />
      </div>
      {showLabel && (
        <span className="text-xs mt-1 text-stone-400">{LABELS[character]}</span>
      )}
    </div>
  )
}

export function getCharacterLabel(c: Character): string {
  return LABELS[c]
}
