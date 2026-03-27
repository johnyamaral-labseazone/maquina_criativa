import { useState } from 'react'
import { useCampanha2Store } from './stores/campanha2Store'
import { Logo } from './imports/Logo1'
import { ArrowLeft, FileText, FolderOpen, Settings2, Users, ImageIcon, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BriefingStep2 from './components/Campanha2/BriefingStep2'
import AssetsStep2 from './components/Campanha2/AssetsStep2'
import Parametros2 from './components/Campanha2/Parametros2'
import AgenciaView from './components/Campanha2/AgenciaView'
import Resultados2 from './components/Campanha2/Resultados2'
import { HistoricoView2 } from './components/Campanha2/HistoricoView2'

const STEPS = [
  { id: 'briefing',    label: 'Briefing',    icon: FileText  },
  { id: 'assets',      label: 'Assets',      icon: FolderOpen },
  { id: 'parametros',  label: 'Parâmetros',  icon: Settings2  },
  { id: 'agencia',     label: 'Agência IA',  icon: Users      },
  { id: 'resultados',  label: 'Resultados',  icon: ImageIcon  },
]

export default function AppCampanha2() {
  const navigate = useNavigate()
  const step = useCampanha2Store(s => s.step)
  const [showHistorico, setShowHistorico] = useState(false)

  const currentIdx = STEPS.findIndex(s => s.id === step)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="gradient-header">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-3 py-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:opacity-70 transition-opacity flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff' }}
            >
              <ArrowLeft size={15} />
            </button>
            <div style={{ width: 110, flexShrink: 0 }}>
              <Logo variant="white" />
            </div>
            <div className="w-px h-4 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <div className="flex flex-col" style={{ lineHeight: 1.2, flexShrink: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: 14 }}>Campanha 2.0</span>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>Agentes IA</span>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-0.5 ml-auto overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {STEPS.map((s, i) => {
                const active = s.id === step
                const done = i < currentIdx
                const Icon = s.icon
                return (
                  <div key={s.id} className="flex items-center gap-0.5 flex-shrink-0">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all"
                      style={{
                        backgroundColor: active ? 'rgba(255,255,255,0.22)' : done ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: active ? '#fff' : done ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      <Icon size={13} />
                      <span style={{ fontSize: 11, fontWeight: active ? 700 : 400 }}>{s.label}</span>
                      {done && <span style={{ fontSize: 9, color: '#5EA500' }}>✓</span>}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ width: 8, height: 1, backgroundColor: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* History button */}
            <button
              onClick={() => setShowHistorico(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0 hover:opacity-80 transition-opacity"
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: 12 }}
            >
              <Clock size={13} />
              <span style={{ display: 'none' }} className="md:block">Histórico</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 animate-fade-in-up">
        {step === 'briefing'   && <BriefingStep2 />}
        {step === 'assets'     && <AssetsStep2 />}
        {step === 'parametros' && <Parametros2 />}
        {step === 'agencia'    && <AgenciaView />}
        {step === 'resultados' && <Resultados2 />}
      </main>

      {/* History drawer */}
      {showHistorico && <HistoricoView2 onClose={() => setShowHistorico(false)} />}
    </div>
  )
}
