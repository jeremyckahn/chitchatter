import { useState, useContext, ChangeEvent, SyntheticEvent } from 'react'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Tooltip from '@mui/material/Tooltip'
import useTheme from '@mui/material/styles/useTheme'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

import { ShellContext } from 'contexts/ShellContext'
import { getPeerName } from 'components/PeerNameDisplay'
import { SettingsContext } from 'contexts/SettingsContext'
import { PublicKey } from 'components/PublicKey'
import { PeerNameDisplay } from 'components/PeerNameDisplay'

interface UserInfoProps {
  userId: string
}

const maxCustomUsernameLength = 30

export const UserInfo = ({ userId }: UserInfoProps) => {
  const theme = useTheme()
  const userName = getPeerName(userId)

  const { customUsername, setCustomUsername, showAlert } =
    useContext(ShellContext)
  const { getUserSettings } = useContext(SettingsContext)
  const [inflightCustomUsername, setInflightCustomUsername] =
    useState(customUsername)
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)

  const { publicKey } = getUserSettings()

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

  const handleInfoButtonClick = () => {
    setIsInfoDialogOpen(true)
  }

  const handleInfoDialogClose = () => {
    setIsInfoDialogOpen(false)
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <FormControl sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              onChange={handleChange}
              onBlur={handleBlur}
              variant="outlined"
              label={`${userName}`}
              sx={{ width: '100%' }}
              value={inflightCustomUsername}
              inputProps={{ maxLength: maxCustomUsernameLength }}
            />
            <Tooltip title="Reveal your user info">
              <IconButton
                sx={{
                  ml: 1.5,
                  color: theme.palette.action.active,
                }}
                onClick={handleInfoButtonClick}
              >
                <InfoOutlinedIcon fontSize="large" />
              </IconButton>
            </Tooltip>
          </Box>
          <FormHelperText>Your username</FormHelperText>
        </FormControl>
      </form>
      <Dialog open={isInfoDialogOpen} onClose={handleInfoDialogClose}>
        <DialogTitle>
          <Box component="span">
            <PeerNameDisplay sx={{ fontSize: 'inherit' }}>
              {userId}
            </PeerNameDisplay>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your public key (generated locally):
          </DialogContentText>
          <PublicKey publicKey={publicKey} />
          <DialogContentText>
            Your private key, which was also generated locally, is hidden and
            only exists on your device.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleInfoDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
