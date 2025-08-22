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
const mockMessagedSender = vi.fn().mockImplementation(() => Promise.resolve([]))

const mockTimeService = new Time()
const mockNowTime = 1234
mockTimeService.now = () => mockNowTime

// Mock fetch for TURN server API
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

// Create QueryClient for tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

vi.mock('../../lib/Audio')

vi.mock('trystero/torrent', () => ({
  joinRoom: () => ({
    makeAction: () => [mockMessagedSender, () => {}, () => {}],
    ping: () => Promise.resolve(0),
    leave: () => {},
    getPeers: () => [],
    addStream: () => [Promise.resolve()],
    removeStream: () => {},
    addTrack: () => [Promise.resolve()],
    removeTrack: () => {},
    replaceTrack: () => [Promise.resolve()],
    onPeerJoin: () => {},
    onPeerLeave: () => {},
    onPeerStream: () => {},
    onPeerTrack: () => {},
  }),
}))

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

    expect(mockMessagedSender).toHaveBeenCalledWith(
      {
        authorId: mockUserId,
        text: 'hello',
        timeSent: mockNowTime,
        id: 'abc123',
      },
      null
    )
  })
})
