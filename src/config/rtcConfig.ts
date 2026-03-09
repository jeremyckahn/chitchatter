/**
 * This file exports an RTCConfiguration object that is provided as `config.rtcConfig`
 * to Trystero's `joinRoom` function.
 *
 * See:
 * - Trystero joinRoom configuration docs: https://github.com/dmotz/trystero#joinroomconfig-namespace
 * - MDN RTCPeerConnection parameters: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#parameters
 */

export const rtcConfig: RTCConfiguration = {
  // ICE servers are used for establishing connectivity between peers.
  // Adding a STUN server helps to gather candidates that reflect the public IP,
  // and TURN servers act as a relay if a direct connection is not possible.
  iceServers: [
    // Free Google STUN server for basic NAT traversal.
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    // First TURN server
    {
      urls: [
        'turn:23.95.61.186:3478?transport=udp',
        'turn:23.95.61.186:3478?transport=tcp',
      ],
      username: 'h3Z7TPYyGFRkeA1',
      credential: 'Pumhav-mamhyb-jufsa1',
    },
    // Second TURN server
    {
      urls: [
        'turn:206.189.39.100:3478?transport=udp',
        'turn:206.189.39.100:3478?transport=tcp',
      ],
      username: 'h3Z7TPYyGFRkeA1',
      credential: 'Pumhav-mamhyb-jufsa1',
    },
    // Backup TURN server
    {
      urls: ['turn:relay1.expressturn.com:3478'],
      username: 'efQUQ79N77B5BNVVKF',
      credential: 'N4EAugpjMzPLrxSS',
    },
  ],

  // Pre-generate ICE candidates to speed up connection establishment.
  iceCandidatePoolSize: 10,

  // The bundlePolicy setting determines whether to bundle media tracks.
  // 'balanced' attempts to optimize between bandwidth usage and connection quality.
  bundlePolicy: 'balanced',
}
