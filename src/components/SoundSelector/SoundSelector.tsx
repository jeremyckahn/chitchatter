import React, { useContext } from 'react'
import { Autocomplete, TextField } from '@mui/material'
import { soundOptions } from 'config/soundNames'
import { SettingsContext } from 'contexts/SettingsContext'

export const handleChange = async (
  event: React.SyntheticEvent<Element, Event>,
  newValue: { label: string; value: string } | null,
  updateUserSettings: Function
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

interface SoundSelectorProps {
  disabled?: boolean
}

export const SoundSelector: React.FC<SoundSelectorProps> = ({ disabled }) => {
  const { getUserSettings, updateUserSettings } = useContext(SettingsContext)
  const { selectedSound } = getUserSettings()

  return (
    <Autocomplete
      options={soundOptions}
      sx={{ width: 300, mt: 2 }}
      value={
        soundOptions.find(option => option.value === selectedSound) ||
        soundOptions[0]
      }
      onChange={(event, newValue) =>
        handleChange(event, newValue, updateUserSettings)
      }
      getOptionLabel={option => option.label}
      isOptionEqualToValue={(option, value) => option.value === value.value}
      renderInput={params => (
        <TextField {...params} label="Sound" disabled={disabled} />
      )}
      disabled={disabled}
    />
  )
}
