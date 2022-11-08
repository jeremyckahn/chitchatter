import { useEffect, useRef } from 'react'
import Paper from '@mui/material/Paper'

import { PeerNameDisplay } from 'components/PeerNameDisplay'

interface PeerVideoProps {
  isSelf?: boolean
  numberOfPeers: number
  userId: string
  videoStream: MediaStream
}

// Adapted from https://www.geeksforgeeks.org/find-the-next-perfect-square-greater-than-a-given-number/
const nextPerfectSquare = (base: number) => {
  const nextInteger = Math.floor(Math.sqrt(base)) + 1

  return nextInteger * nextInteger
}

export const PeerVideo = ({
  isSelf,
  numberOfPeers,
  userId,
  videoStream,
}: PeerVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const { current: video } = videoRef
    if (!video) return

    video.autoplay = true
    video.srcObject = videoStream
  }, [videoRef, videoStream])

  const sizePercent = 100 / Math.sqrt(nextPerfectSquare(numberOfPeers - 1))

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
        width: `calc(${sizePercent}% - 1em)`,
        height: `calc(${sizePercent}% - 1em)`,
      }}
      elevation={10}
    >
      <video
        playsInline
        ref={videoRef}
        style={{
          borderRadius: '.25em',
          overflow: 'auto',
          marginLeft: 'auto',
          marginRight: 'auto',
          height: '100%',
          ...(isSelf && {
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
