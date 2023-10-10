import { Box } from '@mui/system'
import ListItemText from '@mui/material/ListItemText'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import NetworkPingIcon from '@mui/icons-material/NetworkPing'
import ListItem from '@mui/material/ListItem'
import Tooltip from '@mui/material/Tooltip'

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
  const hasPeerConnection = peer.peerId in peerConnectionTypes

  const isPeerConnectionDirect =
    peerConnectionTypes[peer.peerId] === PeerConnectionType.DIRECT

  return (
    <ListItem key={peer.peerId} divider={true}>
      <PeerDownloadFileButton peer={peer} />
      <ListItemText>
        {hasPeerConnection ? (
          <Tooltip
            title={
              isPeerConnectionDirect ? (
                <>
                  You are connected directly to{' '}
                  <PeerNameDisplay
                    sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}
                  >
                    {peer.userId}
                  </PeerNameDisplay>
                </>
              ) : (
                <>
                  You are connected to{' '}
                  <PeerNameDisplay
                    sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}
                  >
                    {peer.userId}
                  </PeerNameDisplay>{' '}
                  via a relay server. Your connection is still private and
                  encrypted, but performance may be degraded.
                </>
              )
            }
          >
            <Box component="span" sx={{ pr: 1, cursor: 'pointer' }}>
              {isPeerConnectionDirect ? (
                <SyncAltIcon color="success" />
              ) : (
                <NetworkPingIcon color="warning" />
              )}
            </Box>
          </Tooltip>
        ) : null}
        <PeerNameDisplay>{peer.userId}</PeerNameDisplay>
        {peer.peerId in peerAudios && (
          <AudioVolume audioEl={peerAudios[peer.peerId]} />
        )}
      </ListItemText>
    </ListItem>
  )
}
