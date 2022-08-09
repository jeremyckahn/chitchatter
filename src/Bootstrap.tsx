import React from 'react'

import logo from './logo.svg'
import './Bootstrap.sass'

function Bootstrap() {
  return (
    <div className="Bootstrap">
      <header className="Bootstrap-header">
        <img src={logo} className="Bootstrap-logo" alt="logo" />
        <p>
          Edit <code>src/Bootstrap.tsx</code> and save to reload.
        </p>
        <a
          className="Bootstrap-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  )
}

export default Bootstrap
