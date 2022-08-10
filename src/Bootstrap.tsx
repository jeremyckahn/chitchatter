import React from 'react'
import { Routes, Route } from 'react-router-dom'

import { Home } from './pages/Home/'

function Bootstrap() {
  return (
    <div className="Chitchatter">
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  )
}

export default Bootstrap
