import { useCampanha2Store } from '../../stores/campanha2Store'
import { ChevronLeft, ChevronRight, Minus, Plus, Image, Video, Tv2, Layers } from 'lucide-react'

function Counter({ value, min, max, onDec, onInc, label, sublabel }: {
  value: number; min: number; max: number; onDec(): void; onInc(): void; label: string; sublabel?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      {sublabel && <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{sublabel}</span>}
      <div className="flex items-center gap-2">
        <button onClick={onDec} disabled={value <= min}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:opacity-80"
          style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: value <= min ? 'not-allowed' : 'pointer', opacity: value <= min ? 0.4 : 1 }}
        ><Minus size={13} /></button>
        <span className="h3" style={{ color: 'var(--foreground)', minWidth: 24, textAlign: 'center' }}>{value}</span>
        <button onClick={onInc} disabled={value >= max}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:opacity-80"
          style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: value >= max ? 'not-allowed' : 'pointer', opacity: value >= max ? 0.4 : 1 }}
        ><Plus size={13} /></button>
      </div>
    </div>
  )
}

function Toggle({ active, onToggle, icon: Icon, label, sublabel, color, children }: {
  active: boolean; onToggle(): void; icon: React.ElementType; label: string; sublabel: string; color: string; children?: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ border: active ? `1.5px solid ${color}35` : '1px solid var(--border)', backgroundColor: 'var(--card)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 transition-all hover:opacity-80"
        style={{ background: active ? `linear-gradient(135deg, ${color}08, transparent)` : 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ backgroundColor: active ? color : 'var(--secondary)' }}>
            <Icon size={17} style={{ color: active ? '#fff' : 'var(--muted-foreground)' }} />
          </span>
          <div className="flex flex-col">
            <span className="p-ui-medium" style={{ color: 'var(--foreground)' }}>{label}</span>
            <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>{sublabel}</span>
          </div>
        </div>
        <div
          className="w-11 h-6 rounded-full transition-all flex items-center relative flex-shrink-0"
          style={{ backgroundColor: active ? color : 'var(--secondary)', padding: '2px' }}
        >
          <div
            className="w-5 h-5 rounded-full transition-all absolute"
            style={{ backgroundColor: '#fff', left: active ? 'calc(100% - 22px)' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
          />
        </div>
      </button>
      {active && children && (
        <div className="px-4 pb-4 flex flex-col gap-4" style={{ borderTop: `1px solid ${color}20` }}
          onClick={e => e.stopPropagation()}>
          <div style={{ height: 4 }} />
          {children}
        </div>
      )}
    </div>
  )
}

export default function Parametros2() {
  const {
    estruturasCount, variacoesCount, incluirImagens, incluirNarrado, incluirApresentadora,
    setEstruturasCount, setVariacoesCount, setIncluirImagens, setIncluirNarrado, setIncluirApresentadora,
    setStep, startAgency, campaignName,
  } = useCampanha2Store()

  const nenhum = !incluirImagens && !incluirNarrado && !incluirApresentadora

  const totalPecas = (incluirImagens ? estruturasCount * variacoesCount * 2 : 0)
    + (incluirNarrado ? estruturasCount : 0)
    + (incluirApresentadora ? estruturasCount : 0)

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <h2 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 700 }}>Parâmetros da campanha</h2>
        <p className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
          Configure o que a agência IA vai criar.
        </p>
      </div>

      {/* Content types */}
      <div className="flex flex-col gap-3">
        <span className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Tipos de conteúdo</span>

        <Toggle active={incluirImagens} onToggle={() => setIncluirImagens(!incluirImagens)} icon={Image} label="Imagens estáticas" sublabel="Feed 4:5 e Story 9:16" color="#0055FF">
          <div className="grid grid-cols-2 gap-4">
            <Counter value={estruturasCount} min={1} max={3} onDec={() => setEstruturasCount(estruturasCount - 1)} onInc={() => setEstruturasCount(estruturasCount + 1)} label="Estruturas" sublabel="Abordagens diferentes" />
            <Counter value={variacoesCount} min={1} max={5} onDec={() => setVariacoesCount(variacoesCount - 1)} onInc={() => setVariacoesCount(variacoesCount + 1)} label="Variações" sublabel="Por estrutura" />
          </div>
          <p className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
            Gera {estruturasCount * variacoesCount * 2} imagens ({estruturasCount * variacoesCount} Feed + {estruturasCount * variacoesCount} Story)
          </p>
        </Toggle>

        <Toggle active={incluirNarrado} onToggle={() => setIncluirNarrado(!incluirNarrado)} icon={Video} label="Vídeo narrado" sublabel="Locução com imagens do empreendimento" color="#7C3AED">
          <p className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
            Gera {estruturasCount} roteiro(s) com narração em voz da apresentadora.
          </p>
        </Toggle>

        <Toggle active={incluirApresentadora} onToggle={() => setIncluirApresentadora(!incluirApresentadora)} icon={Tv2} label="Vídeo apresentadora" sublabel="Avatar da apresentadora Seazone" color="#EA580C">
          <p className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
            Gera {estruturasCount} vídeo(s) com a apresentadora apresentando o empreendimento.
          </p>
        </Toggle>
      </div>

      {/* Summary */}
      <div
        className="flex items-center justify-between px-5 py-4 rounded-2xl"
        style={{ backgroundColor: nenhum ? 'rgba(239,68,68,0.05)' : 'var(--secondary)', border: `1px solid ${nenhum ? 'rgba(239,68,68,0.2)' : 'var(--border)'}` }}
      >
        {nenhum ? (
          <span className="body-small" style={{ color: '#EF4444' }}>Selecione pelo menos um tipo de conteúdo</span>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Layers size={16} style={{ color: 'var(--muted-foreground)' }} />
              <span className="body-small" style={{ color: 'var(--muted-foreground)' }}>Total de peças</span>
            </div>
            <span className="h3" style={{ color: 'var(--foreground)' }}>{totalPecas}</span>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep('assets')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full"
          style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: 'none', cursor: 'pointer' }}
        >
          <ChevronLeft size={15} />
          <span className="p-ui">Voltar</span>
        </button>
        <button
          onClick={() => startAgency()}
          disabled={nenhum}
          className="flex items-center gap-2 px-6 py-3 rounded-full transition-all hover:opacity-90 active:scale-95"
          style={{
            background: nenhum ? 'var(--secondary)' : 'linear-gradient(135deg, #7C3AED, #EA580C)',
            color: nenhum ? 'var(--muted-foreground)' : '#fff',
            border: 'none', cursor: nenhum ? 'not-allowed' : 'pointer',
            boxShadow: nenhum ? 'none' : '0 4px 15px rgba(124,58,237,0.3)',
          }}
        >
          <span className="p-ui">Iniciar Agência IA</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
