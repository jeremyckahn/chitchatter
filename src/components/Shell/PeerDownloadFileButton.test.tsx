import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useContext, useEffect } from 'react'
import { MemoryRouter as Router } from 'react-router-dom'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { createWebAdapters } from 'adapters/web'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { createPlatformAdapters } from 'core/adapters/noop'
import { PlatformAdapters } from 'core/adapters/types'
import { ChatRoom } from 'core/chat/ChatRoom'
import { deriveUserIdFromKey } from 'core/chat/identity'
import { encryption } from 'core/crypto/Encryption'
import { PeerVerificationState } from 'core/models/chat'
import {
  createInMemoryNetwork,
  InMemoryTransport,
} from 'core/transport/InMemoryTransport'
import { FileTransferService } from 'services/FileTransfer'
import { itemAt } from 'test-utils/itemAt'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { Shell } from './Shell'

/**
 * Every WebTorrent client the page builds, in the order it built them.
 *
 * `secure-file-transfer` is the one thing replaced here: it is what talks to
 * trackers and peers. Everything above it — `FileTransferService`, the web
 * file-transfer adapter, the `ChatRoom`s and the shell — is the real code, so
 * what is being asserted is which client a real peer-list download reaches.
 */
const { fileTransferClients } = vi.hoisted(() => {
  const clients: Array<{
    download: (magnetURI: string, fileKey: string) => Promise<never[]>
    rescind: (magnetURI: string) => Promise<void>
    torrents: Set<string>
  }> = []

  return { fileTransferClients: clients }
})

vi.mock('secure-file-transfer', async () => {
  const { vi: hoistedVi } = await import('vitest')

  // Holds a torrent from the moment it is downloaded until it is rescinded,
  // which is what the real library does and what `isOffering` reports on.
  class FileTransfer {
    torrents = new Set<string>()

    offer = hoistedVi.fn(async () => 'magnet:offered-by-self')

    download = hoistedVi.fn(async (magnetURI: string) => {
      this.torrents.add(magnetURI)

      return []
    })

    rescind = hoistedVi.fn(async (magnetURI: string) => {
      this.torrents.delete(magnetURI)
    })

    rescindAll = hoistedVi.fn(async () => {
      this.torrents.clear()
    })

    isOffering = (magnetURI: string) => this.torrents.has(magnetURI)

    constructor() {
      fileTransferClients.push(this)
    }
  }

  return { FileTransfer, setStreamSaverMitm: () => {} }
})

// Each listed peer keeps a direct-message `Room` mounted, which would join a
// real Trystero room. That room's file transfer is covered in `useRoom.test`.
vi.mock('components/Room', () => ({ Room: () => null }))

const aliceMagnetUri = `magnet:?xt=urn:btih:${'a'.repeat(40)}&dn=secret.txt`

interface Identity {
  keyPair: CryptoKeyPair
  userId: string
}

// Real keys, because a peer is only listed once it has proven it holds the key
// its user id is derived from.
let aliceIdentity: Identity
let bobIdentity: Identity

const createIdentity = async (): Promise<Identity> => {
  const keyPair = await encryption.generateKeyPair()

  return {
    keyPair,
    userId: await deriveUserIdFromKey(encryption, keyPair.publicKey),
  }
}

/**
 * Stands in for `Room`: publishes a group room to the shell exactly as
 * `useRoom` does, without the Trystero transport `Room` would build.
 */
const GroupRoomStub = ({
  chatRoom,
  fileTransferService,
}: {
  chatRoom: ChatRoom
  fileTransferService: FileTransferService
}) => {
  const { registerGroupRoom } = useContext(ShellContext)

  useEffect(() => {
    registerGroupRoom({ chatRoom, fileTransferService })

    return () => registerGroupRoom(null)
  }, [chatRoom, fileTransferService, registerGroupRoom])

  return null
}

const createChatRoom = (
  network: ReturnType<typeof createInMemoryNetwork>,
  peerId: string,
  { keyPair, userId }: Identity,
  adapters: PlatformAdapters
) =>
  new ChatRoom({
    roomId: 'room-123',
    userId,
    customUsername: '',
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    transport: new InMemoryTransport(network, peerId),
    adapters,
  })

