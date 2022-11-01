import { PropsWithChildren } from 'react'
import MuiDrawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import VolumeUp from '@mui/icons-material/VolumeUp'
import ListItemButton from '@mui/material/ListItemButton'

import { PeerListHeader } from 'components/Shell/PeerListHeader'
import { PeerNameDisplay } from 'components/PeerNameDisplay'

import { AudioState, Peer } from 'models/chat'

export const peerListWidth = 300

export interface PeerListProps extends PropsWithChildren {
  userId: string
  isPeerListOpen: boolean
  onPeerListClose: () => void
  peerList: Peer[]
  audioState: AudioState
}

export const PeerList = ({
  userId,
  isPeerListOpen,
  onPeerListClose,
  peerList,
  audioState,
}: PeerListProps) => {
  return (
    <MuiDrawer
      sx={{
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: peerListWidth,
          boxSizing: 'border-box',
        },
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
        <ListItemButton disableRipple={true}>
          {audioState === AudioState.PLAYING && (
            <ListItemIcon>
              <VolumeUp />
            </ListItemIcon>
          )}
          <ListItemText>
            <PeerNameDisplay>{userId}</PeerNameDisplay> (you)
          </ListItemText>
        </ListItemButton>
        {peerList.map((peer: Peer) => (
          <ListItemButton key={peer.peerId} disableRipple={true}>
            {peer.audioState === AudioState.PLAYING && (
              <ListItemIcon>
                <VolumeUp />
              </ListItemIcon>
            )}
            <ListItemText>
              <PeerNameDisplay>{peer.userId}</PeerNameDisplay>
            </ListItemText>
          </ListItemButton>
        ))}
      </List>
      <Divider />
    </MuiDrawer>
  )
}
