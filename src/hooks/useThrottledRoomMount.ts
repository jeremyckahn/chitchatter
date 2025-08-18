import { useState, useEffect } from 'react'
import { useTimeout } from 'usehooks-ts'

const LAST_MOUNT_TIME_KEY = 'room-mount-throttle:last-mount-time'
const BACKOFF_KEY = 'room-mount-throttle:backoff'

const backoffResetPeriod = 5000
const baseBackoff = 2000
const backoffMultiplier = 2

// This hook prevents users from rapidly rejoining rooms, which can cause
// WebRTC and peer connections to get into a broken state when leaving and
// rejoining too quickly. It implements exponential backoff to throttle
// successive room mounts.

export function useThrottledRoomMount(roomId: string) {
  const [canMount, setCanMount] = useState(false)
  const [backoffDelay, setBackoffDelay] = useState<number | null>(null)
  const [resetDelay, setResetDelay] = useState<number | null>(null)

  useTimeout(() => {
    setCanMount(true)
    setResetDelay(backoffResetPeriod)
  }, backoffDelay)

  useTimeout(() => {
    sessionStorage.setItem(BACKOFF_KEY, '0')
  }, resetDelay)

  useEffect(() => {
    const now = Date.now()

    const lastMountTime =
      Number(sessionStorage.getItem(LAST_MOUNT_TIME_KEY) || '0') || 0

    const timeSinceLastMount = now - lastMountTime
    sessionStorage.setItem(LAST_MOUNT_TIME_KEY, now.toString())

    let backoff = Number(sessionStorage.getItem(BACKOFF_KEY) || '0') || 0

    if (timeSinceLastMount < backoffResetPeriod) {
      backoff = backoff === 0 ? baseBackoff : backoff * backoffMultiplier
    } else {
      backoff = 0
    }

    sessionStorage.setItem(BACKOFF_KEY, backoff.toString())

    if (backoff > 0) {
      setBackoffDelay(backoff)
    } else {
      setCanMount(true)
      setResetDelay(backoffResetPeriod)
    }
  }, [roomId])

  return canMount
}
