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
import { peerService, type PeerMessage } from '../services/peerService'
import { resolveDuplicateNames } from '../utils/playerName'

const TOTAL_COINS = 24
const COINS_PER_PLAYER = 2
const CARDS_PER_PLAYER = 2
const REACTION_DURATION_MS = 15000

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
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
  isHost: boolean

  createGame: (playerName: string) => Promise<void>
  joinGameWithId: (gameId: string | null, playerName: string) => Promise<void>
  setPlayerName: (name: string) => void
  leaveLobby: () => void
  abandonPlayer: (playerId: string) => void

  // Game actions
  performAction: (actionType: ActionType, targetPlayerId?: string, characterClaimed?: Character) => void
  performReaction: (type: 'METTRE_EN_DOUTE' | 'CONTRER', characterClaimed?: Character) => void
  resolveReactionPhase: () => void
  tickReactionTimer: () => void
  ambassadeurChooseCards: (cardIdsToKeep: string[]) => void

  // Internal sync
  syncGameState: (state: GameState) => void
  syncLobby: (game: LobbyGame) => void
}

export const useGameStore = create<GameStore>((set, get) => {
  // Setup PeerJS message handler
  peerService.setOnMessage((message: PeerMessage, _from: string) => {
    const store = get()
    switch (message.type) {
      case 'game-state':
        if (store.isHost) return // Host doesn't receive game-state updates
        store.syncGameState(message.payload)
        break
      case 'action':
        if (!store.isHost) return // Only host processes actions
        const { actionType, targetPlayerId, characterClaimed } = message.payload
        processActionLocally(store, actionType, targetPlayerId, characterClaimed, message.playerId)
        break
      case 'reaction':
        if (!store.isHost) return
        const { type, characterClaimed: charClaimed } = message.payload
        processReactionLocally(store, type, charClaimed, message.playerId)
        break
      case 'player-joined':
        if (store.isHost) {
          const { playerId, playerName } = message.payload
          addPlayerToLobby(store, playerId, playerName)
        }
        break
      case 'player-left':
        if (store.isHost) {
          const { playerId } = message.payload
          removePlayerFromLobby(store, playerId)
        }
        break
    }
  })

  return {
    games: [],
    currentPlayerId: null,
    currentPlayerName: 'Joueur',
    currentGameId: null,
    isHost: false,

    setPlayerName: (name) => set({ currentPlayerName: name || 'Joueur' }),

    createGame: async (playerName) => {
      const playerId = generateId()
      const gameId = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')

      try {
        await peerService.initialize(true, gameId)
        const game: LobbyGame = {
          id: gameId,
          players: [{ id: playerId, name: playerName }],
          started: false,
        }

        set({
          games: [game],
          currentPlayerId: playerId,
          currentPlayerName: playerName,
          currentGameId: gameId,
          isHost: true,
        })

        // Update URL
        window.history.pushState({}, '', `/?id=${gameId}`)
      } catch (error) {
        console.error('Erreur création partie:', error)
        alert('Erreur lors de la création de la partie')
      }
    },

    joinGameWithId: async (gameId, playerName) => {
      const playerId = generateId()

      try {
        if (gameId) {
          // Rejoindre avec ID spécifique
          await peerService.initialize(false)
          await peerService.connectToHost(gameId)

          // Initialiser l'état local pour ce joueur client
          set({
            games: [
              {
                id: gameId,
                players: [{ id: playerId, name: playerName }],
                started: false,
              },
            ],
            currentPlayerId: playerId,
            currentPlayerName: playerName,
            currentGameId: gameId,
            isHost: false,
          })
        } else {
          // Rejoindre partie aléatoire (créer si aucune existe)
          const randomId = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0')
          await peerService.initialize(true, randomId)
          const game: LobbyGame = {
            id: randomId,
            players: [{ id: playerId, name: playerName }],
            started: false,
          }
          set({
            games: [game],
            currentPlayerId: playerId,
            currentPlayerName: playerName,
            currentGameId: randomId,
            isHost: true,
          })
          window.history.pushState({}, '', `/?id=${randomId}`)
          return
        }

        // Envoyer message de connexion au host
        peerService.broadcast({
          type: 'player-joined',
          payload: { playerId, playerName },
          timestamp: Date.now(),
          playerId,
        })

        // Attendre la réponse du host avec l'état du lobby
        setTimeout(() => {
          // Le host devrait envoyer l'état du lobby
        }, 500)
      } catch (error) {
        console.error('Erreur connexion:', error)
        alert('Impossible de rejoindre la partie. Vérifiez l\'ID ou créez une nouvelle partie.')
      }
    },

    leaveLobby: () => {
      peerService.disconnect()
      set({ currentGameId: null, currentPlayerId: null, isHost: false })
    },

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

    syncGameState: (state: GameState) => {
      const { games, currentGameId, currentPlayerId } = get()
      if (!currentGameId || !currentPlayerId) return
      
      // Sanitiser l'état reçu pour ne montrer que les cartes révélées des autres
      const sanitized = sanitizeGameStateForPlayer(state, currentPlayerId)
      
      set({
        games: games.map((g) =>
          g.id === currentGameId ? { ...g, gameState: sanitized } : g
        ),
      })
    },

    syncLobby: (game: LobbyGame) => {
      const { games } = get()
      const existing = games.findIndex((g) => g.id === game.id)
      if (existing >= 0) {
        set({
          games: games.map((g) => (g.id === game.id ? game : g)),
        })
      } else {
        set({ games: [...games, game] })
      }
    },

    performAction: (actionType, targetPlayerId, characterClaimed) => {
      const { games, currentGameId, currentPlayerId, isHost } = get()
      const game = games.find((g) => g.id === currentGameId)
      if (!game?.gameState || game.gameState.phase !== 'action' || !currentPlayerId) return
      const state = game.gameState
      const me = state.players.find((p) => p.id === currentPlayerId)
      if (!me || me.isEliminated) return

      // Vérifier que c'est bien notre tour
      if (state.currentTurnPlayerId !== currentPlayerId) {
        console.warn("Ce n'est pas votre tour")
        return
      }

      const mustAssassinate = me.coins >= 10
      if (mustAssassinate && actionType !== 'ASSASSINAT') return
      if (!mustAssassinate && actionType === 'ASSASSINAT' && me.coins < 7) return
      if (actionType === 'POUVOIR_ASSASSIN' && me.coins < 3) return

      if (isHost) {
        processActionLocally(get(), actionType, targetPlayerId, characterClaimed, currentPlayerId)
      } else {
        // Envoyer au host
        peerService.broadcast({
          type: 'action',
          payload: { actionType, targetPlayerId, characterClaimed },
          timestamp: Date.now(),
          playerId: currentPlayerId,
        })
      }
    },

    performReaction: (type, characterClaimed) => {
      const { games, currentGameId, currentPlayerId, isHost } = get()
      const game = games.find((g) => g.id === currentGameId)
      if (!game?.gameState || game.gameState.phase !== 'reaction' || !currentPlayerId) return

      if (isHost) {
        processReactionLocally(get(), type, characterClaimed, currentPlayerId)
      } else {
        peerService.broadcast({
          type: 'reaction',
          payload: { type, characterClaimed },
          timestamp: Date.now(),
          playerId: currentPlayerId,
        })
      }
    },

    resolveReactionPhase: () => {
      const { games, currentGameId, isHost } = get()
      if (!isHost) return // Seul le host peut résoudre
      const game = games.find((g) => g.id === currentGameId)
      if (!game?.gameState || game.gameState.phase !== 'reaction') return
      const state = game.gameState
      if (!state.pendingAction) return
      applyAction(get(), state, state.pendingAction)
      const isAmbassadeurWaiting =
        state.pendingAction.actionType === 'POUVOIR_AMBASSADEUR' &&
        state.ambassadeurSelection !== null
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
      updateGameState(get(), newState)
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
      updateGameState(get(), state)
    },
  }
})

