import { useBriefingStore } from '../../stores/StoreContext'
import { StructureForm } from './StructureForm'
import { Plus, ArrowRight, Layers, LayoutGrid, Puzzle } from 'lucide-react'

export function BriefingForm() {
  const estruturas = useBriefingStore((s) => s.briefing.estruturas)
  const addEstrutura = useBriefingStore((s) => s.addEstrutura)
  const setStep = useBriefingStore((s) => s.setStep)

  const totalVariacoes = estruturas.reduce((sum, e) => sum + e.variacoes.length, 0)
  const totalPecas = totalVariacoes * 2

  return (
    <div className="flex flex-col gap-6">
      {/* Header with stats */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2>Briefing</h2>
          <span className="subtle-regular" style={{ color: 'var(--muted-foreground)' }}>
            Defina as estruturas, variações e textos dos criativos
          </span>
        </div>

        <div className="flex gap-3">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ backgroundColor: 'var(--secondary)' }}
          >
            <Layers size={14} style={{ color: 'var(--primary)' }} />
            <span className="detail-medium" style={{ color: 'var(--primary)' }}>
              {estruturas.length} estrutura(s)
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ backgroundColor: 'var(--secondary)' }}
          >
            <LayoutGrid size={14} style={{ color: 'var(--primary)' }} />
            <span className="detail-medium" style={{ color: 'var(--primary)' }}>
              {totalVariacoes} variações
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ backgroundColor: 'var(--secondary)' }}
          >
            <Puzzle size={14} style={{ color: 'var(--primary)' }} />
            <span className="detail-medium" style={{ color: 'var(--primary)' }}>
              {totalPecas} peças
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 stagger-children">
        {estruturas.map((e, i) => (
          <StructureForm key={e.id} estruturaIndex={i} />
        ))}
      </div>

      <button
        type="button"
        onClick={addEstrutura}
        className="group w-full py-4 rounded-full transition-all active:scale-95 hover-glow"
        style={{
          backgroundColor: 'transparent',
          color: 'var(--muted-foreground)',
          border: '2px dashed var(--border)',
        }}
      >
        <span className="p-ui-medium flex items-center justify-center gap-2">
          <Plus size={18} />
          Adicionar estrutura
        </span>
      </button>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full transition-all hover:opacity-90 active:scale-95 hover-lift"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
          }}
        >
          <span className="p-ui">Próximo: Assets</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
