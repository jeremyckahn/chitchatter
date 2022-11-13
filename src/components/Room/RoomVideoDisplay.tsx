import { Fragment, useContext } from 'react'
import Paper from '@mui/material/Paper'

import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { Peer } from 'models/chat'

import { PeerVideo } from './PeerVideo'

type PeerWithVideo = {
  peer: Peer
  videoStream?: MediaStream
  screenStream?: MediaStream
}

export interface RoomVideoDisplayProps {
  userId: string
}

export const RoomVideoDisplay = ({ userId }: RoomVideoDisplayProps) => {
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)

  const { peerList } = shellContext
  const {
    peerVideoStreams,
    selfVideoStream,
    peerScreenStreams,
    selfScreenStream,
  } = roomContext

  const peersWithVideo: PeerWithVideo[] = peerList.reduce(
    (acc: PeerWithVideo[], peer: Peer) => {
      const videoStream = peerVideoStreams[peer.peerId]
      const screenStream = peerScreenStreams[peer.peerId]

      if (videoStream || screenStream) {
        acc.push({
          peer,
          videoStream,
          screenStream,
        })
      }

      return acc
    },
    []
  )

  const numberOfVideos =
    (selfVideoStream ? 1 : 0) +
    (selfScreenStream ? 1 : 0) +
    peersWithVideo.reduce((sum, peerWithVideo) => {
      if (peerWithVideo.videoStream) sum++
      if (peerWithVideo.screenStream) sum++

      return sum
    }, 0)

  return (
    <Paper
      className="RoomVideoDisplay"
      elevation={3}
      square
      sx={{
        alignContent: 'center',
        alignItems: 'center',
        display: 'flex',
        flexDirection: numberOfVideos === 1 ? 'column' : 'row',
        flexGrow: 1,
        flexWrap: 'wrap',
        justifyContent: 'center',
        overflow: 'auto',
        width: '75%',
      }}
    >
      {selfVideoStream && (
        <PeerVideo
          isSelf
          numberOfVideos={numberOfVideos}
          userId={userId}
          videoStream={selfVideoStream}
        />
      )}
      {selfScreenStream && (
        <PeerVideo
          isSelf
          numberOfVideos={numberOfVideos}
          userId={userId}
          videoStream={selfScreenStream}
        />
      )}
      {peersWithVideo.map(peerWithVideo => (
        <Fragment key={peerWithVideo.peer.peerId}>
          {peerWithVideo.videoStream && (
            <PeerVideo
              numberOfVideos={numberOfVideos}
              userId={peerWithVideo.peer.userId}
              videoStream={peerWithVideo.videoStream}
            />
          )}
          {peerWithVideo.screenStream && (
            <PeerVideo
              numberOfVideos={numberOfVideos}
              userId={peerWithVideo.peer.userId}
              videoStream={peerWithVideo.screenStream}
            />
          )}
        </Fragment>
      ))}
    </Paper>
  )
}
