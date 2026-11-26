import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { progressIndicatorDelay } from 'hooks/useDelayedFlag'

import { PasswordPrompt, unlockFailedMessage } from './PasswordPrompt'

const createDeferred = () => {
  let resolve: () => void = () => {}
  let reject: (reason: unknown) => void = () => {}
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const renderPrompt = (
  onPasswordEntered: (password: string) => Promise<void>,
  notice?: string
) =>
  render(
    <MemoryRouter>
      <PasswordPrompt
        isOpen
        onPasswordEntered={onPasswordEntered}
        notice={notice}
      />
    </MemoryRouter>
  )

const getPasswordField = () => screen.getByLabelText('Password')

describe('PasswordPrompt', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('submits the entered password', async () => {
    const onPasswordEntered = vi.fn(async () => {})

    renderPrompt(onPasswordEntered)

    await userEvent.type(getPasswordField(), 'sunshine42{Enter}')

    expect(onPasswordEntered).toHaveBeenCalledExactlyOnceWith('sunshine42')
  })

  test('locks the form while the room secret is being derived', async () => {
    const deferred = createDeferred()
    const onPasswordEntered = vi.fn(() => deferred.promise)

    renderPrompt(onPasswordEntered)

    await userEvent.type(getPasswordField(), 'sunshine42{Enter}')

    expect(getPasswordField()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled()

    await act(async () => {
      deferred.resolve()
    })
  })

  test('ignores repeated submissions while unlocking', async () => {
    const deferred = createDeferred()
    const onPasswordEntered = vi.fn(() => deferred.promise)

    renderPrompt(onPasswordEntered)

    await userEvent.type(getPasswordField(), 'sunshine42{Enter}')
    // The field is disabled now, so submit the form directly, as a second
    // Enter press or a double tap would.
    const form = getPasswordField().closest('form')

    await act(async () => {
      form?.requestSubmit()
    })

    expect(onPasswordEntered).toHaveBeenCalledOnce()

    await act(async () => {
      deferred.resolve()
    })
  })

  test('shows progress only once unlocking takes noticeable time', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const deferred = createDeferred()

    renderPrompt(() => deferred.promise)

    await userEvent.type(getPasswordField(), 'sunshine42{Enter}')

    expect(screen.queryByText('Unlocking room…')).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(progressIndicatorDelay)
    })

    expect(
      screen.getByRole('button', { name: 'Unlocking room…' })
    ).toBeDisabled()

    await act(async () => {
      deferred.resolve()
    })
  })

  test('shows an error and unlocks the form when derivation fails', async () => {
    const onPasswordEntered = vi.fn(async () => {
      throw new Error('derivation failed')
    })

    renderPrompt(onPasswordEntered)

    await userEvent.type(getPasswordField(), 'sunshine42{Enter}')

    expect(await screen.findByText(unlockFailedMessage)).toBeInTheDocument()
    expect(getPasswordField()).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled()
  })

  test('shows a notice when one is given', () => {
    renderPrompt(async () => {}, 'This room link could not be read.')

    expect(
      screen.getByText('This room link could not be read.')
    ).toBeInTheDocument()
  })
})
