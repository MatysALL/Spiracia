import { create } from 'zustand'
import type {
  GameState,
  LobbyGame,
  LobbyPlayer,
  Player,
  Character,
  ActionType,
  GameLogEntry,
  PendingAction,
} from '../types/game'
import { CHARACTERS } from '../types/game'

const TOTAL_COINS = 24
const COINS_PER_PLAYER = 2
const CARDS_PER_PLAYER = 2
const REACTION_DURATION_MS = 15000

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function createInitialGame(players: LobbyPlayer[]): GameState {
  const characterPool: Character[] = []
  CHARACTERS.forEach((c) => {
    for (let i = 0; i < 3; i++) characterPool.push(c)
  })
  const shuffled = shuffle(characterPool)
  const numPlayers = players.length
  const totalCardsNeeded = numPlayers * CARDS_PER_PLAYER
  const court = shuffled.slice(totalCardsNeeded).map((c) => c)
  const playerCards = shuffled.slice(0, totalCardsNeeded)

  const gamePlayers: Player[] = players.map((p, i) => ({
    id: p.id,
    name: p.name,
    coins: COINS_PER_PLAYER,
    order: i,
    isEliminated: false,
    isAbandoned: p.isAbandoned,
    cards: [
      { character: playerCards[i * 2], revealed: false, id: generateId() },
      { character: playerCards[i * 2 + 1], revealed: false, id: generateId() },
    ],
  }))

  const treasury = TOTAL_COINS - numPlayers * COINS_PER_PLAYER

  const firstPlayer = gamePlayers[0]
  const logs: GameLogEntry[] = [
    {
      id: generateId(),
      type: 'system',
      message: `Partie démarrée. ${numPlayers} joueurs. Trésor: ${treasury} pièces.`,
      timestamp: Date.now(),
    },
  ]

  return {
    id: generateId(),
    players: gamePlayers,
    court,
    treasury,
    currentTurnPlayerId: firstPlayer.id,
    phase: 'action',
    pendingAction: null,
    pendingReaction: null,
    reactionEndsAt: null,
    logs,
    ambassadeurSelection: null,
    ambassadeurDrawnCards: null,
  }
}

interface GameStore {
  // Lobby
  games: LobbyGame[]
  currentPlayerId: string | null
  currentPlayerName: string
  currentGameId: string | null

  joinOrCreateGame: (playerName: string) => void
  setPlayerName: (name: string) => void
  leaveLobby: () => void
  abandonPlayer: (playerId: string) => void

  // Game actions (simulation locale)
  performAction: (actionType: ActionType, targetPlayerId?: string, characterClaimed?: Character) => void
  performReaction: (type: 'METTRE_EN_DOUTE' | 'CONTRER', characterClaimed?: Character) => void
  resolveReactionPhase: () => void
  tickReactionTimer: () => void
  ambassadeurChooseCards: (cardIdsToKeep: string[]) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  games: [],
  currentPlayerId: null,
  currentPlayerName: 'Joueur',
  currentGameId: null,

  setPlayerName: (name) => set({ currentPlayerName: name || 'Joueur' }),

  joinOrCreateGame: (playerName) => {
    const id = generateId()
    const games = get().games
    let game = games.find((g) => !g.started && g.players.length < 4)
    if (!game) {
      game = {
        id: generateId(),
        players: [],
        started: false,
      }
      set({ games: [...games, game] })
    }
    const newPlayer: LobbyPlayer = { id, name: playerName }
    let updatedPlayers = [...game.players, newPlayer]
    // Simulation : compléter avec des bots pour démarrer à 4
    while (updatedPlayers.length < 4) {
      updatedPlayers.push({
        id: generateId(),
        name: `Bot ${updatedPlayers.length}`,
        isAbandoned: false,
      })
    }
    const updatedGames = get().games.map((g) =>
      g.id === game!.id
        ? {
            ...g,
            players: updatedPlayers,
            started: updatedPlayers.length === 4,
            gameState:
              updatedPlayers.length === 4 ? createInitialGame(updatedPlayers) : undefined,
          }
        : g
    )
    set({
      games: updatedGames,
      currentPlayerId: id,
      currentPlayerName: playerName,
      currentGameId: game.id,
    })
  },

