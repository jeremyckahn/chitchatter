import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { v4 as uuid } from 'uuid'

import { Home } from './pages/Home/'
import { PublicRoom } from './pages/PublicRoom/'

function Bootstrap() {
  const [userId] = useState(uuid())

  return (
    <div className="Chitchatter">
      <Routes>
        {['/', '/index.html'].map(path => (
          <Route key={path} path={path} element={<Home />} />
        ))}
        <Route
          path="/public/:roomId"
          element={<PublicRoom userId={userId} />}
        />
      </Routes>
    </div>
  )
}

export default Bootstrap
