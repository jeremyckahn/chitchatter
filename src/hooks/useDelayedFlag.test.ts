import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { progressIndicatorDelay, useDelayedFlag } from './useDelayedFlag'

describe('useDelayedFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('stays off while the flag is off', () => {
    const { result } = renderHook(() => useDelayedFlag(false))

    act(() => {
      vi.advanceTimersByTime(progressIndicatorDelay * 2)
    })

    expect(result.current).toBe(false)
  })

  test('turns on only after the flag has been on for the delay', () => {
    const { result } = renderHook(() => useDelayedFlag(true))

    act(() => {
      vi.advanceTimersByTime(progressIndicatorDelay - 1)
    })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(true)
  })

  test('never turns on when the flag clears before the delay', () => {
    const { result, rerender } = renderHook(
      ({ flag }: { flag: boolean }) => useDelayedFlag(flag),
      { initialProps: { flag: true } }
    )

    act(() => {
      vi.advanceTimersByTime(progressIndicatorDelay - 1)
    })
    rerender({ flag: false })
    act(() => {
      vi.advanceTimersByTime(progressIndicatorDelay)
    })

    expect(result.current).toBe(false)
  })

  test('turns off as soon as the flag does', () => {
    const { result, rerender } = renderHook(
      ({ flag }: { flag: boolean }) => useDelayedFlag(flag),
      { initialProps: { flag: true } }
    )

    act(() => {
      vi.advanceTimersByTime(progressIndicatorDelay)
    })
    expect(result.current).toBe(true)

    rerender({ flag: false })

    expect(result.current).toBe(false)
  })
})
