import React from 'react'
import { Routes, Route } from 'react-router-dom'

import { Home } from './pages/Home/'
import { PublicRoom } from './pages/PublicRoom/'

function Bootstrap() {
  return (
    <div className="Chitchatter">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/public/:roomId" element={<PublicRoom />} />
      </Routes>
    </div>
  )
}

export default Bootstrap
