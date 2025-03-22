export const soundOptions = [
  { label: 'New Message', value: '/sounds/new-message.aac' },
  { label: 'Chime', value: '/sounds/chime.mp3' },
  { label: 'Beep', value: '/sounds/beep.mp3' },
]

export const DEFAULT_SOUND =
  soundOptions.find(sound => sound.label === 'New Message')?.value ||
  '/sounds/new-message.aac'
