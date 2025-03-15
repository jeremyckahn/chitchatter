import React from 'react'
import { Autocomplete, TextField } from '@mui/material'
import { useContext } from 'react'
import { soundOptions } from 'config/soundNames'
import { SettingsContext } from 'contexts/SettingsContext'

function SoundSelector() {
  const { getUserSettings, updateUserSettings } = useContext(SettingsContext)
  const { selectedSound } = getUserSettings()

  const handleChange = async (
    event: any,
    newValue: { label: string; value: string } | null
  ) => {
    const newSound = newValue?.value || soundOptions[0].value

    // Play the selected sound immediately
    if (newSound) {
      const audio = new Audio(newSound)
      audio.play().catch(error => console.error('Error playing sound:', error))
    }

    // Update user settings
    await updateUserSettings({ selectedSound: newSound })
  }

  return (
    <Autocomplete
      disablePortal
      options={soundOptions}
      sx={{ width: 300, mt: 2 }}
      value={
        soundOptions.find(option => option.value === selectedSound) ||
        soundOptions[0]
      }
      onChange={handleChange}
      getOptionLabel={option => option.label}
      isOptionEqualToValue={(option, value) => option.value === value.value}
      renderInput={params => <TextField {...params} label="Sound" />}
    />
  )
}

export default SoundSelector
