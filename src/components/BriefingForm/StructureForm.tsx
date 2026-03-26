import { useBriefingStore } from '../../stores/StoreContext'
import { VariationForm } from './VariationForm'
import { Trash2, Plus, X, Sparkles, Hash } from 'lucide-react'

interface Props {
  estruturaIndex: number
}

export function StructureForm({ estruturaIndex }: Props) {
  const estrutura = useBriefingStore((s) => s.briefing.estruturas[estruturaIndex])
  const updateEstrutura = useBriefingStore((s) => s.updateEstrutura)
  const removeEstrutura = useBriefingStore((s) => s.removeEstrutura)
  const addVariacao = useBriefingStore((s) => s.addVariacao)
  const removeVariacao = useBriefingStore((s) => s.removeVariacao)
  const addPontoForte = useBriefingStore((s) => s.addPontoForte)
  const removePontoForte = useBriefingStore((s) => s.removePontoForte)
  const totalEstruturas = useBriefingStore((s) => s.briefing.estruturas.length)

  if (!estrutura) return null

  return (
    <div
      className="rounded-xl overflow-hidden hover-lift"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        boxShadow: 'var(--elevation-sm)',
      }}
    >
      {/* Card header with subtle gradient */}
      <div
        className="px-5 md:px-6 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, var(--cores-azul-50) 0%, rgba(0,85,255,0.03) 100%)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            <Hash size={14} />
          </span>
          <h3 style={{ margin: 0 }}>Estrutura {estruturaIndex + 1}</h3>
        </div>
        {totalEstruturas > 1 && (
          <button
            type="button"
            onClick={() => removeEstrutura(estruturaIndex)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95"
            style={{
              backgroundColor: 'rgba(231,0,11,0.06)',
              color: 'var(--destructive)',
              border: 'none',
            }}
          >
            <Trash2 size={13} />
            <span className="detail-medium">Remover</span>
          </button>
        )}
      </div>

      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="body flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
              Hipótese
            </label>
            <input
              type="text"
              value={estrutura.nome}
              onChange={(e) => updateEstrutura(estruturaIndex, { nome: e.target.value })}
              placeholder="Ex: Fachada"
              className="w-full px-4 py-2.5 mt-1 outline-none transition-all focus-ring"
              style={{
                backgroundColor: 'var(--input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--foreground)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label className="body" style={{ color: 'var(--foreground)' }}>Pontos fortes</label>
            <div className="flex flex-wrap gap-2 mt-1.5 mb-2">
              {estrutura.pontosFortes.map((ponto, pi) => (
                <span
                  key={pi}
                  className="detail-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 animate-scale-in"
                  style={{
                    backgroundColor: 'var(--secondary)',
                    color: 'var(--primary)',
                  }}
                >
                  {ponto}
                  <button
                    type="button"
                    onClick={() => removePontoForte(estruturaIndex, pi)}
                    className="w-4 h-4 flex items-center justify-center rounded-full transition-all"
                    style={{
                      color: 'var(--primary)',
                      border: 'none',
                      background: 'rgba(0,85,255,0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Digite e pressione Enter (ex: F, L, Re, T)"
              className="w-full px-4 py-2.5 outline-none transition-all focus-ring"
              style={{
                backgroundColor: 'var(--input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--foreground)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const input = e.currentTarget
                  const value = input.value.trim()
                  if (value) {
                    addPontoForte(estruturaIndex, value)
                    input.value = ''
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="body" style={{ color: 'var(--muted-foreground)' }}>
            {estrutura.variacoes.length} variação(ões)
          </span>
        </div>

        <div className="flex flex-col gap-3 stagger-children">
          {estrutura.variacoes.map((_, vi) => (
            <div key={estrutura.variacoes[vi].id} className="relative group">
              <VariationForm estruturaIndex={estruturaIndex} variacaoIndex={vi} />
              {estrutura.variacoes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVariacao(estruturaIndex, vi)}
                  className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                  style={{
                    backgroundColor: 'rgba(231,0,11,0.06)',
                    color: 'var(--destructive)',
                    border: 'none',
                  }}
                >
                  <X size={12} />
                  <span className="detail-regular">Remover</span>
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => addVariacao(estruturaIndex)}
          className="mt-4 w-full py-2.5 rounded-full transition-all active:scale-95 hover-glow flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--muted-foreground)',
            border: '2px dashed var(--border)',
          }}
        >
          <Plus size={16} />
          <span className="body">Adicionar variação</span>
        </button>
      </div>
    </div>
  )
}
