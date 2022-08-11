import React from 'react'
import { Routes, Route } from 'react-router-dom'

import { Home } from './pages/Home/'
import { PublicRoom } from './pages/PublicRoom/'

function Bootstrap() {
  return (
    <div className="Chitchatter">
      <Routes>
        {['/', '/index.html'].map(path => (
          <Route key={path} path={path} element={<Home />} />
        ))}
        <Route path="/public/:roomId" element={<PublicRoom />} />
      </Routes>
    </div>
  )
}

export default Bootstrap
