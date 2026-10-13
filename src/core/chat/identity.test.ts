import { beforeAll, describe, expect, it } from 'vitest'

import {
  getIdentityVerificationMessage,
  signIdentity,
  verifyPeerIdentity,
} from 'core/chat/identity'
import { encryption, EncryptionService } from 'core/crypto/Encryption'
import { PeerVerificationState } from 'core/models/chat'

const roomId = 'room-1'
const userId = 'user-1'

describe('getIdentityVerificationMessage', () => {
  it('binds the room id and user id together', () => {
    expect(getIdentityVerificationMessage('abc', 'def')).toBe('abc_def')
  })

  it('differs between rooms so a signature cannot be replayed elsewhere', () => {
    expect(getIdentityVerificationMessage('room-a', userId)).not.toBe(
      getIdentityVerificationMessage('room-b', userId)
    )
  })
})

describe('signIdentity / verifyPeerIdentity', () => {
  let keyPair: CryptoKeyPair

  beforeAll(async () => {
    keyPair = await encryption.generateKeyPair()
  })

  it('round-trips a signature as VERIFIED', async () => {
    const proof = await signIdentity({
      encryptionService: encryption,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      roomId,
      userId,
    })

    const verified = await verifyPeerIdentity({
      encryptionService: encryption,
      ...proof,
      roomId,
      peerUserId: userId,
    })

    expect(verified?.verificationState).toBe(PeerVerificationState.VERIFIED)
  })

  it('returns the parsed public key so the peer list can hold it', async () => {
    const proof = await signIdentity({
      encryptionService: encryption,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      roomId,
      userId,
    })

    const verified = await verifyPeerIdentity({
      encryptionService: encryption,
      ...proof,
      roomId,
      peerUserId: userId,
    })

    expect(verified?.publicKey.type).toBe('public')
    await expect(
      encryption.stringifyCryptoKey(verified!.publicKey)
    ).resolves.toBe(proof.publicKeyString)
  })

  it('reports UNVERIFIED when the signature is for a different user', async () => {
    const proof = await signIdentity({
      encryptionService: encryption,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      roomId,
      userId,
    })

    const verified = await verifyPeerIdentity({
      encryptionService: encryption,
      ...proof,
      roomId,
      peerUserId: 'somebody-else',
    })

    expect(verified?.verificationState).toBe(PeerVerificationState.UNVERIFIED)
  })

  it('reports UNVERIFIED when the signature is for a different room', async () => {
    const proof = await signIdentity({
      encryptionService: encryption,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      roomId,
      userId,
    })

    const verified = await verifyPeerIdentity({
      encryptionService: encryption,
      ...proof,
      roomId: 'a-different-room',
      peerUserId: userId,
    })

    expect(verified?.verificationState).toBe(PeerVerificationState.UNVERIFIED)
  })

  it('reports UNVERIFIED for a tampered signature rather than throwing', async () => {
    const proof = await signIdentity({
      encryptionService: encryption,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      roomId,
      userId,
    })

    const tampered = EncryptionService.base64ToArrayBuffer(
      proof.identitySignatureBase64
    )
    const bytes = new Uint8Array(tampered)

    bytes[0] = bytes[0] ^ 0xff

    const verified = await verifyPeerIdentity({
      encryptionService: encryption,
      publicKeyString: proof.publicKeyString,
      identitySignatureBase64: EncryptionService.arrayBufferToBase64(tampered),
      roomId,
      peerUserId: userId,
    })

    expect(verified?.verificationState).toBe(PeerVerificationState.UNVERIFIED)
  })

  it('reports UNVERIFIED when another key signed the message', async () => {
    const impostor = await encryption.generateKeyPair()

    const identitySignature = await encryption.signString(
      impostor.privateKey,
      getIdentityVerificationMessage(roomId, userId)
    )

    const verified = await verifyPeerIdentity({
      encryptionService: encryption,
      publicKeyString: await encryption.stringifyCryptoKey(keyPair.publicKey),
      identitySignatureBase64:
        EncryptionService.arrayBufferToBase64(identitySignature),
      roomId,
      peerUserId: userId,
    })

    expect(verified?.verificationState).toBe(PeerVerificationState.UNVERIFIED)
  })

  it('returns null for an unparseable public key rather than throwing', async () => {
    await expect(
      verifyPeerIdentity({
        encryptionService: encryption,
        publicKeyString: 'not-a-key',
        identitySignatureBase64: 'AAAA',
        roomId,
        peerUserId: userId,
      })
    ).resolves.toBeNull()
  })
})
