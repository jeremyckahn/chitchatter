interface InlineMediaProps {
  magnetURI: string
}

export const InlineMedia = ({ magnetURI }: InlineMediaProps) => {
  return <>{magnetURI}</>
}
