import { createContext, useContext } from 'react'

import { FileTransferService } from 'services/FileTransfer'

/**
 * The {@link FileTransferService} of the room whose files a subtree shows.
 *
 * A room's service is the one its `ChatRoom` offers, seeds and rescinds
 * through, so a download started anywhere else would be held by a WebTorrent
 * client the room's seeding decisions never reach, and that nothing stops
 * seeding when the owner withdraws the file or the user leaves the room. That
 * is why there is no default instance: outside a provider this is `null`, and
 * {@link useRoomFileTransfer} throws rather than quietly building a second
 * client.
 *
 * Two places provide it. `Room` provides its own, for the transcript's inline
 * media. `Shell` provides the group room's around the peer list, which sits
 * outside the room but offers that room's files.
 */
export const RoomFileTransferContext =
  createContext<FileTransferService | null>(null)

/**
 * Reads the {@link FileTransferService} of the enclosing room.
 *
 * @throws When called outside a {@link RoomFileTransferContext} provider with
 * a service in it. That is a wiring mistake, not a condition to recover from.
 */
export const useRoomFileTransfer = (): FileTransferService => {
  const fileTransferService = useContext(RoomFileTransferContext)

  if (!fileTransferService) {
    throw new Error(
      "useRoomFileTransfer was called outside a room. Render the component inside a RoomFileTransferContext provider holding that room's FileTransferService."
    )
  }

  return fileTransferService
}
