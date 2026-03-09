import { vi } from 'vitest'
import { PropsWithChildren } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'
import { mockEncryptionService } from 'test-utils/mocks/mockEncryptionService'
import { SettingsContext } from 'contexts/SettingsContext'
import { Time } from 'lib/Time'

import { Room, RoomProps } from './'

const mockUserId = 'user-id'
const mockRoomId = 'room-123'

const userSettingsStub = userSettingsContextStubFactory({
  userId: mockUserId,
})

window.AudioContext = vi.fn().mockImplementation(() => {})
const mockGetUuid = vi.fn()

const mockTimeService = new Time()
const mockNowTime = 1234
mockTimeService.now = () => mockNowTime

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  headers: {
    get: vi.fn().mockReturnValue('application/json'),
  },
  json: vi.fn().mockResolvedValue({
    urls: ['turn:relay1.expressturn.com:3478'],
    username: 'efQUQ79N77B5BNVVKF',
    credential: 'N4EAUgpjMzPLrxSS',
  }),
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

vi.mock('../../lib/Audio')

const mockWsInstances: MockWebSocket[] = []

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  CONNECTING = 0
  OPEN = 1
  CLOSING = 2
  CLOSED = 3
  readyState = MockWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null

  constructor() {
    mockWsInstances.push(this)
  }

  send = vi.fn()
  close = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
}

vi.stubGlobal('WebSocket', MockWebSocket)

const RouteStub = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router initialEntries={['/public/abc123']}>
        <SettingsContext.Provider value={userSettingsStub}>
          <Routes>
            <Route path="/public/:roomId" element={children}></Route>
          </Routes>
        </SettingsContext.Provider>
      </Router>
    </QueryClientProvider>
  )
}

const RoomStub = (props: RoomProps) => {
  return (
    <Room
      encryptionService={mockEncryptionService}
      timeService={mockTimeService}
      {...props}
    />
  )
}

describe('Room', () => {
  beforeEach(() => {
    mockWsInstances.length = 0
  })

  test('is available', () => {
    render(
      <RouteStub>
        <RoomStub userId={mockUserId} roomId={mockRoomId} />
      </RouteStub>
    )
  })

  test('send button is disabled', () => {
    render(
      <RouteStub>
        <RoomStub userId={mockUserId} roomId={mockRoomId} />
      </RouteStub>
    )

    const sendButton = screen.getByLabelText('Send')
    expect(sendButton).toBeDisabled()
  })

  test('inputting text enabled send button', async () => {
    render(
      <RouteStub>
        <RoomStub userId={mockUserId} roomId={mockRoomId} />
      </RouteStub>
    )

    const sendButton = screen.getByLabelText('Send')
    const textInput = screen.getByPlaceholderText('Your message')

    await userEvent.type(textInput, 'hello')

    expect(sendButton).not.toBeDisabled()
  })

  test('sending a message clears the text input', async () => {
    render(
      <RouteStub>
        <RoomStub userId={mockUserId} roomId={mockRoomId} />
      </RouteStub>
    )

    const sendButton = screen.getByLabelText('Send')
    const textInput = screen.getByPlaceholderText('Your message')

    await userEvent.type(textInput, 'hello')
    await userEvent.click(sendButton)

    expect(textInput).toHaveValue('')
  })

  test('message is sent to peers', async () => {
    render(
      <RouteStub>
        <RoomStub
          getUuid={mockGetUuid.mockImplementation(() => 'abc123')}
          userId={mockUserId}
          roomId={mockRoomId}
        />
      </RouteStub>
    )

    const sendButton = screen.getByLabelText('Send')
    const textInput = screen.getByPlaceholderText('Your message')

    await userEvent.type(textInput, 'hello')
    await userEvent.click(sendButton)

    expect(textInput).toHaveValue('')
  })
})
