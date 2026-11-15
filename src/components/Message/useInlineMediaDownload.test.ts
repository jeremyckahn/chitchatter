import { act, renderHook, waitFor } from '@testing-library/react'
import type { FileTransfer } from 'secure-file-transfer'

import {
  InlineMediaDownloadState,
  useInlineMediaDownload,
} from './useInlineMediaDownload'

type Download = FileTransfer['download']

const file = {
  magnetURI: `magnet:?xt=urn:btih:${'e'.repeat(40)}`,
  fileKey: 'k'.repeat(43),
}

/** A promise with its settle functions, so a test decides when it settles. */
const deferred = () => {
  let resolve: (files: Awaited<ReturnType<Download>>) => void = () => {}
  let reject: (error: unknown) => void = () => {}

  const promise = new Promise<Awaited<ReturnType<Download>>>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const transferWith = (download: Download): Pick<FileTransfer, 'download'> => ({
  download: vi.fn(download),
})

describe('useInlineMediaDownload', () => {
  test('downloads with the message’s own magnet URI and key', () => {
    const transfer = transferWith(() => deferred().promise)

    renderHook(() => useInlineMediaDownload(transfer, file))

    expect(transfer.download).toHaveBeenCalledOnce()
    expect(transfer.download).toHaveBeenCalledWith(file.magnetURI, file.fileKey)
  })

  test('renders once on mount rather than resetting a state it already has', () => {
    const transfer = transferWith(() => deferred().promise)
    let renders = 0

    renderHook(() => {
      renders++

      return useInlineMediaDownload(transfer, file)
    })

    expect(renders).toBe(1)
  })

  test('is loading until the download settles, then ready with its files', async () => {
    const pending = deferred()
    const transfer = transferWith(() => pending.promise)

    const { result } = renderHook(() => useInlineMediaDownload(transfer, file))

    expect(result.current).toEqual({ state: InlineMediaDownloadState.LOADING })

    pending.resolve([])

    await waitFor(() =>
      expect(result.current).toEqual({
        state: InlineMediaDownloadState.READY,
        files: [],
      })
    )
  })

  // Regression: a rejected download escaped the effect unhandled, and the
  // message showed a spinner forever.
  test('fails, rather than loading forever, when the file cannot be decrypted', async () => {
    const transfer = transferWith(() =>
      Promise.reject(new Error('The password is wrong'))
    )

    const { result } = renderHook(() => useInlineMediaDownload(transfer, file))

    await waitFor(() =>
      expect(result.current).toEqual({ state: InlineMediaDownloadState.FAILED })
    )
  })

  test('ignores a download that settles after its reference changed', async () => {
    const first = deferred()
    const second = deferred()
    const transfer = transferWith(
      vi
        .fn<Download>()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise)
    )

    const { result, rerender } = renderHook(
      ({ fileKey }) => useInlineMediaDownload(transfer, { ...file, fileKey }),
      { initialProps: { fileKey: file.fileKey } }
    )

    rerender({ fileKey: 'j'.repeat(43) })
    second.resolve([])

    await waitFor(() =>
      expect(result.current.state).toBe(InlineMediaDownloadState.READY)
    )

    // The superseded download failing late must not overwrite the current one.
    // Settled inside `act` so any state update it makes is applied before the
    // assertion, rather than after it, which would let this pass regardless.
    await act(async () => {
      first.reject(new Error('late'))
      await first.promise.catch(() => {})
    })

    expect(result.current.state).toBe(InlineMediaDownloadState.READY)
  })
})
