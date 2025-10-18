const BASE_URL = import.meta.env.BASE_URL ?? ''

export const soundOptions = [
  { label: 'New Message', value: `${BASE_URL}sounds/new-message.aac` },
  { label: 'Chime', value: `${BASE_URL}sounds/chime.mp3` },
  { label: 'Beep', value: `${BASE_URL}sounds/beep.mp3` },
]

export const DEFAULT_SOUND =
  soundOptions.find(sound => sound.label === 'New Message')?.value ||
  `${BASE_URL}sounds/new-message.aac`