/**
 * Bob in the shell with his group room registered, and Alice in the same room
 * offering a file. Bob's room is built like `useRoom` builds one: its own
 * `FileTransferService`, behind the real web adapters.
 */
const setUp = async () => {
  const network = createInMemoryNetwork()

  const bobFileTransferService = new FileTransferService({})
  const bob = createChatRoom(
    network,
    'peer-bob',
    bobIdentity,
    createWebAdapters({
      selectedSound: '',
      fileTransferService: bobFileTransferService,
    })
  )

  const alice = createChatRoom(
    network,
    'peer-alice',
    aliceIdentity,
    createPlatformAdapters(
      { uuid: () => 'alice-id' },
      {
        fileTransfer: {
          ...createPlatformAdapters({ uuid: () => '' }).fileTransfer,
          offer: async () => aliceMagnetUri,
        },
      }
    )
  )

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <Router>
        <SettingsContext.Provider
          value={userSettingsContextStubFactory({
            userId: bobIdentity.userId,
          })}
        >
          <Shell appNeedsUpdate={false} userPeerId={bobIdentity.userId}>
            <GroupRoomStub
              chatRoom={bob}
              fileTransferService={bobFileTransferService}
            />
          </Shell>
        </SettingsContext.Provider>
      </Router>
    </QueryClientProvider>
  )

  await bob.join()
  await alice.join()

  await waitFor(() =>
    expect(
      bob.getPeers().map(({ verificationState }) => verificationState)
    ).toEqual([PeerVerificationState.VERIFIED])
  )

  await alice.offerFiles([{ name: 'secret.txt', type: 'text/plain', size: 1 }])

  await waitFor(() =>
    expect(bob.getPeers()[0]?.offeredFile?.magnetURI).toBe(aliceMagnetUri)
  )

  const fileKey = itemAt(bob.getPeers(), 0).offeredFile?.fileKey

  return { alice, bob, bobFileTransferService, fileKey, view }
}

const downloadFromPeerList = async () => {
  await userEvent.click(screen.getByLabelText('Peer list'))

  const peerList = await screen.findByRole('list')

  await userEvent.click(
    await within(peerList).findByRole('button', {
      name: /download files being offered by/i,
    })
  )
}

describe('PeerDownloadFileButton', () => {
  beforeAll(async () => {
    ;[aliceIdentity, bobIdentity] = await Promise.all([
      createIdentity(),
      createIdentity(),
    ])
  }, 30_000)

  beforeEach(() => {
    fileTransferClients.length = 0
  })

  afterEach(() => {
    fileTransferClients.length = 0
  })

  // Regression test for https://github.com/jeremyckahn/chitchatter/issues/680
  test("downloads through the group room's own file transfer client", async () => {
    const { fileKey } = await setUp()

    // Only the room's: the shell builds none of its own, and nothing else
    // does either just by being imported.
    expect(fileTransferClients).toHaveLength(1)

    await downloadFromPeerList()

    const roomClient = itemAt(fileTransferClients, 0)

    await waitFor(() =>
      expect(roomClient.download).toHaveBeenCalledWith(
        aliceMagnetUri,
        fileKey,
        expect.anything()
      )
    )
    expect(fileTransferClients).toHaveLength(1)
  })

  // Regression test for https://github.com/jeremyckahn/chitchatter/issues/680
  test('stops seeding a downloaded file when its owner withdraws it', async () => {
    const { alice } = await setUp()

    await downloadFromPeerList()

    const roomClient = itemAt(fileTransferClients, 0)

    await waitFor(() =>
      expect(roomClient.torrents.has(aliceMagnetUri)).toBe(true)
    )

    await alice.rescindFileOffer()

    await waitFor(() =>
      expect(roomClient.rescind).toHaveBeenCalledWith(aliceMagnetUri)
    )
    expect(roomClient.torrents.has(aliceMagnetUri)).toBe(false)
  })

  // Regression test for https://github.com/jeremyckahn/chitchatter/issues/680
  test('stops seeding a downloaded file when the user leaves the room', async () => {
    const { bob } = await setUp()

    await downloadFromPeerList()

    const roomClient = itemAt(fileTransferClients, 0)

    await waitFor(() =>
      expect(roomClient.torrents.has(aliceMagnetUri)).toBe(true)
    )

    await bob.leave()

    expect(roomClient.torrents.has(aliceMagnetUri)).toBe(false)
  })
})
