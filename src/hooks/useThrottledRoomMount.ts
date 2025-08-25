import { useState, useEffect } from 'react'
import { useTimeout } from 'usehooks-ts'

// Session storage keys for persisting throttling state
export const LAST_MOUNT_TIME_KEY = 'room-mount-throttle:last-mount-time'
export const BACKOFF_KEY = 'room-mount-throttle:backoff'

export const backoffResetPeriod = 5000
export const baseBackoff = 2000
export const backoffMultiplier = 2

// This hook prevents users from rapidly rejoining rooms, which can cause
// WebRTC and peer connections to get into a broken state when leaving and
// rejoining too quickly. It implements exponential backoff to throttle
// successive room mounts.

export function useThrottledRoomMount(roomId: string) {
  const [canMount, setCanMount] = useState(false)
  // Delay before allowing room mount (null means no delay)
  const [backoffDelay, setBackoffDelay] = useState<number | null>(null)
  // Delay before resetting the backoff counter (null means no reset scheduled)
  const [resetDelay, setResetDelay] = useState<number | null>(null)

  // Timer that allows room mounting after the backoff delay
  useTimeout(() => {
    setCanMount(true)
    setResetDelay(backoffResetPeriod) // Schedule backoff reset after allowing mount
  }, backoffDelay)

  // Timer that resets the backoff counter to 0 after the reset period
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

    // If the user is rejoining too quickly (within the reset period)
    if (timeSinceLastMount < backoffResetPeriod) {
      // Apply exponential backoff: start with base delay, then multiply by 2 each time
      backoff = backoff === 0 ? baseBackoff : backoff * backoffMultiplier
    } else {
      // Enough time has passed, reset backoff to 0
      backoff = 0
    }

    // Save the updated backoff value
    sessionStorage.setItem(BACKOFF_KEY, backoff.toString())

    // If there's a backoff delay, start the timer to allow mounting later
    if (backoff > 0) {
      setBackoffDelay(backoff)
    } else {
      // No backoff needed, allow immediate mounting and schedule backoff reset
      setCanMount(true)
      setResetDelay(backoffResetPeriod)
    }
  }, [roomId])

  return canMount
}
