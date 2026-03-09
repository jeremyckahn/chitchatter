import { StreamType } from 'models/chat'

export interface SfuTrackInfo {
  trackName: string
  mid: string | null
  sessionId: string
  trackId: string
  streamType: StreamType
}

interface NewSessionResponse {
  sessionId: string
  [key: string]: unknown
}

interface NewTracksRequest {
  sessionDescription?: {
    type: string
    sdp: string
  }
  tracks: Array<{
    location: 'local' | 'remote'
    trackName: string
    sessionId?: string
    mid?: string | null
  }>
}

interface NewTracksResponse {
  requiresImmediateRenegotiation: boolean
  sessionDescription?: {
    type: string
    sdp: string
  }
  tracks: Array<{
    trackName: string
    mid: string
    sessionId: string
    errorCode?: string
    errorDescription?: string
  }>
}

interface RenegotiateRequest {
  sessionDescription: {
    type: string
    sdp: string
  }
}

interface CloseTracksRequest {
  tracks: Array<{
    mid: string
  }>
  force?: boolean
}

export class SfuClient {
  private apiBase: string

  private pc: RTCPeerConnection | null = null

  private sessionId: string | null = null

  private localTrackMap: Map<
    string,
    { mid: string; trackId: string; streamType: StreamType }
  > = new Map()

  private remoteTrackMap: Map<
    string,
    { trackName: string; sessionId: string; streamType: StreamType }
  > = new Map()

  private onRemoteTrackCallbacks: Array<
    (
      track: MediaStreamTrack,
      stream: MediaStream,
      peerId: string,
      streamType: StreamType
    ) => void
  > = []

  private onRemoteTrackEndCallbacks: Array<
    (peerId: string, streamType: StreamType) => void
  > = []

  constructor(apiBase: string) {
    this.apiBase = apiBase
  }

