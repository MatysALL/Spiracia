// Règles Complots – types pour Spiracia

export const CHARACTERS = ['DUCHESSE', 'ASSASSIN', 'COMTESSE', 'CAPITAINE', 'AMBASSADEUR'] as const
export type Character = (typeof CHARACTERS)[number]

export type ActionType =
  | 'REVENU'
  | 'AIDE_ETRANGERE'
  | 'ASSASSINAT'
  | 'POUVOIR_DUCHESSE'
  | 'POUVOIR_ASSASSIN'
  | 'POUVOIR_CAPITAINE'
  | 'POUVOIR_AMBASSADEUR'
  | 'POUVOIR_COMTESSE' // pas d'action active, seulement contrer

export type ReactionType = 'METTRE_EN_DOUTE' | 'CONTRER' | null

export interface PlayerCard {
  character: Character
  revealed: boolean
  id: string
}

export interface Player {
  id: string
  name: string
  coins: number
  cards: PlayerCard[]
  isEliminated: boolean
  isAbandoned?: boolean
  order: number
}

export interface GameLogEntry {
  id: string
  type: 'action' | 'reaction' | 'resolution' | 'system'
  message: string
  playerId?: string
  targetId?: string
  timestamp: number
}

export interface PendingAction {
  playerId: string
  actionType: ActionType
  targetPlayerId?: string
  characterClaimed?: Character
}

export interface PendingReaction {
  type: ReactionType
  playerId: string
  characterClaimed?: Character
}

export interface GameState {
  id: string
  players: Player[]
  court: Character[]
  treasury: number
  currentTurnPlayerId: string | null
  phase: 'setup' | 'action' | 'reaction' | 'resolution' | 'ended'
  pendingAction: PendingAction | null
  pendingReaction: PendingReaction | null
  reactionEndsAt: number | null
  logs: GameLogEntry[]
  ambassadeurSelection: string[] | null
  ambassadeurDrawnCards: PlayerCard[] | null // 2 cartes piochées à la Cour (affichage choix)
}

export interface LobbyPlayer {
  id: string
  name: string
  isReady?: boolean
  isAbandoned?: boolean
}

export interface LobbyGame {
  id: string
  players: LobbyPlayer[]
  started: boolean
  gameState?: GameState
}
