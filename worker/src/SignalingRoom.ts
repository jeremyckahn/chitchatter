interface Session {
  ws: WebSocket
  peerId: string
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate'
  targetPeerId: string
  [key: string]: unknown
}

export class SignalingRoom {
  private sessions: Map<string, Session> = new Map()

  constructor(
    private state: DurableObjectState,
    private env: Record<string, unknown>
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    server.accept()

    const peerId = crypto.randomUUID()

    const existingPeerIds = Array.from(this.sessions.keys())

    server.send(
      JSON.stringify({
        type: 'init',
        peerId,
        peerIds: existingPeerIds,
      })
    )

    this.sessions.set(peerId, { ws: server, peerId })

    this.broadcast({ type: 'peer-joined', peerId }, peerId)

    server.addEventListener('message', (event: MessageEvent) => {
      if (typeof event.data !== 'string') return

      try {
        const data = JSON.parse(event.data) as SignalingMessage
        this.handleMessage(peerId, data)
      } catch {
        // Ignore malformed messages
      }
    })

    const cleanup = () => {
      this.sessions.delete(peerId)
      this.broadcast({ type: 'peer-left', peerId }, peerId)
    }

    server.addEventListener('close', cleanup)
    server.addEventListener('error', cleanup)

    return new Response(null, { status: 101, webSocket: client })
  }

  private handleMessage(fromPeerId: string, data: SignalingMessage): void {
    const { type, targetPeerId, ...rest } = data

    if (!targetPeerId) return

    switch (type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const target = this.sessions.get(targetPeerId)
        if (target) {
          target.ws.send(
            JSON.stringify({
              type,
              fromPeerId,
              ...rest,
            })
          )
        }
        break
      }
    }
  }

  private broadcast(
    message: Record<string, unknown>,
    excludePeerId: string
  ): void {
    const msg = JSON.stringify(message)

    for (const [id, session] of this.sessions) {
      if (id !== excludePeerId) {
        try {
          session.ws.send(msg)
        } catch {
          this.sessions.delete(id)
        }
      }
    }
  }
}
