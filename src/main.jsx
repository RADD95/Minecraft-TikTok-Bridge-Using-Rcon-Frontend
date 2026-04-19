import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import OverlayPublicView from './components/OverlayPublicView.jsx'
import './index.css'
import './styles/overlay-editor-react.css'

function getOverlayIdFromPath(pathname) {
  const match = String(pathname || '').match(/^\/overlay\/([^/]+)$/)
  if (!match) return ''

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

const overlayId = getOverlayIdFromPath(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {overlayId ? <OverlayPublicView overlayId={overlayId} /> : <App />}
  </StrictMode>
)