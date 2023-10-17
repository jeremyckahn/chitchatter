import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Link from '@mui/material/Link'
import { CopyableBlock } from 'components/CopyableBlock/CopyableBlock'

import { iframeFeatureAllowList } from 'config/iframeFeatureAllowList'

interface EmbedCodeDialogProps {
  showEmbedCode: boolean
  handleEmbedCodeWindowClose: () => void
  roomName: string
}

export const EmbedCodeDialog = ({
  showEmbedCode,
  handleEmbedCodeWindowClose,
  roomName,
}: EmbedCodeDialogProps) => {
  const iframeSrc = new URL(`${window.location.origin}/public/${roomName}`)
  iframeSrc.search = new URLSearchParams({ embed: '1' }).toString()

  return (
    <Dialog open={showEmbedCode} onClose={handleEmbedCodeWindowClose}>
      <DialogTitle>Room embed code</DialogTitle>
      <DialogContent>
        <DialogContentText
          sx={{
            mb: 2,
          }}
        >
          Copy and paste this <code>iframe</code> HTML snippet into your
          project:
        </DialogContentText>
        <CopyableBlock>
          <SyntaxHighlighter
            language="html"
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
            {`<iframe src="${iframeSrc}" allow="${iframeFeatureAllowList.join(
              ';'
            )}" width="800" height="800" />`}
          </SyntaxHighlighter>
        </CopyableBlock>
        <Divider sx={{ my: 2 }} />
        <DialogContentText
          sx={{
            mb: 2,
          }}
        >
          Alternatively, you can use the Chitchatter SDK to embed a chat room as
          a{' '}
          <Link
            href="https://developer.mozilla.org/en-US/docs/Web/API/Web_components"
            target="_blank"
          >
            Web Component
          </Link>
          :
        </DialogContentText>
        <CopyableBlock>
          <SyntaxHighlighter
            language="html"
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
            {`<script src="${process.env.REACT_APP_HOMEPAGE}sdk.js"></script>

<chat-room src="${roomName}" width="800" height="800" />`}
          </SyntaxHighlighter>
        </CopyableBlock>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleEmbedCodeWindowClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
