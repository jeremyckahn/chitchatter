import { Box } from '@mui/system'
import ListItemText from '@mui/material/ListItemText'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import NetworkPingIcon from '@mui/icons-material/NetworkPing'
import ListItem from '@mui/material/ListItem'
import { AudioVolume } from 'components/AudioVolume'
import { PeerNameDisplay } from 'components/PeerNameDisplay'
import { Peer } from 'models/chat'
import { PeerConnectionType } from 'services/PeerRoom/PeerRoom'

import { PeerDownloadFileButton } from './PeerDownloadFileButton'

interface PeerListItemProps {
  peer: Peer
  peerConnectionTypes: Record<string, PeerConnectionType>
  peerAudios: Record<string, HTMLAudioElement>
}
export const PeerListItem = ({
  peer,
  peerConnectionTypes,
  peerAudios,
}: PeerListItemProps): JSX.Element => {
  return (
    <ListItem key={peer.peerId} divider={true}>
      <PeerDownloadFileButton peer={peer} />
      <ListItemText>
        {peer.peerId in peerConnectionTypes ? (
          <Box component="span" sx={{ pr: 1 }}>
            {peerConnectionTypes[peer.peerId] === PeerConnectionType.DIRECT ? (
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
  )
}
