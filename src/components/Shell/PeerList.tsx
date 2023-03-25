import { PropsWithChildren } from 'react'
import { Box } from '@mui/system'
import MuiDrawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import VolumeUp from '@mui/icons-material/VolumeUp'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import NetworkPingIcon from '@mui/icons-material/NetworkPing'
import ListItem from '@mui/material/ListItem'

import { PeerListHeader } from 'components/Shell/PeerListHeader'
import { AudioVolume } from 'components/AudioVolume'
import { PeerNameDisplay } from 'components/PeerNameDisplay'
import { Username } from 'components/Username/Username'
import { AudioState, Peer } from 'models/chat'
import { PeerConnectionType } from 'services/PeerRoom/PeerRoom'

import { PeerDownloadFileButton } from './PeerDownloadFileButton'

export const peerListWidth = 300

export interface PeerListProps extends PropsWithChildren {
  userId: string
  isPeerListOpen: boolean
  onPeerListClose: () => void
  peerList: Peer[]
  peerConnectionTypes: Record<string, PeerConnectionType>
  audioState: AudioState
  peerAudios: Record<string, HTMLAudioElement>
}

export const PeerList = ({
  userId,
  isPeerListOpen,
  onPeerListClose,
  peerList,
  peerConnectionTypes,
  audioState,
  peerAudios,
}: PeerListProps) => {
  return (
    <MuiDrawer
      sx={{
        flexShrink: 0,
        pointerEvents: 'none',
        width: peerListWidth,
        '& .MuiDrawer-paper': {
          width: peerListWidth,
          boxSizing: 'border-box',
        },
        ...(isPeerListOpen && {
          pointerEvents: 'auto',
        }),
      }}
      variant="persistent"
      anchor="right"
      open={isPeerListOpen}
    >
      <PeerListHeader>
        <IconButton onClick={onPeerListClose} aria-label="Close peer list">
          <ChevronRightIcon />
        </IconButton>
      </PeerListHeader>
      <Divider />
      <List>
        <ListItem divider={true}>
          {audioState === AudioState.PLAYING && (
            <ListItemIcon>
              <VolumeUp />
            </ListItemIcon>
          )}
          <ListItemText>
            <Username userId={userId} />
          </ListItemText>
        </ListItem>
        {peerList.map((peer: Peer) => (
          <ListItem key={peer.peerId} divider={true}>
            <PeerDownloadFileButton peer={peer} />
            <ListItemText>
              {peer.peerId in peerConnectionTypes ? (
                <Box component="span" sx={{ pr: 1 }}>
                  {peerConnectionTypes[peer.peerId] ===
                  PeerConnectionType.DIRECT ? (
                    <SyncAltIcon />
                  ) : (
                    <NetworkPingIcon />
                  )}
                </Box>
              ) : null}
              <PeerNameDisplay>{peer.userId}</PeerNameDisplay>
              {peer.peerId in peerAudios && (
                <AudioVolume audioEl={peerAudios[peer.peerId]} />
              )}
            </ListItemText>
          </ListItem>
        ))}
      </List>
    </MuiDrawer>
  )
}