  leaveLobby: () => set({ currentGameId: null, currentPlayerId: null }),

  abandonPlayer: (playerId) => {
    const { games, currentGameId } = get()
    if (!currentGameId) return
    const g = games.find((x) => x.id === currentGameId)
    if (!g) return
    const updated = {
      ...g,
      players: g.players.map((p) => (p.id === playerId ? { ...p, isAbandoned: true } : p)),
    }
    if (g.gameState) {
      updated.gameState = {
        ...g.gameState,
        players: g.gameState.players.map((p) =>
          p.id === playerId ? { ...p, isAbandoned: true } : p
        ),
      }
    }
    set({
      games: games.map((x) => (x.id === currentGameId ? updated : x)),
    })
  },

  performAction: (actionType, targetPlayerId, characterClaimed) => {
    const { games, currentGameId, currentPlayerId } = get()
    const game = games.find((g) => g.id === currentGameId)
    if (!game?.gameState || game.gameState.phase !== 'action' || !currentPlayerId) return
    const state = game.gameState
    const me = state.players.find((p) => p.id === currentPlayerId)
    if (!me || me.isEliminated) return

    const mustAssassinate = me.coins >= 10
    if (mustAssassinate && actionType !== 'ASSASSINAT') return
    if (!mustAssassinate && actionType === 'ASSASSINAT' && me.coins < 7) return
    if (actionType === 'POUVOIR_ASSASSIN' && me.coins < 3) return

    const log = (msg: string, type: GameLogEntry['type'] = 'action') =>
      state.logs.push({
        id: generateId(),
        type,
        message: msg,
        playerId: currentPlayerId,
        targetId: targetPlayerId,
        timestamp: Date.now(),
      })

    const actionLabels: Record<ActionType, string> = {
      REVENU: 'Revenu (+1)',
      AIDE_ETRANGERE: 'Aide étrangère (+2)',
      ASSASSINAT: 'Assassinat (-7)',
      POUVOIR_DUCHESSE: 'La Duchesse (3 pièces)',
      POUVOIR_ASSASSIN: "L'Assassin (3 pièces)",
      POUVOIR_CAPITAINE: 'Le Capitaine (vol 2)',
      POUVOIR_AMBASSADEUR: "L'Ambassadeur (échange)",
      POUVOIR_COMTESSE: 'La Comtesse',
    }

    log(`${me.name}: ${actionLabels[actionType]}${targetPlayerId ? ` → cible` : ''}`, 'action')

    const pending: PendingAction = {
      playerId: currentPlayerId,
      actionType,
      targetPlayerId,
      characterClaimed: characterClaimed ?? undefined,
    }

    const canBeChallenged =
      actionType === 'AIDE_ETRANGERE' ||
      actionType === 'POUVOIR_DUCHESSE' ||
      actionType === 'POUVOIR_ASSASSIN' ||
      actionType === 'POUVOIR_CAPITAINE' ||
      actionType === 'POUVOIR_AMBASSADEUR'
    const canBeCountered =
      actionType === 'AIDE_ETRANGERE' ||
      actionType === 'POUVOIR_ASSASSIN' ||
      actionType === 'POUVOIR_CAPITAINE'
    const assassinatNeverCountered = actionType === 'ASSASSINAT'

    if (assassinatNeverCountered || (!canBeChallenged && !canBeCountered)) {
      applyAction(get(), state, pending)
      const waitingAmbassadeur =
        state.ambassadeurSelection !== null && state.ambassadeurDrawnCards !== null
      if (!waitingAmbassadeur) advanceTurn(state)
      set({ games: get().games })
      return
    }

    const reactionEndsAt = Date.now() + REACTION_DURATION_MS
    const newState: GameState = {
      ...state,
      phase: 'reaction',
      pendingAction: pending,
      pendingReaction: null,
      reactionEndsAt,
      logs: [...state.logs],
    }
    const newGames = games.map((g) =>
      g.id === currentGameId ? { ...g, gameState: newState } : g
    )
    set({ games: newGames })
  },

