import { act, renderHook, waitFor } from '@testing-library/react'
import { PropsWithChildren, useContext, useMemo } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { createPlatformAdapters } from 'core/adapters/noop'
import { FileTransferAdapter } from 'core/adapters/types'
import { ChatRoom } from 'core/chat/ChatRoom'
import { encryption } from 'core/crypto/Encryption'
import {
  createInMemoryNetwork,
  InMemoryTransport,
} from 'core/transport/InMemoryTransport'
import { mockEncryptionService } from 'test-utils/mocks/mockEncryptionService'

import { useRoomFileShare } from './useRoomFileShare'

/**
 * A real `ChatRoom` over `InMemoryTransport`, because what these tests are
 * about is the controls agreeing with the room: the offer state lives in the
 * core and the hook derives its "stop sharing" control from it, so a stub room
 * would be asserting against the test's own idea of the answer.
 */
const createRoom = ({
  offer = vi.fn(async () => 'magnet:self'),
}: { offer?: FileTransferAdapter['offer'] } = {}) => {
  const network = createInMemoryNetwork()
  const fileTransfer: FileTransferAdapter = {
    offer,
    rescind: vi.fn(async () => {}),
    rescindAll: vi.fn(async () => {}),
    isOffering: vi.fn(() => true),
  }

  const chatRoom = new ChatRoom({
    roomId: 'room-123',
    userId: 'self',
    customUsername: '',
    publicKey: encryption.cryptoKeyStub,
    privateKey: encryption.cryptoKeyStub,
    transport: new InMemoryTransport(network, 'peer-self'),
    encryptionService: mockEncryptionService,
    adapters: createPlatformAdapters({ uuid: () => 'id-1' }, { fileTransfer }),
  })

  return { chatRoom, fileTransfer }
}

/** The shell's and room's real defaults, with only `showAlert` observed. */
const createWrapper = () => {
  const showAlert = vi.fn()

  const Wrapper = ({ children }: PropsWithChildren) => {
    const shellDefaults = useContext(ShellContext)
    const roomDefaults = useContext(RoomContext)

    const shellValue = useMemo(
      () => ({ ...shellDefaults, showAlert }),
      [shellDefaults]
    )

    return (
      <ShellContext.Provider value={shellValue}>
        <RoomContext.Provider value={roomDefaults}>
          {children}
        </RoomContext.Provider>
      </ShellContext.Provider>
    )
  }

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

// A `FileList` cannot be constructed — it only ever comes from an `<input>` or
// a drag — and the hook uses it as an iterable of `name`/`type`/`size`, which
// is all `FileHandle` asks for. Nothing downstream of the stubbed file-transfer
// adapter touches the files themselves.
const fileListStub = [
  { name: 'doc.pdf', type: 'application/pdf', size: 10 },
] as unknown as FileList

describe('useRoomFileShare', () => {
  test('offers the selected files and shows the stop control', async () => {
    const { chatRoom, fileTransfer } = createRoom()
    const { result } = renderFileShare(chatRoom)

    await act(async () => {
      await result.current.handleFileShareStart(fileListStub)
    })

    expect(fileTransfer.offer).toHaveBeenCalled()
    await waitFor(() => expect(result.current.isSharingFile).toBe(true))
  })

  test('reports a share that could not be offered', async () => {
    const { chatRoom } = createRoom({
      offer: vi.fn(async () => {
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

  test('reports a share the room refused outright', async () => {
    const { chatRoom, fileTransfer } = createRoom()

    await chatRoom.leave()

    const { result, showAlert } = renderFileShare(chatRoom)

    await act(async () => {
      await result.current.handleFileShareStart(fileListStub)
    })

    // `offerFiles` resolves without doing anything once the room has been
    // left. Treating that as success put a "stop sharing" control on screen
    // with nothing behind it to stop, and claimed the encryption had finished.
    expect(fileTransfer.offer).not.toHaveBeenCalled()
    expect(showAlert).not.toHaveBeenCalledWith('Encryption complete', {
      severity: 'success',
    })
    expect(showAlert).toHaveBeenCalledWith('The file could not be shared', {
      severity: 'error',
    })
    expect(result.current.isSharingFile).toBe(false)
  })

  test('releases the stop control when the room stops offering', async () => {
    const { chatRoom } = createRoom()
    const { result } = renderFileShare(chatRoom)

    await act(async () => {
      await result.current.handleFileShareStart(fileListStub)
    })

    await waitFor(() => expect(result.current.isSharingFile).toBe(true))

    await act(async () => {
      result.current.handleFileShareStop()
    })

    // Read back from the room rather than tracked here, so the control cannot
    // disagree with it about whether a share exists.
    await waitFor(() => expect(result.current.isSharingFile).toBe(false))
    expect(chatRoom.getSelfFileOfferMagnetUri()).toBeNull()
  })
})
