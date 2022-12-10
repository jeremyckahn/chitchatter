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
    const secret = await encodePassword(password)
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
          Share a link to this private room with the password. When using this
          link, users will not need to enter a password themselves.
        </DialogContentText>
        <Alert severity="error" sx={{ mb: 2 }}>
          Be careful where and how this link is shared. Anybody who obtains it
          can enter the room. The sharing medium must be trusted, as well as all
          potential recipients of the link, just as if you were sharing the
          password itself.
        </Alert>
        <Alert severity="warning">
          While the secret will not leave the browser when using the URL
          containing the password, keep in mind that browsers can record the
          full URL in the address history, and may even store the history in the
          cloud. If this is a problem, consider sharing the room URL without the
          password and sending the password separately.
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
