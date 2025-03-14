import React, { useState } from 'react'
import { Autocomplete, TextField } from '@mui/material'
import { soundNames } from 'config/soundNames'

function SoundSelector() {
  const [selectedSound, setSelectedSound] = useState('')

  const handleChange = (event: any, newValue: string | null) => {
    setSelectedSound(newValue || '') // Handle selection or empty selection
  }

  return (
    <Autocomplete
      disablePortal
      options={soundNames}
      sx={{ width: 300, mt: 2 }}
      value={selectedSound}
      onChange={handleChange}
      renderInput={params => <TextField {...params} label="Sound" />}
    />
  )
}

export default SoundSelector
