import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { Home } from './Home'

vi.mock('config/router', () => ({
  routerType: 'browser',
}))

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home userId="test-user" />
    </MemoryRouter>
  )

const warningText = /anyone who learns it can join/i

describe('Home', () => {
  it('does not show the public room name warning for UUID names', () => {
    renderHome()

    expect(screen.queryByText(warningText)).not.toBeInTheDocument()
  })

  it('shows the warning when Passphrase is selected and hides it for UUID', () => {
    renderHome()

    fireEvent.click(screen.getByRole('button', { name: 'Passphrase' }))
    expect(screen.getByRole('note')).toHaveTextContent(warningText)

    fireEvent.click(screen.getByRole('button', { name: 'UUID' }))
    expect(screen.queryByText(warningText)).not.toBeInTheDocument()
  })
})
