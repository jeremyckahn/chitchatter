import { useState, useEffect, useRef } from 'react'

const LAST_MOUNT_TIME_KEY = 'room-mount-throttle:last-mount-time'
const BACKOFF_KEY = 'room-mount-throttle:backoff'

const backoffResetPeriod = 5000
const baseBackoff = 2000
const backoffMultiplier = 2

export function useThrottledRoomMount(roomId: string) {
  const [canMount, setCanMount] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const now = Date.now()
    const lastMountTime = parseInt(
      sessionStorage.getItem(LAST_MOUNT_TIME_KEY) || '0',
      10
    )
    const timeSinceLastMount = now - lastMountTime
    sessionStorage.setItem(LAST_MOUNT_TIME_KEY, now.toString())

    let backoff = parseInt(sessionStorage.getItem(BACKOFF_KEY) || '0', 10)

    if (timeSinceLastMount < backoffResetPeriod) {
      backoff = backoff === 0 ? baseBackoff : backoff * backoffMultiplier
    } else {
      backoff = 0
    }
    sessionStorage.setItem(BACKOFF_KEY, backoff.toString())

    const mount = () => {
      setCanMount(true)
      timeoutRef.current = setTimeout(() => {
        sessionStorage.setItem(BACKOFF_KEY, '0')
      }, backoffResetPeriod)
    }

    if (backoff > 0) {
      timeoutRef.current = setTimeout(mount, backoff)
    } else {
      mount()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [roomId])

  return canMount
}
