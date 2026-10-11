import { act, renderHook, waitFor } from '@testing-library/react'
import { PropsWithChildren } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { RoomContext, RoomContextProps } from 'contexts/RoomContext'
import { ShellContext, ShellContextProps } from 'contexts/ShellContext'
import { ChatRoom } from 'core/chat/ChatRoom'

import { useRoomFileShare } from './useRoomFileShare'

/**
 * Only the parts of the room the hook actually reaches for. The offer/rescind
 * state machine itself lives in the core and is covered by `ChatRoom.test.ts`;
 * what matters here is what the controls do with its outcome.
 */
const noOffers = Object.freeze({})

const createChatRoomStub = (overrides: Partial<ChatRoom> = {}) =>
  ({
    // One reference, not a fresh object per read: `useSyncExternalStore` spins
    // forever on a snapshot whose identity changes on every call, which is the
    // contract `ChatRoom`'s cached snapshots exist to satisfy.
    getFileOffers: () => noOffers,
    on: () => () => {},
    offerFiles: vi.fn(async () => 'magnet:self'),
    rescindFileOffer: vi.fn(async () => {}),
    ...overrides,
  }) as unknown as ChatRoom

const createWrapper = () => {
  const showAlert = vi.fn()

  const Wrapper = ({ children }: PropsWithChildren) => (
    <ShellContext.Provider
      value={{ showAlert } as unknown as ShellContextProps}
    >
      <RoomContext.Provider
        value={
          { setPeerOfferedFileMetadata: vi.fn() } as unknown as RoomContextProps
        }
      >
        {children}
      </RoomContext.Provider>
    </ShellContext.Provider>
  )

  return { Wrapper, showAlert }
}

const renderFileShare = (chatRoom: ChatRoom) => {
  const { Wrapper, showAlert } = createWrapper()

  const { result } = renderHook(
    () => useRoomFileShare({ chatRoom, onInlineMediaUpload: vi.fn() }),
    { wrapper: Wrapper }
  )

  return { result, showAlert }
}

const fileListStub = [
  { name: 'doc.pdf', type: 'application/pdf', size: 10 },
] as unknown as FileList

describe('useRoomFileShare', () => {
  test('offers the selected files and shows the stop control', async () => {
    const chatRoom = createChatRoomStub()
    const { result } = renderFileShare(chatRoom)

    await act(async () => {
      await result.current.handleFileShareStart(fileListStub)
    })

    expect(chatRoom.offerFiles).toHaveBeenCalled()
    await waitFor(() => expect(result.current.isSharingFile).toBe(true))
  })

  test('reports a share that could not be offered', async () => {
    const chatRoom = createChatRoomStub({
      offerFiles: vi.fn(async () => {
        throw new Error('offer failed')
      }),
    })
    const { result, showAlert } = renderFileShare(chatRoom)

    await act(async () => {
      await result.current.handleFileShareStart(fileListStub)
    })

    expect(showAlert).toHaveBeenCalledWith('The file could not be shared', {
      severity: 'error',
    })

    // No stop control for a share that never happened, and the picker is usable
    // again rather than stuck disabled.
    expect(result.current.isSharingFile).toBe(false)
    expect(result.current.isFileSharingEnabled).toBe(true)
  })

  test('releases the stop control even when rescinding fails', async () => {
    const chatRoom = createChatRoomStub({
      rescindFileOffer: vi.fn(async () => {
        throw new Error('rescind failed')
      }),
    })
    const { result } = renderFileShare(chatRoom)

    await act(async () => {
      await result.current.handleFileShareStart(fileListStub)
    })

    await waitFor(() => expect(result.current.isSharingFile).toBe(true))

    await act(async () => {
      await result.current.handleFileShareStop().catch(() => {})
    })

    // The core has already stopped offering the file by the time anything in
    // here can fail, so leaving the button on "stop sharing" would strand the
    // user on a share that no longer exists.
    expect(result.current.isSharingFile).toBe(false)
  })
})
