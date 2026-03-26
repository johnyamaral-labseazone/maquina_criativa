import { useState } from 'react'
import { useCampanhaStore } from '../../stores/campanhaStore'
import type { CopyVariation } from '../../stores/campanhaStore'
import {
  LayoutGrid, Smartphone, Video, User,
  ChevronLeft, Zap, CheckCircle2, DollarSign, MapPin, Minus, Plus, Loader2,
} from 'lucide-react'

const ESTRUTURA_DEFS = [
  { num: 1, label: 'Retorno Financeiro',      desc: 'ROI, renda mensal, valorização',         color: '#0055FF' },
  { num: 2, label: 'Localização & Lifestyle', desc: 'Praia, qualidade de vida, status',        color: '#7C3AED' },
  { num: 3, label: 'Gestão Profissional',     desc: 'Tranquilidade, tecnologia, resultados',  color: '#059669' },
]

// ── Reusable inline counter ──────────────────────────────────────────────────
function Counter({
  label, sublabel, value, min, max, color,
  onDecrement, onIncrement,
}: {
  label: string; sublabel?: string; value: number; min: number; max: number; color: string
  onDecrement: () => void; onIncrement: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{label}</span>
        {sublabel && <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: 'var(--muted-foreground)' }}>{sublabel}</span>}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onDecrement() }}
          disabled={value <= min}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ backgroundColor: value <= min ? 'var(--secondary)' : color, color: value <= min ? 'var(--muted-foreground)' : '#fff', border: 'none', cursor: value <= min ? 'not-allowed' : 'pointer', opacity: value <= min ? 0.4 : 1 }}
        >
          <Minus size={13} />
        </button>
        <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--foreground)', minWidth: 28, textAlign: 'center' }}>
          {value}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onIncrement() }}
          disabled={value >= max}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ backgroundColor: value >= max ? 'var(--secondary)' : color, color: value >= max ? 'var(--muted-foreground)' : '#fff', border: 'none', cursor: value >= max ? 'not-allowed' : 'pointer', opacity: value >= max ? 0.4 : 1 }}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

