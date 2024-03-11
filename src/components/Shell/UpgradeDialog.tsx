import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import WarningIcon from '@mui/icons-material/Warning'
import { useRegisterSW } from 'virtual:pwa-register/react'

interface UpgradeDialogProps {
  appNeedsUpdate: boolean
}

export const UpgradeDialog = ({ appNeedsUpdate }: UpgradeDialogProps) => {
  const { updateServiceWorker } = useRegisterSW()

  const handleRestartClick = () => {
    updateServiceWorker(true)
  }

  return (
    <Dialog
      open={appNeedsUpdate}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon
            fontSize="medium"
            sx={theme => ({
              color: theme.palette.warning.main,
              mr: theme.spacing(1),
            })}
          />
          Update needed
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          In order to function properly, Chitchatter needs to be updated. The
          update has already been installed in the background. All you need to
          do is reload the page or click "Refresh" below.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleRestartClick} autoFocus>
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  )
}
