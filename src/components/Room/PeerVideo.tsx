import { useEffect, useRef } from 'react'
import Paper from '@mui/material/Paper'

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

  const sizePercent = 100 / Math.sqrt(nextPerfectSquare(numberOfVideos - 1))

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
        margin: '0.5em',
        overflow: 'auto',
        py: 2,
        ...(selectedPeerStream
          ? {
              height: '100%',
            }
          : {
              width: `calc(${sizePercent}% - 1em)`,
              height: `calc(${sizePercent}% - 1em)`,
            }),
      }}
      elevation={10}
    >
      <video
        playsInline
        ref={videoRef}
        onClick={handleVideoClick}
        style={{
          borderRadius: '.25em',
          overflow: 'auto',
          marginLeft: 'auto',
          marginRight: 'auto',
          height: '100%',
          ...(isSelfVideo && {
            transform: 'rotateY(180deg)',
          }),
        }}
      />
      <PeerNameDisplay
        sx={{ textAlign: 'center', display: 'block', marginTop: '1em' }}
      >
        {userId}
      </PeerNameDisplay>
    </Paper>
  )
}
