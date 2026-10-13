/**
 * A terminal chat client for Chitchatter, in about 150 lines.
 *
 * This is a spike, not a product. Its job is to show that `src/core` is usable
 * outside a browser: it builds a real ChatRoom over the real TrysteroTransport
 * and runs the whole chat protocol without importing a line of React, MUI or
 * DOM code.
 *
 * STATUS — what this does and does not prove:
 *
 * Working: the core boots in Node, generates its RSA identity keypair, joins
 * the room and opens a tracker WebSocket. Nothing under `src/core` needed
 * changing or stubbing to get there, which was the point of the exercise.
 *
 * Not yet working: peer discovery between two Node processes. The tracker
 * socket reaches readyState OPEN but Trystero never reports a peer, so no
 * WebRTC connection is established and no messages cross. That is a
 * Trystero/node-datachannel interop gap underneath the transport rather than
 * anything the core affects — the same code paths work in a browser, which the
 * Playwright suite covers. Running it down means digging into Trystero's
 * torrent strategy against node-datachannel's polyfill, and is left for
 * whoever builds the real TUI.
 *
 * The headlessness of the core itself is proven independently of this script,
 * and without that caveat, by the `core` Vitest project:
 * `npx vitest run --project core` runs the full protocol between several
 * clients over InMemoryTransport with `environment: 'node'` and no DOM.
 *
 * Run it with:
 *
 *   npm run spike:tui -- <room-id>
 *
 * then open http://localhost:3000/public/<room-id> in a browser (`npm run dev`)
 * and type in both. Point it at a local tracker with
 * CHITCHATTER_TRACKER_URL=ws://localhost:8000 to match `npm run dev`.
 */
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

// Trystero's torrent strategy expects a browser WebRTC stack. Node has none,
// so install one before anything imports Trystero. This is the whole extent of
// the platform gap for a terminal host.
import { RTCPeerConnection } from 'node-datachannel/polyfill'

Object.assign(globalThis, { RTCPeerConnection })

const { ChatRoom } = await import('../src/core/chat/ChatRoom.ts')
const { ChatRoomEvent } = await import('../src/core/chat/events.ts')
const { createPlatformAdapters } = await import('../src/core/adapters/noop.ts')
const { encryption } = await import('../src/core/crypto/Encryption.ts')
const { isInlineMedia } = await import('../src/core/models/chat.ts')
const { getDisplayUsername } = await import('../src/core/names/peerNames.ts')
const { TrysteroTransport } = await import(
  '../src/core/transport/TrysteroTransport.ts'
)

const roomId = process.argv[2]

if (!roomId) {
  console.error('Usage: npm run spike:tui -- <room-id>')
  process.exit(1)
}

// Crypto-grade, not Math.random(): this id becomes part of the
// `${roomId}_${userId}` plaintext that peers sign to prove their identity, and
// the generated nickname other peers verify is derived from it. The web app
// uses a v4 uuid here for the same reason (see Init.tsx).
const userId = `tui-${globalThis.crypto.randomUUID()}`
const customUsername = process.env.CHITCHATTER_USERNAME ?? 'Terminal'

// Must match the browser app's appId, or the two join different rooms.
// See the `appId` default in src/components/Room/Room.tsx.
const appId =
  process.env.CHITCHATTER_APP_ID ??
  `${encodeURI('http://localhost:3000')}_chitchatter`

console.log(`Generating a keypair…`)

const { publicKey, privateKey } = await encryption.generateKeyPair()

// Mirrors src/config/trackerUrls.ts, which the core may not import because it
// reads import.meta.env.
const trackerUrl = process.env.CHITCHATTER_TRACKER_URL

const transport = new TrysteroTransport(
  {
    appId,
    // A public room's Trystero password is its room id, which is what gives
    // the room encryption a key either way. See useRoom's ChatRoom setup.
    password: roomId,
    relayConfig: {
      urls: trackerUrl ? [trackerUrl] : undefined,
      redundancy: 4,
    },
  },
  roomId
)

const chatRoom = new ChatRoom({
  roomId,
  userId,
  customUsername,
  publicKey,
  privateKey,
  transport,
  // No notifications, no sound, no file transfer: a terminal has no business
  // with any of them, and the core does not care.
  adapters: createPlatformAdapters(
    { uuid: () => globalThis.crypto.randomUUID() },
    { logger: { warn: () => {}, error: console.error } }
  ),
})

const nameFor = (id: string) =>
  getDisplayUsername(id, {
    selfUserId: userId,
    selfCustomUsername: customUsername,
    peers: chatRoom.getPeers(),
  })

const log = (line: string) => {
  // Keep the prompt on the last line while messages scroll above it.
  stdout.write(`\r\x1b[K${line}\n> `)
}

chatRoom.on(ChatRoomEvent.MESSAGE_RECEIVED, ({ message }) => {
  log(
    isInlineMedia(message)
      ? `${nameFor(message.authorId)} shared media`
      : `${nameFor(message.authorId)}: ${message.text}`
  )
})

chatRoom.on(ChatRoomEvent.PEER_JOIN, () => {
  log('* someone joined')
})

chatRoom.on(ChatRoomEvent.PEER_LEAVE, ({ peer }) => {
  log(`* ${peer ? nameFor(peer.userId) : 'someone'} left`)
})

chatRoom.on(
  ChatRoomEvent.PEER_RENAME,
  ({ previousDisplayName, displayName }) => {
    log(`* ${previousDisplayName} is now ${displayName}`)
  }
)

chatRoom.on(ChatRoomEvent.TYPING_STATUS_CHANGE, ({ peerId, isTyping }) => {
  if (!isTyping) return

  const peer = chatRoom.getPeers().find(({ peerId: id }) => id === peerId)

  if (peer) log(`* ${nameFor(peer.userId)} is typing…`)
})

chatRoom.on(ChatRoomEvent.ERROR, ({ error, context }) => {
  log(`! ${context}: ${error.message}`)
})

await chatRoom.join()

console.log(`Joined "${roomId}" as ${nameFor(userId)}.`)
console.log(
  `Open http://localhost:3000/public/${roomId} to chat from a browser.`
)
console.log(`Type a message and press enter. Ctrl-C to leave.\n`)

const rl = createInterface({ input: stdin, output: stdout, prompt: '> ' })

const shutDown = async () => {
  rl.close()
  await chatRoom.leave()
  transport.leaveRoom()
  console.log('\nLeft the room.')
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutDown()
})

rl.prompt()

for await (const line of rl) {
  const text = line.trim()

  if (text) await chatRoom.sendMessage(text)

  rl.prompt()
}

await shutDown()
