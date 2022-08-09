import React from 'react'
import { render, screen } from '@testing-library/react'

import Bootstrap from './Bootstrap'

test('renders learn react link', () => {
  render(<Bootstrap />)
  const linkElement = screen.getByText(/learn react/i)
  expect(linkElement).toBeInTheDocument()
})
