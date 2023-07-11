import { getTrackers } from 'trystero/torrent'
import { rtcConfig } from 'config/rtcConfig'
import { parseCandidate } from 'sdp'

export enum ConnectionTestEvents {
  CONNECTION_TEST_RESULTS_UPDATED = 'CONNECTION_TEST_RESULTS_UPDATED',
  HAS_HOST_CHANGED = 'HAS_HOST_CHANGED',
  HAS_RELAY_CHANGED = 'HAS_RELAY_CHANGED',
}

export type ConnectionTestEvent = CustomEvent<ConnectionTest>

const checkExperationTime = 10 * 1000

export class ConnectionTest extends EventTarget {
  hasTracker = false
  hasHost = false
  hasRelay = false
  hasPeerReflexive = false
  hasServerReflexive = false

  rtcPeerConnection?: RTCPeerConnection

  async startRtcPeerConnectionTest() {
    if (typeof RTCPeerConnection === 'undefined') return

    const { iceServers } = rtcConfig

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

    const hasRelayCheckTimeout = setTimeout(() => {
      this.hasRelay = false

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
            clearTimeout(hasRelayCheckTimeout)
            this.hasRelay = window.navigator.onLine
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
    } catch (e) {}
  }

  destroyRtcPeerConnectionTest() {
    this.rtcPeerConnection?.close()
  }

  runTrackerConnectionTest() {
    const trackers = getTrackers()

    const readyStates = Object.values(trackers).map(
      ({ readyState }) => readyState
    )

    const areAnyTrackersConnected = readyStates.some(
      readyState => readyState === WebSocket.OPEN
    )

    this.hasTracker = areAnyTrackersConnected
  }
}

export const connectionTest = new ConnectionTest()
