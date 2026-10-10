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
