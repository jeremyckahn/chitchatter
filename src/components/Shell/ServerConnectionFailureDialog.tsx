import { useContext } from 'react'
import useTheme from '@mui/material/styles/useTheme'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import ReportIcon from '@mui/icons-material/Report'

import { ShellContext } from 'contexts/ShellContext'

export const ServerConnectionFailureDialog = () => {
  const theme = useTheme()
  const {
    isServerConnectionFailureDialogOpen,
    setIsServerConnectionFailureDialogOpen,
  } = useContext(ShellContext)

  const handleDialogClose = () => {
    setIsServerConnectionFailureDialogOpen(false)
  }

  return (
    <Dialog
      open={isServerConnectionFailureDialogOpen}
      onClose={handleDialogClose}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ReportIcon
            fontSize="medium"
            sx={theme => ({
              color: theme.palette.error.main,
              mr: theme.spacing(1),
            })}
          />
          Server connection failed
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          A pairing server could not be found. Make sure you are connected to
          the internet. If you still can't connect, try:
        </DialogContentText>
        <Typography
          component="ul"
          sx={{
            color: theme.palette.text.secondary,
            m: 1,
          }}
        >
          <li>Refreshing the page</li>
          <li>Disabling any adblockers</li>
          <li>Connecting to a different network</li>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
