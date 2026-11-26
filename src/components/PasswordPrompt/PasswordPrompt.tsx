import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  SyntheticEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
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

import { useDelayedFlag } from 'hooks/useDelayedFlag'
import { QueryParamKeys } from 'models/shell'

export const unlockFailedMessage = "Couldn't unlock the room. Please try again."

interface PasswordPromptProps {
  isOpen: boolean
  /**
   * Called with the entered password. Deriving the room secret from it is
   * deliberately slow, so the prompt stays in a pending state until the
   * returned promise settles, and shows an error if it rejects.
   */
  onPasswordEntered: (password: string) => Promise<void>
  /** Context shown above the form, e.g. why a room link wasn't enough. */
  notice?: string
}

export const PasswordPrompt = ({
  isOpen,
  onPasswordEntered,
  notice,
}: PasswordPromptProps) => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const showProgress = useDelayedFlag(isUnlocking)

  // A successful unlock unmounts the prompt before the pending state is
  // cleared, so the cleanup must not touch state after that.
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
    }
  }, [])

  const queryParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  )

  const isEmbedded = queryParams.has(QueryParamKeys.IS_EMBEDDED)

  const navigate = useNavigate()

  const handleFormSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()

    // Ignore repeat submissions (Enter pressed twice, a double tap) while a
    // derivation is already running.
    if (isUnlocking || password.length === 0) return

    setIsUnlocking(true)
    setErrorMessage(undefined)

    try {
      await onPasswordEntered(password)
    } catch (error) {
      console.error(error)
      if (isMounted.current) setErrorMessage(unlockFailedMessage)
    } finally {
      if (isMounted.current) setIsUnlocking(false)
    }
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
          {notice && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {notice}
            </Alert>
          )}
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
            disabled={isUnlocking}
            error={errorMessage !== undefined}
            helperText={errorMessage}
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
            <Button
              color="secondary"
              onClick={handleGoBackClick}
              disabled={isUnlocking}
            >
              Go back
            </Button>
          )}
          <Button
            type="submit"
            disabled={password.length === 0 || isUnlocking}
            startIcon={
              showProgress ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {showProgress ? 'Unlocking room…' : 'Submit'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
