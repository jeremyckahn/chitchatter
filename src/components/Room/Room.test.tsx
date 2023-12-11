import { PropsWithChildren } from 'react'
import { waitFor, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom'

import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'
import { mockEncryptionService } from 'test-utils/mocks/mockEncryptionService'

import { SettingsContext } from 'contexts/SettingsContext'

import Room, { RoomProps } from './Room'

const mockUserId = 'user-id'
const mockRoomId = 'room-123'

const userSettingsStub = userSettingsContextStubFactory({
  userId: mockUserId,
})

window.AudioContext = jest.fn().mockImplementation()
const mockGetUuid = jest.fn()
const mockMessagedSender = jest
  .fn()
  .mockImplementation(() => Promise.resolve([]))

jest.mock('trystero', () => ({
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
    <Router initialEntries={['/public/abc123']}>
      <SettingsContext.Provider value={userSettingsStub}>
        <Routes>
          <Route path="/public/:roomId" element={children}></Route>
        </Routes>
      </SettingsContext.Provider>
    </Router>
  )
}

jest.useFakeTimers().setSystemTime(100)

const RoomStub = (props: RoomProps) => {
  return <Room encryptionService={mockEncryptionService} {...props} />
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

    await waitFor(() => {
      userEvent.type(textInput, 'hello')
    })

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

    await waitFor(() => {
      userEvent.type(textInput, 'hello')
    })

    await waitFor(() => {
      userEvent.click(sendButton)
    })

    expect(textInput).toHaveValue('')
  })

  test('message is sent to peer', async () => {
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

    await waitFor(() => {
      userEvent.type(textInput, 'hello')
    })

    await waitFor(() => {
      userEvent.click(sendButton)
    })

    expect(mockMessagedSender).toHaveBeenCalledWith({
      authorId: mockUserId,
      text: 'hello',
      timeSent: 100,
      id: 'abc123',
    })
  })
})
