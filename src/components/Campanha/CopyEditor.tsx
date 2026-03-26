import { useState } from 'react'
import { useCampanhaStore } from '../../stores/campanhaStore'
import type { CopyVariation } from '../../stores/campanhaStore'
import {
  ChevronLeft, ChevronDown, ChevronUp, ArrowRight, Zap, PenLine,
  Type, AlignLeft, MousePointerClick, Film,
} from 'lucide-react'

const ESTRUTURA_LABELS = [
  { num: 1, label: 'Retorno Financeiro',     color: '#0055FF' },
  { num: 2, label: 'Localização & Lifestyle', color: '#7C3AED' },
  { num: 3, label: 'Gestão Profissional',     color: '#059669' },
]

export function CopyEditor() {
  const copyVariations    = useCampanhaStore((s) => s.copyVariations)
  const estruturasCount   = useCampanhaStore((s) => s.estruturasCount)
  const variacoesCount    = useCampanhaStore((s) => s.variacoesCount)
  const updateCopy        = useCampanhaStore((s) => s.updateCopyVariation)
  const setStep           = useCampanhaStore((s) => s.setStep)
  const startGenerating   = useCampanhaStore((s) => s.startGenerating)

  const [expandedE, setExpandedE] = useState<number>(1)

  const handleGenerate = () => {
    startGenerating()
    setStep('gerando')
  }

  const estruturas = Array.from({ length: estruturasCount }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <PenLine size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--foreground)' }}>
            Revisar e editar copies
          </span>
        </div>
        <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: 'var(--muted-foreground)' }}>
          A IA gerou os textos abaixo. Edite headlines, bodys e CTAs antes de gerar as artes finais.
        </span>
      </div>

      {/* Estrutura accordion sections */}
      {estruturas.map((eNum) => {
        const estDef = ESTRUTURA_LABELS[eNum - 1] || ESTRUTURA_LABELS[0]
        const isExpanded = expandedE === eNum
        const variations = copyVariations.filter((c) => c.estrutura === eNum)

        return (
          <div key={eNum} className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${estDef.color}30`, backgroundColor: 'var(--card)' }}>
            {/* Estrutura header — click to expand/collapse */}
            <button
              onClick={() => setExpandedE(isExpanded ? 0 : eNum)}
              className="w-full flex items-center gap-3 px-5 py-4 transition-all"
              style={{ backgroundColor: `${estDef.color}08`, border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: estDef.color, color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                {eNum}
              </span>
              <div className="flex flex-col gap-0 flex-1">
                <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                  Estrutura {eNum}: {estDef.label}
                </span>
                <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: 'var(--muted-foreground)' }}>
                  {variations.length} variação{variations.length !== 1 ? 'ões' : ''}
                </span>
              </div>
              {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronDown size={18} style={{ color: 'var(--muted-foreground)' }} />}
            </button>

            {/* Variations */}
            {isExpanded && (
              <div className="flex flex-col gap-4 p-5">
                {variations.map((cv) => (
                  <CopyCard
                    key={`e${cv.estrutura}v${cv.variacao}`}
                    copy={cv}
                    color={estDef.color}
                    onUpdate={(updates) => updateCopy(cv.estrutura, cv.variacao, updates)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep('parametros')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all active:scale-95"
          style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, cursor: 'pointer' }}
        >
          <ChevronLeft size={15} /> Voltar
        </button>
        <button
          onClick={handleGenerate}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #1C398E 100%)',
            color: '#fff',
            border: 'none',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Zap size={17} />
          Gerar artes com IA
        </button>
      </div>
    </div>
  )
}

function CopyCard({
  copy,
  color,
  onUpdate,
}: {
  copy: CopyVariation
  color: string
  onUpdate: (updates: Partial<CopyVariation>) => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)' }}
    >
      {/* Variation header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}1a`, color, fontSize: 11, fontWeight: 600, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            V{copy.variacao}
          </span>
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: 'var(--muted-foreground)' }}>
            {copy.variacao <= Math.ceil(5 * 0.6) ? 'Longa — Feed + Vídeo 30-40s' : 'Curta — Story + Vídeo 10-20s'}
          </span>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all"
          style={{ backgroundColor: editing ? `${color}15` : 'transparent', border: editing ? `1px solid ${color}30` : '1px solid var(--border)', color: editing ? color : 'var(--muted-foreground)', cursor: 'pointer', fontSize: 11, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          <PenLine size={10} /> {editing ? 'Fechar' : 'Editar'}
        </button>
      </div>

      {editing ? (
        /* Edit mode */
        <div className="flex flex-col gap-3">
          <EditField icon={<Type size={13} />} label="Headline" value={copy.headline} onChange={(v) => onUpdate({ headline: v })} />
          <EditField icon={<AlignLeft size={13} />} label="Body" value={copy.body} onChange={(v) => onUpdate({ body: v })} multiline />
          <EditField icon={<MousePointerClick size={13} />} label="CTA" value={copy.cta} onChange={(v) => onUpdate({ cta: v })} />
          {copy.videoRoteiro && (
            <EditField icon={<Film size={13} />} label="Roteiro vídeo" value={copy.videoRoteiro} onChange={(v) => onUpdate({ videoRoteiro: v })} multiline />
          )}
        </div>
      ) : (
        /* View mode */
        <div className="flex flex-col gap-1.5">
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.3 }}>
            {copy.headline}
          </span>
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
            {copy.body}
          </span>
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color, fontWeight: 600 }}>
            {copy.cta}
          </span>
        </div>
      )}
    </div>
  )
}

function EditField({
  icon,
  label,
  value,
  onChange,
  multiline,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
        {icon}
        <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 500 }}>{label}</span>
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg resize-none"
          style={{
            backgroundColor: 'var(--input)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            outline: 'none',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--input)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            outline: 'none',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 13,
          }}
        />
      )}
    </div>
  )
}
