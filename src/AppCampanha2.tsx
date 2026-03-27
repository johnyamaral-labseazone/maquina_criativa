import { useCampanha2Store } from './stores/campanha2Store'
import { Logo } from './imports/Logo1'
import { ArrowLeft, FileText, FolderOpen, Settings2, Users, ImageIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BriefingStep2 from './components/Campanha2/BriefingStep2'
import AssetsStep2 from './components/Campanha2/AssetsStep2'
import Parametros2 from './components/Campanha2/Parametros2'
import AgenciaView from './components/Campanha2/AgenciaView'
import Resultados2 from './components/Campanha2/Resultados2'

const STEPS = [
  { id: 'briefing', label: 'Briefing', icon: FileText },
  { id: 'assets', label: 'Assets', icon: FolderOpen },
  { id: 'parametros', label: 'Parâmetros', icon: Settings2 },
  { id: 'agencia', label: 'Agência IA', icon: Users },
  { id: 'resultados', label: 'Resultados', icon: ImageIcon },
]

export default function AppCampanha2() {
  const navigate = useNavigate()
  const step = useCampanha2Store(s => s.step)

  const currentIdx = STEPS.findIndex(s => s.id === step)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="gradient-header">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:opacity-70 transition-opacity flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff' }}
            >
              <ArrowLeft size={16} />
            </button>
            <div style={{ width: 120, flexShrink: 0 }}>
              <Logo variant="white" />
            </div>
            <div className="w-px h-4 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
              <span className="body" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Campanha 2.0</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Agentes IA</span>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1 ml-auto">
              {STEPS.map((s, i) => {
                const active = s.id === step
                const done = i < currentIdx
                const Icon = s.icon
                return (
                  <div key={s.id} className="flex items-center gap-1">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all"
                      style={{
                        backgroundColor: active ? 'rgba(255,255,255,0.2)' : done ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: active ? '#fff' : done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      <Icon size={12} />
                      <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, display: 'none' }} className="md:block">{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ width: 12, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 animate-fade-in-up">
        {step === 'briefing' && <BriefingStep2 />}
        {step === 'assets' && <AssetsStep2 />}
        {step === 'parametros' && <Parametros2 />}
        {(step === 'agencia') && <AgenciaView />}
        {step === 'resultados' && <Resultados2 />}
      </main>
    </div>
  )
}
