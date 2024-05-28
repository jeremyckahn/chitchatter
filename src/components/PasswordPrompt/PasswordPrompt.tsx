import { ChangeEvent, useState, SyntheticEvent, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Tooltip from '@mui/material/Tooltip'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

import { QueryParamKeys } from 'models/shell'

interface PasswordPromptProps {
  isOpen: boolean
  onPasswordEntered: (password: string) => void
}

export const PasswordPrompt = ({
  isOpen,
  onPasswordEntered,
}: PasswordPromptProps) => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const queryParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  )

  const isEmbedded = queryParams.has(QueryParamKeys.IS_EMBEDDED)

  const navigate = useNavigate()

  const handleFormSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    onPasswordEntered(password)
  }

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword)
  }

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
  }

  const handleGoBackClick = () => {
    navigate(-1)
  }

  const passwordToggleLabel = showPassword ? 'Hide password' : 'Show password'

  return (
    <Dialog open={isOpen}>
      <form onSubmit={handleFormSubmit}>
        <DialogTitle>Room Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            You will only be able to connect to room peers that enter the same
            password. Due to the decentralized nature of Chitchatter, it is
            impossible to know if the password you enter will match the password
            entered by other peers.
          </DialogContentText>
          <DialogContentText sx={{ mb: 2 }}>
            If there is a mismatch, you will be in the room but be unable to
            connect to others. An error will not be shown.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={password}
            onChange={handlePasswordChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={passwordToggleLabel}>
                    <IconButton
                      aria-label={passwordToggleLabel}
                      onClick={handleClickShowPassword}
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          {!isEmbedded && (
            <Button color="secondary" onClick={handleGoBackClick}>
              Go back
            </Button>
          )}
          <Button type="submit" disabled={password.length === 0}>
            Submit
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