export function ParametrosForm() {
  const campaignName          = useCampanhaStore((s) => s.campaignName)
  const estruturasCount       = useCampanhaStore((s) => s.estruturasCount)
  const variacoesCount        = useCampanhaStore((s) => s.variacoesCount)
  const incluirImagens        = useCampanhaStore((s) => s.incluirImagens)
  const incluirNarrado        = useCampanhaStore((s) => s.incluirNarrado)
  const incluirApresentadora  = useCampanhaStore((s) => s.incluirApresentadora)
  const narradoCount          = useCampanhaStore((s) => s.narradoCount)
  const apresentadoraCount    = useCampanhaStore((s) => s.apresentadoraCount)
  const parsedBriefing        = useCampanhaStore((s) => s.parsedBriefing)

  const setCampaignName         = useCampanhaStore((s) => s.setCampaignName)
  const setEstruturasCount      = useCampanhaStore((s) => s.setEstruturasCount)
  const setVariacoesCount       = useCampanhaStore((s) => s.setVariacoesCount)
  const setIncluirImagens       = useCampanhaStore((s) => s.setIncluirImagens)
  const setIncluirNarrado       = useCampanhaStore((s) => s.setIncluirNarrado)
  const setIncluirApresentadora = useCampanhaStore((s) => s.setIncluirApresentadora)
  const setNarradoCount         = useCampanhaStore((s) => s.setNarradoCount)
  const setApresentadoraCount   = useCampanhaStore((s) => s.setApresentadoraCount)
  const setStep                 = useCampanhaStore((s) => s.setStep)
  const setCopyVariations       = useCampanhaStore((s) => s.setCopyVariations)

  const [generatingCopies, setGeneratingCopies] = useState(false)
  const [copyError, setCopyError]               = useState<string | null>(null)

  const totalImagens       = estruturasCount * variacoesCount * 2
  const totalNarrado       = estruturasCount * narradoCount
  const totalApresentadora = apresentadoraCount
  const totalPecas = (incluirImagens ? totalImagens : 0) + (incluirApresentadora ? totalApresentadora : 0) + (incluirNarrado ? totalNarrado : 0)

  const handleGenerateCopies = async () => {
    setGeneratingCopies(true)
    setCopyError(null)
    try {
      const state = useCampanhaStore.getState()
      const res = await fetch('/api/campanha/generate-copies-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefing: state.parsedBriefing,
          campaignName: state.campaignName,
          estruturasCount: state.estruturasCount,
          variacoesCount: state.variacoesCount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar copies')
      const copies: CopyVariation[] = data.copies ?? []
      setCopyVariations(copies)
      setStep('editarCopies')
    } catch (err) {
      setCopyError(String(err))
    }
    setGeneratingCopies(false)
  }

  // ── Shared estrutura/variação section (reused in multiple toggles) ──────────
  const EstruturasVariacoes = ({ accentColor }: { accentColor: string }) => (
    <div className="flex flex-col gap-4">
      {/* Counters row */}
      <div className="grid grid-cols-2 gap-6">
        <Counter
          label="Estruturas"
          sublabel="Ângulos de comunicação"
          value={estruturasCount} min={1} max={3} color={accentColor}
          onDecrement={() => setEstruturasCount(estruturasCount - 1)}
          onIncrement={() => setEstruturasCount(estruturasCount + 1)}
        />
        <Counter
          label="Variações"
          sublabel="Por estrutura"
          value={variacoesCount} min={1} max={5} color={accentColor}
          onDecrement={() => setVariacoesCount(variacoesCount - 1)}
          onIncrement={() => setVariacoesCount(variacoesCount + 1)}
        />
      </div>

      {/* Estrutura cards */}
      <div className="flex flex-col gap-1.5">
        {ESTRUTURA_DEFS.map((e) => {
          const isActive = e.num <= estruturasCount
          return (
            <button
              key={e.num}
              onClick={(ev) => { ev.stopPropagation(); setEstruturasCount(isActive && e.num === estruturasCount ? e.num - 1 : e.num) }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
              style={{
                backgroundColor: isActive ? `${e.color}0f` : 'var(--background)',
                border: isActive ? `1.5px solid ${e.color}40` : '1px solid var(--border)',
                opacity: isActive ? 1 : 0.45,
                cursor: 'pointer',
              }}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isActive ? e.color : 'var(--border)', color: isActive ? '#fff' : 'var(--muted-foreground)', fontSize: 10, fontWeight: 700, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                {e.num}
              </span>
              <div className="flex flex-col gap-0 flex-1">
                <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{e.label}</span>
                <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: 'var(--muted-foreground)' }}>{e.desc}</span>
              </div>
              {isActive && (
                <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: e.color, fontWeight: 600, flexShrink: 0 }}>
                  {variacoesCount} variação{variacoesCount !== 1 ? 'ões' : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* Briefing summary */}
      {parsedBriefing && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1.5px solid rgba(0,85,255,0.2)' }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(0,85,255,0.06)', borderBottom: '1px solid rgba(0,85,255,0.1)' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--primary)' }} />
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
              Briefing analisado — {parsedBriefing.produto}
            </span>
            <button onClick={() => setStep('briefing')} style={{ marginLeft: 'auto', backgroundColor: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12 }}>
              Editar
            </button>
          </div>
          {(parsedBriefing.rendaMensal || parsedBriefing.valorInvestimento || parsedBriefing.roi) && (
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              {parsedBriefing.valorInvestimento && <FinancialCard icon={<DollarSign size={14} />} label="Investimento" value={parsedBriefing.valorInvestimento} />}
              {parsedBriefing.rendaMensal && <FinancialCard icon={<DollarSign size={14} />} label="Renda/mês" value={parsedBriefing.rendaMensal} />}
              {parsedBriefing.roi && <FinancialCard icon={<DollarSign size={14} />} label="ROI" value={parsedBriefing.roi} />}
              {parsedBriefing.localizacao && (
                <div className="col-span-3 flex items-center gap-1.5">
                  <MapPin size={12} style={{ color: 'var(--muted-foreground)' }} />
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: 'var(--muted-foreground)' }}>{parsedBriefing.localizacao}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Nome da campanha */}
      <div className="p-6 rounded-2xl flex flex-col gap-3" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <label style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)' }}>Nome da campanha</label>
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="Ex: Novo Campeche SPOT II"
          className="w-full px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14 }}
        />
      </div>

      {/* Conteúdo a gerar */}
      <div className="p-6 rounded-2xl flex flex-col gap-3" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>Conteúdo a gerar</span>

        {/* ── Imagens estáticas ── */}
        <ToggleOption
          icon={<LayoutGrid size={16} />}
          label="Imagens estáticas"
          sublabel={incluirImagens
            ? `${totalImagens} peças · ${estruturasCount * variacoesCount} Feed 4:5 + ${estruturasCount * variacoesCount} Story 9:16`
            : 'Feed 4:5 e Story 9:16 com IA'}
          badge="Nanobanana"
          badgeColor="#0055FF"
          active={incluirImagens}
          onToggle={() => setIncluirImagens(!incluirImagens)}
        >
          <EstruturasVariacoes accentColor="#0055FF" />
          <div className="flex gap-2 flex-wrap">
            <FormatBadge icon={<LayoutGrid size={11} />} label={`${estruturasCount * variacoesCount} × Feed 4:5`} />
            <FormatBadge icon={<Smartphone size={11} />} label={`${estruturasCount * variacoesCount} × Story 9:16`} />
          </div>
        </ToggleOption>

        {/* ── Vídeo Apresentadora ── */}
        <ToggleOption
          icon={<User size={16} />}
          label="Vídeo Apresentadora"
          sublabel={incluirApresentadora
            ? `${totalApresentadora} vídeo${totalApresentadora > 1 ? 's' : ''} · apresentadora Seazone em cena`
            : 'Apresentadora Seazone em cena com locução'}
          badge="Freepik Kling"
          badgeColor="#7C3AED"
          active={incluirApresentadora}
          onToggle={() => setIncluirApresentadora(!incluirApresentadora)}
        >
          <div className="grid grid-cols-2 gap-6">
            <Counter
              label="Estruturas"
              sublabel="Ângulos de comunicação"
              value={estruturasCount} min={1} max={3} color="#7C3AED"
              onDecrement={() => setEstruturasCount(estruturasCount - 1)}
              onIncrement={() => setEstruturasCount(estruturasCount + 1)}
            />
            <Counter
              label="Quantidade"
              sublabel={`Vídeos (máx. ${estruturasCount})`}
              value={apresentadoraCount} min={1} max={estruturasCount} color="#7C3AED"
              onDecrement={() => setApresentadoraCount(apresentadoraCount - 1)}
              onIncrement={() => setApresentadoraCount(apresentadoraCount + 1)}
            />
          </div>
          {/* Estrutura cards */}
          <div className="flex flex-col gap-1.5">
            {ESTRUTURA_DEFS.map((e) => {
              const isActive = e.num <= estruturasCount
              const hasVideo = e.num <= apresentadoraCount
              return (
                <div
                  key={e.num}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: isActive ? 'rgba(124,58,237,0.06)' : 'var(--background)', border: isActive ? '1.5px solid rgba(124,58,237,0.2)' : '1px solid var(--border)', opacity: isActive ? 1 : 0.4 }}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isActive ? '#7C3AED' : 'var(--border)', color: isActive ? '#fff' : 'var(--muted-foreground)', fontSize: 10, fontWeight: 700, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                    {e.num}
                  </span>
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)', flex: 1 }}>{e.label}</span>
                  {isActive && (
                    <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: hasVideo ? '#7C3AED' : 'var(--muted-foreground)', fontWeight: hasVideo ? 600 : 400, flexShrink: 0 }}>
                      {hasVideo ? '1 vídeo' : 'sem vídeo'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </ToggleOption>

        {/* ── Vídeo Narrado ── */}
        <ToggleOption
          icon={<Video size={16} />}
          label="Vídeo Narrado"
          sublabel={incluirNarrado
            ? `${totalNarrado} vídeo${totalNarrado > 1 ? 's' : ''} · locução + imagens dos empreendimentos`
            : 'Locução com voz da apresentadora + imagens dos empreendimentos'}
          badge="Freepik Kling"
          badgeColor="#059669"
          active={incluirNarrado}
          onToggle={() => setIncluirNarrado(!incluirNarrado)}
        >
          <div className="grid grid-cols-2 gap-6">
            <Counter
              label="Estruturas"
              sublabel="Ângulos de comunicação"
              value={estruturasCount} min={1} max={3} color="#059669"
              onDecrement={() => setEstruturasCount(estruturasCount - 1)}
              onIncrement={() => setEstruturasCount(estruturasCount + 1)}
            />
            <Counter
              label="Variações"
              sublabel="Vídeos por estrutura"
              value={narradoCount} min={1} max={variacoesCount} color="#059669"
              onDecrement={() => setNarradoCount(narradoCount - 1)}
              onIncrement={() => setNarradoCount(narradoCount + 1)}
            />
          </div>
          {/* Estrutura cards */}
          <div className="flex flex-col gap-1.5">
            {ESTRUTURA_DEFS.map((e) => {
              const isActive = e.num <= estruturasCount
              return (
                <div
                  key={e.num}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: isActive ? 'rgba(5,150,105,0.06)' : 'var(--background)', border: isActive ? '1.5px solid rgba(5,150,105,0.2)' : '1px solid var(--border)', opacity: isActive ? 1 : 0.4 }}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isActive ? '#059669' : 'var(--border)', color: isActive ? '#fff' : 'var(--muted-foreground)', fontSize: 10, fontWeight: 700, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                    {e.num}
                  </span>
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)', flex: 1 }}>{e.label}</span>
                  {isActive && (
                    <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: '#059669', fontWeight: 600, flexShrink: 0 }}>
                      {narradoCount} vídeo{narradoCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </ToggleOption>
      </div>

      {/* Resumo + gerar */}
      <div className="p-6 rounded-2xl flex flex-col gap-4" style={{ background: 'linear-gradient(135deg, rgba(0,85,255,0.06) 0%, transparent 100%)', border: '1px solid rgba(0,85,255,0.15)' }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>Resumo da geração</span>
          <span className="px-3 py-1 rounded-full" style={{ backgroundColor: totalPecas > 0 ? 'var(--primary)' : 'var(--secondary)', color: totalPecas > 0 ? '#fff' : 'var(--muted-foreground)', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, fontWeight: 600 }}>
            {totalPecas} peças
          </span>
        </div>
        {totalPecas === 0 ? (
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: 'var(--muted-foreground)' }}>
            Selecione pelo menos um tipo de conteúdo acima
          </span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {incluirImagens && <SummaryBadge label={`${totalImagens} imagens`} />}
            {incluirApresentadora && <SummaryBadge label={`${totalApresentadora} vídeo${totalApresentadora > 1 ? 's' : ''} apresentadora`} color="rgba(124,58,237,0.1)" textColor="#7C3AED" />}
            {incluirNarrado && <SummaryBadge label={`${totalNarrado} vídeo${totalNarrado > 1 ? 's' : ''} narrado${totalNarrado > 1 ? 's' : ''}`} color="rgba(5,150,105,0.1)" textColor="#059669" />}
          </div>
        )}
        {copyError && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: '#EF4444' }}>{copyError}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setStep('assets')} className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all active:scale-95" style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, cursor: 'pointer' }}>
            <ChevronLeft size={15} /> Voltar
          </button>
          <button
            onClick={handleGenerateCopies}
            disabled={generatingCopies || totalPecas === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all hover:opacity-90 active:scale-95"
            style={{ background: (generatingCopies || totalPecas === 0) ? 'var(--muted)' : 'linear-gradient(135deg, var(--primary) 0%, #1C398E 100%)', color: '#fff', border: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 700, cursor: (generatingCopies || totalPecas === 0) ? 'not-allowed' : 'pointer' }}
          >
            {generatingCopies ? <Loader2 size={17} className="animate-spin" /> : <Zap size={17} />}
            {generatingCopies ? 'Gerando copies com IA...' : 'Gerar copies com IA'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FinancialCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(0,85,255,0.04)', border: '1px solid rgba(0,85,255,0.1)' }}>
      <div className="flex items-center gap-1" style={{ color: 'var(--primary)' }}>{icon}<span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 10, color: 'var(--muted-foreground)' }}>{label}</span></div>
      <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{value}</span>
    </div>
  )
}

function FormatBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}>
      {icon}
      <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11 }}>{label}</span>
    </span>
  )
}

