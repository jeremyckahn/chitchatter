import { act, renderHook } from '@testing-library/react'
import { PropsWithChildren, useContext, useMemo } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { createPlatformAdapters } from 'core/adapters/noop'
import { ChatRoom } from 'core/chat/ChatRoom'
import { encryption } from 'core/crypto/Encryption'
import { PeerAction } from 'core/models/network'
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
const createRoom = (
  targetPeerId?: string,
  transport: InMemoryTransport = new InMemoryTransport(
    createInMemoryNetwork(),
    'peer-self'
  )
) =>
  new ChatRoom({
    roomId: 'room-123',
    userId: 'self',
    customUsername: '',
    publicKey: encryption.cryptoKeyStub,
    privateKey: encryption.cryptoKeyStub,
    transport,
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

  test('alerts the user when a message they sent fails', async () => {
    const transport = new InMemoryTransport(
      createInMemoryNetwork(),
      'peer-self'
    )
    const realMakeAction = transport.makeAction

    // Break only the MESSAGE sender, leaving the rest of the protocol intact.
    transport.makeAction = ((peerAction, namespace) => {
      const action = realMakeAction(peerAction, namespace)

      if (peerAction !== PeerAction.MESSAGE) return action

      return [
        async () => {
          throw new Error('transport is gone')
        },
        action[1],
        action[2],
        action[3],
      ]
    }) as typeof transport.makeAction

    const chatRoom = createRoom(undefined, transport)

    await chatRoom.join()

    const { showAlert } = renderNotifications(chatRoom, false)

    await act(async () => {
      await chatRoom.sendMessage('nope')
    })

    expect(showAlert).toHaveBeenCalledTimes(1)
    expect(showAlert).toHaveBeenCalledWith(
      expect.stringContaining('could not be sent'),
      { severity: 'error' }
    )
  })

  test('stays silent when a background refresh fails', async () => {
    const transport = new InMemoryTransport(
      createInMemoryNetwork(),
      'peer-self'
    )

    vi.spyOn(transport, 'getPeerConnectionTypes').mockRejectedValue(
      new Error('boom')
    )

    const chatRoom = createRoom(undefined, transport)
    const { showAlert } = renderNotifications(chatRoom, false)

    await act(async () => {
      await chatRoom.refreshConnectionTypes()
    })

    expect(showAlert).not.toHaveBeenCalled()
  })
})
