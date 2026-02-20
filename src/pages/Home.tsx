import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo3D } from '../components/Logo3D'
import { useGameStore } from '../store/gameStore'
import { TITLES } from '../utils/playerName'

export function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentPlayerName, setPlayerName, createGame, joinGameWithId } = useGameStore()
  const [gameIdInput, setGameIdInput] = useState('')
  const [selectedTitle, setSelectedTitle] = useState(TITLES[0])
  const [pseudo, setPseudo] = useState('joueur')

  useEffect(() => {
    const fullName = `${selectedTitle} ${pseudo}`
    setPlayerName(fullName)
  }, [selectedTitle, pseudo, setPlayerName])

  const handleCreateGame = async () => {
    const name = `${selectedTitle} ${pseudo || 'joueur'}`
    if (!pseudo.trim()) return
    await createGame(name)
    navigate('/lobby')
  }

  const handleJoinRandom = async () => {
    const name = `${selectedTitle} ${pseudo || 'joueur'}`
    if (!pseudo.trim()) return
    await joinGameWithId(null, name)
    navigate('/lobby')
  }

  const handleJoinWithId = async () => {
    const name = `${selectedTitle} ${pseudo || 'joueur'}`
    if (!pseudo.trim()) return
    const id = gameIdInput.trim().padStart(3, '0').slice(0, 3)
    if (id.length !== 3 || !/^\d{3}$/.test(id)) {
      alert('Veuillez entrer un ID valide (3 chiffres)')
      return
    }
    await joinGameWithId(id, name)
    navigate('/lobby')
  }

  useEffect(() => {
    const idFromUrl = searchParams.get('id')
    if (idFromUrl) {
      setGameIdInput(idFromUrl)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-stone-900 via-stone-850 to-stone-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <Logo3D className="mx-auto" />
        </div>
        <h1 className="font-display text-5xl md:text-6xl text-amber-100 mb-2 tracking-wide" style={{ fontFamily: '"Medieval Sharp", cursive' }}>
          Spiracia
        </h1>
        <p className="text-stone-400 text-sm mb-8 font-body">
          Comprend les cartes de : Complots 1
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-left text-stone-400 text-sm mb-2">Votre nom</label>
            <div className="flex gap-2">
              <select
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value as typeof TITLES[number])}
                className="px-3 py-3 rounded-xl bg-stone-800 border border-stone-600 text-parchment focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-600"
              >
                {TITLES.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="joueur"
                className="flex-1 px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-parchment placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-600"
              />
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCreateGame}
              className="w-full py-3 rounded-xl font-display text-base bg-amber-600 hover:bg-amber-500 text-stone-900 font-semibold transition-colors shadow-lg hover:shadow-amber-500/20"
            >
              Créer une partie
            </button>

            <button
              onClick={handleJoinRandom}
              className="w-full py-3 rounded-xl font-display text-base bg-stone-700 hover:bg-stone-600 text-parchment font-semibold transition-colors"
            >
              Rejoindre une partie aléatoire
            </button>

            <div className="flex gap-2">
              <input
                type="text"
                value={gameIdInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 3)
                  setGameIdInput(val)
                }}
                placeholder="000"
                maxLength={3}
                className="flex-1 px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-parchment placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-600 text-center font-mono text-lg"
              />
              <button
                onClick={handleJoinWithId}
                disabled={gameIdInput.length !== 3}
                className="px-6 py-3 rounded-xl font-display text-base bg-stone-700 hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed text-parchment font-semibold transition-colors"
              >
                Rejoindre
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
