import './polyfills'
import ReactDOM from 'react-dom/client'
import 'typeface-roboto'

import 'index.sass'
import Bootstrap from 'Bootstrap'
import reportWebVitals from 'reportWebVitals'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<Bootstrap />)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
