/**
 * Browser-side half of the hostile-peer E2E helpers.
 *
 * This file is NOT run by Playwright's Node process. Vite serves it to a page
 * on the app's own origin, and `hostile-peer.ts` imports it there by URL, so it
 * gets the app's real `TrysteroTransport`, tracker configuration and file
 * transfer service: the peer below speaks the protocol exactly as a modified
 * client would, over a real WebRTC connection to the real app.
 *
 * Keep it free of Node and Playwright imports.
 */
import { trackerUrls } from 'config/trackerUrls'
import { PeerAction } from 'core/models/network'
import { FileOfferMetadata } from 'core/models/chat'
import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { ActionNamespace } from 'core/transport/types'
import { FileTransferService } from 'services/FileTransfer'

// Mirrors what `Room` builds for the app. If it drifts, the hostile peer never
// meets the others and the tests fail waiting for its first sighting of an
// offer, rather than passing without having attacked anything.
const appId = `${encodeURI(window.location.origin)}_${process.env['VITE_NAME']}`

const rtcConfig: RTCConfiguration = { iceServers: [] }

const isMagnetCarrier = (data: unknown): data is { magnetURI: string } =>
  typeof data === 'object' &&
  data !== null &&
  'magnetURI' in data &&
  typeof data.magnetURI === 'string'

/**
 * Joins `roomId` as a peer that follows no part of the chat protocol beyond
 * what it needs: it listens for the magnet URIs the room broadcasts, and can
 * write a file offer of its own for any magnet URI it has seen.
 */
export const joinRoomAsHostilePeer = (roomId: string) => {
  const transport = new TrysteroTransport(
    {
      appId,
      relayConfig: { urls: trackerUrls, redundancy: 4 },
      password: roomId,
      rtcConfig,
    },
    roomId
  )

  const [sendFileOffer, onFileOffer] =
    transport.makeAction<FileOfferMetadata | null>(
      PeerAction.FILE_OFFER,
      ActionNamespace.GROUP
    )
  const [, onMediaMessage] = transport.makeAction<{ magnetURI: string }>(
    PeerAction.MEDIA_MESSAGE,
    ActionNamespace.GROUP
  )

  const offeredMagnetUris: string[] = []
  const inlineMediaMagnetUris: string[] = []

  onFileOffer(data => {
    if (isMagnetCarrier(data)) offeredMagnetUris.push(data.magnetURI)
  })

  onMediaMessage(data => {
    if (isMagnetCarrier(data)) inlineMediaMagnetUris.push(data.magnetURI)
  })

  return {
    /** Magnet URIs other peers have offered, in the order they were seen. */
    getOfferedMagnetUris: () => [...offeredMagnetUris],

    /** Magnet URIs of inline media other peers have posted. */
    getInlineMediaMagnetUris: () => [...inlineMediaMagnetUris],

    getPeerCount: () => transport.getPeers().length,

    /**
     * Claims `magnetURI` as this peer's own file offer. The flag is the peer's
     * to set, so a hostile one sets it to whatever suits it.
     */
    claim: (magnetURI: string, isAllInlineMedia = false) =>
      sendFileOffer({ magnetURI, isAllInlineMedia }),

    withdraw: () => sendFileOffer(null),

    leave: () => transport.leaveRoom(),
  }
}

export type HostilePeer = ReturnType<typeof joinRoomAsHostilePeer>

/**
 * Downloads `magnetURI` with a fresh client that has never been in the room,
 * the way a late joiner would, and returns the decrypted text of its first
 * file. It resolves only once a seeder has actually delivered the data, so it
 * is the end-to-end answer to "is the file still there?".
 */
export const downloadAsFreshClient = async (
  magnetURI: string,
  roomId: string
): Promise<string> => {
  const { fileTransfer } = new FileTransferService(rtcConfig)

  const [file] = await fileTransfer.download(magnetURI, roomId, {
    doSave: false,
  })

  const decoder = new TextDecoder()
  let text = ''

  for await (const chunk of file.createReadStream()) {
    text +=
      typeof chunk === 'string'
        ? chunk
        : decoder.decode(chunk, { stream: true })
  }

  return text
}
