import { renderHook } from '@testing-library/react'
import { PropsWithChildren } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { FileTransferService } from 'services/FileTransfer'

import {
  RoomFileTransferContext,
  useRoomFileTransfer,
} from './RoomFileTransferContext'

/** Counts the WebTorrent clients built, which is all these tests care about. */
const { fileTransferConstructions } = vi.hoisted(() => ({
  fileTransferConstructions: vi.fn(),
}))

vi.mock('secure-file-transfer', () => ({
  FileTransfer: class {
    constructor() {
      fileTransferConstructions()
    }
  },
  setStreamSaverMitm: () => {},
}))

describe('RoomFileTransferContext', () => {
  // Regression test for https://github.com/jeremyckahn/chitchatter/issues/680:
  // `RoomContext` used to build a working `FileTransferService` as its default
  // value, so anything rendered outside a room silently got a WebTorrent
  // client that no room could ever stop seeding.
  test('no context builds a file transfer client just by being loaded', async () => {
    await import('contexts/RoomContext')
    await import('contexts/ShellContext')
    await import('contexts/RoomFileTransferContext')

    expect(fileTransferConstructions).not.toHaveBeenCalled()
  })

  test('refuses to be read outside a room', () => {
    expect(() => renderHook(() => useRoomFileTransfer())).toThrow(
      /outside a room/
    )
  })

  test('refuses to be read under a provider that holds no service', () => {
    const Wrapper = ({ children }: PropsWithChildren) => (
      <RoomFileTransferContext.Provider value={null}>
        {children}
      </RoomFileTransferContext.Provider>
    )

    expect(() =>
      renderHook(() => useRoomFileTransfer(), { wrapper: Wrapper })
    ).toThrow(/outside a room/)
  })

  test("returns the enclosing room's service", () => {
    const fileTransferService = new FileTransferService({})
    const Wrapper = ({ children }: PropsWithChildren) => (
      <RoomFileTransferContext.Provider value={fileTransferService}>
        {children}
      </RoomFileTransferContext.Provider>
    )

    const { result } = renderHook(() => useRoomFileTransfer(), {
      wrapper: Wrapper,
    })

    expect(result.current).toBe(fileTransferService)
  })
})
