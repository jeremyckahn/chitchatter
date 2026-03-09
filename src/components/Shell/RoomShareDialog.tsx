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
import { useTranslation } from 'react-i18next'

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

export const RoomShareDialog = (props: RoomShareDialogProps) => {
  const { t } = useTranslation()
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
        t('roomShareDialog.copiedWithPassword'),
        'warning'
      )

      handleClose()
    } else {
      setPassThrottled(true)
      props.showAlert(t('roomShareDialog.wrongPassword'), {
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
        ? t('roomShareDialog.copiedWithoutPassword')
        : t('roomShareDialog.urlCopied'),
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
            {t('roomShareDialog.title')}
            <Button onClick={() => setIsAdvanced(false)}>
              {t('roomShareDialog.simple')}
            </Button>
            <IconButton
              aria-label={t('common.close')}
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
              {t('roomShareDialog.description')}
            </DialogContentText>
            <Alert severity="error" sx={{ mb: 2 }}>
              {t('roomShareDialog.securityWarning')}
            </Alert>
            <Alert severity="warning">{t('roomShareDialog.browserOnly')}</Alert>
            <FormControlLabel
              label={t('roomShareDialog.understandRisks')}
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
              label={t('roomShareDialog.passwordLabel')}
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
            <Tooltip title={t('roomShareDialog.copyWithPasswordTip')}>
              <span>
                <Button
                  type="submit"
                  onClick={copyWithPass}
                  color="error"
                  disabled={
                    password.length === 0 || !isUnderstood || passThrottled
                  }
                >
                  {t('roomShareDialog.copyWithPassword')}
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button onClick={() => setIsAdvanced(true)} color="error">
              {t('roomShareDialog.advanced')}
            </Button>
          )}
          <Tooltip title={t('roomShareDialog.copyUrlTip')}>
            <Button onClick={copyWithoutPass} color="success" autoFocus>
              {t('roomShareDialog.copyUrl')}
            </Button>
          </Tooltip>
        </DialogActions>
      </form>
    </Dialog>
  )
}
