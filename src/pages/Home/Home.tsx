import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import { v4 as uuid } from 'uuid'

export function Home() {
  const [roomName, setRoomName] = useState(uuid())
  const navigate = useNavigate()

  const handleRoomNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setRoomName(value)
  }

  const handleFormSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate(`/public/${roomName}`)
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
        <form onSubmit={handleFormSubmit} className="max-w-xl mx-auto">
          <FormControl fullWidth>
            <TextField
              label="Room name"
              variant="outlined"
              value={roomName}
              onChange={handleRoomNameChange}
              size="medium"
            />
          </FormControl>
          <div className="block pt-4">
            <Button variant="contained" type="submit">
              Go to public room
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
