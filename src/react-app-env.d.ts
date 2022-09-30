/// <reference types="react-scripts" />

declare module 'trystero' {
  export type RoomConfig = BaseRoomConfig &
    (BitTorrentRoomConfig | FirebaseRoomConfig | IpfsRoomConfig)
}
