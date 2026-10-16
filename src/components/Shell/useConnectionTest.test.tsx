import { vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { TrackerConnection } from 'lib/ConnectionTest'

import { useConnectionTest } from './useConnectionTest'

const mocks = vi.hoisted(() => ({
  instances: [] as unknown[],
  turnConfig: { isLoading: false, turnConfig: [] as unknown[] },
}))

vi.mock('hooks/useTurnConfig', () => ({
  useTurnConfig: () => mocks.turnConfig,
}))

vi.mock('lib/ConnectionTest', async () => {
  const actual =
    await vi.importActual<typeof import('lib/ConnectionTest')>(
      'lib/ConnectionTest'
    )

  class FakeConnectionTest extends EventTarget {
    initRtcPeerConnectionTest = vi.fn().mockResolvedValue(undefined)
    destroyRtcPeerConnectionTest = vi.fn()
    testTrackerConnection = vi.fn(() => actual.TrackerConnection.CONNECTED)

    constructor() {
      super()
      mocks.instances.push(this)
    }
  }

  return { ...actual, ConnectionTest: FakeConnectionTest }
})

const countTrackerTests = () =>
  (
    mocks.instances as {
      testTrackerConnection: { mock: { calls: unknown[] } }
    }[]
  ).reduce((sum, i) => sum + i.testTrackerConnection.mock.calls.length, 0)

describe('useConnectionTest', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.instances.length = 0
    mocks.turnConfig = { isLoading: false, turnConfig: [] }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('stops polling after unmount', async () => {
    const { unmount } = renderHook(() => useConnectionTest())

    await vi.advanceTimersByTimeAsync(0)
    unmount()

    const instancesAtUnmount = mocks.instances.length
    const trackerTestsAtUnmount = countTrackerTests()

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

    expect(mocks.instances.length).toBe(instancesAtUnmount)
    expect(countTrackerTests()).toBe(trackerTestsAtUnmount)
  })

  test('destroys the in-flight RTC test on unmount', async () => {
    const { unmount } = renderHook(() => useConnectionTest())

    await vi.advanceTimersByTimeAsync(0)

    const rtcTest = mocks.instances[0] as {
      destroyRtcPeerConnectionTest: ReturnType<typeof vi.fn>
    }

    unmount()

    expect(rtcTest.destroyRtcPeerConnectionTest).toHaveBeenCalled()
  })

  test('does not stack polling loops when the config changes', async () => {
    const { rerender, unmount } = renderHook(() => useConnectionTest())

    await vi.advanceTimersByTimeAsync(0)

    mocks.turnConfig = { isLoading: false, turnConfig: [{}] }
    rerender()
    await vi.advanceTimersByTimeAsync(0)

    const before = countTrackerTests()

    await vi.advanceTimersByTimeAsync(5 * 1000 * 4)

    // One live tracker loop polls roughly once per 5s interval, not twice.
    expect(countTrackerTests() - before).toBeLessThanOrEqual(5)

    unmount()
  })

  test('reports the tracker result while mounted', async () => {
    const { result, unmount } = renderHook(() => useConnectionTest())

    await vi.advanceTimersByTimeAsync(0)

    expect(result.current.connectionTestResults.trackerConnection).toBe(
      TrackerConnection.CONNECTED
    )

    unmount()
  })
})
