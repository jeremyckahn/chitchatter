import { rtcConfig } from 'config/rtcConfig'
import { parseCandidate } from 'sdp'

export enum ConnectionTestEvents {
  CONNECTION_TEST_RESULTS_UPDATED = 'connectionTestResultsUpdated',
}

export class ConnectionTest extends EventTarget {
  hasHost = false
  hasRelay = false
  hasPeerReflexive = false
  hasServerReflexive = false

  async runRtcPeerConnectionTest() {
    if (typeof RTCPeerConnection === 'undefined') return

    const { iceServers } = rtcConfig

    const rtcPeerConnection = new RTCPeerConnection({
      iceServers,
    })

    rtcPeerConnection.addEventListener('icecandidate', event => {
      if (event.candidate?.candidate.length) {
        const parsedCandidate = parseCandidate(event.candidate.candidate)

        switch (parsedCandidate.type) {
          case 'host':
            this.hasHost = true
            break

          case 'relay':
            this.hasRelay = true
            break

          case 'prflx':
            this.hasPeerReflexive = true
            break

          case 'srflx':
            this.hasServerReflexive = true
            break
        }

        this.dispatchEvent(
          new Event(ConnectionTestEvents.CONNECTION_TEST_RESULTS_UPDATED)
        )
      }
    })

    // Kick off the connection test
    try {
      const rtcSessionDescription = await rtcPeerConnection.createOffer({
        offerToReceiveAudio: true,
      })

      rtcPeerConnection.setLocalDescription(rtcSessionDescription)
    } catch (e) {}
  }
}

export const connectionTest = new ConnectionTest()
