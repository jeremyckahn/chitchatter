import { FileOfferMetadata } from 'core/models/chat'

/**
 * The minimum a file needs to look like for the core to reason about it. The
 * DOM `File` satisfies this, as does a plain object from a non-browser host.
 */
export interface FileHandle {
  name: string
  type: string
  size: number
}

const inlineMediaTypes = ['image', 'audio', 'video']

/** Whether a file can be rendered inline in the transcript rather than downloaded. */
export const isInlineMediaFile = ({ type }: FileHandle) =>
  inlineMediaTypes.includes(type.split('/')[0])

export const isEveryFileInlineMedia = (
  files: readonly FileHandle[] | null | undefined
) => Boolean(files && files.length > 0 && files.every(isInlineMediaFile))

export const getInlineMediaFiles = (files: readonly FileHandle[]) =>
  files.filter(isInlineMediaFile)

export type FileOffers = Record<string, FileOfferMetadata>

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
 * Whether an offer should be rescinded now that it has been withdrawn or its
 * peer has left.
 *
 * Offers made up entirely of inline media are exempt: that content is rendered
 * in the transcript and stays reachable after the offer itself is gone, so
 * rescinding it would break already-delivered messages.
 */
export const shouldRescindOffer = (
  metadata: FileOfferMetadata | undefined | null,
  isOffering: (magnetURI: string) => boolean
): boolean =>
  Boolean(
    metadata && !metadata.isAllInlineMedia && isOffering(metadata.magnetURI)
  )
