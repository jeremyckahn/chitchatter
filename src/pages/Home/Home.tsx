import React from 'react'
import Typography from '@mui/material/Typography'

export function Home() {
  return (
    <div className="Home">
      <header className="max-w-3xl text-center mx-auto">
        <Typography variant="h1">chitchatter</Typography>
        <Typography variant="body1">
          This is a communication tool that is free, open source, and designed
          for maximum security. All communication between you and your online
          peers is encrypted and ephemeral.
        </Typography>
      </header>
    </div>
  )
}