  private sfuFetch = async (
    path: string,
    method: string,
    body?: unknown
  ): Promise<unknown> => {
    const resp = await fetch(`${this.apiBase}/sfu/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!resp.ok) {
      throw new Error(`SFU API error: ${resp.status} ${resp.statusText}`)
    }

    return resp.json()
  }

  createSession = async (rtcConfig?: RTCConfiguration): Promise<string> => {
    const data = (await this.sfuFetch(
      'sessions/new',
      'POST',
      {}
    )) as NewSessionResponse
    this.sessionId = data.sessionId

    this.pc = new RTCPeerConnection({
      ...rtcConfig,
      iceServers: [
        { urls: 'stun:stun.cloudflare.com:3478' },
        ...(rtcConfig?.iceServers || []),
      ],
      bundlePolicy: 'max-bundle',
    })

    this.pc.ontrack = (event: RTCTrackEvent) => {
      const mid = event.transceiver.mid
      if (!mid) return

      const info = this.remoteTrackMap.get(mid)
      if (!info) return

      const stream = event.streams[0] || new MediaStream([event.track])

      for (const cb of this.onRemoteTrackCallbacks) {
        cb(event.track, stream, info.sessionId, info.streamType)
      }

      event.track.onended = () => {
        for (const cb of this.onRemoteTrackEndCallbacks) {
          cb(info.sessionId, info.streamType)
        }
      }
    }

    return this.sessionId
  }

  pushTrack = async (
    track: MediaStreamTrack,
    stream: MediaStream,
    streamType: StreamType
  ): Promise<string | null> => {
    if (!this.pc || !this.sessionId) return null

    const trackName = `${streamType}_${stream.id}_${track.id}`

    this.pc.addTrack(track, stream)

    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)

    const request: NewTracksRequest = {
      sessionDescription: {
        type: 'offer',
        sdp: this.pc.localDescription!.sdp,
      },
      tracks: [
        {
          location: 'local',
          trackName,
        },
      ],
    }

    const data = (await this.sfuFetch(
      `sessions/${this.sessionId}/tracks/new`,
      'POST',
      request
    )) as NewTracksResponse

    if (data.sessionDescription) {
      await this.pc.setRemoteDescription(
        new RTCSessionDescription({
          type: data.sessionDescription.type as RTCSdpType,
          sdp: data.sessionDescription.sdp,
        })
      )
    }

    const trackInfo = data.tracks[0]
    if (trackInfo && !trackInfo.errorCode) {
      this.localTrackMap.set(trackName, {
        mid: trackInfo.mid,
        trackId: trackInfo.sessionId,
        streamType,
      })
      return trackName
    }

    return null
  }

  pullTracks = async (tracksToSubscribe: SfuTrackInfo[]): Promise<void> => {
    if (!this.pc || !this.sessionId) return

    const request: NewTracksRequest = {
      tracks: tracksToSubscribe.map(t => ({
        location: 'remote' as const,
        trackName: t.trackName,
        sessionId: t.sessionId,
      })),
    }

    const data = (await this.sfuFetch(
      `sessions/${this.sessionId}/tracks/new`,
      'POST',
      request
    )) as NewTracksResponse

    if (data.requiresImmediateRenegotiation && data.sessionDescription) {
      await this.pc.setRemoteDescription(
        new RTCSessionDescription({
          type: data.sessionDescription.type as RTCSdpType,
          sdp: data.sessionDescription.sdp,
        })
      )

      const answer = await this.pc.createAnswer()
      await this.pc.setLocalDescription(answer)

      await this.sfuFetch(`sessions/${this.sessionId}/renegotiate`, 'PUT', {
        sessionDescription: {
          type: 'answer',
          sdp: this.pc.localDescription!.sdp,
        },
      } as RenegotiateRequest)
    }

    for (const t of data.tracks) {
      if (!t.errorCode) {
        const sourceTrack = tracksToSubscribe.find(
          s => s.trackName === t.trackName
        )
        if (sourceTrack) {
          this.remoteTrackMap.set(t.mid, {
            trackName: t.trackName,
            sessionId: sourceTrack.sessionId,
            streamType: sourceTrack.streamType,
          })
        }
      }
    }
  }

  unpushTrack = async (trackName: string): Promise<void> => {
    if (!this.pc || !this.sessionId) return

    const info = this.localTrackMap.get(trackName)
    if (!info) return

    const request: CloseTracksRequest = {
      tracks: [{ mid: info.mid }],
      force: true,
    }

    await this.sfuFetch(
      `sessions/${this.sessionId}/tracks/close`,
      'PUT',
      request
    )

    this.localTrackMap.delete(trackName)
  }

  onRemoteTrack = (
    callback: (
      track: MediaStreamTrack,
      stream: MediaStream,
      peerId: string,
      streamType: StreamType
    ) => void
  ) => {
    this.onRemoteTrackCallbacks.push(callback)
  }

  onRemoteTrackEnd = (
    callback: (peerId: string, streamType: StreamType) => void
  ) => {
    this.onRemoteTrackEndCallbacks.push(callback)
  }

  getSessionId = (): string | null => this.sessionId

  getPeerConnection = (): RTCPeerConnection | null => this.pc

  destroy = async () => {
    if (this.pc && this.sessionId) {
      const mids = Array.from(this.localTrackMap.values()).map(t => ({
        mid: t.mid,
      }))

      if (mids.length > 0) {
        try {
          await this.sfuFetch(
            `sessions/${this.sessionId}/tracks/close`,
            'PUT',
            { tracks: mids, force: true } as CloseTracksRequest
          )
        } catch {
          // Best effort cleanup
        }
      }
    }

    this.pc?.close()
    this.pc = null
    this.sessionId = null
    this.localTrackMap.clear()
    this.remoteTrackMap.clear()
    this.onRemoteTrackCallbacks = []
    this.onRemoteTrackEndCallbacks = []
  }
}