function ToggleOption({
  icon, label, sublabel, badge, badgeColor, active, onToggle, children,
}: {
  icon: React.ReactNode; label: string; sublabel: string; badge: string
  badgeColor: string; active: boolean; onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden transition-all"
      style={{
        backgroundColor: active ? `${badgeColor}0a` : 'var(--secondary)',
        border: active ? `1.5px solid ${badgeColor}35` : '1px solid var(--border)',
      }}
    >
      {/* Toggle header row */}
      <button
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-3 w-full text-left"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <span
          className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ backgroundColor: active ? badgeColor : 'var(--border)', color: active ? '#fff' : 'var(--muted-foreground)' }}
        >
          {icon}
        </span>
        <div className="flex flex-col gap-0.5 flex-1">
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: active ? 600 : 400, color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
              {label}
            </span>
            <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${badgeColor}1a`, color: badgeColor, fontSize: 10, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              {badge}
            </span>
          </div>
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: 'var(--muted-foreground)' }}>
            {sublabel}
          </span>
        </div>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: active ? badgeColor : 'transparent', border: active ? 'none' : '2px solid var(--border)' }}
        >
          {active && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
        </div>
      </button>

      {/* Expanded content — rendered when active and children provided */}
      {active && children && (
        <div
          className="flex flex-col gap-4 px-4 pb-4"
          style={{ borderTop: `1px solid ${badgeColor}20` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ height: 8 }} />
          {children}
        </div>
      )}
    </div>
  )
}

function SummaryBadge({ label, color = 'var(--secondary)', textColor = 'var(--secondary-foreground)' }: { label: string; color?: string; textColor?: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: color, color: textColor, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12 }}>
      {label}
    </span>
  )
}
