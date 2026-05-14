import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base/global.css'
import App from './App.jsx'
import { GlobalProvider } from './context/GlobalContext'
import { ToastProvider } from './context/ToastContext'
import { GoogleOAuthProvider } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = "355373139751-ie4gr5mdsi08fed9bmb7uff7bs6i264g.apps.googleusercontent.com";

createRoot(document.getElementById('root')).render(
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ToastProvider>
        <GlobalProvider>
          <App />
        </GlobalProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
)

