# `src/core`

Chitchatter's application logic, with no presentation layer attached.

Everything in here must run unchanged in a browser, in Node, and in a terminal.
That is what makes a TUI (or any other non-web front end) possible without
re-implementing the chat protocol.

## The boundary rule

Nothing under `src/core` may:

- import `react`, `react-*`, `@mui/*` or `@emotion/*`
- import from `components/`, `contexts/`, `pages/`, `hooks/`, `services/` or
  `adapters/`
- import a browser-only package (`localforage`, `file-saver`, `streamsaver`,
  `secure-file-transfer`)
- touch `window`, `document`, `navigator`, `localStorage`, `sessionStorage`,
  `alert`, `Notification` or `AudioContext`
- read `import.meta.env` — build-time configuration is passed _in_, not read

The first four are enforced by `no-restricted-imports` / `no-restricted-globals`
in the `src/core/**/*.ts` override in `.eslintrc.json`, and `npm run lint` runs
with `--max-warnings=0`.

Lint cannot see through a transitive import that itself reaches for the DOM, so
the real backstop is the `core` Vitest project: it runs with
`environment: 'node'` and no `setupFiles`, so anything that needs a DOM fails
there. Run it alone with `npx vitest run --project core`.

## How platform capabilities get in

Through injected adapters (`src/core/adapters/types.ts`): notifications, sound,
storage, file transfer, clock, ids and logging. The web implementations live in
`src/adapters/web/`; `src/core/adapters/noop.ts` provides inert versions for
tests and headless consumers.

Of those, `fileTransfer`, `clock`, `ids` and `logger` are the ones the core
actually calls. `notifier`, `sound` and `storage` are declared and implemented
but unused from here: the web app decides what to announce in
`useChatRoomNotifications`, from the room's events, because wording an alert is
presentation. They are the slot a host without such a layer would use — not a
path the core takes.

`src/core/transport/TrysteroTransport.ts` is the one deliberate exception — it
owns the WebRTC/Trystero stack, so it is _not_ exported from `src/core/index.ts`.
Import it explicitly when you want it, and use `InMemoryTransport` in tests.

## What is intentionally _not_ here

Audio, video and screen share. They are inherently web-only and stay in
`src/components/Room/useRoom{Audio,Video,ScreenShare}.ts`. The core knows that a
peer's media is playing or stopped (`AudioState`, `VideoState`,
`ScreenShareState` on `Peer`) but never touches a `MediaStream`.

Web-only types that would otherwise leak DOM objects into the domain model live
in `src/models/media.ts`.

## How the web app consumes it

The React side owns three things the core does not: when rooms are created, how
long they live, and how components read their state.

### One transport, many rooms

`src/components/Room/useRoom.ts` creates a `TrysteroTransport` for the group
room and parks it on `ShellContext.transportRef`. A direct-message room does
**not** join the room a second time — it reuses that same transport under a
different action namespace (`ActionNamespace.GROUP = 'g'` vs
`DIRECT_MESSAGE = 'dm'` in `transport/types.ts`). One underlying WebRTC room
therefore carries group chat plus every DM.

The consequence is the single sharpest edge in this design: **every room on a
transport shares that transport's actions, and every direct-message room shares
the `dm` namespace with every other one.** A DM room's receivers are called for
traffic from peers it has nothing to do with, so each one has to recognise its
own correspondent — which is what `ChatRoom.isFromRoomPeer` is for. A new
`dm.*` receiver that forgets to apply it will put one conversation's messages,
metadata, typing status or file offers into another's.

This is the normal case, not an edge case: `PeerListItem` renders its peer
dialog with MUI's `keepMounted`, so in any room with two or more peers every
peer already has a live DM `ChatRoom` attached to those shared actions.

### Lifetime

`ChatRoomRegistry` (`chat/ChatRoomRegistry.ts`) holds the open rooms: one group
room plus a DM room per peer. Rooms are registered there rather than owned by
the components that render them, because a DM conversation has to survive the
dialog closing and reopening with its transcript intact. Only the group room is
published to the shell (`registerChatRoom`); when it unmounts it clears the
registry's DM rooms, leaves, and drops the transport.

