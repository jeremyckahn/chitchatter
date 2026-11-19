import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { EnhancedConnectivityControl } from './EnhancedConnectivityControl'

describe('EnhancedConnectivityControl', () => {
  it('warns that disabling relays may prevent peers from connecting', () => {
    render(<EnhancedConnectivityControl isEnabled onChange={vi.fn()} />)

    expect(screen.getByText(/unable to connect to some peers/)).toBeTruthy()
  })

  it('calls onChange when the switch is toggled', () => {
    const onChange = vi.fn()

    render(<EnhancedConnectivityControl isEnabled onChange={onChange} />)

    fireEvent.click(screen.getByRole('checkbox'))

    expect(onChange).toHaveBeenCalledWith(expect.anything(), false)
  })
})
