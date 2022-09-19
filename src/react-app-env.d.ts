/// <reference types="react-scripts" />

// TODO: Contribute this to Trystero
declare module 'trystero' {
  export type RoomConfig = BaseRoomConfig &
    (BitTorrentRoomConfig | FirebaseRoomConfig | IpfsRoomConfig)
}
