import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
            sx={() => ({
              color: theme.palette.error.main,
              mr: theme.spacing(1),
            })}
          />
          {t('serverFailureDialog.title')}
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('serverFailureDialog.message')}
        </DialogContentText>
        <Typography
          component="ul"
          sx={{
            color: theme.palette.text.secondary,
            m: 1,
          }}
        >
          <li>{t('serverFailureDialog.refreshPage')}</li>
          <li>{t('serverFailureDialog.disableAdblockers')}</li>
          <li>{t('serverFailureDialog.differentNetwork')}</li>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}
