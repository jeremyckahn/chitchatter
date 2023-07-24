// This object is provided as `config.rtcConfig` to Trystero's `joinRoom`
// function: https://github.com/dmotz/trystero#joinroomconfig-namespace
//
// https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#parameters
export const rtcConfig: RTCConfiguration = {
  // You can configure Chitchatter to use TURN servers as a relay in case
  // direct peer-to-peer connections cannot be made.
  iceServers: [
    {
      urls: 'stun:188.148.133.173:3478',
    },
    {
      urls: 'turn:188.148.133.173:3478',
      username: 'c386d75b5633456cb3bc13812858098d',
      credential: '58fd06d85fe14c0f9f46220748b0f565',
    },
    {
      urls: 'turn:188.148.133.173:3478',
      username: '0e2f563eacfd4c4a82ea239b04d1d494',
      credential: '8179b4b533f240ad9fe590663bef1bc9',
    },
    {
      urls: 'turn:188.148.133.173:3478',
      username: 'feab95c3fcd147a2a96a3d3590bf9cda',
      credential: '654cafd885424b7fb974e65f631f25f9',
    },
  ],
}