function processActionLocally(
  store: GameStore,
  actionType: ActionType,
  targetPlayerId: string | undefined,
  characterClaimed: Character | undefined,
  playerId: string
) {
  const { games, currentGameId } = store
  const game = games.find((g) => g.id === currentGameId)
  if (!game?.gameState || game.gameState.phase !== 'action') return
  const state = game.gameState
  const me = state.players.find((p) => p.id === playerId)
  if (!me || me.isEliminated) return

  const mustAssassinate = me.coins >= 10
  if (mustAssassinate && actionType !== 'ASSASSINAT') return
  if (!mustAssassinate && actionType === 'ASSASSINAT' && me.coins < 7) return
  if (actionType === 'POUVOIR_ASSASSIN' && me.coins < 3) return

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

  state.logs.push({
    id: generateId(),
    type: 'action',
    message: `${me.name}: ${actionLabels[actionType]}${targetPlayerId ? ` → cible` : ''}`,
    playerId,
    targetId: targetPlayerId,
    timestamp: Date.now(),
  })

  const pending: PendingAction = {
    playerId,
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
    applyAction(store, state, pending)
    const waitingAmbassadeur =
      state.ambassadeurSelection !== null && state.ambassadeurDrawnCards !== null
    if (!waitingAmbassadeur) advanceTurn(state)
    updateGameState(store, state)
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
  updateGameState(store, newState)
}

function processReactionLocally(
  store: GameStore,
  type: 'METTRE_EN_DOUTE' | 'CONTRER',
  characterClaimed: Character | undefined,
  playerId: string
) {
  const { games, currentGameId } = store
  const game = games.find((g) => g.id === currentGameId)
  if (!game?.gameState || game.gameState.phase !== 'reaction') return
  const state = game.gameState
  const pending = state.pendingAction
  if (!pending) return

  const reactor = state.players.find((p) => p.id === playerId)
  if (!reactor || reactor.isEliminated) return

  const canCounter =
    pending.actionType === 'AIDE_ETRANGERE' ||
    pending.actionType === 'POUVOIR_ASSASSIN' ||
    pending.actionType === 'POUVOIR_CAPITAINE'
  const onlyTargetCanCounter =
    pending.actionType === 'POUVOIR_ASSASSIN' || pending.actionType === 'POUVOIR_CAPITAINE'
  if (type === 'CONTRER') {
    if (!canCounter) return
    if (onlyTargetCanCounter && pending.targetPlayerId !== playerId) return
  }

  const newState: GameState = {
    ...state,
    pendingReaction: { type, playerId, characterClaimed },
    reactionEndsAt: null,
    phase: 'resolution',
    logs: [...state.logs],
  }
  newState.logs.push({
    id: generateId(),
    type: 'reaction',
    message: `${reactor.name}: ${type === 'METTRE_EN_DOUTE' ? 'Mettre en doute' : 'Contrer'}`,
    playerId,
    timestamp: Date.now(),
  })
  resolveAll(store, newState)
  updateGameState(store, newState)
}

function addPlayerToLobby(store: GameStore, playerId: string, playerName: string) {
  const { games, currentGameId } = store
  if (!currentGameId) return
  const game = games.find((g) => g.id === currentGameId)
  if (!game || game.started) return

  // Vérifier si partie complète
  if (game.players.length >= 4) {
    // Envoyer message "partie complète"
    return
  }

  const newPlayer: LobbyPlayer = { id: playerId, name: playerName }
  const updatedPlayers = [...game.players, newPlayer]

  // Résoudre les noms dupliqués
  const names = updatedPlayers.map((p) => p.name)
  const resolvedNames = resolveDuplicateNames(names)
  const playersWithResolvedNames = updatedPlayers.map((p, i) => ({
    ...p,
    name: resolvedNames[i],
  }))

  const shouldStart = playersWithResolvedNames.length >= 2 // Minimum 2 joueurs

  const updatedGame: LobbyGame = {
    ...game,
    players: playersWithResolvedNames,
    started: shouldStart,
    gameState: shouldStart ? createInitialGame(playersWithResolvedNames) : undefined,
  }

  store.syncLobby(updatedGame)

  // Envoyer l'état du lobby à tous les joueurs
  peerService.sendToAll({
    type: 'game-state',
    payload: updatedGame.gameState,
    timestamp: Date.now(),
    playerId: '',
  })
}

function removePlayerFromLobby(store: GameStore, playerId: string) {
  const { games, currentGameId } = store
  if (!currentGameId) return
  const game = games.find((g) => g.id === currentGameId)
  if (!game) return

  const updatedPlayers = game.players.filter((p) => p.id !== playerId)
  const updatedGame: LobbyGame = {
    ...game,
    players: updatedPlayers,
    started: false,
    gameState: undefined,
  }

  store.syncLobby(updatedGame)
}

function sanitizeGameStateForPlayer(state: GameState, viewingPlayerId: string): GameState {
  // Créer une copie de l'état avec les cartes filtrées
  const sanitized = {
    ...state,
    players: state.players.map((p) => {
      if (p.id === viewingPlayerId) {
        // Le joueur voit ses propres cartes complètes
        return p
      } else {
        // Les autres joueurs ne voient que les cartes révélées
        return {
          ...p,
          cards: p.cards.filter((c) => c.revealed),
        }
      }
    }),
  }
  return sanitized
}

function updateGameState(store: GameStore, state: GameState) {
  const { currentGameId, isHost } = store
  if (!currentGameId) return
  
  // Le host garde l'état complet, les autres reçoivent une version sanitisée
  if (isHost) {
    // Host diffuse l'état à tous (version générale sanitisée - chaque client filtrera selon son playerId)
    peerService.sendToAll({
      type: 'game-state',
      payload: state, // Le client recevant filtrera selon son currentPlayerId
      timestamp: Date.now(),
      playerId: '',
    })
  }
}

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

function applyAction(_store: GameStore, state: GameState, pending: PendingAction) {
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
