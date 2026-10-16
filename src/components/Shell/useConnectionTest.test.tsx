import { vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import type { ConnectionTest } from 'lib/ConnectionTest'
import { ConnectionTestEvents, TrackerConnection } from 'lib/ConnectionTest'
import type { useTurnConfig } from 'hooks/useTurnConfig'

import { useConnectionTest } from './useConnectionTest'

type FakeSurface = Pick<
  ConnectionTest,
  | 'initRtcPeerConnectionTest'
  | 'destroyRtcPeerConnectionTest'
  | 'testTrackerConnection'
  | 'hasHost'
  | 'hasTURNServer'
>

const mocks = vi.hoisted(() => {
  class FakeConnectionTest extends EventTarget implements FakeSurface {
    hasHost = false
    hasTURNServer = false

    initRtcPeerConnectionTest = vi.fn<
      ConnectionTest['initRtcPeerConnectionTest']
    >(() => state.initRtc())
    destroyRtcPeerConnectionTest =
      vi.fn<ConnectionTest['destroyRtcPeerConnectionTest']>()
    testTrackerConnection = vi.fn<ConnectionTest['testTrackerConnection']>(
      () => state.trackerResult
    )

    constructor() {
      super()
      state.instances.push(this)
    }
  }

  const state = {
    FakeConnectionTest,
    instances: [] as FakeConnectionTest[],
    initRtc: (): Promise<void> => Promise.resolve(),
    trackerResult: 'CONNECTED' as ReturnType<
      ConnectionTest['testTrackerConnection']
    >,
    turnConfig: {
      isLoading: false,
      isError: false,
      error: null,
      turnConfig: { iceServers: [] },
    } as ReturnType<typeof useTurnConfig>,
  }

  return state
})

vi.mock('hooks/useTurnConfig', () => ({
  useTurnConfig: () => mocks.turnConfig,
}))

vi.mock('lib/ConnectionTest', async () => {
  const actual =
    await vi.importActual<typeof import('lib/ConnectionTest')>(
      'lib/ConnectionTest'
    )

  return { ...actual, ConnectionTest: mocks.FakeConnectionTest }
})

const twentySeconds = 20 * 1000

const countTrackerTests = () =>
  mocks.instances.reduce(
    (sum, i) => sum + i.testTrackerConnection.mock.calls.length,
    0
  )

const rtcInstances = () =>
  mocks.instances.filter(i => i.initRtcPeerConnectionTest.mock.calls.length > 0)

const newTurnConfig = (): ReturnType<typeof useTurnConfig> => ({
  isLoading: false,
  isError: false,
  error: null,
  turnConfig: { iceServers: [{ urls: 'stun:stun.example.test' }] },
})

describe('useConnectionTest', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.instances.length = 0
    mocks.initRtc = () => Promise.resolve()
    mocks.trackerResult = TrackerConnection.CONNECTED
    mocks.turnConfig = {
      isLoading: false,
      isError: false,
      error: null,
      turnConfig: { iceServers: [] },
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  test('destroys an RTC test that is still initializing on unmount', async () => {
    mocks.initRtc = () => new Promise<void>(() => {})

    const { unmount } = renderHook(() => useConnectionTest())

    await vi.advanceTimersByTimeAsync(0)

    const [rtcTest] = rtcInstances()

    expect(rtcTest.destroyRtcPeerConnectionTest).not.toHaveBeenCalled()

    unmount()

    expect(rtcTest.destroyRtcPeerConnectionTest).toHaveBeenCalledTimes(1)
  })

  test('does not stack tracker polling loops when the config changes', async () => {
    const baseline = renderHook(() => useConnectionTest())

    await vi.advanceTimersByTimeAsync(twentySeconds)

    const callsForOneLoop = countTrackerTests()

    baseline.unmount()
    mocks.instances.length = 0

    const { rerender, unmount } = renderHook(() => useConnectionTest())

    await vi.advanceTimersByTimeAsync(0)

    const before = countTrackerTests()
    const [firstRtcTest] = rtcInstances()

    mocks.turnConfig = newTurnConfig()
    rerender()
    await vi.advanceTimersByTimeAsync(twentySeconds)

    expect(firstRtcTest.destroyRtcPeerConnectionTest).toHaveBeenCalled()
    expect(countTrackerTests() - before).toBe(callsForOneLoop)

    unmount()
  })

  test('ignores a superseded RTC test after the config changes', async () => {
    const pending: Array<(error: Error) => void> = []

    mocks.initRtc = () =>
      pending.length === 0
        ? new Promise<void>((_resolve, reject) => {
            pending.push(reject)
          })
        : Promise.resolve()

    const { result, rerender, unmount } = renderHook(() => useConnectionTest())

    await vi.advanceTimersByTimeAsync(0)

    const [staleTest] = rtcInstances()

    mocks.turnConfig = newTurnConfig()
    rerender()
    await vi.advanceTimersByTimeAsync(0)

    const currentTest = rtcInstances()[1]

    currentTest.hasHost = true
    currentTest.hasTURNServer = true
    act(() => {
      currentTest.dispatchEvent(
        new CustomEvent(ConnectionTestEvents.HAS_HOST_CHANGED, {
          detail: currentTest,
        })
      )
      currentTest.dispatchEvent(
        new CustomEvent(ConnectionTestEvents.HAS_RELAY_CHANGED, {
          detail: currentTest,
        })
      )
    })

    expect(result.current.connectionTestResults.hasHost).toBe(true)
    expect(result.current.connectionTestResults.hasTURNServer).toBe(true)

    staleTest.hasHost = false
    staleTest.hasTURNServer = false
    act(() => {
      staleTest.dispatchEvent(
        new CustomEvent(ConnectionTestEvents.HAS_HOST_CHANGED, {
          detail: staleTest,
        })
      )
      staleTest.dispatchEvent(
        new CustomEvent(ConnectionTestEvents.HAS_RELAY_CHANGED, {
          detail: staleTest,
        })
      )
    })

    expect(result.current.connectionTestResults.hasHost).toBe(true)
    expect(result.current.connectionTestResults.hasTURNServer).toBe(true)

    await act(async () => {
      pending[0](new Error('closed during init'))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.connectionTestResults.hasHost).toBe(true)
    expect(result.current.connectionTestResults.hasTURNServer).toBe(true)

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
