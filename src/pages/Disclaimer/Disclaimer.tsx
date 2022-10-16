import { useContext, useEffect } from 'react'
import Box from '@mui/material/Box'
import MuiMarkdown from 'mui-markdown'

import { ShellContext } from 'contexts/ShellContext'

import './index.sass'

export const Disclaimer = () => {
  const { setTitle } = useContext(ShellContext)

  useEffect(() => {
    setTitle('Disclaimer')
  }, [setTitle])

  return (
    <Box className="max-w-3xl mx-auto p-4">
      <MuiMarkdown>
        {`
## Interpretation and Definitions
### Interpretation

The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.

### Definitions

For the purposes of this Disclaimer:

- **Company** (referred to as either "the Company", "We", "Us" or "Our" in this Disclaimer) refers to Chitchatter.
- **Service** refers to the Website.
- **You** means the individual accessing the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.
- **Website** refers to Chitchatter, accessible from https://chitchatter.im
`}
      </MuiMarkdown>
    </Box>
  )
}
