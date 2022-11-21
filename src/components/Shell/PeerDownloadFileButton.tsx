import { useState } from 'react'
import { WebTorrent as WebTorrentType } from 'webtorrent'
import streamSaver from 'streamsaver'
import Fab from '@mui/material/Fab'
import Download from '@mui/icons-material/Download'

// @ts-ignore
import WebTorrent from 'webtorrent/webtorrent.min.js'

import { Peer } from 'models/chat'

interface PeerDownloadFileButtonProps {
  peer: Peer
}

// FIXME: Make this configurable
streamSaver.mitm = 'https://jeremyckahn.github.io/StreamSaver.js/mitm.html'

export const PeerDownloadFileButton = ({
  peer,
}: PeerDownloadFileButtonProps) => {
  const { torrentMetadata } = peer

  const [webTorrentClient] = useState(
    () => new (WebTorrent as unknown as WebTorrentType)()
  )

  if (!torrentMetadata) {
    return <></>
  }

  const handleDownloadFileClick = () => {
    webTorrentClient.add(torrentMetadata.magnetURI, torrent => {
      for (const file of torrent.files) {
        const fileStream = streamSaver.createWriteStream(file.name)
        const writer = fileStream.getWriter()
        file
          .createReadStream()
          .on('data', data => {
            writer.write(data)
          })
          .on('end', () => {
            writer.close()
          })
      }
    })
  }

  return (
    <Fab
      color="primary"
      size="small"
      onClick={handleDownloadFileClick}
      sx={{ mr: 2 }}
    >
      <Download />
    </Fab>
  )
}
