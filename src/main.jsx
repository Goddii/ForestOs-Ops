import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './lib/cesium'
import './index.css'
import App from './App.jsx'

// Note: React.StrictMode is intentionally omitted. Its double-invoked mount
// effects tear down and recreate the Cesium viewer mid-init, which leaves the
// sector map's tile provider detached (blank map). Resium + Cesium expect a
// single mount.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
