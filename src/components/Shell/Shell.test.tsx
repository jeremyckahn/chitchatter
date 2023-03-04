import { waitFor, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsContext } from 'contexts/SettingsContext'
import { MemoryRouter as Router } from 'react-router-dom'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { Shell, ShellProps } from './Shell'

const mockUserPeerId = 'abc123'

const userSettingsStub = userSettingsContextStubFactory({
  userId: mockUserPeerId,
})

const ShellStub = (shellProps: Partial<ShellProps> = {}) => {
  return (
    <Router>
      <SettingsContext.Provider value={userSettingsStub}>
        <Shell
          appNeedsUpdate={false}
          userPeerId={mockUserPeerId}
          {...shellProps}
        />
      </SettingsContext.Provider>
    </Router>
  )
}

describe('Shell', () => {
  describe('menu drawer', () => {
    test('can be opened', () => {
      render(<ShellStub />)
      const menuButton = screen.getByLabelText('Open menu')
      userEvent.click(menuButton)
      const navigation = screen.getByRole('navigation')
      expect(navigation).toBeVisible()
    })

    test('can be closed', async () => {
      render(<ShellStub />)
      const menuButton = screen.getByLabelText('Open menu')
      userEvent.click(menuButton)
      const closeMenu = screen.getByLabelText('Close menu')
      userEvent.click(closeMenu)
      const navigation = screen.getByRole('navigation')

      await waitFor(() => {
        expect(navigation).not.toBeVisible()
      })
    })
  })
})
