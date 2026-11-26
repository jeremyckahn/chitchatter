import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { encryption } from 'core/crypto/Encryption'
import { progressIndicatorDelay } from 'hooks/useDelayedFlag'

import { RoomShareDialog, RoomShareDialogProps } from './RoomShareDialog'

const roomSecret = 'v2.HkewEwK6hKoGia0Kcg25zaypd5eEMDAwbMjltBdOY5A='

const renderDialog = (props: Partial<RoomShareDialogProps> = {}) => {
  const defaultProps: RoomShareDialogProps = {
    isOpen: true,
    handleClose: vi.fn(),
    roomId: 'team-sync-2026',
    password: roomSecret,
    showAlert: vi.fn(),
    copyToClipboard: vi.fn(async () => {}),
  }
  const mergedProps = { ...defaultProps, ...props }

  render(<RoomShareDialog {...mergedProps} />)

  return mergedProps
}

const openAdvancedAndEnter = async (password: string) => {
  await userEvent.click(screen.getByRole('button', { name: 'Advanced' }))
  await userEvent.click(screen.getByLabelText('I understand the risks'))
  await userEvent.type(screen.getByLabelText('Password'), password)
}

const copyWithPasswordButton = () =>
  screen.getByRole('button', { name: 'Copy URL with password' })

describe('RoomShareDialog', () => {
  beforeEach(() => {
    vi.spyOn(encryption, 'encodePassword').mockResolvedValue(roomSecret)
  })

  test('verifies the password once per click', async () => {
    const { copyToClipboard } = renderDialog()

    await openAdvancedAndEnter('sunshine42')
    await userEvent.click(copyWithPasswordButton())

    // Regression: the button both submitted the form and had an onClick, so
    // each click ran the (deliberately slow) derivation twice and copied twice.
    expect(encryption.encodePassword).toHaveBeenCalledOnce()
    expect(copyToClipboard).toHaveBeenCalledOnce()
    expect(copyToClipboard).toHaveBeenCalledWith(
      expect.stringContaining(
        `#${new URLSearchParams({ secret: roomSecret })}`
      ),
      'Private room URL with password copied to clipboard',
      'warning'
    )
  })

  test('shows verification progress while the password is checked', async () => {
    let resolveSecret: (secret: string) => void = () => {}

    vi.mocked(encryption.encodePassword).mockReturnValue(
      new Promise<string>(resolve => {
        resolveSecret = resolve
      })
    )
    renderDialog()

    await openAdvancedAndEnter('sunshine42')
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await userEvent.click(copyWithPasswordButton())

    expect(screen.getByLabelText('Password')).toBeDisabled()

    await act(async () => {
      vi.advanceTimersByTime(progressIndicatorDelay)
    })

    expect(
      screen.getByRole('button', { name: 'Verifying password…' })
    ).toBeDisabled()

    await act(async () => {
      resolveSecret(roomSecret)
    })
    vi.useRealTimers()
  })

  test('rejects a password that derives a different secret', async () => {
    vi.mocked(encryption.encodePassword).mockResolvedValue('v2.other')
    const { copyToClipboard, showAlert } = renderDialog()

    await openAdvancedAndEnter('wrong')
    await userEvent.click(copyWithPasswordButton())

    expect(copyToClipboard).not.toHaveBeenCalled()
    expect(showAlert).toHaveBeenCalledWith(
      'Incorrect password entered. Please wait 2s to retry.',
      { severity: 'error' }
    )
  })

  test('reports a derivation failure instead of copying', async () => {
    vi.mocked(encryption.encodePassword).mockRejectedValue(
      new Error('derivation failed')
    )
    const { copyToClipboard, showAlert } = renderDialog()

    await openAdvancedAndEnter('sunshine42')
    await userEvent.click(copyWithPasswordButton())

    expect(copyToClipboard).not.toHaveBeenCalled()
    expect(showAlert).toHaveBeenCalledWith(
      "Couldn't verify the password. Please try again.",
      { severity: 'error' }
    )
    expect(screen.getByLabelText('Password')).toBeEnabled()
  })
})
