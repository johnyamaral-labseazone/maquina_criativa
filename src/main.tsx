import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Hub from './pages/Hub'
import AppWhatsapp from './AppWhatsapp'
import AppCampanha2 from './AppCampanha2'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/whatsapp" element={<AppWhatsapp />} />
        <Route path="/campanha2" element={<AppCampanha2 />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