The registry also forwards the group room's `PEER_JOIN` and `PEER_LEAVE` to the
DM room for that peer, because the transport has one join and one leave slot per
`PeerHookType` and the group room holds both. **Both directions have to be
forwarded.** A room that is told a peer left remembers it, so that metadata
still in flight cannot resurrect a peer that has gone — and only a join lifts
that, so forwarding the departure alone leaves a conversation that can never
take its correspondent back.

Because that forwarding makes DM rooms emit membership events too, the web app
only announces them for the group room: `useChatRoomNotifications` takes an
`isDirectMessageRoom` flag and subscribes to `PEER_JOIN`, `PEER_LEAVE` and
`PEER_RENAME` only when it is false. Otherwise one departure raises a snackbar
per open conversation, which — see `keepMounted` above — is per peer in the
room.

### Reading state

Components do not hold copies of core state. `useChatRoomSnapshot`
(`src/hooks/useChatRoomSnapshot.ts`) subscribes to a room's events through
`useSyncExternalStore`, and `src/hooks/useChatRoomState.ts` wraps it as
`useChatRoomPeers`, `useChatRoomMessageLog`, `useChatRoomFileOffers`,
`useChatRoomSelfFileOffer`, `useChatRoomIsMessageSending` and
`useChatRoomConnectionTypes`. Each takes the slice of the room it reads
(`ChatRoomPeerSource` and friends) rather than a whole `ChatRoom`, so a
component can declare what it needs and a test stub is checked against the real
members.

This extends to state the host might be tempted to keep itself. The
stop-sharing control is a view of `getSelfFileOfferMagnetUri` through
`useChatRoomSelfFileOffer`, not a `useState` the handlers write: the room
refuses an offer outright once it has been left, and clears its own before a
rescind can fail, so a second copy of the answer can only disagree with it.

`useSyncExternalStore` requires `getSnapshot` to return an identical reference
until the data actually changes, which is why `ChatRoom` caches its snapshots
instead of building a fresh array per read. **A `get*` method that returns a new
object every call will spin the renderer**, so any new snapshot accessor must
cache the same way, and a mutation that changes nothing must not emit its event.

One corollary worth knowing: `ShellContext.peerList` is a snapshot of the
**group** room only. Per-room state — a DM's roster, its typing status — has to
be read from that room via these hooks, not from the shell.

### Errors

A room does not throw out of the operations nothing can be done about — a failed
broadcast, a rescind that cannot be announced, a teardown that half-succeeds.
It reports them on `ChatRoomEvent.ERROR` and carries on, so a host decides
whether that is a snackbar, a log line or nothing at all. The payload's
`context` is a `ChatRoomErrorContext`, not a string, so a host can switch on
which operation failed. Nothing in the web app subscribes to it today; the
adapter's logger is the only consumer.

## Running it headless

```sh
npx vitest run --project core   # the whole protocol, in Node, with no DOM
npm run spike:tui -- <room-id>  # a terminal client built on this core
```

The Vitest `core` project is the authoritative proof: it runs several
`ChatRoom`s against each other over `InMemoryTransport` with
`environment: 'node'` and no setup files. `scripts/tui-spike.ts` is a
demonstration rather than a test, and its header documents exactly how far it
currently gets.

## Map

| Area                  | Entry point                   |
| --------------------- | ----------------------------- |
| The chat client       | `chat/ChatRoom.ts`            |
| Event catalog         | `chat/events.ts`              |
| Wire payloads         | `chat/protocol.ts`            |
| Peer identity         | `chat/identity.ts`            |
| Transcript policy     | `chat/transcript.ts`          |
| Peer-list reducers    | `chat/peers.ts`               |
| File offers           | `chat/fileOffers.ts`          |
| Open-room bookkeeping | `chat/ChatRoomRegistry.ts`    |
| Transport contract    | `transport/types.ts`          |
| Platform adapters     | `adapters/types.ts`           |
| Settings              | `settings/SettingsManager.ts` |
| Name resolution       | `names/peerNames.ts`          |
