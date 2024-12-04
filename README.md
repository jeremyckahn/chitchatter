# PopChat

![Chitchatter logo](./public/logo/logo.svg)


PopChat is a free (as in both price and freedom) communication tool. Redesigned from Chitchatter  Designed to be the simplest way to connect with others privately and securely, it is:

- Fully open source (licensed under [GPL v2](./LICENSE))
- Peer-to-peer
  - Whenever possible, otherwise a TURN server is used to ensure reliable peer connection
- End-to-end encrypted (via [WebRTC](https://webrtc-security.github.io/))
- Ephemeral
  - Message content is never persisted to disk on either the client or server
- Decentralized
  - There is no API server. All that's required for Chitchatter to function is availability of GitHub for static assets, and public WebTorrent and STUN/TURN relay servers for establishing peer-to-peer communication.
- Embeddable
- [Self-hostable](#self-hosting)

Chitchatter uses [Vite](https://vitejs.dev/). The secure networking and streaming magic would not be possible without [Trystero](https://github.com/dmotz/trystero). File transfer functionality is powered by [`secure-file-transfer`](https://github.com/jeremyckahn/secure-file-transfer).

