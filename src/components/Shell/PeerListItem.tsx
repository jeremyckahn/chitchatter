import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption'
import NetworkPingIcon from '@mui/icons-material/NetworkPing'
import NoEncryptionIcon from '@mui/icons-material/NoEncryption'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useTheme from '@mui/material/styles/useTheme'
import { useMediaQuery } from '@mui/material'
import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AudioVolume } from 'components/AudioVolume'
import { PeerNameDisplay } from 'components/PeerNameDisplay'
import { usePeerNameDisplay } from 'components/PeerNameDisplay/usePeerNameDisplay'
import { PublicKey } from 'components/PublicKey'
import { Room } from 'components/Room'
import { PeerConnectionType } from 'lib/PeerRoom'
import {
  AudioChannel,
  AudioChannelName,
  Peer,
  PeerVerificationState,
} from 'models/chat'
import { SettingsContext } from 'contexts/SettingsContext'

import { PeerDownloadFileButton } from './PeerDownloadFileButton'

interface PeerListItemProps {
  peer: Peer
  peerConnectionTypes: Record<string, PeerConnectionType>
  peerAudioChannels: Record<string, AudioChannel>
  roomId: string
}

const iconRightPadding = 1

export const PeerListItem = ({
  peer,
  peerConnectionTypes,
  peerAudioChannels,
  roomId,
}: PeerListItemProps) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const { getUserSettings } = useContext(SettingsContext)
  const { userId } = getUserSettings()
  const { getDisplayUsername } = usePeerNameDisplay()
  const [showPeerDialog, setShowPeerDialog] = useState(false)
  const isSmallViewport = useMediaQuery(theme.breakpoints.down('sm'))

  const verificationStateDisplayMap = {
    [PeerVerificationState.UNVERIFIED]: (
      <Tooltip title={t('peerList.unverifiedWarning')}>
        <NoEncryptionIcon color="error" />
      </Tooltip>
    ),
    [PeerVerificationState.VERIFIED]: (
      <Tooltip title={t('peerList.verified')}>
        <EnhancedEncryptionIcon color="success" />
      </Tooltip>
    ),
    [PeerVerificationState.VERIFYING]: (
      <Tooltip title={t('peerList.verifying')}>
        <CircularProgress size={16} sx={{ position: 'relative', top: 3 }} />
      </Tooltip>
    ),
  }

  const hasPeerConnection = peer.peerId in peerConnectionTypes

  const isPeerConnectionDirect =
    peerConnectionTypes[peer.peerId] === PeerConnectionType.DIRECT

  const handleListItemTextClick = () => {
    setShowPeerDialog(true)
  }

  const handleDialogClose = () => {
    setShowPeerDialog(false)
  }

  const microphoneAudio =
    peerAudioChannels[peer.peerId]?.[AudioChannelName.MICROPHONE]
  const screenShareAudio =
    peerAudioChannels[peer.peerId]?.[AudioChannelName.SCREEN_SHARE]

  return (
    <>
      <ListItem key={peer.peerId} divider={true}>
        <PeerDownloadFileButton peer={peer} />
        <ListItemText>
          <Box
            sx={{ display: 'flex', alignContent: 'center', cursor: 'pointer' }}
            onClick={handleListItemTextClick}
          >
            {hasPeerConnection ? (
              <Tooltip
                title={
                  isPeerConnectionDirect
                    ? t('peerList.directConnection', {
                        name: getDisplayUsername(peer.userId),
                      })
                    : t('peerList.relayConnection', {
                        name: getDisplayUsername(peer.userId),
                      })
                }
              >
                <Box
                  component="span"
                  sx={{ pr: iconRightPadding, cursor: 'pointer' }}
                >
                  {isPeerConnectionDirect ? (
                    <SyncAltIcon color="success" />
                  ) : (
                    <NetworkPingIcon color="warning" />
                  )}
                </Box>
              </Tooltip>
            ) : null}
            <Box
              component="span"
              sx={{ pr: iconRightPadding, cursor: 'pointer' }}
            >
              {verificationStateDisplayMap[peer.verificationState]}
            </Box>
            <PeerNameDisplay>{peer.userId}</PeerNameDisplay>
          </Box>
          {microphoneAudio && (
            <AudioVolume
              audioEl={microphoneAudio}
              audioChannelName={AudioChannelName.MICROPHONE}
            />
          )}
          {screenShareAudio && (
            <AudioVolume
              audioEl={screenShareAudio}
              audioChannelName={AudioChannelName.SCREEN_SHARE}
            />
          )}
        </ListItemText>
      </ListItem>
      <Dialog
        open={showPeerDialog}
        onClose={handleDialogClose}
        fullScreen={isSmallViewport}
        maxWidth="md"
        keepMounted
        PaperProps={{
          sx: { minHeight: `calc(100% - ${theme.spacing(8)})` },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          {verificationStateDisplayMap[peer.verificationState]}
          <Box component="span" sx={{ ml: 1 }}>
            <PeerNameDisplay sx={{ fontSize: 'inherit' }}>
              {peer.userId}
            </PeerNameDisplay>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
          <Accordion>
            <AccordionSummary>
              <Typography>{t('peerList.theirPublicKey')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <PublicKey publicKey={peer.publicKey} />
            </AccordionDetails>
          </Accordion>
          <Box
            bgcolor={theme.palette.background.paper}
            display="flex"
            flexDirection="column"
            flexGrow={1}
            mt={1}
            overflow="auto"
          >
            <Room roomId={roomId} userId={userId} targetPeerId={peer.peerId} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
