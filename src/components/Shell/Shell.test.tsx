import { waitFor, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsContext } from 'contexts/SettingsContext'
import { MemoryRouter as Router } from 'react-router-dom'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { Shell, ShellProps } from './Shell'

const mockUserPeerId = 'abc123'

const userSettingsStub = userSettingsContextStubFactory({
  userId: mockUserPeerId,
})

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: Infinity,
      },
    },
  })

const ShellStub = (shellProps: Partial<ShellProps> = {}) => {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SettingsContext.Provider value={userSettingsStub}>
          <Shell
            appNeedsUpdate={false}
            userPeerId={mockUserPeerId}
            {...shellProps}
          />
        </SettingsContext.Provider>
      </Router>
    </QueryClientProvider>
  )
}

describe('Shell', () => {
  describe('menu drawer', () => {
    test('can be opened', async () => {
      render(<ShellStub />)
      const menuButton = screen.getByLabelText('Open menu')
      await waitFor(() => {
        userEvent.click(menuButton)
      })

      const navigation = screen.getByLabelText('Navigation menu')

      await waitFor(() => {
        expect(navigation).toBeVisible()
      })
    })

    test('can be closed', async () => {
      render(<ShellStub />)
      const menuButton = screen.getByLabelText('Open menu')

      await waitFor(() => {
        userEvent.click(menuButton)
      })

      const closeMenu = screen.getByLabelText('Close menu')

      await waitFor(() => {
        userEvent.click(closeMenu)
      })

      const navigation = screen.getByLabelText('Navigation menu')

      await waitFor(() => {
        expect(navigation).not.toBeVisible()
      })
    })
  })
})
