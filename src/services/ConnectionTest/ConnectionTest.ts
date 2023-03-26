import { rtcConfig } from 'config/rtcConfig'
import { parseCandidate } from 'sdp'

export class ConnectionTest {
  hasHost = false
  hasRelay = false
  hasPeerReflexive = false
  hasServerReflexive = false

  constructor() {
    if (typeof RTCPeerConnection !== 'undefined') {
      this.runRtcPeerConnectionTest()
    }
  }

  async runRtcPeerConnectionTest() {
    const { iceServers } = rtcConfig

    const rtcPeerConnection = new RTCPeerConnection({
      iceServers,
    })

    rtcPeerConnection.onicecandidate = event => {
      if (event.candidate) {
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
      }
    }

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
