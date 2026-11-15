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
import { FileOfferMetadata, FileReference, isFileKey } from 'core/models/chat'
import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { ActionNamespace, PeerHookType } from 'core/transport/types'
import { FileTransferService } from 'services/FileTransfer'

// Mirrors what `Room` builds for the app. If it drifts, the hostile peer never
// meets the others and the tests fail waiting for its first sighting of an
// offer, rather than passing without having attacked anything.
const appId = `${encodeURI(window.location.origin)}_${process.env['VITE_NAME']}`

const rtcConfig: RTCConfiguration = { iceServers: [] }

/**
 * One entry of a transcript, as a hostile peer writes it: a flat record of
 * whatever fields it likes. It is deliberately not `ReceivedMessage`, since the
 * point is to send what a well-behaved client never would.
 */
export type ForgedTranscriptEntry = { [field: string]: string | number }

/**
 * Whether `data` names a file the way an offer or an inline-media message does:
 * a magnet URI and the key that decrypts it. The key only ever crosses the
 * room's peer connections, which a hostile peer in the room is on, so it learns
 * every key exactly as a real attacker would.
 */
const isFileReferenceCarrier = (data: unknown): data is FileReference =>
  typeof data === 'object' &&
  data !== null &&
  'magnetURI' in data &&
  typeof data.magnetURI === 'string' &&
  'fileKey' in data &&
  isFileKey(data.fileKey)

const toFileReference = ({ magnetURI, fileKey }: FileReference) => ({
  magnetURI,
  fileKey,
})

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
  const [, onMediaMessage] = transport.makeAction<FileReference>(
    PeerAction.MEDIA_MESSAGE,
    ActionNamespace.GROUP
  )

  const [sendTranscript] = transport.makeAction<ForgedTranscriptEntry[]>(
    PeerAction.MESSAGE_TRANSCRIPT,
    ActionNamespace.GROUP
  )

  const offeredFiles: FileReference[] = []
  const inlineMediaFiles: FileReference[] = []

  let forgedTranscript: ForgedTranscriptEntry[] | undefined

  // What a real client does for a newcomer to a public room, with the history
  // of the hostile peer's choosing: it is how a room's first peer to answer
  // gets to say what was said before the newcomer arrived.
  transport.onPeerJoin(PeerHookType.NEW_PEER, peerId => {
    if (forgedTranscript)
      void sendTranscript(forgedTranscript, { target: peerId })
  })

  onFileOffer(data => {
    if (isFileReferenceCarrier(data)) offeredFiles.push(toFileReference(data))
  })

  onMediaMessage(data => {
    if (isFileReferenceCarrier(data))
      inlineMediaFiles.push(toFileReference(data))
  })

  return {
    /** Files other peers have offered, in the order they were seen. */
    getOfferedFiles: () => [...offeredFiles],

    /** Inline media other peers have posted. */
    getInlineMediaFiles: () => [...inlineMediaFiles],

    getPeerCount: () => transport.getPeers().length,

    /**
     * Claims `file` as this peer's own file offer, key and all, as a replay
     * would. The flag is the peer's to set, so a hostile one sets it to
     * whatever suits it.
     */
    claim: ({ magnetURI, fileKey }: FileReference, isAllInlineMedia = false) =>
      sendFileOffer({ magnetURI, fileKey, isAllInlineMedia }),

    /**
     * Hands `entries` over as the room's history, to everyone already here and
     * to each peer that arrives later, as a client does when it greets one.
     */
    serveTranscript: async (entries: ForgedTranscriptEntry[]) => {
      forgedTranscript = entries

      await Promise.all(
        transport
          .getPeers()
          .map(peerId => sendTranscript(entries, { target: peerId }))
      )
    },

    withdraw: () => sendFileOffer(null),

    leave: () => transport.leaveRoom(),
  }
}

export type HostilePeer = ReturnType<typeof joinRoomAsHostilePeer>

/**
 * Downloads `file` with a fresh client that has never been in the room, the way
 * a late joiner would, and returns the decrypted text of its first file. It
 * resolves only once a seeder has actually delivered the data, so it is the
 * end-to-end answer to "is the file still there?".
 */
export const downloadAsFreshClient = async ({
  magnetURI,
  fileKey,
}: FileReference): Promise<string> => {
  const { fileTransfer } = new FileTransferService(rtcConfig)

  const [file] = await fileTransfer.download(magnetURI, fileKey, {
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
