import { useEffect, useRef } from 'react'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'

import { PeerNameDisplay } from 'components/PeerNameDisplay'
import { VideoStreamType } from 'models/chat'

import { SelectedPeerStream } from './RoomVideoDisplay'

interface PeerVideoProps {
  isSelfVideo?: boolean
  numberOfVideos: number
  onVideoClick?: (
    userId: string,
    videoStreamType: VideoStreamType,
    videoStream: MediaStream
  ) => void
  selectedPeerStream: SelectedPeerStream | null
  userId: string
  videoStream: MediaStream
  videoStreamType: VideoStreamType
}

// Adapted from https://www.geeksforgeeks.org/find-the-next-perfect-square-greater-than-a-given-number/
const nextPerfectSquare = (base: number) => {
  const nextInteger = Math.floor(Math.sqrt(base)) + 1

  return nextInteger * nextInteger
}

export const PeerVideo = ({
  isSelfVideo,
  numberOfVideos,
  onVideoClick,
  userId,
  selectedPeerStream,
  videoStream,
  videoStreamType,
}: PeerVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const { current: video } = videoRef
    if (!video) return

    video.autoplay = true
    video.srcObject = videoStream
  }, [videoRef, videoStream])

  const cols = Math.sqrt(nextPerfectSquare(numberOfVideos - 1))
  const rows = Math.ceil(numberOfVideos / cols)

  const handleVideoClick = () => {
    onVideoClick?.(userId, videoStreamType, videoStream)
  }

  return (
    <Paper
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 1,
        justifyContent: 'center',
        mx: 'auto',
        overflow: 'auto',
        padding: '0px',
        marginBottom: '5px',
        marginRight: '5px',
        ...(selectedPeerStream
          ? {
              height: 'calc(100% - 5px)',
              width: 'calc(100% - 5px)',
            }
          : {
              width: `calc(${100 / cols}% - 5px)`,
              height: `calc(${100 / rows}% - 5px)`,
            }),
      }}
      elevation={10}
    >
      <Tooltip
        title={<PeerNameDisplay>{userId}</PeerNameDisplay>}
        placement="top"
        componentsProps={{
          tooltip: { sx: { position: 'absolute', top: '25px' } },
        }}
      >
        <video
          playsInline
          ref={videoRef}
          onClick={handleVideoClick}
          style={{
            borderRadius: '.25em',
            cursor: 'pointer',
            overflow: 'auto',
            marginLeft: 'auto',
            marginRight: 'auto',
            height: '100%',
            width: '100%',
            ...(isSelfVideo && {
              transform: 'rotateY(180deg)',
            }),
          }}
        />
      </Tooltip>
    </Paper>
  )
}
