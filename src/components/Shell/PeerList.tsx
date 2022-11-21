import { PropsWithChildren } from 'react'
import MuiDrawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import VolumeUp from '@mui/icons-material/VolumeUp'
import ListItem from '@mui/material/ListItem'

import { PeerListHeader } from 'components/Shell/PeerListHeader'
import { PeerNameDisplay } from 'components/PeerNameDisplay'
import { AudioState, Peer } from 'models/chat'

import { PeerDownloadFileButton } from './PeerDownloadFileButton'

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
        <ListItem>
          {audioState === AudioState.PLAYING && (
            <ListItemIcon>
              <VolumeUp />
            </ListItemIcon>
          )}
          <ListItemText>
            <PeerNameDisplay>{userId}</PeerNameDisplay> (you)
          </ListItemText>
        </ListItem>
        {peerList.map((peer: Peer) => (
          <ListItem key={peer.peerId}>
            <PeerDownloadFileButton peer={peer} />
            <ListItemText>
              <PeerNameDisplay>{peer.userId}</PeerNameDisplay>
            </ListItemText>
            {peer.audioState === AudioState.PLAYING && (
              <ListItemIcon>
                <VolumeUp />
              </ListItemIcon>
            )}
          </ListItem>
        ))}
      </List>
      <Divider />
    </MuiDrawer>
  )
}
