import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom'

import { Room } from './'

const getRoomStub = () => {
  return (
    <Router initialEntries={['/public/abc123']}>
      <Routes>
        <Route path="/public/:roomId" element={<Room />}></Route>
      </Routes>
    </Router>
  )
}

describe('Room', () => {
  test('is available', () => {
    render(getRoomStub())
  })

  test('send button is disabled', () => {
    render(getRoomStub())
    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()
  })

  test('inputting text enabled send button', () => {
    render(getRoomStub())
    const sendButton = screen.getByText('Send')
    const textInput = screen.getByPlaceholderText('Your message')
    userEvent.type(textInput, 'hello')
    expect(sendButton).not.toBeDisabled()
  })

  test('sending a message clears the text input', () => {
    render(getRoomStub())
    const sendButton = screen.getByText('Send')
    const textInput = screen.getByPlaceholderText('Your message')
    userEvent.type(textInput, 'hello')
    userEvent.click(sendButton)
    expect(textInput).toHaveValue('')
  })
})
