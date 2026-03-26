import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Hub from './pages/Hub'
import App from './App'
import AppWhatsapp from './AppWhatsapp'
import AppCampanha from './AppCampanha'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/variacoes" element={<App />} />
        <Route path="/whatsapp" element={<AppWhatsapp />} />
        <Route path="/campanha" element={<AppCampanha />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
