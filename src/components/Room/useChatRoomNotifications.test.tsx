import { act, renderHook } from '@testing-library/react'
import { PropsWithChildren, useContext, useMemo } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { createPlatformAdapters } from 'core/adapters/noop'
import { ChatRoom } from 'core/chat/ChatRoom'
import { ChatRoomErrorContext, ChatRoomEvent } from 'core/chat/events'
import { encryption } from 'core/crypto/Encryption'
import { PeerAction } from 'core/models/network'
import {
  createInMemoryNetwork,
  InMemoryTransport,
} from 'core/transport/InMemoryTransport'
import {
  ActionNamespace,
  ActionSender,
  DataPayload,
  PeerRoomAction,
} from 'core/transport/types'
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

/**
 * An in-memory transport whose MESSAGE sender always rejects, so a real
 * ChatRoom can be driven into the failure path without faking its types.
 */
class FailingMessageTransport extends InMemoryTransport {
  constructor(...args: ConstructorParameters<typeof InMemoryTransport>) {
    super(...args)

    const makeAction = this.makeAction

    this.makeAction = <T extends DataPayload>(
      peerAction: PeerAction,
      namespace: ActionNamespace
    ): PeerRoomAction<T> => {
      const [send, receive, progress, disconnect] = makeAction<T>(
        peerAction,
        namespace
      )

      if (peerAction !== PeerAction.MESSAGE) {
        return [send, receive, progress, disconnect]
      }

      const failingSend: ActionSender<T> = async () => {
        throw new Error('transport is gone')
      }

      return [failingSend, receive, progress, disconnect]
    }
  }
}

/** Which failures the user should see; the rest are logged only. */
const expectedAlerts: Record<ChatRoomErrorContext, boolean> = {
  [ChatRoomErrorContext.SEND_MESSAGE]: true,
  [ChatRoomErrorContext.SEND_INLINE_MEDIA]: true,
  [ChatRoomErrorContext.RESCIND_FILE_OFFER]: true,
  [ChatRoomErrorContext.ANNOUNCE_SELF]: false,
  [ChatRoomErrorContext.GREET_PEER]: false,
  [ChatRoomErrorContext.REFRESH_CONNECTION_TYPES]: false,
  [ChatRoomErrorContext.SEND_TYPING_STATUS]: false,
  [ChatRoomErrorContext.STOP_SEEDING]: false,
  [ChatRoomErrorContext.LEAVE]: false,
}

/** Emits an ERROR exactly as the core does, without needing a failing path. */
const reportError = (chatRoom: ChatRoom, context: ChatRoomErrorContext) => {
  chatRoom.dispatchEvent(
    new CustomEvent(ChatRoomEvent.ERROR, {
      detail: { error: new Error('boom'), context },
    })
  )
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
    const chatRoom = createRoom(
      undefined,
      new FailingMessageTransport(createInMemoryNetwork(), 'peer-self')
    )

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

  test.each(Object.values(ChatRoomErrorContext))(
    'decides show-or-suppress for %s',
    context => {
      const chatRoom = createRoom()
      const { showAlert } = renderNotifications(chatRoom, false)

      act(() => {
        reportError(chatRoom, context)
      })

      if (expectedAlerts[context]) {
        expect(showAlert).toHaveBeenCalledTimes(1)
        expect(showAlert).toHaveBeenCalledWith(expect.any(String), {
          severity: 'error',
        })
      } else {
        expect(showAlert).not.toHaveBeenCalled()
      }
    }
  )

  test('stops listening for errors once unmounted', () => {
    const chatRoom = createRoom()
    const { showAlert, unmount } = renderNotifications(chatRoom, false)

    unmount()

    act(() => {
      reportError(chatRoom, ChatRoomErrorContext.SEND_MESSAGE)
    })

    expect(showAlert).not.toHaveBeenCalled()
  })
})
