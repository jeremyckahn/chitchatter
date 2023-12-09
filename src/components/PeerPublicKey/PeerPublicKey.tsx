import { useEffect, useState } from 'react'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { CopyableBlock } from 'components/CopyableBlock/CopyableBlock'
import { Peer } from 'models/chat'
import { encryptionService } from 'services/Encryption/Encryption'

interface PeerPublicKeyProps {
  peer: Peer
}

export const PeerPublicKey = ({ peer }: PeerPublicKeyProps) => {
  const [publicKeyString, setPublicKeyString] = useState('')

  useEffect(() => {
    ;(async () => {
      setPublicKeyString(
        await encryptionService.stringifyCryptoKey(peer.publicKey)
      )
    })()
  }, [peer.publicKey])

  return (
    <CopyableBlock>
      <SyntaxHighlighter
        language="plaintext"
        style={materialDark}
        PreTag="div"
        lineProps={{
          style: {
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
          },
        }}
        wrapLines={true}
      >
        {publicKeyString}
      </SyntaxHighlighter>
    </CopyableBlock>
  )
}
