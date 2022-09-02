import { waitFor, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter as Router } from 'react-router-dom'

import { Shell, ShellProps } from './Shell'

const ShellStub = (overrides: ShellProps = {}) => {
  return (
    <Router>
      <Shell {...overrides} />
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
