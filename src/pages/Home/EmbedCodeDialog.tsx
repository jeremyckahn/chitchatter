import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
// These imports need to be ts-ignored to prevent spurious errors that look
// like this:
//
//   Module 'react-markdown' cannot be imported using this construct. The
//   specifier only resolves to an ES module, which cannot be imported
//   synchronously. Use dynamic import instead. (tsserver 1471)
//
// @ts-ignore
import Markdown from 'react-markdown'
// @ts-ignore
import { CodeProps } from 'react-markdown/lib/ast-to-react'
// @ts-ignore
import remarkGfm from 'remark-gfm'

interface EmbedCodeDialogProps {
  showEmbedCode: boolean
  handleEmbedCodeWindowClose: () => void
  embedUrl: URL
}

export const EmbedCodeDialog = ({
  showEmbedCode,
  handleEmbedCodeWindowClose,
  embedUrl,
}: EmbedCodeDialogProps) => (
  <Dialog open={showEmbedCode} onClose={handleEmbedCodeWindowClose}>
    <DialogTitle>Room embed code</DialogTitle>
    <DialogContent>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // https://github.com/remarkjs/react-markdown#use-custom-components-syntax-highlight
          code({
            node,
            inline,
            className,
            children,
            style,
            ...props
          }: CodeProps) {
            return (
              <SyntaxHighlighter
                children={String(children).replace(/\n$/, '')}
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
                {...props}
              />
            )
          },
        }}
      >
        {`\`\`\`html
<iframe src="${embedUrl}" allow="camera;microphone;display-capture" width="800" height="800" />
\`\`\``}
      </Markdown>
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