  performReaction: (type, characterClaimed) => {
    const { games, currentGameId, currentPlayerId } = get()
    const game = games.find((g) => g.id === currentGameId)
    if (!game?.gameState || game.gameState.phase !== 'reaction' || !currentPlayerId) return
    const state = game.gameState
    const pending = state.pendingAction
    if (!pending) return

    const reactor = state.players.find((p) => p.id === currentPlayerId)
    if (!reactor || reactor.isEliminated) return

    const canCounter =
      pending.actionType === 'AIDE_ETRANGERE' ||
      pending.actionType === 'POUVOIR_ASSASSIN' ||
      pending.actionType === 'POUVOIR_CAPITAINE'
    const onlyTargetCanCounter =
      pending.actionType === 'POUVOIR_ASSASSIN' ||
      pending.actionType === 'POUVOIR_CAPITAINE'
    if (type === 'CONTRER') {
      if (!canCounter) return
      if (onlyTargetCanCounter && pending.targetPlayerId !== currentPlayerId) return
    }

    const newState: GameState = {
      ...state,
      pendingReaction: { type, playerId: currentPlayerId, characterClaimed },
      reactionEndsAt: null,
      phase: 'resolution',
      logs: [...state.logs],
    }
    newState.logs.push({
      id: generateId(),
      type: 'reaction',
      message: `${reactor.name}: ${type === 'METTRE_EN_DOUTE' ? 'Mettre en doute' : 'Contrer'}`,
      playerId: currentPlayerId,
      timestamp: Date.now(),
    })
    resolveAll(get(), newState)
    const updatedGames = get().games.map((g) =>
      g.id === currentGameId ? { ...g, gameState: newState } : g
    )
    set({ games: updatedGames })
  },

  resolveReactionPhase: () => {
    const { games, currentGameId } = get()
    const game = games.find((g) => g.id === currentGameId)
    if (!game?.gameState || game.gameState.phase !== 'reaction') return
    const state = game.gameState
    if (!state.pendingAction) return
    applyAction(get(), state, state.pendingAction)
    const isAmbassadeurWaiting =
      state.pendingAction.actionType === 'POUVOIR_AMBASSADEUR' && state.ambassadeurSelection !== null
    if (!isAmbassadeurWaiting) advanceTurn(state)
    const newState: GameState = {
      ...state,
      phase: 'action',
      pendingAction: null,
      pendingReaction: null,
      reactionEndsAt: null,
      logs: [...state.logs],
    }
    newState.logs.push({
      id: generateId(),
      type: 'resolution',
      message: 'Aucune réaction. Action appliquée.',
      timestamp: Date.now(),
    })
    set({
      games: games.map((g) => (g.id === currentGameId ? { ...g, gameState: newState } : g)),
    })
  },

  tickReactionTimer: () => {
    const { games, currentGameId } = get()
    const game = games.find((g) => g.id === currentGameId)
    if (!game?.gameState || game.gameState.phase !== 'reaction') return
    if (Date.now() < (game.gameState.reactionEndsAt ?? 0)) return
    get().resolveReactionPhase()
  },

