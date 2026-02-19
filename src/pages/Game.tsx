import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Coins, Library } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { CharacterIcon, getCharacterLabel } from '../components/CharacterIcon'
import { ActionLog } from '../components/ActionLog'
import { ReactionTimer } from '../components/ReactionTimer'
import type { ActionType, Character } from '../types/game'
import { CHARACTERS } from '../types/game'

export function Game() {
  const navigate = useNavigate()
  const {
    currentGameId,
    currentPlayerId,
    games,
    performAction,
    performReaction,
    resolveReactionPhase,
    tickReactionTimer,
    ambassadeurChooseCards,
  } = useGameStore()

  const game = currentGameId ? games.find((g) => g.id === currentGameId) : null
  const state = game?.gameState

  useEffect(() => {
    if (!currentGameId || !game) {
      navigate('/', { replace: true })
      return
    }
    if (!game.started || !state) {
      navigate('/lobby', { replace: true })
      return
    }
  }, [currentGameId, game, state, navigate])

  useEffect(() => {
    if (!state || state.phase !== 'reaction') return
    const t = setInterval(tickReactionTimer, 500)
    return () => clearInterval(t)
  }, [state?.phase, tickReactionTimer])

  // Simulation des tours des bots
  useEffect(() => {
    if (!state || state.phase !== 'action' || !state.currentTurnPlayerId) return
    const turnPlayer = state.players.find((p) => p.id === state.currentTurnPlayerId)
    if (!turnPlayer?.name.startsWith('Bot') || turnPlayer.isEliminated) return
    const timer = setTimeout(() => {
      const alive = state.players.filter((p) => !p.isEliminated && p.id !== turnPlayer.id)
      if (turnPlayer.coins >= 10 && alive.length > 0) {
        performAction('ASSASSINAT', alive[0].id)
      } else if (turnPlayer.coins >= 7 && alive.length > 0 && Math.random() > 0.6) {
        performAction('ASSASSINAT', alive[Math.floor(Math.random() * alive.length)].id)
      } else if (Math.random() > 0.5) {
        performAction('REVENU')
      } else {
        performAction('AIDE_ETRANGERE')
      }
    }, 1800)
    return () => clearTimeout(timer)
  }, [state?.currentTurnPlayerId, state?.phase, state?.players, performAction])

  if (!state) return null

  const me = state.players.find((p) => p.id === currentPlayerId)
  const isMyTurn = state.currentTurnPlayerId === currentPlayerId
  const phase = state.phase
  const isReaction = phase === 'reaction'
  const pending = state.pendingAction
  const canReact = isReaction && me && !me.isEliminated && currentPlayerId !== pending?.playerId
  const ambassadeurMode =
    state.ambassadeurSelection !== null &&
    state.ambassadeurDrawnCards &&
    state.currentTurnPlayerId === currentPlayerId
  const mustAssassinate = me && me.coins >= 10
  const aliveOpponents = state.players.filter(
    (p) => !p.isEliminated && p.id !== currentPlayerId && !p.isAbandoned
  )
  const winner =
    state.phase === 'ended'
      ? state.players.find((p) => !p.isEliminated)
      : null

  const handleAction = (actionType: ActionType, targetId?: string, character?: Character) => {
    performAction(actionType, targetId, character)
  }

  const handleReaction = (type: 'METTRE_EN_DOUTE' | 'CONTRER', character?: Character) => {
    performReaction(type, character)
  }

  const handleAmbassadeurKeep = (cardIds: string[]) => {
    if (cardIds.length !== 2) return
    ambassadeurChooseCards(cardIds)
  }

  if (winner && state.phase === 'ended') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-900">
        <h1 className="font-display text-3xl text-amber-100 mb-4">Partie terminée</h1>
        <p className="text-parchment text-lg">
          Victoire : <strong>{winner.name}</strong>
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-8 px-6 py-3 rounded-xl bg-amber-600 text-stone-900 font-semibold"
        >
          Retour à l'accueil
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-900 text-parchment pb-safe">
      {/* Zone centrale : Trésor + Cour */}
      <div className="flex-1 p-4 flex flex-col md:flex-row gap-4">
        <main className="flex-1 flex flex-col items-center justify-center gap-6 rounded-2xl bg-stone-800/60 border border-stone-600 p-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-900/40 border border-amber-700">
              <Coins className="w-6 h-6 text-amber-400" />
              <span className="font-display text-xl text-amber-200">Trésor</span>
              <span className="font-mono text-amber-100">{state.treasury}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-700/60 border border-stone-600">
              <Library className="w-6 h-6 text-stone-400" />
              <span className="text-stone-300">Cour</span>
              <span className="font-mono">{state.court.length}</span>
            </div>
          </div>
          {pending && isReaction && (
            <div className="text-center">
              <ReactionTimer
                endsAt={state.reactionEndsAt}
                onEnd={resolveReactionPhase}
                className="w-64"
              />
              <p className="text-stone-400 text-sm mt-2">
                Mettre en doute ou contrer ?
              </p>
            </div>
          )}
        </main>

        {/* Logs à droite / overlay */}
        <aside className="w-full md:w-72 shrink-0">
          <ActionLog logs={state.logs} />
        </aside>
      </div>

      {/* Overlay Ambassadeur : choisir 2 cartes */}
      {ambassadeurMode && state.ambassadeurDrawnCards && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-stone-800 rounded-2xl border border-stone-600 p-6 max-w-md w-full">
            <h2 className="font-display text-xl text-amber-100 mb-4">
              Choisissez 2 cartes à garder
            </h2>
            <p className="text-stone-400 text-sm mb-4">
              Vous avez 2 cartes en main + 2 piochées. Sélectionnez les 2 à conserver.
            </p>
            <AmbassadeurPicker
              handCards={me!.cards}
              drawnCards={state.ambassadeurDrawnCards}
              onChoose={handleAmbassadeurKeep}
            />
          </div>
        </div>
      )}

      {/* Joueurs adverses (mini) */}
      <div className="px-4 py-2 flex flex-wrap gap-2 justify-center border-t border-stone-700">
        {state.players
          .filter((p) => p.id !== currentPlayerId && !p.isEliminated)
          .map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                p.isAbandoned ? 'bg-red-900/30 border-red-700' : 'bg-stone-800 border-stone-600'
              } ${state.currentTurnPlayerId === p.id ? 'ring-2 ring-amber-500' : ''}`}
            >
              <span className="text-sm font-medium">{p.name}</span>
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-xs">{p.coins}</span>
              <div className="flex gap-0.5">
                {p.cards.map((c) => (
                  <CharacterIcon key={c.id} character={c.character} revealed={c.revealed} size="sm" />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Mes cartes + actions en bas */}
      <div className="border-t border-stone-700 bg-stone-800/80 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-stone-400">Vos cartes</span>
          {me && (
            <span className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-amber-500" /> {me.coins} pièces
            </span>
          )}
        </div>
        <div className="flex justify-center gap-3">
          {me?.cards.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border-2 p-2 ${
                c.revealed ? 'bg-stone-700 border-stone-600' : 'bg-stone-800 border-amber-700/50'
              }`}
            >
              <CharacterIcon character={c.character} revealed={c.revealed} size="lg" showLabel />
            </div>
          ))}
        </div>

        {/* Phase réaction : Mettre en doute / Contrer */}
        {canReact && pending && (
          <div className="space-y-2">
            <p className="text-sm text-amber-400">
              Action annoncée. Vous pouvez réagir.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleReaction('METTRE_EN_DOUTE')}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-900 font-medium text-sm"
              >
                Mettre en doute
              </button>
              {(pending.actionType === 'AIDE_ETRANGERE' ||
                pending.actionType === 'POUVOIR_ASSASSIN' ||
                pending.actionType === 'POUVOIR_CAPITAINE') && (
                <button
                  onClick={() =>
                    handleReaction(
                      'CONTRER',
                      pending.actionType === 'AIDE_ETRANGERE'
                        ? 'DUCHESSE'
                        : pending.actionType === 'POUVOIR_ASSASSIN'
                          ? 'COMTESSE'
                          : 'AMBASSADEUR'
                    )
                  }
                  className="px-4 py-2 rounded-lg bg-stone-600 hover:bg-stone-500 text-parchment font-medium text-sm"
                >
                  Contrer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Actions (mon tour) */}
        {isMyTurn && phase === 'action' && !ambassadeurMode && me && !me.isEliminated && (
          <div className="space-y-2">
            <p className="text-sm text-stone-400">Choisissez une action (bluff autorisé)</p>
            <div className="flex flex-wrap gap-2">
              {mustAssassinate ? (
                <>
                  {aliveOpponents.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-amber-400 text-sm w-full">10+ pièces : Assassinat obligatoire</span>
                      {aliveOpponents.map((target) => (
                        <button
                          key={target.id}
                          onClick={() => handleAction('ASSASSINAT', target.id)}
                          className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm"
                        >
                          Assassinat → {target.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleAction('REVENU')}
                    className="px-3 py-2 rounded-lg bg-stone-600 hover:bg-stone-500 text-sm"
                  >
                    Revenu (+1)
                  </button>
                  <button
                    onClick={() => handleAction('AIDE_ETRANGERE')}
                    className="px-3 py-2 rounded-lg bg-stone-600 hover:bg-stone-500 text-sm"
                  >
                    Aide étrangère (+2)
                  </button>
                  {me.coins >= 7 &&
                    aliveOpponents.map((target) => (
                      <button
                        key={target.id}
                        onClick={() => handleAction('ASSASSINAT', target.id)}
                        className="px-3 py-2 rounded-lg bg-red-800/60 hover:bg-red-700 text-sm"
                      >
                        Assassinat → {target.name}
                      </button>
                    ))}
                  {CHARACTERS.map((char) => (
                    <CharacterActionButton
                      key={char}
                      character={char}
                      me={me}
                      aliveOpponents={aliveOpponents}
                      onAction={handleAction}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CharacterActionButton({
  character,
  me,
  aliveOpponents,
  onAction,
}: {
  character: Character
  me: { coins: number; cards: { character: Character }[] }
  aliveOpponents: { id: string; name: string }[]
  onAction: (action: ActionType, targetId?: string, claimed?: Character) => void
}) {
  const actionByChar: Record<Character, ActionType> = {
    DUCHESSE: 'POUVOIR_DUCHESSE',
    ASSASSIN: 'POUVOIR_ASSASSIN',
    COMTESSE: 'POUVOIR_COMTESSE',
    CAPITAINE: 'POUVOIR_CAPITAINE',
    AMBASSADEUR: 'POUVOIR_AMBASSADEUR',
  }
  const action = actionByChar[character]
  if (action === 'POUVOIR_COMTESSE') return null
  const needTarget = action === 'POUVOIR_ASSASSIN' || action === 'POUVOIR_CAPITAINE'
  const needCoins = action === 'POUVOIR_ASSASSIN' && me.coins < 3
  if (needCoins) return null

  const label = getCharacterLabel(character)
  if (!needTarget) {
    return (
      <button
        onClick={() => onAction(action, undefined, character)}
        className="px-3 py-2 rounded-lg bg-stone-600 hover:bg-stone-500 text-sm"
      >
        {label}
      </button>
    )
  }
  return (
    <>
      {aliveOpponents.map((target) => (
        <button
          key={target.id}
          onClick={() => onAction(action, target.id, character)}
          className="px-3 py-2 rounded-lg bg-stone-600 hover:bg-stone-500 text-sm"
        >
          {label} → {target.name}
        </button>
      ))}
    </>
  )
}

function AmbassadeurPicker({
  handCards,
  drawnCards,
  onChoose,
}: {
  handCards: { id: string; character: Character }[]
  drawnCards: { id: string; character: Character }[]
  onChoose: (ids: string[]) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const all = [...handCards, ...drawnCards]

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 2) next.add(id)
      else {
        next.clear()
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-center">
        {all.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`rounded-xl border-2 p-3 transition-colors ${
              selected.has(c.id) ? 'border-amber-500 bg-amber-900/30' : 'border-stone-600 bg-stone-800'
            }`}
          >
            <CharacterIcon character={c.character} size="lg" showLabel />
          </button>
        ))}
      </div>
      <button
        disabled={selected.size !== 2}
        onClick={() => onChoose(Array.from(selected))}
        className="w-full py-3 rounded-xl bg-amber-600 disabled:opacity-50 text-stone-900 font-semibold"
      >
        Garder ces 2 cartes
      </button>
    </div>
  )
}
