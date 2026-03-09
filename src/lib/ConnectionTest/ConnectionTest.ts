import { parseCandidate } from 'sdp'

export enum ConnectionTestEvents {
  CONNECTION_TEST_RESULTS_UPDATED = 'CONNECTION_TEST_RESULTS_UPDATED',
  HAS_HOST_CHANGED = 'HAS_HOST_CHANGED',
  HAS_RELAY_CHANGED = 'HAS_RELAY_CHANGED',
  SIGNALING_CONNECTION_CHANGED = 'SIGNALING_CONNECTION_CHANGED',
}

export enum SignalingConnection {
  SEARCHING = 'SEARCHING',
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED',
}

export type ConnectionTestEvent = CustomEvent<ConnectionTest>

const checkExpirationTime = 10 * 1000

export class ConnectionTest extends EventTarget {
  signalingConnection = SignalingConnection.SEARCHING
  hasHost = false
  hasTURNServer = false
  hasPeerReflexive = false
  hasServerReflexive = false

  rtcPeerConnection?: RTCPeerConnection
  rtcConfig: RTCConfiguration
  private signalingServerUrl: string

  constructor(rtcConfig: RTCConfiguration, signalingServerUrl: string) {
    super()
    this.rtcConfig = rtcConfig
    this.signalingServerUrl = signalingServerUrl
  }

  async initRtcPeerConnectionTest() {
    if (typeof RTCPeerConnection === 'undefined') return

    const { iceServers } = this.rtcConfig

    this.rtcPeerConnection = new RTCPeerConnection({
      iceServers,
    })

    const hasHostCheckTimeout = setTimeout(() => {
      this.hasHost = false

      this.dispatchEvent(
        new CustomEvent(ConnectionTestEvents.HAS_HOST_CHANGED, {
          detail: this,
        })
      )
    }, checkExpirationTime)

    const hasTURNServerCheckTimeout = setTimeout(() => {
      this.hasTURNServer = false

      this.dispatchEvent(
        new CustomEvent(ConnectionTestEvents.HAS_RELAY_CHANGED, {
          detail: this,
        })
      )
    }, checkExpirationTime)

    this.rtcPeerConnection.addEventListener('icecandidate', event => {
      if (event.candidate?.candidate.length) {
        const parsedCandidate = parseCandidate(event.candidate.candidate)
        let eventType: ConnectionTestEvents | undefined

        switch (parsedCandidate.type) {
          case 'host':
            clearTimeout(hasHostCheckTimeout)
            this.hasHost = window.navigator.onLine
            eventType = ConnectionTestEvents.HAS_HOST_CHANGED
            break

          case 'relay':
            clearTimeout(hasTURNServerCheckTimeout)
            this.hasTURNServer = window.navigator.onLine
            eventType = ConnectionTestEvents.HAS_RELAY_CHANGED
            break
        }

        if (typeof eventType !== 'undefined') {
          this.dispatchEvent(
            new CustomEvent(eventType, {
              detail: this,
            })
          )
        }

        this.dispatchEvent(
          new Event(ConnectionTestEvents.CONNECTION_TEST_RESULTS_UPDATED)
        )
      }
    })

    try {
      const rtcSessionDescription = await this.rtcPeerConnection.createOffer({
        offerToReceiveAudio: true,
      })

      this.rtcPeerConnection.setLocalDescription(rtcSessionDescription)
    } catch (_e) {}
  }

  destroyRtcPeerConnectionTest() {
    this.rtcPeerConnection?.close()
  }

  async testSignalingConnection(): Promise<SignalingConnection> {
    const httpUrl = this.signalingServerUrl
      .replace('wss://', 'https://')
      .replace('ws://', 'http://')

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const resp = await fetch(`${httpUrl}/health`, {
        signal: controller.signal,
      })

      clearTimeout(timeout)

      this.signalingConnection = resp.ok
        ? SignalingConnection.CONNECTED
        : SignalingConnection.FAILED
    } catch {
      this.signalingConnection = SignalingConnection.FAILED
    }

    this.dispatchEvent(
      new CustomEvent(ConnectionTestEvents.SIGNALING_CONNECTION_CHANGED, {
        detail: this,
      })
    )

    return this.signalingConnection
  }
}
