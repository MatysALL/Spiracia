import { useNavigate } from 'react-router-dom'
import { Swords } from 'lucide-react'
import { useGameStore } from '../store/gameStore'

export function Home() {
  const navigate = useNavigate()
  const { currentPlayerName, setPlayerName, joinOrCreateGame } = useGameStore()

  const handleJoin = () => {
    joinOrCreateGame(currentPlayerName)
    navigate('/lobby')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-stone-900 via-stone-850 to-stone-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="rounded-2xl bg-stone-800/80 p-6 border border-amber-800/50 shadow-xl">
            <Swords className="w-20 h-20 text-amber-400 mx-auto" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="font-display text-5xl md:text-6xl text-amber-100 mb-2 tracking-wide">
          Spiracia
        </h1>
        <p className="text-stone-400 text-sm mb-8 font-body">
          Ville médiévale • Complots
        </p>
        <div className="space-y-4">
          <label className="block text-left text-stone-400 text-sm">Votre nom</label>
          <input
            type="text"
            value={currentPlayerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Joueur"
            className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-parchment placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-600"
          />
          <button
            onClick={handleJoin}
            className="w-full py-4 rounded-xl font-display text-lg bg-amber-600 hover:bg-amber-500 text-stone-900 font-semibold transition-colors shadow-lg hover:shadow-amber-500/20"
          >
            Rejoindre une partie
          </button>
        </div>
      </div>
    </div>
  )
}
