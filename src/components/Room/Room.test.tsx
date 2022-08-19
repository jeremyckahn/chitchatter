import { PropsWithChildren } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom'

import { Room } from './'

const mockGetUuid = jest.fn()
const mockMessagedSender = jest.fn()

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
      <Routes>
        <Route path="/public/:roomId" element={children}></Route>
      </Routes>
    </Router>
  )
}

jest.useFakeTimers().setSystemTime(100)

describe('Room', () => {
  test('is available', () => {
    render(
      <RouteStub>
        <Room />
      </RouteStub>
    )
  })

  test('send button is disabled', () => {
    render(
      <RouteStub>
        <Room />
      </RouteStub>
    )

    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()
  })

  test('inputting text enabled send button', () => {
    render(
      <RouteStub>
        <Room />
      </RouteStub>
    )

    const sendButton = screen.getByText('Send')
    const textInput = screen.getByPlaceholderText('Your message')
    userEvent.type(textInput, 'hello')
    expect(sendButton).not.toBeDisabled()
  })

  test('sending a message clears the text input', () => {
    render(
      <RouteStub>
        <Room />
      </RouteStub>
    )

    const sendButton = screen.getByText('Send')
    const textInput = screen.getByPlaceholderText('Your message')
    userEvent.type(textInput, 'hello')
    userEvent.click(sendButton)
    expect(textInput).toHaveValue('')
  })

  test('message is sent to peer', () => {
    render(
      <RouteStub>
        <Room getUuid={mockGetUuid.mockImplementation(() => 'abc123')} />
      </RouteStub>
    )

    const sendButton = screen.getByText('Send')
    const textInput = screen.getByPlaceholderText('Your message')
    userEvent.type(textInput, 'hello')
    userEvent.click(sendButton)
    expect(mockMessagedSender).toHaveBeenCalledWith({
      text: 'hello',
      timeSent: 100,
      id: 'abc123',
    })
  })
})
