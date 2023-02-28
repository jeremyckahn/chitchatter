import { useState, useContext, ChangeEvent, SyntheticEvent } from 'react'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'

import { ShellContext } from 'contexts/ShellContext'
import { getPeerName } from 'components/PeerNameDisplay/getPeerName'

interface UsernameProps {
  userId: string
}

const maxCustomUsernameLength = 30

export const Username = ({ userId }: UsernameProps) => {
  const userName = getPeerName(userId)

  const { customUsername, setCustomUsername, showAlert } =
    useContext(ShellContext)
  const [inflightCustomUsername, setInflightCustomUsername] =
    useState(customUsername)

  const handleChange = (evt: ChangeEvent<HTMLInputElement>) => {
    setInflightCustomUsername(evt.target.value)
  }

  const updateCustomUsername = () => {
    const trimmedUsername = inflightCustomUsername.trim()
    setCustomUsername(trimmedUsername)

    if (trimmedUsername.length) {
      showAlert(`Username changed to "${trimmedUsername}"`, {
        severity: 'success',
      })
    } else {
      showAlert(`Username reset`, { severity: 'success' })
    }
  }

  const handleSubmit = (evt: SyntheticEvent<HTMLFormElement>) => {
    evt.preventDefault()
    updateCustomUsername()
  }

  const handleBlur = () => {
    updateCustomUsername()
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormControl sx={{ width: '100%' }}>
        <TextField
          onChange={handleChange}
          onBlur={handleBlur}
          variant="outlined"
          label={`${userName}`}
          sx={{ width: '100%' }}
          value={inflightCustomUsername}
          inputProps={{ maxLength: maxCustomUsernameLength }}
        />
        <FormHelperText>Your username</FormHelperText>
      </FormControl>
    </form>
  )
}
