import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import App from './App'
import awsconfig from './aws-exports'
import './index.css'

// Configure Amplify
Amplify.configure(awsconfig)

console.log('=== React应用启动 ===')
console.log('=== API_ENDPOINT:', import.meta.env.VITE_API_ENDPOINT, '===')
console.log('=== 当前URL:', window.location.href, '===')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
