import { useEffect, useState } from 'react'

const DURATION_MS = 15000

interface ReactionTimerProps {
  endsAt: number | null
  onEnd: () => void
  className?: string
}

export function ReactionTimer({ endsAt, onEnd, className = '' }: ReactionTimerProps) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0)
      return
    }
    const tick = () => {
      const r = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemaining(r)
      if (r <= 0) onEnd()
    }
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [endsAt, onEnd])

  if (!endsAt || remaining <= 0) return null

  const pct = (remaining / (DURATION_MS / 1000)) * 100
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-mono text-amber-400 tabular-nums w-8">
          {remaining}s
        </span>
      </div>
    </div>
  )
}
