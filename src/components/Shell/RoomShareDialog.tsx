import Alert, { AlertColor } from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'

import { AlertOptions } from 'models/shell'
import { useEffect, useState, SyntheticEvent } from 'react'
import { sleep } from 'lib/sleep'
import { encryption } from 'services/Encryption'

export interface RoomShareDialogProps {
  isOpen: boolean
  handleClose: () => void
  roomId: string
  password: string
  showAlert: (message: string, options?: AlertOptions) => void
  copyToClipboard: (
    content: string,
    alert: string,
    severity: AlertColor
  ) => Promise<void>
}

export function RoomShareDialog(props: RoomShareDialogProps) {
  const [isAdvanced, setIsAdvanced] = useState(false)
  const [isUnderstood, setIsUnderstood] = useState(false)
  const [password, setPassword] = useState('')
  const [passThrottled, setPassThrottled] = useState(false)
  const handleClose = () => {
    props.handleClose()
    setPassword('')
  }

  useEffect(() => {
    if (!isAdvanced) setIsUnderstood(false)
  }, [isAdvanced])

  useEffect(() => {
    if (!isUnderstood) setPassword('')
  }, [isUnderstood])

  const url = window.location.href.split('#')[0]

  const copyWithPass = async () => {
    const encoded = await encryption.encodePassword(props.roomId, password)

    if (encoded === props.password) {
      const params = new URLSearchParams()
      params.set('secret', props.password)

      await props.copyToClipboard(
        `${url}#${params}`,
        'Private room URL with password copied to clipboard',
        'warning'
      )

      handleClose()
    } else {
      setPassThrottled(true)
      props.showAlert('Incorrect password entered. Please wait 2s to retry.', {
        severity: 'error',
      })

      await sleep(2000)

      setPassThrottled(false)
    }
  }

  const copyWithoutPass = async () => {
    await props.copyToClipboard(
      url,
      isAdvanced
        ? 'Private room URL without password copied to clipboard'
        : 'Current URL copied to clipboard',
      'success'
    )

    handleClose()
  }

  const handleFormSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!passThrottled) copyWithPass()
  }

  return (
    <Dialog
      open={props.isOpen}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <form onSubmit={handleFormSubmit}>
        {isAdvanced && (
          <DialogTitle id="alert-dialog-title">
            Copy URL with password
            <Button onClick={() => setIsAdvanced(false)}>Simple</Button>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
        )}
        {isAdvanced && (
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Copy URL to this private room containing an indecipherable hash of
              the password. When using this URL, users will not need to enter
              the password themselves.
            </DialogContentText>
            <Alert severity="error" sx={{ mb: 2 }}>
              Be careful where and how this URL is shared. Anybody who obtains
              it can enter the room. The sharing medium must be trusted, as well
              as all potential recipients of the URL, just as if you were
              sharing the password itself.
            </Alert>
            <Alert severity="warning">
              By design, the password hash does not leave the web browser when
              this URL is used to access the room. However, web browsers can
              still independently record the full URL in the address history,
              and may even store the history in the cloud if configured to do
              so.
            </Alert>
            <FormControlLabel
              label="I understand the risks"
              control={
                <Checkbox
                  checked={isUnderstood}
                  onChange={e => setIsUnderstood(e.target.checked)}
                />
              }
            />
            <TextField
              autoFocus
              margin="none"
              id="password"
              label="Password"
              type="password"
              fullWidth
              variant="standard"
              value={password}
              disabled={!isUnderstood}
              onChange={e => setPassword(e.target.value)}
            />
          </DialogContent>
        )}
        <DialogActions>
          {isAdvanced ? (
            <Tooltip title="Copy room URL with password. No password entry required to access room.">
              <span>
                <Button
                  type="submit"
                  onClick={copyWithPass}
                  color="error"
                  disabled={
                    password.length === 0 || !isUnderstood || passThrottled
                  }
                >
                  Copy URL with password
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button onClick={() => setIsAdvanced(true)} color="error">
              Advanced
            </Button>
          )}
          <Tooltip title="Copy room URL. Password required to access room.">
            <Button onClick={copyWithoutPass} color="success" autoFocus>
              Copy URL
            </Button>
          </Tooltip>
        </DialogActions>
      </form>
    </Dialog>
  )
}
