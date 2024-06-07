// This object is provided as `config.rtcConfig` to Trystero's `joinRoom`
// function: https://github.com/dmotz/trystero#joinroomconfig-namespace
//
// https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#parameters
export const rtcConfig: RTCConfiguration = {
  // These are the relay servers that are used in case a direct peer-to-peer
  // connection cannot be made. Feel free to change them as you'd like. If you
  // would like to disable relay servers entirely, remove the `iceServers`
  // property from the rtcConfig object. IF YOU DISABLE RELAY SERVERS,
  // CHITCHATTER PEERS MAY NOT BE ABLE TO CONNECT DEPENDING ON HOW THEY ARE
  // CONNECTED TO THE INTERNET.
  iceServers: [
    {
      urls: 'turn:relay1.expressturn.com:3478',
      username: 'efQUQ79N77B5BNVVKF',
      credential: 'N4EAUgpjMzPLrxSS',
    },
  ],
}
