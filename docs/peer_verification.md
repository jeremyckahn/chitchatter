# Peer Verification in Chitchatter

This document explains how peer verification is currently implemented in
Chitchatter, why it was designed that way, and a proposal for a
simpler, signature‑based approach that keeps everything client‑side.

## 1. Current Implementation

### Key generation

- When a user first opens the app, an RSA‑OAEP 2048‑bit key pair is
  generated using the Web Crypto API.
- The **public key** is displayed in the peer list and shared with
  other peers via a WebRTC data channel.
- The **private key** is stored only in the browser’s memory; it is never
  transmitted.

### Token‑based verification flow

1. A new peer joins a room.
2. The initiator creates a random _verification token_.
3. The token is encrypted with the remote peer’s public key and sent as
   `VERIFICATION_TOKEN_ENCRYPTED`.
4. The remote peer decrypts the payload, then sends the **raw** token
   back as `VERIFICATION_TOKEN_RAW`.
5. The initiator compares the returned token with the one it originally
   created. If they match, the peer is marked `VERIFIED`; otherwise it
   remains `UNVERIFIED`.
6. If no response is received within `verificationTimeout` (10 s), the
   peer is marked `UNVERIFIED`.

### State model

The verification state lives on the `Peer` interface (see
`src/models/chat.ts`):

```ts
export enum PeerVerificationState {
  VERIFYING,
  UNVERIFIED,
  VERIFIED,
}
```

The `Peer` model also stores the raw token and its encrypted
representation so that a peer can respond to verification requests.

### UI representation

`src/components/Shell/PeerListItem.tsx` shows an icon that reflects the
current `PeerVerificationState`. Clicking a peer opens a dialog where the
public key and a room‑joining interface are displayed.

## 2. Proposed Simplification – Signature‑Based Verification

The goal is to reduce complexity and the number of round‑trips while
preserving the same security guarantees. The new flow uses a simple
challenge‑response that relies on public‑key **signatures**.

### How it works

1. When a new peer joins, the initiator creates a random 32‑byte
   _challenge_.
2. The initiator signs the challenge with its **private key** using
   `RSASSA-PKCS1-v1_5` (or ECDSA if preferred). The resulting
   signature is sent as a single WebRTC message
   `VERIFICATION_SIGNATURE`.
3. The remote peer receives the signature, verifies it with the
   initiator’s **public key** via `verifyString`. If verification
   succeeds, the peer is marked `VERIFIED`; otherwise it stays
   `UNVERIFIED`.
4. No raw token or encrypted payload is stored, eliminating the need
   for `verificationToken` and `encryptedVerificationToken` fields.
5. The timeout logic remains identical – if a response is not
   received within `verificationTimeout`, the peer is marked
   `UNVERIFIED`.

### Benefits

- **Single message** – Only one WebRTC message is required.
- **No token persistence** – The challenge never leaves the sender.
- **Simplicity** – The verification logic is easier to reason about
  and to test.
- **Zero‑copy** – Signing and verifying are fast operations on the
  browser’s crypto engine.

### New helper functions

Add the following to `src/services/Encryption/Encryption.ts`:

```ts
// Sign a UTF‑8 string with a private key
async signString(privateKey: CryptoKey, data: string): Promise<ArrayBuffer> {
  const encoded = new TextEncoder().encode(data);
  return await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    privateKey,
    encoded,
  );
}

// Verify a signature using a public key
async verifyString(publicKey: CryptoKey, data: string, signature: ArrayBuffer): Promise<boolean> {
  const encoded = new TextEncoder().encode(data);
  return await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    publicKey,
    signature,
    encoded,
  );
}
```

### Updated data‑channel actions

| Old                            | New                      |
| ------------------------------ | ------------------------ |
| `VERIFICATION_TOKEN_ENCRYPTED` | `VERIFICATION_SIGNATURE` |
| `VERIFICATION_TOKEN_RAW`       | – removed                |

### Model changes

Remove `verificationToken` and `encryptedVerificationToken` from the
`Peer` interface. All components that previously accessed those
properties should be updated to work with the new flow.

## 3. Migration Plan

| Step | Task                                                                                                       | Owner   | Notes                                              |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------- |
| 1    | Add `signString` / `verifyString` helpers to `EncryptionService`.                                          | dev     | Use existing RSA key pair.                         |
| 2    | Update `usePeerVerification` hook:                                                                         |
|      | • Remove token generation logic.                                                                           |
|      | • Generate a random challenge.                                                                             |
|      | • Sign and send via `VERIFICATION_SIGNATURE`.                                                              |
|      | • On receipt, verify the signature and update state.                                                       |
|      | • Adjust timeout handling.                                                                                 |
|      | • Delete token fields from the peer object.                                                                | dev     |                                                    |
| 3    | Remove `verificationToken` and `encryptedVerificationToken` from the `Peer` model in `src/models/chat.ts`. | dev     | Ensure no downstream code references these fields. |
| 4    | Update UI components (`PeerListItem`, dialog, etc.) to no longer read token fields.                        | dev     |                                                    |
| 5    | Add or update tests:                                                                                       |
|      | • Verify that a peer becomes `VERIFIED` when the signature matches.                                        |
|      | • Verify that a mismatch or timeout results in `UNVERIFIED`.                                               | QA      |                                                    |
| 6    | Update documentation (README, About page, this file) to reflect the new verification method.               | dev     |                                                    |
| 7    | Run the full test suite, lint, type check, and formatting.                                                 | CI      | Ensure 100 % pass.                                 |
| 8    | Deprecate the old `VERIFICATION_TOKEN_*` actions in the `PeerAction` enum and remove any unused code.      | dev     |                                                    |
| 9    | Merge changes and release the new version.                                                                 | release |                                                    |

> **Tip** – Keep the migration in a single feature branch and consider using a feature flag to enable the new flow for a subset of users until it is fully validated.

---

### Dependencies & Constraints

- All cryptographic operations remain client‑side; no server changes are needed.
- No new third‑party libraries are required.
- The Web Crypto API is available in all modern browsers used by
  Chitchatter.

### Risk Assessment

- **Compatibility** – Existing peers that still use the old protocol
  will fail verification. A fallback layer can be added temporarily.
- **Testing** – Write unit tests for the new helper functions using a
  headless browser or a mock `crypto` object.
- **Performance** – Signing a 32‑byte challenge is negligible compared
  to the current encrypt‑decrypt workflow.

---

### Summary

The signature‑based approach keeps the verification entirely client‑side,
reduces the number of round‑trips, and simplifies the codebase while
maintaining the same security guarantees.
