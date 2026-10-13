import { act, renderHook } from '@testing-library/react'
import { PropsWithChildren, useContext, useMemo } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { createPlatformAdapters } from 'core/adapters/noop'
import { ChatRoom } from 'core/chat/ChatRoom'
import { encryption } from 'core/crypto/Encryption'
import {
  createInMemoryNetwork,
  InMemoryTransport,
} from 'core/transport/InMemoryTransport'
import { mockEncryptionService } from 'test-utils/mocks/mockEncryptionService'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { useChatRoomNotifications } from './useChatRoomNotifications'

vi.mock('../../lib/Audio')

const userSettingsStub = userSettingsContextStubFactory({ userId: 'self' })

/** A real room, so the events under test are the ones the core really emits. */
const createRoom = (targetPeerId?: string) =>
  new ChatRoom({
    roomId: 'room-123',
    userId: 'self',
    customUsername: '',
    publicKey: encryption.cryptoKeyStub,
    privateKey: encryption.cryptoKeyStub,
    transport: new InMemoryTransport(createInMemoryNetwork(), 'peer-self'),
    encryptionService: mockEncryptionService,
    adapters: createPlatformAdapters({ uuid: () => 'id-1' }),
    targetPeerId,
  })

const renderNotifications = (
  chatRoom: ChatRoom,
  isDirectMessageRoom: boolean
) => {
  const showAlert = vi.fn()

  const Wrapper = ({ children }: PropsWithChildren) => {
    const shellDefaults = useContext(ShellContext)

    const shellValue = useMemo(
      () => ({ ...shellDefaults, showAlert }),
      [shellDefaults]
    )

    return (
      <SettingsContext.Provider value={userSettingsStub}>
        <ShellContext.Provider value={shellValue}>
          {children}
        </ShellContext.Provider>
      </SettingsContext.Provider>
    )
  }

  const rendered = renderHook(
    () =>
      useChatRoomNotifications(chatRoom, {
        isShowingMessages: true,
        isDirectMessageRoom,
      }),
    { wrapper: Wrapper }
  )

  return { ...rendered, showAlert }
}

describe('useChatRoomNotifications', () => {
  test('announces a departure from the group room', async () => {
    const chatRoom = createRoom()
    const { showAlert } = renderNotifications(chatRoom, false)

    await act(async () => {
      chatRoom.notifyPeerLeft('peer-1')
    })

    expect(showAlert).toHaveBeenCalledTimes(1)
    expect(showAlert).toHaveBeenCalledWith(
      expect.stringContaining('has left the room'),
      { severity: 'warning' }
    )
  })

  test('leaves room membership to the group room', async () => {
    const chatRoom = createRoom('peer-1')
    const { showAlert } = renderNotifications(chatRoom, true)

    // A direct-message room is told about departures by the registry, because
    // it cannot hear them itself. Announcing them from here too meant one
    // snackbar per departure *per* open conversation — and every peer in the
    // list has a conversation mounted behind its dialog.
    await act(async () => {
      chatRoom.notifyPeerLeft('peer-1')
    })

    expect(showAlert).not.toHaveBeenCalled()
  })
})
