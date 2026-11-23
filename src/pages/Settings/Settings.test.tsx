import { fireEvent, render, waitFor } from '@testing-library/react'
import { PropsWithChildren, useContext, useMemo } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { notification } from 'services/Notification'
import { settings } from 'services/Settings'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { Settings } from './Settings'

const showAlert = vi.fn()
const updateUserSettings = vi.fn(() => Promise.resolve())

const Wrapper = ({ children }: PropsWithChildren) => {
  const shellDefaults = useContext(ShellContext)

  const shellValue = useMemo(
    () => ({ ...shellDefaults, showAlert }),
    [shellDefaults]
  )
  const settingsValue = useMemo(
    () => ({ ...userSettingsContextStubFactory(), updateUserSettings }),
    []
  )

  return (
    <ShellContext.Provider value={shellValue}>
      <SettingsContext.Provider value={settingsValue}>
        {children}
      </SettingsContext.Provider>
    </ShellContext.Provider>
  )
}

const renderImportInput = () => {
  const { container } = render(<Settings userId="user-1" />, {
    wrapper: Wrapper,
  })
  const input = container.querySelector('input[type="file"]')

  if (!(input instanceof HTMLInputElement)) {
    throw new Error('profile import input not rendered')
  }

  return input
}

describe('Settings profile import', () => {
  beforeEach(() => {
    vi.spyOn(notification, 'requestPermission').mockResolvedValue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    showAlert.mockClear()
    updateUserSettings.mockClear()
  })

  test('imports the picked file', async () => {
    const importSettings = vi
      .spyOn(settings, 'importSettings')
      .mockResolvedValue(userSettingsContextStubFactory().getUserSettings())
    const input = renderImportInput()
    const file = new File(['{}'], 'profile.json', { type: 'application/json' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(importSettings).toHaveBeenCalledWith(file))
    await waitFor(() => expect(updateUserSettings).toHaveBeenCalledTimes(1))
  })

  test('does nothing when the change has no file', async () => {
    const importSettings = vi.spyOn(settings, 'importSettings')
    const onUnhandledRejection = vi.fn()

    process.on('unhandledRejection', onUnhandledRejection)

    const input = renderImportInput()

    // An empty selection reaches the handler as `[]`, and nothing outside the
    // handler's `try` may throw on it
    fireEvent.change(input, { target: { files: [] } })

    // The library reads files asynchronously, so let its promise settle
    await new Promise(resolve => setTimeout(resolve, 0))

    process.off('unhandledRejection', onUnhandledRejection)

    expect(onUnhandledRejection).not.toHaveBeenCalled()
    expect(importSettings).not.toHaveBeenCalled()
    expect(updateUserSettings).not.toHaveBeenCalled()
    expect(showAlert).not.toHaveBeenCalled()
  })
})
