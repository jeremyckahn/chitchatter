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

  testSignalingConnection(): SignalingConnection {
    const httpUrl = this.signalingServerUrl
      .replace('wss://', 'https://')
      .replace('ws://', 'http://')

    try {
      const ws = new WebSocket(
        `${this.signalingServerUrl}/room/__connection_test__`
      )
      let resolved = false

      const testPromise = new Promise<SignalingConnection>(resolve => {
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true
            ws.close()
            resolve(SignalingConnection.FAILED)
          }
        }, 5000)

        ws.onopen = () => {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            ws.close()
            resolve(SignalingConnection.CONNECTED)
          }
        }

        ws.onerror = () => {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            resolve(SignalingConnection.FAILED)
          }
        }
      })

      testPromise.then(result => {
        this.signalingConnection = result
        this.dispatchEvent(
          new CustomEvent(ConnectionTestEvents.SIGNALING_CONNECTION_CHANGED, {
            detail: this,
          })
        )
      })

      // Use fetch as a quick connectivity check instead of waiting for WebSocket
      fetch(httpUrl, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          if (!resolved) {
            this.signalingConnection = SignalingConnection.SEARCHING
          }
        })
        .catch(() => {
          if (!resolved) {
            resolved = true
            ws.close()
            this.signalingConnection = SignalingConnection.FAILED
          }
        })
    } catch {
      this.signalingConnection = SignalingConnection.FAILED
    }

    return this.signalingConnection
  }
}