  ambassadeurChooseCards: (cardIdsToKeep) => {
    const { games, currentGameId, currentPlayerId } = get()
    const game = games.find((g) => g.id === currentGameId)
    if (!game?.gameState || !currentPlayerId) return
    const state = game.gameState
    const me = state.players.find((p) => p.id === currentPlayerId)
    const drawn = state.ambassadeurDrawnCards
    if (!me || !drawn || drawn.length !== 2) return
    const allCards = [...me.cards, ...drawn]
    const toKeep = allCards.filter((c) => cardIdsToKeep.includes(c.id))
    const toReturn = allCards.filter((c) => !cardIdsToKeep.includes(c.id))
    if (toKeep.length !== 2) return
    state.court.push(...toReturn.map((c) => c.character))
    state.court = shuffle(state.court)
    me.cards = toKeep.map((c) => ({ ...c }))
    state.ambassadeurSelection = null
    state.ambassadeurDrawnCards = null
    state.logs.push({
      id: generateId(),
      type: 'resolution',
      message: `${me.name} a échangé des cartes (Ambassadeur).`,
      playerId: currentPlayerId,
      timestamp: Date.now(),
    })
    advanceTurn(state)
    set({ games: get().games })
  },
}))

function advanceTurn(state: GameState) {
  const alive = state.players.filter((p) => !p.isEliminated)
  if (alive.length <= 1) {
    state.phase = 'ended'
    state.currentTurnPlayerId = null
    return
  }
  const currentIdx = state.players.findIndex((p) => p.id === state.currentTurnPlayerId)
  let nextIdx = (currentIdx + 1) % state.players.length
  while (state.players[nextIdx].isEliminated) {
    nextIdx = (nextIdx + 1) % state.players.length
  }
  state.currentTurnPlayerId = state.players[nextIdx].id
}

function applyAction(
  _store: GameStore,
  state: GameState,
  pending: PendingAction
) {
  const { actionType, playerId, targetPlayerId } = pending
  const actor = state.players.find((p) => p.id === playerId)!
  const target = targetPlayerId ? state.players.find((p) => p.id === targetPlayerId) : null

  switch (actionType) {
    case 'REVENU':
      actor.coins += 1
      state.treasury -= 1
      state.logs.push({
        id: generateId(),
        type: 'resolution',
        message: `${actor.name} prend 1 pièce (Revenu).`,
        timestamp: Date.now(),
      })
      break
    case 'AIDE_ETRANGERE':
      actor.coins += 2
      state.treasury -= 2
      state.logs.push({
        id: generateId(),
        type: 'resolution',
        message: `${actor.name} prend 2 pièces (Aide étrangère).`,
        timestamp: Date.now(),
      })
      break
    case 'ASSASSINAT':
      actor.coins -= 7
      state.treasury += 7
      if (target) {
        const hidden = target.cards.filter((c) => !c.revealed)
        if (hidden.length > 0) {
          hidden[0].revealed = true
          state.logs.push({
            id: generateId(),
            type: 'resolution',
            message: `Assassinat: ${target.name} perd un personnage.`,
            targetId: target.id,
            timestamp: Date.now(),
          })
          if (target.cards.every((c) => c.revealed)) {
            target.isEliminated = true
            state.treasury += target.coins
            target.coins = 0
          }
        }
      }
      break
    case 'POUVOIR_DUCHESSE':
      actor.coins += 3
      state.treasury -= 3
      state.logs.push({
        id: generateId(),
        type: 'resolution',
        message: `${actor.name} prend 3 pièces (La Duchesse).`,
        timestamp: Date.now(),
      })
      break
    case 'POUVOIR_ASSASSIN':
      actor.coins -= 3
      state.treasury += 3
      if (target) {
        const hidden = target.cards.filter((c) => !c.revealed)
        if (hidden.length > 0) {
          hidden[0].revealed = true
          state.logs.push({
            id: generateId(),
            type: 'resolution',
            message: `L'Assassin: ${target.name} perd un personnage.`,
            targetId: target.id,
            timestamp: Date.now(),
          })
          if (target.cards.every((c) => c.revealed)) {
            target.isEliminated = true
            state.treasury += target.coins
            target.coins = 0
          }
        }
      }
      break
    case 'POUVOIR_CAPITAINE':
      if (target && target.coins > 0) {
        const steal = Math.min(2, target.coins)
        target.coins -= steal
        actor.coins += steal
        state.logs.push({
          id: generateId(),
          type: 'resolution',
          message: `Le Capitaine: ${actor.name} vole ${steal} pièce(s) à ${target.name}.`,
          targetId: target.id,
          timestamp: Date.now(),
        })
      }
      break
    case 'POUVOIR_AMBASSADEUR': {
      const drawnChars = state.court.splice(0, 2)
      state.ambassadeurDrawnCards = drawnChars.map((character) => ({
        character,
        revealed: false,
        id: generateId(),
      }))
      state.ambassadeurSelection = []
      state.logs.push({
        id: generateId(),
        type: 'resolution',
        message: `${actor.name} utilise l'Ambassadeur (pioche 2, en garde 2).`,
        timestamp: Date.now(),
      })
      break
    }
    default:
      break
  }
}

