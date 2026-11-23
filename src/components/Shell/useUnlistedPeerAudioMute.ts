import { useEffect } from 'react'

import { Peer } from 'core/models/chat'
import { AudioChannel } from 'models/media'

/**
 * Keeps every peer audio element muted unless its peer is in the peer list.
 *
 * A peer enters the list only by sending `PEER_METADATA`, and the list is the
 * only place the UI renders a peer's volume controls. Audio from any other
 * source (a peer that never announces itself, or whose metadata was rejected)
 * would play with nothing in the UI to name it or turn it down. Muting it
 * keeps what is audible in step with what is shown.
 *
 * A legitimate peer is listed before its audio arrives in practice, because
 * metadata is sent the moment it connects while streams wait in the
 * transport's queue. If the stream does win that race it starts muted and is
 * unmuted as soon as the peer is listed.
 *
 * This writes `muted` rather than `volume`, so it never fights the volume
 * control the peer list renders.
 */
export const useUnlistedPeerAudioMute = (
  peerList: readonly Peer[],
  peerAudioChannels: Readonly<Record<string, AudioChannel>>
): void => {
  useEffect(() => {
    const listedPeerIds = new Set(peerList.map(({ peerId }) => peerId))

    for (const [peerId, audioChannel] of Object.entries(peerAudioChannels)) {
      const isListed = listedPeerIds.has(peerId)

      for (const audio of Object.values(audioChannel)) {
        audio.muted = !isListed
      }
    }
  }, [peerList, peerAudioChannels])
}
