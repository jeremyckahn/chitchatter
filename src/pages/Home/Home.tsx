import React, { useEffect, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import { v4 as uuid } from 'uuid'

import { ShellContext } from 'ShellContext'

export function Home() {
  const { setTitle } = useContext(ShellContext)
  const [roomName, setRoomName] = useState(uuid())
  const navigate = useNavigate()

  useEffect(() => {
    setTitle('Chitchatter')
  }, [setTitle])

  const handleRoomNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setRoomName(value)
  }

  const handleFormSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate(`/public/${roomName}`)
  }

  return (
    <Box className="Home">
      <header className="max-w-3xl text-center mx-auto mt-8">
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
          <Button
            variant="contained"
            type="submit"
            sx={{
              marginTop: 2,
            }}
          >
            Go to public room
          </Button>
        </form>
      </main>
    </Box>
  )
}
