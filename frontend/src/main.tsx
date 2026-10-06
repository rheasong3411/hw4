import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/libre-caslon-text/400.css'
import '@fontsource/libre-caslon-text/400-italic.css'
import '@fontsource/libre-caslon-text/700.css'
import '@fontsource/libre-caslon-display/400.css'
import '@fontsource-variable/inter'
import '@fontsource/caveat/500.css'
import './index.css'
import App from './App.tsx'
import AuthProvider from './auth/AuthProvider.tsx'
import BagProvider from './bag/BagProvider.tsx'
import ChatPanelProvider from './chat/ChatPanelProvider.tsx'
import ChatResultsProvider from './chat/ChatResultsProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ChatResultsProvider>
          <ChatPanelProvider>
            <BagProvider>
              <App />
            </BagProvider>
          </ChatPanelProvider>
        </ChatResultsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
