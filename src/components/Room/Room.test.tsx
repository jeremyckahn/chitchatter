import { render } from '@testing-library/react'
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
})
