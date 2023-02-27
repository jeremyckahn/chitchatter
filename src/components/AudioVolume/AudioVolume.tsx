import { useState, useEffect } from 'react'
import Slider from '@mui/material/Slider'
import Box from '@mui/material/Box'
import ListItemIcon from '@mui/material/ListItemIcon'
import VolumeUp from '@mui/icons-material/VolumeUp'
import VolumeDown from '@mui/icons-material/VolumeDown'
import VolumeMute from '@mui/icons-material/VolumeMute'

interface AudioVolumeProps {
  audioEl: HTMLAudioElement
}

export const AudioVolume = ({ audioEl }: AudioVolumeProps) => {
  const [audioVolume, setAudioVolume] = useState(audioEl.volume)

  useEffect(() => {
    audioEl.volume = audioVolume
  }, [audioEl, audioVolume])

  const handleIconClick = () => {
    if (audioVolume === 0) {
      setAudioVolume(1)
    } else {
      setAudioVolume(0)
    }
  }

  const handleSliderChange = (_event: Event, value: number | number[]) => {
    value = Array.isArray(value) ? value[0] : value
    setAudioVolume(value / 100)
  }

  const formatLabelValue = () => `${Math.round(audioVolume * 100)}%`

  let VolumeIcon = VolumeUp

  if (audioVolume === 0) {
    VolumeIcon = VolumeMute
  } else if (audioVolume < 0.5) {
    VolumeIcon = VolumeDown
  }

  return (
    <Box sx={{ display: 'flex', pt: 1, pr: 3, alignItems: 'center' }}>
      <ListItemIcon>
        <VolumeIcon sx={{ cursor: 'pointer' }} onClick={handleIconClick} />
      </ListItemIcon>
      <Slider
        aria-label="Volume"
        getAriaValueText={formatLabelValue}
        valueLabelFormat={formatLabelValue}
        valueLabelDisplay="auto"
        onChange={handleSliderChange}
        value={audioVolume * 100}
      ></Slider>
    </Box>
  )
}
