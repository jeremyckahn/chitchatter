import { vi } from 'vitest'

import { ConnectionTest } from './ConnectionTest'

class StubRtcPeerConnection extends EventTarget {
  createOffer = vi.fn(
    (): Promise<RTCSessionDescriptionInit> =>
      Promise.resolve({ type: 'offer', sdp: '' })
  )
  setLocalDescription = vi.fn(
    (_description: RTCSessionDescriptionInit): Promise<void> =>
      Promise.resolve()
  )
  close = vi.fn()
}

describe('ConnectionTest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('waits for setLocalDescription so a late failure is handled', async () => {
    const stub = new StubRtcPeerConnection()
    let failSetLocalDescription = (_error: Error) => {}

    stub.setLocalDescription.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          failSetLocalDescription = reject
        })
    )

    vi.stubGlobal('RTCPeerConnection', function () {
      return stub
    })

    const connectionTest = new ConnectionTest({ iceServers: [] })
    let isSettled = false
    const init = connectionTest.initRtcPeerConnectionTest().then(() => {
      isSettled = true
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(stub.setLocalDescription).toHaveBeenCalledTimes(1)
    expect(isSettled).toBe(false)

    failSetLocalDescription(new DOMException('closed', 'InvalidStateError'))

    await expect(init).resolves.toBeUndefined()
    expect(isSettled).toBe(true)
  })
})
