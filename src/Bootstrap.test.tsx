import React from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter as Router } from 'react-router-dom'

import Bootstrap from './Bootstrap'

const StubBootstrap = () => (
  <Router>
    <Bootstrap />
  </Router>
)

test('renders', () => {
  render(<StubBootstrap />)
})
