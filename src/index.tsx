import './polyfills'
import ReactDOM from 'react-dom/client'
import 'typeface-roboto'

import './index.sass'

import { ThemeProvider, createTheme } from '@mui/material/styles'

import Init from './Init'
import reportWebVitals from './reportWebVitals'

// NOTE: This is a workaround for MUI components attempting to load theme code
// before it has loaded.
// See: https://stackoverflow.com/a/76017295/470685
;<ThemeProvider theme={createTheme()} />

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<Init />)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
