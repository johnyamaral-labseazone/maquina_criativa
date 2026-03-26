import { useNavigate } from 'react-router-dom'
import { Logo } from './imports/Logo1'
import { ArrowLeft } from 'lucide-react'
import { WaCanvas } from './components/WhatsappEditor/WaCanvas'
import { WaPanel } from './components/WhatsappEditor/WaPanel'

export default function AppWhatsapp() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="gradient-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 flex-shrink-0"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <ArrowLeft size={13} />
              <span className="body" style={{ fontSize: 12 }}>Hub</span>
            </button>

            <div style={{ width: '120px', flexShrink: 0 }}>
              <Logo variant="white" />
            </div>

            <div className="w-px h-5 flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

            <span className="body flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.65)' }}>
              Estáticos WhatsApp
            </span>
          </div>
        </div>
      </header>

      {/* Editor — two-column layout, fills full width */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex gap-6 items-start animate-fade-in-up">

          {/* ── Canvas: sticky so it stays in view ── */}
          <div
            className="flex-shrink-0 flex flex-col items-center gap-2"
            style={{ position: 'sticky', top: 16 }}
          >
            <WaCanvas />
            <span className="detail-regular"
              style={{ color: 'var(--muted-foreground)' }}>
              Arraste os textos para reposicionar
            </span>
          </div>

          {/* ── Panel: fills ALL remaining horizontal space ── */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <WaPanel />
          </div>
        </div>
      </main>
    </div>
  )
}
