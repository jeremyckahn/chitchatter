import {
  Alert,
  AlertColor,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  TextField,
  Tooltip,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { encodePassword } from 'utils'

export interface RoomShareDialogProps {
  roomId: string
  isOpen: boolean
  handleClose: () => void
  copyToClipboard: (
    content: string,
    alert: string,
    severity: AlertColor
  ) => Promise<void>
}

export function RoomShareDialog(props: RoomShareDialogProps) {
  const [password, setPassword] = useState('')
  const [isAdvanced, setIsAdvanced] = useState(false)
  const [isUnderstood, setIsUnderstood] = useState(false)
  const handleClose = () => {
    props.handleClose()
    setPassword('')
  }

  useEffect(() => {
    if (!isUnderstood) setPassword('')
  }, [isUnderstood])

  useEffect(() => {
    if (!isAdvanced) setIsUnderstood(false)
  }, [isAdvanced])

  const url = window.location.href.split('#')[0]

  const copyWithPass = async () => {
    const secret = await encodePassword(props.roomId, password)
    const params = new URLSearchParams()
    params.set('secret', secret)
    await props.copyToClipboard(
      url + '#' + params.toString(),
      'Private room URL with password copied to clipboard',
      'warning'
    )
    handleClose()
  }

  const copyWithoutPass = async () => {
    await props.copyToClipboard(
      url,
      'Private room URL without password copied to clipboard',
      'success'
    )
    handleClose()
  }

  const showIf = (when: boolean) => {
    return { display: when ? '' : 'none' }
  }

  return (
    <Dialog
      open={props.isOpen}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title" sx={showIf(isAdvanced)}>
        Copy URL with password
        <Button onClick={() => setIsAdvanced(false)}>Simple</Button>
      </DialogTitle>
      <DialogContent sx={showIf(isAdvanced)}>
        <DialogContentText sx={{ mb: 2 }}>
          Copy URL to this private room containing an indecipherable hash of the
          password. When using this URL, users will not need to enter the
          password themselves.
        </DialogContentText>
        <Alert severity="error" sx={{ mb: 2 }}>
          Be careful where and how this URL is shared. Anybody who obtains it
          can enter the room. The sharing medium must be trusted, as well as all
          potential recipients of the URL, just as if you were sharing the
          password itself.
        </Alert>
        <Alert severity="warning">
          By design, the password hash does not leave the web browser when this
          URL is used to access the room. However, web browsers can still
          independently record the full URL in the address history, and may even
          store the history in the cloud if configured to do so.
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
        <Alert severity="info" sx={showIf(isUnderstood)}>
          If you enter a different password, users will enter the room but be
          unable to connect to the existing members. No error will be shown.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => setIsAdvanced(true)}
          color="error"
          sx={showIf(!isAdvanced)}
        >
          Advanced
        </Button>
        <Tooltip
          title="Copy room URL with password. No password entry required to access room."
          sx={showIf(isAdvanced)}
        >
          <Button
            onClick={copyWithPass}
            color="error"
            disabled={password.length === 0 || !isUnderstood}
          >
            Copy URL with password
          </Button>
        </Tooltip>
        <Tooltip title="Copy room URL. Password required to access room.">
          <Button onClick={copyWithoutPass} color="success" autoFocus>
            Copy URL
          </Button>
        </Tooltip>
      </DialogActions>
    </Dialog>
  )
}
