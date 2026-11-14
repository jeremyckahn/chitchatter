import { useEffect, useState } from 'react'
import type { FileTransfer } from 'secure-file-transfer'
import { TorrentFile } from 'webtorrent'

import { FileReference } from 'core/models/chat'

export enum InlineMediaDownloadState {
  LOADING = 'LOADING',
  READY = 'READY',
  FAILED = 'FAILED',
}

/** The part of a downloaded file that rendering it needs. */
export type InlineMediaFile = Pick<
  TorrentFile,
  'name' | 'length' | 'getBlobURL'
>

export type InlineMediaDownload =
  | { state: InlineMediaDownloadState.LOADING }
  | {
      state: InlineMediaDownloadState.READY
      files: readonly InlineMediaFile[]
    }
  | { state: InlineMediaDownloadState.FAILED }

/**
 * Downloads and decrypts the inline media a message refers to.
 *
 * A download can fail: the key a peer sent may not decrypt the torrent (a
 * malformed or hostile peer, or one on an incompatible version), or the data
 * may be corrupt. That has to end the loading state. Left unhandled, the
 * rejection escaped the effect and the message showed a spinner forever.
 *
 * Takes only the slice of {@link FileTransfer} it uses, so a test can hand it a
 * typed stand-in rather than a cast one.
 */
export const useInlineMediaDownload = (
  fileTransfer: Pick<FileTransfer, 'download'>,
  { magnetURI, fileKey }: FileReference
): InlineMediaDownload => {
  const [download, setDownload] = useState<InlineMediaDownload>({
    state: InlineMediaDownloadState.LOADING,
  })

  useEffect(() => {
    // Set false on cleanup, so a download that settles after the message has
    // gone (or after its reference changed) does not update stale state.
    let isCurrent = true

    // Only a changed reference has anything to reset. The first run finds the
    // initial LOADING state, and replacing it with an equal object would
    // render every message twice for nothing.
    setDownload(previous =>
      previous.state === InlineMediaDownloadState.LOADING
        ? previous
        : { state: InlineMediaDownloadState.LOADING }
    )

    fileTransfer.download(magnetURI, fileKey).then(
      files => {
        if (isCurrent) {
          setDownload({ state: InlineMediaDownloadState.READY, files })
        }
      },
      (error: unknown) => {
        console.error('Inline media could not be downloaded', error)

        if (isCurrent) setDownload({ state: InlineMediaDownloadState.FAILED })
      }
    )

    return () => {
      isCurrent = false
    }
  }, [fileTransfer, magnetURI, fileKey])

  return download
}
