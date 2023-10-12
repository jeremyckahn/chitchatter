import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { CopyableBlock } from 'components/CopyableBlock/CopyableBlock'

interface EmbedCodeDialogProps {
  showEmbedCode: boolean
  handleEmbedCodeWindowClose: () => void
  embedUrl: URL
}

const iframeFeatureAllowList = [
  'camera',
  'microphone',
  'display-capture',
  'fullscreen',
]

export const EmbedCodeDialog = ({
  showEmbedCode,
  handleEmbedCodeWindowClose,
  embedUrl,
}: EmbedCodeDialogProps) => (
  <Dialog open={showEmbedCode} onClose={handleEmbedCodeWindowClose}>
    <DialogTitle>Room embed code</DialogTitle>
    <DialogContent>
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
          {`<iframe src="${embedUrl}" allow="${iframeFeatureAllowList.join(
            ';'
          )}" width="800" height="800" />`}
        </SyntaxHighlighter>
      </CopyableBlock>
      <DialogContentText
        sx={{
          mb: 2,
        }}
      >
        Copy and paste this HTML snippet into your project.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={handleEmbedCodeWindowClose}>Close</Button>
    </DialogActions>
  </Dialog>
)
