import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'

import { AudioChannelName, AudioState } from 'core/models/chat'
import { TrackerConnection } from 'lib/ConnectionTest'

import { PeerList, PeerListProps, privateRoomEmptyHint } from './PeerList'

vi.mock('components/UserInfo', () => ({
  UserInfo: ({ userId }: { userId: string }) => <span>{userId}</span>,
}))

const renderPeerList = (props: Partial<PeerListProps> = {}) => {
  const defaultProps: PeerListProps = {
    userId: 'user-1',
    roomId: 'team-sync-2026',
    onPeerListClose: () => {},
    peerList: [],
    peerConnectionTypes: {},
    peerAudioChannelState: {
      [AudioChannelName.MICROPHONE]: AudioState.STOPPED,
      [AudioChannelName.SCREEN_SHARE]: AudioState.STOPPED,
    },
    peerAudioChannels: {},
    connectionTestResults: {
      hasHost: true,
      hasTURNServer: false,
      trackerConnection: TrackerConnection.CONNECTED,
    },
    isPrivateRoom: true,
  }

  render(
    <MemoryRouter>
      <PeerList {...defaultProps} {...props} />
    </MemoryRouter>
  )
}

describe('PeerList', () => {
  test('explains why nobody appears in an empty private room', () => {
    renderPeerList()

    expect(screen.getByText('Searching for peers...')).toBeInTheDocument()
    expect(screen.getByText(privateRoomEmptyHint)).toBeInTheDocument()
  })

  test('does not show the private room hint in a public room', () => {
    renderPeerList({ isPrivateRoom: false })

    expect(screen.getByText('Searching for peers...')).toBeInTheDocument()
    expect(screen.queryByText(privateRoomEmptyHint)).not.toBeInTheDocument()
  })
})
