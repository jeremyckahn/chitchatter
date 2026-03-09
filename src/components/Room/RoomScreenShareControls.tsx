import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import ScreenShare from '@mui/icons-material/ScreenShare'
import StopScreenShare from '@mui/icons-material/StopScreenShare'
import Tooltip from '@mui/material/Tooltip'

import { PeerRoom } from 'lib/PeerRoom'

import { useRoomScreenShare } from './useRoomScreenShare'
import { MediaButton } from './MediaButton'

export interface RoomFileUploadControlsProps {
  peerRoom: PeerRoom
}

export function RoomScreenShareControls({
  peerRoom,
}: RoomFileUploadControlsProps) {
  const { t } = useTranslation()
  const { isSharingScreen, handleScreenShareStart, handleScreenShareStop } =
    useRoomScreenShare({
      peerRoom,
    })

  const handleToggleScreenShareButtonClick = () => {
    if (isSharingScreen) {
      handleScreenShareStop()
    } else {
      handleScreenShareStart()
    }
  }

  if (!window.navigator?.mediaDevices?.getDisplayMedia) {
    return <></>
  }

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
      <Tooltip
        title={
          isSharingScreen
            ? t('roomControls.stopShareScreen')
            : t('roomControls.shareScreen')
        }
      >
        <MediaButton
          isActive={isSharingScreen}
          aria-label={t('roomControls.shareScreenLabel')}
          onClick={handleToggleScreenShareButtonClick}
        >
          {isSharingScreen ? <ScreenShare /> : <StopScreenShare />}
        </MediaButton>
      </Tooltip>
    </Box>
  )
}
