import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { encryption } from 'core/crypto/Encryption'

import { invalidLinkNotice, PrivateRoom } from './PrivateRoom'

vi.mock('components/Room', () => ({
  Room: ({ roomId, password }: { roomId: string; password?: string }) => (
    <div data-testid="room">{`${roomId}|${password ?? ''}`}</div>
  ),
}))

vi.mock('hooks/useThrottledRoomMount', () => ({
  useThrottledRoomMount: () => true,
}))

vi.mock('services/Notification', () => ({
  notification: { requestPermission: () => {} },
}))

const roomId = 'team-sync-2026'
const legacySecret = 'pn9emZ19UNxo/0Ml/imYLDIu43ihuVNpGsmBglQR5OQ='
const currentSecret = 'v2.HkewEwK6hKoGia0Kcg25zaypd5eEMDAwbMjltBdOY5A='

const renderPrivateRoom = (hash = '') => {
  window.history.replaceState(null, '', `/private/${roomId}${hash}`)

  return render(
    <MemoryRouter initialEntries={[`/private/${roomId}`]}>
      <Routes>
        <Route
          path="/private/:roomId"
          element={<PrivateRoom userId="user-1" />}
        />
      </Routes>
    </MemoryRouter>
  )
}

const expectRoomJoinedWith = async (secret: string) => {
  expect(await screen.findByTestId('room')).toHaveTextContent(
    `${roomId}|${secret}`
  )
}

describe('PrivateRoom', () => {
  beforeEach(() => {
    vi.spyOn(encryption, 'encodePassword').mockResolvedValue(currentSecret)
    vi.spyOn(encryption, 'resolveRoomLinkSecret').mockResolvedValue(
      currentSecret
    )
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  test('asks for the password when the link carries no secret', () => {
    renderPrivateRoom()

    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.queryByTestId('room')).not.toBeInTheDocument()
  })

  test('joins with the secret derived from the typed password', async () => {
    renderPrivateRoom()

    await userEvent.type(screen.getByLabelText('Password'), 'sunshine42{Enter}')

    await expectRoomJoinedWith(currentSecret)
    expect(encryption.encodePassword).toHaveBeenCalledWith(roomId, 'sunshine42')
  })

  test('upgrades a legacy link secret without asking for the password', async () => {
    renderPrivateRoom(`#secret=${encodeURIComponent(legacySecret)}`)

    await expectRoomJoinedWith(currentSecret)
    expect(encryption.resolveRoomLinkSecret).toHaveBeenCalledExactlyOnceWith(
      roomId,
      legacySecret
    )
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  test('falls back to the password prompt for an unreadable link', async () => {
    vi.mocked(encryption.resolveRoomLinkSecret).mockResolvedValue(undefined)

    renderPrivateRoom('#secret=garbage')

    expect(await screen.findByText(invalidLinkNotice)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.queryByTestId('room')).not.toBeInTheDocument()
  })

  test('falls back to the password prompt when a link cannot be resolved', async () => {
    vi.mocked(encryption.resolveRoomLinkSecret).mockRejectedValue(
      new Error('derivation failed')
    )

    renderPrivateRoom(`#secret=${encodeURIComponent(currentSecret)}`)

    expect(await screen.findByText(invalidLinkNotice)).toBeInTheDocument()
  })

  test('derives the secret from a pwd link parameter once', async () => {
    renderPrivateRoom('#pwd=sunshine42')

    await expectRoomJoinedWith(currentSecret)
    // Regression: the parameter was re-derived on every render.
    expect(encryption.encodePassword).toHaveBeenCalledExactlyOnceWith(
      roomId,
      'sunshine42'
    )
  })

  test('clears the secret from the address bar', async () => {
    renderPrivateRoom(`#secret=${encodeURIComponent(currentSecret)}`)

    await expectRoomJoinedWith(currentSecret)
    await waitFor(() => {
      expect(window.location.hash).not.toContain('secret')
    })
  })
})
