/// <reference types="react-scripts" />

// TODO: Contribute this to DefinitelyTyped
declare module 'trystero' {
  interface BitTorrentRoomConfig {
    trackerUrls?: string[]
    trackerRedundancy?: number
  }

  interface FirebaseRoomConfig {
    firebaseApp?: string
    rootPath?: string
  }

  interface IpfsRoomConfig {
    swarmAddresses?: string
  }

  export interface BaseRoomConfig {
    appId: string
    password?: string
    rtcConfig?: RTCConfiguration
  }

  export type RoomConfig = BaseRoomConfig &
    (BitTorrentRoomConfig | FirebaseRoomConfig | IpfsRoomConfig)

  export interface Room {
    makeAction: <T>(
      namespace: string
    ) => [
      (
        data: T,
        targetPeers?: string[],
        metadata?: Record,
        progress: (percent: number, peerId: string) => void
      ) => void,

      (data: T, peerId: string, metadata?: Record) => void,

      (percent: number, peerId: string, metadata?: Record) => void
    ]

    ping: (id: string) => Promise<number>

    leave: () => void

    getPeers: () => string[]

    addStream: (
      stream: MediaStream,
      peerId?: string,
      metadata?: Record
    ) => Promise<void>[]

    removeStream: (stream: MediaStream, peerId?: string) => void

    addTrack: (
      track: MediaStreamTrack,
      stream: MediaStream,
      peerId?: string,
      metadata?: Record
    ) => Promise<void>[]

    removeTrack: (
      track: MediaStreamTrack,
      stream: MediaStream,
      peerId?: string
    ) => void

    replaceTrack: (
      oldTrack: MediaStreamTrack,
      newTrack: MediaStreamTrack,
      stream: MediaStream,
      peerId?: string
    ) => Promise<void>[]

    onPeerJoin: (fn: (peerId: string) => void) => void

    onPeerLeave: (fn: (peerId: string) => void) => void

    onPeerStream: (fn: (stream: MediaStream, peerId: string) => void) => void

    onPeerTrack: (
      fn: (track: MediaStreamTrack, stream: MediaStream, peerId: string) => void
    ) => void
  }

  export function joinRoom(config: RoomConfig, roomId: string): Room
}
