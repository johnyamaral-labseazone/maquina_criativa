import { useBriefingStore, StoreProvider } from './stores/StoreContext'
import { variacoesStore } from './stores/briefingStore'
import { BriefingForm } from './components/BriefingForm/BriefingForm'
import { AssetsInput } from './components/AssetsInput/AssetsInput'
import { CreativePreview } from './components/Preview/CreativePreview'
import { ExportPanel } from './components/Export/ExportButton'
import { Logo } from './imports/Logo1'
import { FileText, Image, Eye, Download, Check, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  { label: 'Briefing', icon: FileText, component: BriefingForm },
  { label: 'Assets', icon: Image, component: AssetsInput },
  { label: 'Preview', icon: Eye, component: CreativePreview },
  { label: 'Exportar', icon: Download, component: ExportPanel },
]

function AppContent() {
  const currentStep = useBriefingStore((s) => s.currentStep)
  const setStep = useBriefingStore((s) => s.setStep)
  const CurrentStepComponent = STEPS[currentStep].component
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <header className="gradient-header">
        <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex items-center gap-4 py-4 flex-wrap gap-y-3">
            {/* Back to hub */}
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

            {/* Logo */}
            <div style={{ width: '120px', flexShrink: 0 }}>
              <Logo variant="white" />
            </div>

            <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

            <span className="body flex-shrink-0" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Automação de variações
            </span>

            <div className="flex-1" />

            {/* Step tabs */}
            <nav className="flex items-center gap-1.5 flex-wrap">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                const isActive = i === currentStep
                const isCompleted = i < currentStep

                return (
                  <button
                    key={step.label}
                    onClick={() => setStep(i)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all active:scale-95"
                    style={{
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.95)'
                        : isCompleted
                          ? 'rgba(255,255,255,0.14)'
                          : 'rgba(255,255,255,0.06)',
                      color: isActive
                        ? 'var(--cores-azul-900, #1C398E)'
                        : 'rgba(255,255,255,0.75)',
                      border: isActive
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <span
                      className="w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isActive
                          ? 'rgba(28,57,142,0.12)'
                          : isCompleted
                            ? 'rgba(255,255,255,0.15)'
                            : 'transparent',
                      }}
                    >
                      {isCompleted
                        ? <Check size={12} strokeWidth={2.5} />
                        : <Icon size={12} />
                      }
                    </span>
                    <span className="body">{step.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Progress bar at the bottom of the header */}
        <div style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div style={{
            height: '100%',
            width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.7))',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-10">
        <div key={currentStep} className="animate-fade-in-up">
          <CurrentStepComponent />
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <StoreProvider store={variacoesStore}>
      <AppContent />
    </StoreProvider>
  )
}

export default App
