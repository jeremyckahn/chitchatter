import { useState, useEffect } from 'react'
import Slider from '@mui/material/Slider'
import Box from '@mui/material/Box'
import ListItemIcon from '@mui/material/ListItemIcon'
import VolumeUp from '@mui/icons-material/VolumeUp'

interface AudioVolumeProps {
  audioEl?: HTMLAudioElement
}

export const AudioVolume = ({ audioEl }: AudioVolumeProps) => {
  const [audioVolume, setAudioVolume] = useState(
    audioEl?.volume ? audioEl.volume : 1
  )

  useEffect(() => {
    if (!audioEl) return

    audioEl.volume = audioVolume
  }, [audioEl, audioVolume])

  if (!audioEl) return <></>

  const handleChange = (_event: Event, value: number | number[]) => {
    value = Array.isArray(value) ? value[0] : value
    setAudioVolume(value / 100)
  }

  return (
    <Box sx={{ display: 'flex', pt: 1, pr: 3, alignItems: 'center' }}>
      <ListItemIcon>
        <VolumeUp />
      </ListItemIcon>
      <Slider onChange={handleChange} value={audioVolume * 100}></Slider>
    </Box>
  )
}
