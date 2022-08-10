import React, { useState } from 'react'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import { v4 as uuid } from 'uuid'

export function Home() {
  const [roomName, setRoomName] = useState(uuid())

  const handleRoomNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setRoomName(value)
  }

  return (
    <div className="Home">
      <header className="max-w-3xl text-center mx-auto">
        <Typography variant="h1">chitchatter</Typography>
        <Typography variant="body1">
          This is a communication tool that is free, open source, and designed
          for maximum security. All communication between you and your online
          peers is encrypted and ephemeral.
        </Typography>
        <Typography variant="body1">
          chitchatter is still a work in progress and not yet ready to be used!
        </Typography>
      </header>
      <main className="mt-8 max-w-3xl text-center mx-auto">
        <TextField
          id="outlined-basic"
          label="Room name"
          variant="outlined"
          value={roomName}
          onChange={handleRoomNameChange}
        />
      </main>
    </div>
  )
}
