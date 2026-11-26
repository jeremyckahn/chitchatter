import { useEffect, useState } from 'react'

/**
 * How long a pending operation may run before its progress indicator appears.
 * Operations that finish sooner never show one, so fast devices don't flash a
 * spinner.
 */
export const progressIndicatorDelay = 150

/**
 * Follows `flag`, but only turns on once it has stayed on for `delay`
 * milliseconds. It turns off as soon as `flag` does.
 */
export const useDelayedFlag = (
  flag: boolean,
  delay: number = progressIndicatorDelay
): boolean => {
  const [isDelayedFlagOn, setIsDelayedFlagOn] = useState(false)

  useEffect(() => {
    if (!flag) {
      setIsDelayedFlagOn(false)
      return
    }

    const timeoutId = setTimeout(() => setIsDelayedFlagOn(true), delay)

    return () => clearTimeout(timeoutId)
  }, [flag, delay])

  return isDelayedFlagOn
}
