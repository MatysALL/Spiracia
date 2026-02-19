import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, LogOut, Crown } from 'lucide-react'
import { useGameStore } from '../store/gameStore'

export function Lobby() {
  const navigate = useNavigate()
  const { currentGameId, currentPlayerId, games, leaveLobby } = useGameStore()

  const game = currentGameId ? games.find((g) => g.id === currentGameId) : null

  useEffect(() => {
    if (!currentGameId || !game) {
      navigate('/', { replace: true })
      return
    }
    if (game.started && game.gameState) {
      navigate('/game', { replace: true })
    }
  }, [currentGameId, game, navigate])

  const handleLeave = () => {
    leaveLobby()
    navigate('/')
  }

  if (!game) return null

  const isFull = game.players.length >= 4
  const waiting = !game.started

  return (
    <div className="min-h-screen flex flex-col bg-stone-900 p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl text-amber-100">Salle d'attente</h1>
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800 text-stone-400 hover:text-parchment border border-stone-600"
        >
          <LogOut className="w-4 h-4" /> Quitter
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-wrap justify-center gap-6 max-w-sm">
          {[0, 1, 2, 3].map((i) => {
            const player = game.players[i]
            const isMe = player?.id === currentPlayerId
            const abandoned = player?.isAbandoned
            return (
              <div
                key={i}
                className={`flex flex-col items-center justify-center w-20 h-24 rounded-2xl border-2 transition-colors ${
                  player
                    ? abandoned
                      ? 'bg-red-900/40 border-red-600 text-red-400'
                      : isMe
                        ? 'bg-amber-900/40 border-amber-500 text-amber-400'
                        : 'bg-stone-800 border-stone-600 text-stone-300'
                    : 'bg-stone-800/50 border-stone-700 border-dashed text-stone-600'
                }`}
              >
                {player ? (
                  <>
                    <Users
                      className={`w-10 h-10 mb-1 ${abandoned ? 'text-red-400' : ''}`}
                      strokeWidth={1.5}
                    />
                    <span className="text-xs font-body truncate w-full text-center px-1">
                      {isMe ? 'Vous' : player.name}
                    </span>
                    {abandoned && (
                      <span className="text-[10px] text-red-400 uppercase">Abandon</span>
                    )}
                  </>
                ) : (
                  <>
                    <Crown className="w-8 h-8 mb-1 opacity-50" />
                    <span className="text-xs">En attente</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-8 text-stone-400 text-center text-sm">
          {waiting
            ? isFull
              ? 'Partie complète. Démarrage…'
              : `${game.players.length} / 4 joueurs`
            : 'Partie démarrée.'}
        </p>
      </div>
    </div>
  )
}
