import { generateRandomBase64Url } from 'core/crypto/random'
import { FILE_KEY_BYTE_LENGTH, FileOfferMetadata } from 'core/models/chat'

/**
 * The minimum a file needs to look like for the core to reason about it. The
 * DOM `File` satisfies this, as does a plain object from a non-browser host.
 */
export interface FileHandle {
  name: string
  type: string
  size: number
}

/**
 * A fresh random key for one file offer, as unpadded base64url so it matches
 * `isFileKey`.
 *
 * Files used to be encrypted with the room id, which made every file in a
 * room only as secret as its name — readable by anyone who saw the torrent on
 * the tracker and could guess the name, and blind to a private room's
 * password. A random key that only travels over the room's peer connections
 * depends on neither.
 */
export const generateFileKey = (): string =>
  generateRandomBase64Url(FILE_KEY_BYTE_LENGTH)

const inlineMediaTypes = ['image', 'audio', 'video']

/**
 * Formats that sit under an inline media type but can carry script. A host that
 * renders them from its own origin lets a peer run code there, so they are
 * always shared as plain downloads. These are Web platform MIME types, so they
 * are not modelled as an enum.
 */
const activeContentTypes = ['image/svg+xml']

/** Whether a file can be rendered inline in the transcript rather than downloaded. */
export const isInlineMediaFile = ({ type }: FileHandle) => {
  // Drop any parameters ("; charset=...") so they cannot dodge the denylist
  const [mimeType = ''] = type.split(';')
  const bareMimeType = mimeType.trim().toLowerCase()
  const [topLevelType = ''] = bareMimeType.split('/')

  return (
    inlineMediaTypes.includes(topLevelType) &&
    !activeContentTypes.includes(bareMimeType)
  )
}

export const isEveryFileInlineMedia = (
  files: readonly FileHandle[] | null | undefined
) => Boolean(files && files.length > 0 && files.every(isInlineMediaFile))

/**
 * Generic over the file type so that a caller holding real DOM `File`s gets
 * `File[]` back rather than the structural `FileHandle[]`, which it would
 * otherwise have to assert its way out of.
 */
export const getInlineMediaFiles = <T extends FileHandle>(
  files: readonly T[]
): T[] => files.filter(isInlineMediaFile)

/**
 * Who is offering what, keyed by peer id.
 *
 * `Readonly` because `ChatRoom.getFileOffers` hands this very object to
 * subscribers: the offers only change through an event they re-read on, so a
 * caller writing into the snapshot would change core state invisibly — the
 * reference stays the same, and `useSyncExternalStore` never re-renders.
 */
export type FileOffers = Readonly<Record<string, FileOfferMetadata>>

export const applyFileOffer = (
  offers: FileOffers,
  peerId: string,
  metadata: FileOfferMetadata
): FileOffers => ({ ...offers, [peerId]: metadata })

export const removeFileOffer = (
  offers: FileOffers,
  peerId: string
): FileOffers => {
  const { [peerId]: _removed, ...rest } = offers

  return rest
}

/**
 * Whether a peer other than `peerId` is currently offering `magnetURI`.
 *
 * A magnet URI is a bearer identifier: the app broadcasts every file's to the
 * whole room, so anyone can name one as their own offer, and nothing in the
 * protocol distinguishes that from the real owner announcing it again (for one
 * who reconnected under a new peer id, say). So a withdrawal is not trusted to
 * end the seed while somebody else still stands behind the same file; the seed
 * ends with the last offerer.
 */
export const isOfferedByAnotherPeer = (
  offers: FileOffers,
  peerId: string,
  magnetURI: string
): boolean =>
  Object.entries(offers).some(
    ([offeringPeerId, offer]) =>
      offeringPeerId !== peerId && offer.magnetURI === magnetURI
  )

/**
 * Returns an incoming offer as this client should record it, with its
 * `isAllInlineMedia` flag dropped when an offer already on record contradicts
 * it.
 *
 * The flag keeps a file seeded after its offer has ended, and the offering
 * peer writes it. A client derives it from the files themselves, so everyone
 * who really offers one magnet agrees on it. A peer naming somebody else's
 * magnet with the flag set is the exception, and believing it would stop
 * receivers letting go of a file its owner later withdraws. So the flag is
 * dropped when any recorded offer of the same magnet lacks it, whether that is
 * another present peer's or the sending peer's own earlier one.
 *
 * The offers on record are all there is to go on, which leaves two cases this
 * cannot settle. A false flag that arrives while no offer of the magnet is on
 * record is believed. An honest flag that arrives while a false unflagged
 * claim on the same magnet is on record is dropped. Nothing in the protocol
 * tells a claimant from the owner: see {@link isOfferedByAnotherPeer}.
 *
 * A dropped flag stays dropped for as long as the sender's own offer of the
 * magnet is on record, not only while the contradicting offer is. The caller
 * records the offer as returned here, without the flag, and that record then
 * contradicts every later announcement of the same offer. The sender gets the
 * flag back only by withdrawing the offer, or leaving, and offering the file
 * again once no unflagged offer of it remains.
 */
export const withoutContradictedInlineFlag = (
  offers: FileOffers,
  metadata: FileOfferMetadata
): FileOfferMetadata => {
  if (!metadata.isAllInlineMedia) return metadata

  const isContradicted = Object.values(offers).some(
    offer => offer.magnetURI === metadata.magnetURI && !offer.isAllInlineMedia
  )

  return isContradicted ? { ...metadata, isAllInlineMedia: false } : metadata
}

/**
 * Whether an offer should be rescinded now that it has been withdrawn or its
 * peer has left.
 *
 * Offers made up entirely of inline media are exempt: that content is rendered
 * in the transcript and stays reachable after the offer itself is gone, so
 * rescinding it would break already-delivered messages. That flag is written by
 * the offering peer, so it cannot be the only protection: `isProtected` is the
 * receiver's own knowledge of what must stay seeded (files it originated, and
 * anything its transcript refers to) and always wins.
 */
export const shouldRescindOffer = (
  metadata: FileOfferMetadata | undefined | null,
  isOffering: (magnetURI: string) => boolean,
  isProtected: (magnetURI: string) => boolean
): boolean =>
  Boolean(
    metadata &&
      !metadata.isAllInlineMedia &&
      !isProtected(metadata.magnetURI) &&
      isOffering(metadata.magnetURI)
  )
