import { useContext } from 'react'
import { useTranslation } from 'react-i18next'

import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import { ExpandLess } from '@mui/icons-material'

import { ShellContext } from 'contexts/ShellContext'

export function RoomHideRoomControls() {
  const { t } = useTranslation()
  const { setShowRoomControls } = useContext(ShellContext)

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: 1,
      }}
    >
      <Tooltip title={t('roomControls.hideControls')}>
        <Fab
          color="primary"
          aria-label={t('roomControls.hideControlsLabel')}
          onClick={() => setShowRoomControls(false)}
        >
          <ExpandLess />
        </Fab>
      </Tooltip>
    </Box>
  )
}
