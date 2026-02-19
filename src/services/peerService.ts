import Peer, { DataConnection } from 'peerjs'

export interface PeerMessage {
  type: 'game-state' | 'action' | 'reaction' | 'player-joined' | 'player-left' | 'ping'
  payload: any
  timestamp: number
  playerId: string
}

export class PeerService {
  private peer: Peer | null = null
  private connections: Map<string, DataConnection> = new Map()
  private isHost = false
  private gameId: string | null = null
  private onMessageCallback?: (message: PeerMessage, from: string) => void
  private onConnectionCallback?: (peerId: string) => void
  private onDisconnectionCallback?: (peerId: string) => void

  async initialize(isHost: boolean, gameId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.isHost = isHost
        const peerId = gameId || this.generateGameId()
        this.gameId = peerId

        this.peer = new Peer(peerId, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
        })

        this.peer.on('open', (id) => {
          console.log('Peer ouvert:', id)
          resolve(id)
        })

        this.peer.on('error', (err) => {
          console.error('Erreur Peer:', err)
          reject(err)
        })

        if (isHost) {
          this.peer.on('connection', (conn) => {
            this.setupConnection(conn)
          })
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async connectToHost(hostId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error('Peer non initialisé'))
        return
      }

      const conn = this.peer.connect(hostId, {
        reliable: true,
      })

      conn.on('open', () => {
        this.setupConnection(conn)
        resolve()
      })

      conn.on('error', (err) => {
        reject(err)
      })
    })
  }

  private setupConnection(conn: DataConnection) {
    const peerId = conn.peer

    conn.on('open', () => {
      console.log('Connexion établie avec:', peerId)
      this.connections.set(peerId, conn)
      this.onConnectionCallback?.(peerId)
    })

    conn.on('data', (data: PeerMessage) => {
      this.onMessageCallback?.(data, peerId)
    })

    conn.on('close', () => {
      console.log('Connexion fermée avec:', peerId)
      this.connections.delete(peerId)
      this.onDisconnectionCallback?.(peerId)
    })

    conn.on('error', (err) => {
      console.error('Erreur de connexion:', err)
    })
  }

  sendToAll(message: PeerMessage) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(message)
      }
    })
  }

  sendToHost(message: PeerMessage) {
    if (!this.isHost && this.connections.size > 0) {
      const hostConn = Array.from(this.connections.values())[0]
      if (hostConn.open) {
        hostConn.send(message)
      }
    }
  }

  broadcast(message: PeerMessage) {
    if (this.isHost) {
      this.sendToAll(message)
    } else {
      this.sendToHost(message)
    }
  }

  setOnMessage(callback: (message: PeerMessage, from: string) => void) {
    this.onMessageCallback = callback
  }

  setOnConnection(callback: (peerId: string) => void) {
    this.onConnectionCallback = callback
  }

  setOnDisconnection(callback: (peerId: string) => void) {
    this.onDisconnectionCallback = callback
  }

  getConnectedPeers(): string[] {
    return Array.from(this.connections.keys())
  }

  isConnected(): boolean {
    return this.peer !== null && this.peer.open
  }

  disconnect() {
    this.connections.forEach((conn) => conn.close())
    this.connections.clear()
    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }
  }

  private generateGameId(): string {
    return Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
  }

  getGameId(): string | null {
    return this.gameId
  }

  getIsHost(): boolean {
    return this.isHost
  }
}

export const peerService = new PeerService()
