import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

import { RoomFileUploadControls } from './RoomFileUploadControls'

// A real `ChatRoom` over `InMemoryTransport`, matching the approach in
// `useRoomFileShare.test.tsx`: the share flow has to agree with the room, so
// a stub would be asserting against the test's own idea of the answer.
const createRoom = () => {
  const network = createInMemoryNetwork()
  const fileTransfer: FileTransferAdapter = {
    offer: vi.fn(async () => 'magnet:self'),
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

  return { chatRoom }
}

const Wrapper = ({ children }: PropsWithChildren) => {
  const shellDefaults = useContext(ShellContext)
  const roomDefaults = useContext(RoomContext)

  const shellValue = useMemo(
    () => ({ ...shellDefaults, showAlert: vi.fn() }),
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

describe('RoomFileUploadControls', () => {
  test('clears the file input after a selection so the same file can be picked again', async () => {
    const { chatRoom } = createRoom()

    const { container } = render(
      <RoomFileUploadControls
        chatRoom={chatRoom}
        onInlineMediaUpload={vi.fn()}
      />,
      { wrapper: Wrapper }
    )

    const input = container.querySelector('input[type="file"]')

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('file input not rendered')
    }

    // jsdom fires `change` on every `userEvent.upload`, but a real browser
    // skips the event when the picked file matches the input's current
    // value. The input therefore has to be reset after each selection, or
    // picking the same file twice in a row silently does nothing (#107).
    // Pin the reset directly.
    await userEvent.upload(
      input,
      new File(['hello'], 'hello.txt', { type: 'text/plain' })
    )

    expect(input.value).toBe('')
  })
})
