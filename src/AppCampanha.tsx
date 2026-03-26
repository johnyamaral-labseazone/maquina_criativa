import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Settings2, Zap, ImageIcon, Clock, FolderOpen, PenLine } from 'lucide-react'
import { Logo } from './imports/Logo1'
import { useCampanhaStore } from './stores/campanhaStore'
import { useHistoryStore } from './stores/historyStore'
import { BriefingInput } from './components/Campanha/BriefingInput'
import { AssetsInput } from './components/Campanha/AssetsInput'
import { ParametrosForm } from './components/Campanha/ParametrosForm'
import { CopyEditor } from './components/Campanha/CopyEditor'
import { GeracaoProgress } from './components/Campanha/GeracaoProgress'
import { ResultadosGallery } from './components/Campanha/ResultadosGallery'
import { HistoricoView } from './components/Campanha/HistoricoView'

const STEPS = [
  { id: 'briefing',      label: 'Briefing',    icon: FileText },
  { id: 'assets',        label: 'Assets',      icon: FolderOpen },
  { id: 'parametros',    label: 'Parâmetros',  icon: Settings2 },
  { id: 'editarCopies',  label: 'Copies',      icon: PenLine },
  { id: 'gerando',       label: 'Geração',     icon: Zap },
  { id: 'resultados',    label: 'Resultados',  icon: ImageIcon },
] as const

export default function AppCampanha() {
  const navigate   = useNavigate()
  const step       = useCampanhaStore((s) => s.step)
  const setStep    = useCampanhaStore((s) => s.setStep)
  const campaigns  = useHistoryStore((s) => s.campaigns)

  const [showHistorico, setShowHistorico] = useState(false)

  const currentIndex = STEPS.findIndex((s) => s.id === step)

  const canNavigateTo = (targetId: string) => {
    const targetIndex = STEPS.findIndex((s) => s.id === targetId)
    return targetIndex <= currentIndex && targetId !== 'gerando'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>

      {/* Header */}
      <header className="gradient-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex items-center gap-3 py-4">

            {/* Back to hub */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 flex-shrink-0"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontSize: 12,
              }}
            >
              <ArrowLeft size={13} />
              Hub
            </button>

            {/* Logo */}
            <div style={{ width: '120px', flexShrink: 0 }}>
              <Logo variant="white" />
            </div>

            <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

            {/* App title */}
            <span
              className="hidden md:block flex-shrink-0"
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontSize: 14,
              }}
            >
              Gerador de Campanhas IA
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Histórico button */}
            <button
              onClick={() => setShowHistorico((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all flex-shrink-0"
              style={{
                backgroundColor: showHistorico ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
                color: showHistorico ? '#fff' : 'rgba(255,255,255,0.75)',
                border: showHistorico ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.12)',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontSize: 13,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <Clock size={13} />
              <span className="hidden sm:inline">Histórico</span>
              {campaigns.length > 0 && (
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 16, height: 16,
                    backgroundColor: '#22C55E',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {campaigns.length}
                </span>
              )}
            </button>

            {/* Step tabs — hidden while showing history */}
            {!showHistorico && (
              <nav className="flex items-center gap-1">
                {STEPS.map(({ id, label, icon: Icon }, idx) => {
                  const isCurrent  = id === step
                  const isComplete = idx < currentIndex
                  const canClick   = canNavigateTo(id)

                  return (
                    <button
                      key={id}
                      onClick={() => canClick && setStep(id as typeof step)}
                      disabled={!canClick}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor: isCurrent
                          ? 'rgba(255,255,255,0.18)'
                          : isComplete ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: isCurrent
                          ? '#fff'
                          : isComplete ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
                        border: isCurrent ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                        cursor: canClick ? 'pointer' : 'default',
                        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                        fontSize: 13,
                        fontWeight: isCurrent ? 600 : 400,
                      }}
                    >
                      <Icon size={13} />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  )
                })}
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-10">

        {showHistorico ? (
          <div className="animate-fade-in-up">
            <HistoricoView onClose={() => setShowHistorico(false)} />
          </div>
        ) : (
          <>
            {/* Step indicator (mobile) */}
            <div className="mb-6 flex items-center gap-2 md:hidden">
              {STEPS.map(({ id }, idx) => (
                <div
                  key={id}
                  className="h-1 flex-1 rounded-full transition-all"
                  style={{
                    backgroundColor: idx <= currentIndex ? 'var(--primary)' : 'var(--border)',
                  }}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="animate-fade-in-up">
              {step === 'briefing'     && <BriefingInput />}
              {step === 'assets'       && <AssetsInput />}
              {step === 'parametros'   && <ParametrosForm />}
              {step === 'editarCopies' && <CopyEditor />}
              {step === 'gerando'      && <GeracaoProgress />}
              {step === 'resultados'   && <ResultadosGallery />}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
