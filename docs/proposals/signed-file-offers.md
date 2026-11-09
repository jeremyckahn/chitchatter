# Proposal: authenticated file offers

Status: **draft for review. Nothing here is implemented.** It changes the wire
protocol, so it needs a decision before any code.

Builds on [#648](https://github.com/jeremyckahn/chitchatter/pull/648), which is
still open. Paths below are as of that PR's head (`7133044`). Implementation
should be stacked on it and retargeted when it merges.

## 1. Recommendation

Do all three pieces from the issue, in this shape:

1. **Bind the identity proof to the connection** using the DTLS certificate
   fingerprints of the peer connection. Not the Trystero peer id, and not a
   challenge nonce (§3.1 explains why both fail).
2. **Sign each magnet in the core**, not in a `secure-file-transfer` wrapper. The
   signature rides in the magnet as an extra `x.cs` parameter, so the wire shape
   of `g.7` does not change and legacy clients can still download from new ones.
3. **Accept an offer only if the magnet's signature verifies under the key the
   sending connection has proven.** Offers that fail are dropped, never shown.

Fail closed for unsigned offers, with no grace-period fallback (§4).

## 2. What is broken, precisely

| Gap                           | Why it works today                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any peer can offer any magnet | `handleFileOffer` applies whatever arrives. It does not even validate the payload's shape.                                                                              |
| Identity can be replayed      | `signIdentity` signs `${roomId}_${userId}`. Another connection re-sends the victim's `{userId, publicKeyString, identitySignatureBase64}` and is shown as **VERIFIED**. |
| A magnet proves nothing       | A signature over `{magnetURI}` alone is forgeable: the attacker signs it with its own key. The signature must be checked against the key the _connection_ proved.       |

Each piece alone is insufficient. Signed magnets with replayable identity: the
attacker replays the owner's identity and the owner's signed magnet. Bound
identity with unsigned magnets: the attacker is honestly "Mallory" and offers
the owner's magnet.

## 3. Design

### 3.1 Connection-bound identity

New proof, signed with the existing key pair:

```
chitchatter/identity/v2\n{roomId}\n{userId}\n{signerFingerprints}\n{verifierFingerprints}
```

Each side's fingerprints are the sorted, de-duplicated `a=fingerprint` values
from `RTCPeerConnection.localDescription.sdp` and `remoteDescription.sdp`,
normalised to lowercase `sha-256:hex`. The signer puts `(local, remote)`. The
verifier recomputes with the roles swapped. A proof captured from one
connection fails on any other connection because the certificates differ.

**Why not the peer id.** Trystero's `selfId` is a random string the peer writes
into its signaling payload (`signal-handler.mjs`), and `room.mjs` replaces an
existing peer when a new connection claims the same id. It is self-asserted. An
attacker who claims the victim's id can replay a proof that "binds" the
victim's id. I have not built an exploit; the point is that the id cannot be the
thing a security property rests on.

**Why not a verifier challenge.** `A signs (nonce, roomId, userId)` is a relay
target. Mallory takes B's nonce, challenges A with it, and forwards A's answer
to B. Defeating that requires binding the proof to the channel, which is what
the fingerprints do. This is analysis, not a demonstrated attack.

Because the proof is per connection, `announceSelf()` stops broadcasting.
`join()` and `setCustomUsername` send one targeted metadata message per peer
(`transport.getPeers()`), each with its own signature.

Transport change (`src/core/transport/types.ts`):

```ts
getConnectionBinding: (peerId: string) => Promise<ConnectionBinding | null>
// ConnectionBinding = { local: readonly string[]; remote: readonly string[] }
```

`TrysteroTransport` reads it from `room.getPeers()[peerId]` (it already holds
the `RTCPeerConnection` for stats). A pure `parseSdpFingerprints` lives in
`core/transport`. `InMemoryTransport` fabricates distinct per-transport values,
so tests can model a forger on a different connection. `null` means "cannot
bind", and that peer can never be verified.

**Unverified assumption:** that both descriptions carry the fingerprint in
Chromium, Firefox and Safari once the data channel is open. It is standard
WebRTC, but step 0 of the plan is a two-browser spike before anything else is
built.

### 3.2 Creator-signed magnets

`ChatRoom.offerFiles` and `sendInlineMedia` get the plain magnet from the
adapter, then sign it in the core:

```
chitchatter/file-offer/v1\n{infoHash}
```

and append `&x.cs=<base64url, no padding>`. The adapter interface, `offer()`
and `secure-file-transfer` are untouched. **This departs from the issue's "wrapper
or upstream change"** because the core already holds the key and
`EncryptionService`, so nothing platform-specific is needed.

The signature carries no key and no room id. The verifier checks it against the
sender's already-proven key. Leaving the room id out is deliberate: it would
give anyone holding a magnet an offline oracle for guessing low-entropy room
names, the class #647 just closed, and buys nothing.

**Strict grammar is mandatory.** I verified against `magnet-uri@6.2.0` (the
version in `node_modules`) that WebTorrent's parser disagrees with a naive one:

- With two `xt` params the **last** wins. A magnet with the signed hash first
  and the attacker's second would verify and then download the attacker's.
- `xs=urn:btpk:…` (BEP 46) makes the client resolve the infohash from the DHT,
  so the `xt` we verified need not be what is fetched.
- Only the text after the first `magnet:?` is parsed, and any `k=v=w` parameter
  is silently skipped.
- `x.cs` itself is ignored by `magnet-uri`, which is what makes the legacy
  downgrade in §4 work.

So `parseSignedMagnet(unknown)` accepts only: a string starting `magnet:?` with
no second occurrence; exactly one `xt=urn:btih:<40 hex>`; at most one `dn`; any
number of `tr`; exactly one `x.cs` of valid base64url; nothing else. I ran
`parse-torrent`'s `toMagnetURI` on an object with an infohash, name and
trackers and got only `xt`, `dn` and `tr`; `offer()` sets no web seeds, but the
implementation should assert this against a magnet from a real `seed()`. The result is a branded `SignedMagnetURI`. All internal
records (originated, inline media, offers) key on the **infohash**, and the
adapter only ever receives the plain URI (signed one with `x.cs` stripped, byte
for byte otherwise). The two web call sites that call `fileTransfer.download`
(`InlineMedia.tsx`, `PeerDownloadFileButton.tsx`) must strip it too, because
WebTorrent keys its torrent map by its own regenerated URI.

### 3.3 Acceptance

`handleFileOffer(unknown, {peerId})`:

1. Validate the payload as `unknown` (`magnetURI` string, `isAllInlineMedia`
   boolean). Reject the rest.
2. If the peer has no verified identity yet, **hold** the offer (one slot per
   peer, latest wins). `greetPeer` sends metadata and the offer concurrently and
   verification is async, so the offer commonly arrives first. Re-evaluate when
   the identity resolves; drop it if the peer ends up unverified.
3. Parse strictly, then verify `x.cs` over the infohash with the peer's proven
   public key. Fail means drop and log. The peer's offer slot is untouched.
4. Accept. If the peer's proven key later changes, re-check its accepted offers.

A withdrawal (`null`) from a peer with no accepted offer is a no-op, which is
what closes the late-joiner race: the attacker's offer never got in, so its
withdrawal has nothing to withdraw. Replays never reach `fileOffers`, so the
duplicate-offer display goes away.

### 3.4 What gets simplified, and what stays

- **Remove:** `retainedMagnetUris`, `pruneRetainedMagnet`. They exist only
  because the offering peer's `isAllInlineMedia` flag was not trustworthy; on an
  accepted offer the flag now comes from the file's creator.
- **Keep, with a changed premise:** `isOfferedByAnotherPeer`. It cannot be
  removed: the owner reconnecting under a new peer id is still two peers
  offering one magnet (the `d938df0` test). It now only ever compares peers
  proven to hold the creator's key, so it can no longer be abused.
- **Keep for now:** `isOriginated`, adapter-level inline-media tracking, and the
  "DM rooms never stop a seed" rule. They are redundant once offers are
  authenticated, but removing them is a refactor with no security payoff, and
  #648's persistence tests pin the behaviour. Suggest a follow-up after this has
  shipped. (Restoring DM withdrawal would then be safe, since only the creator
  can withdraw its torrent.)

## 4. Compatibility and lagging clients

Old and new clients in one room:

| Direction | Result                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| New → old | Works. `g.7` has the same shape; old parsers ignore `x.cs`; the v1 identity field is still sent so old clients still show VERIFIED. |
| Old → new | Old client's identity has no v2 proof, so it is UNVERIFIED, and its unsigned offers are rejected: **it appears to have no files.**  |

Recommendation: **accept that, with no grace-period fallback.** A fallback that
accepts unsigned offers is a downgrade path: the attacker simply claims to be an
old client. For the same reason, acceptance must never consult a self-declared
version; presence of a valid signature is the only gate.

To keep the failure explicable rather than silent, add an advisory
`protocolVersion` (an enum) to `UserMetadata`. It drives UX only: a peer without
it gets a "needs to refresh to share files" hint. The owner has said all clients
can be assumed current, so I would not build more than that. A PWA that lags a
deploy fixes itself on the next service-worker update.

Keep the v1 `identitySignatureBase64` for one release so old clients still see
new ones as verified, then drop it.

## 5. Behaviour changes (called out)

Inherently insecure behaviour being removed:

- A replayed identity no longer shows **VERIFIED**. **VERIFIED now requires the
  connection-bound proof.** Today it is spoofable by design.
- Replayed and forged file offers are rejected, not shown.

Compatibility-driven changes, not insecure behaviour but not free either:

- Legacy (v1-only) peers show as UNVERIFIED and cannot offer files to new clients.
- A transport that cannot supply a binding yields no verified peers, so no
  offers. This includes any non-browser host (the TUI spike) until its transport
  implements `getConnectionBinding`.
- An offer can be briefly delayed while its sender's identity verifies.
- Metadata goes out per peer instead of one broadcast: N signatures instead of 1.
- Magnets on the wire gain `&x.cs=…`, and offers carrying `xs`, `ws`, `as`,
  duplicate `xt` or other parameters are rejected. The app never produces those.

Not changed: inline media persistence, the DM rule, transcript backfill.

## 6. Test plan and commit order

Red before green, one CI-confirmed step at a time:

0. **Spike**, not committed: two Playwright contexts (Chromium is installed)
   confirm fingerprints are readable and that a proof signed on one connection
   fails on another.
1. **Red, behaviour level** (compiles on today's API): a replayed identity is
   VERIFIED today; a forged offer appears in `getFileOffers()` today; the
   late-joiner race (forger announces first, withdraws before the owner's offer
   arrives) stops the receiver's seed today. These fail now and pin the fixes.
2. **Green:** connection binding (transport + `identity.ts`), with unit tests
   for `parseSdpFingerprints` and for swapped roles failing.
3. **Green:** `core/files/magnet.ts` (sign, strict parse, strip) with a unit
   table including duplicate `xt`, `xs=urn:btpk`, a second `magnet:?`, base32
   `xt`, a missing or duplicated `x.cs`, and a real `parse-torrent` magnet.
4. **Green:** acceptance, the pending slot, payload validation, removing
   `retainedMagnetUris`. Cover: reconnect under a new peer id with the same key
   keeps the seed; offer-before-metadata is held and then accepted; held offer
   dropped when verification fails; key change revokes offers; v1-only peer
   rejected; DM namespace behaves the same.

The test fake's `offer` returns opaque strings like `magnet:peer-0`; it must
return valid `magnet:?xt=urn:btih:<hex>` values. That mechanical churn touches
much of `ChatRoom.test.ts` and should be its own commit. The web adapter tests
(`src/adapters/web/index.test.ts`) should need no change.

Gates on each step: `npm run lint`, `npm run check:types`, `npm test`,
`npx vitest run --project core`.

## 7. Decisions needed from the owner

1. **Fail closed with no fallback** (recommended), or a time-boxed fallback?
2. **Branded `SignedMagnetURI` / `MagnetURI` types** (recommended; they keep a
   signed URI from reaching the adapter, at the cost of test churn), or plain
   `string` with discipline?
3. Show legacy peers as UNVERIFIED with a hint (recommended), or add a new
   verification state? The latter changes a numeric enum the UI reads.
4. Drop the v1 identity field after one release, or keep it indefinitely?

## 8. Not addressed

- `handleTranscript` still accepts a backfill from any peer into an empty log.
  Inline media in live `g.5` messages is not checked against its sender either;
  it cannot be, because backfilled messages are legitimately relayed.
- Magnets from peers can carry `tr`, `xs` and `ws` that WebTorrent will contact
  (an IP-disclosure vector). The strict grammar in §3.2 closes it for offers as a
  side effect; the inline-media and transcript paths still pass those through.
- A stolen private key (for example from a settings export) can sign. Out of model.
