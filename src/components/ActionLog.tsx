import { useEffect, useRef } from 'react'
import type { GameLogEntry } from '../types/game'

interface ActionLogProps {
  logs: GameLogEntry[]
  className?: string
}

export function ActionLog({ logs, className = '' }: ActionLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div
      className={`flex flex-col bg-stone-800/90 border border-stone-600 rounded-xl overflow-hidden ${className}`}
    >
      <div className="px-3 py-2 border-b border-stone-600 text-xs font-semibold text-stone-400 uppercase tracking-wider">
        Journal
      </div>
      <div className="overflow-y-auto max-h-40 min-h-24 p-2 space-y-1">
        {logs.map((entry) => (
          <div
            key={entry.id}
            className={`text-xs py-1 px-2 rounded ${
              entry.type === 'system'
                ? 'text-amber-600/90 italic'
                : entry.type === 'reaction'
                  ? 'text-amber-400/90'
                  : entry.type === 'resolution'
                    ? 'text-stone-300'
                    : 'text-parchment'
            }`}
          >
            {entry.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
