import { getRelaySockets } from 'trystero'
import { parseCandidate } from 'sdp'

export enum ConnectionTestEvents {
  CONNECTION_TEST_RESULTS_UPDATED = 'CONNECTION_TEST_RESULTS_UPDATED',
  HAS_HOST_CHANGED = 'HAS_HOST_CHANGED',
  HAS_RELAY_CHANGED = 'HAS_RELAY_CHANGED',
}

export enum RelayConnection {
  SEARCHING = 'SEARCHING',
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED',
}

export type ConnectionTestEvent = CustomEvent<ConnectionTest>

const checkExperationTime = 10 * 1000

export class ConnectionTest extends EventTarget {
  relayConnection = RelayConnection.SEARCHING
  hasHost = false
  hasTURNServer = false
  hasPeerReflexive = false
  hasServerReflexive = false

  rtcPeerConnection?: RTCPeerConnection
  rtcConfig: RTCConfiguration

  constructor(rtcConfig: RTCConfiguration) {
    super()
    this.rtcConfig = rtcConfig
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
    }, checkExperationTime)

    const hasTURNServerCheckTimeout = setTimeout(() => {
      this.hasTURNServer = false

      this.dispatchEvent(
        new CustomEvent(ConnectionTestEvents.HAS_RELAY_CHANGED, {
          detail: this,
        })
      )
    }, checkExperationTime)

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

    // Kick off the connection test
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

  testRelayConnection() {
    const relaySockets = Object.values(getRelaySockets())

    if (relaySockets.length === 0) {
      // Trystero has not yet initialized relay sockets
      this.relayConnection = RelayConnection.SEARCHING
      return this.relayConnection
    }

    const readyStates = (relaySockets as WebSocket[]).map((socket) => socket.readyState)

    const haveAllRelayConnectionsFailed = readyStates.every(
      readyState => readyState === WebSocket.CLOSED
    )

    if (haveAllRelayConnectionsFailed) {
      this.relayConnection = RelayConnection.FAILED
      throw new Error('Could not connect to a Nostr relay')
    }

    const areAnyRelaysConnected = readyStates.some(
      readyState => readyState === WebSocket.OPEN
    )

    this.relayConnection = areAnyRelaysConnected
      ? RelayConnection.CONNECTED
      : RelayConnection.SEARCHING

    return this.relayConnection
  }
}