function resolveAll(store: GameStore, state: GameState) {
  const pending = state.pendingAction
  const reaction = state.pendingReaction
  if (!pending) return

  const actor = state.players.find((p) => p.id === pending.playerId)!
  const hasClaimedCharacter = (c: Character) =>
    actor.cards.some((card) => !card.revealed && card.character === c)

  if (reaction?.type === 'METTRE_EN_DOUTE') {
    const challenger = state.players.find((p) => p.id === reaction.playerId)!
    const claimed = pending.characterClaimed
    const actorHasIt = claimed ? hasClaimedCharacter(claimed) : false

    if (!actorHasIt) {
      const toReveal = actor.cards.find((c) => !c.revealed)
      if (toReveal) {
        toReveal.revealed = true
        state.logs.push({
          id: generateId(),
          type: 'resolution',
          message: `${actor.name} n'avait pas le personnage. Il perd une carte.`,
          timestamp: Date.now(),
        })
        if (actor.cards.every((c) => c.revealed)) {
          actor.isEliminated = true
          state.treasury += actor.coins
          actor.coins = 0
        }
      }
    } else {
      const toReveal = challenger.cards.find((c) => !c.revealed)
      if (toReveal) {
        toReveal.revealed = true
        state.logs.push({
          id: generateId(),
          type: 'resolution',
          message: `${challenger.name} a perdu le défi. Il perd une carte.`,
          timestamp: Date.now(),
        })
        if (challenger.cards.every((c) => c.revealed)) {
          challenger.isEliminated = true
          state.treasury += challenger.coins
          challenger.coins = 0
        }
      }
      const cardToSwap = actor.cards.find((c) => !c.revealed && c.character === claimed)
      if (cardToSwap && state.court.length > 0) {
        state.court.push(cardToSwap.character)
        state.court = shuffle(state.court)
        const newChar = state.court.pop()!
        cardToSwap.character = newChar
      }
      applyAction(store, state, pending)
    }
  } else if (reaction?.type === 'CONTRER') {
    const counter = state.players.find((p) => p.id === reaction.playerId)!
    const counterHasCharacter = reaction.characterClaimed
      ? counter.cards.some((c) => !c.revealed && c.character === reaction.characterClaimed)
      : false
    if (counterHasCharacter) {
      state.logs.push({
        id: generateId(),
        type: 'resolution',
        message: `Contre réussi. L'action échoue.`,
        timestamp: Date.now(),
      })
      if (pending.actionType === 'POUVOIR_ASSASSIN') {
        const actor = state.players.find((p) => p.id === pending.playerId)!
        actor.coins -= 3
        state.treasury += 3
      }
    } else {
      applyAction(store, state, pending)
    }
  }

  state.phase = 'action'
  state.pendingAction = null
  state.pendingReaction = null
  state.reactionEndsAt = null
  advanceTurn(state)
}
