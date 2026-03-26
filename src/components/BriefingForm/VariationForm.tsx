import { useBriefingStore } from '../../stores/StoreContext'
import { Type, AlignLeft, Plus, X } from 'lucide-react'

interface Props {
  estruturaIndex: number
  variacaoIndex: number
}

export function VariationForm({ estruturaIndex, variacaoIndex }: Props) {
  const variacao = useBriefingStore(
    (s) => s.briefing.estruturas[estruturaIndex]?.variacoes[variacaoIndex]
  )
  const updateVariacao = useBriefingStore((s) => s.updateVariacao)
  const addTextoFixo = useBriefingStore((s) => s.addTextoFixo)
  const removeTextoFixo = useBriefingStore((s) => s.removeTextoFixo)

  if (!variacao) return null

  return (
    <div
      className="p-4 transition-all hover-glow"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--background)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-6 h-6 flex items-center justify-center rounded-full"
          style={{
            backgroundColor: 'rgba(0,85,255,0.08)',
            color: 'var(--primary)',
          }}
        >
          <span className="detail-medium">{variacaoIndex + 1}</span>
        </span>
        <h4 style={{ color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Variação {variacaoIndex + 1}
        </h4>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="body flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
            <Type size={13} style={{ color: 'var(--primary)' }} />
            Frase de destaque
          </label>
          <input
            type="text"
            value={variacao.fraseDestaque}
            onChange={(e) =>
              updateVariacao(estruturaIndex, variacaoIndex, { fraseDestaque: e.target.value })
            }
            placeholder="Ex: R$ 4.190+ líquidos por mês*"
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
          <div className="flex items-center justify-between mb-1">
            <label className="body flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
              <AlignLeft size={13} style={{ color: 'var(--primary)' }} />
              Textos fixos
            </label>
            <button
              type="button"
              onClick={() => addTextoFixo(estruturaIndex, variacaoIndex)}
              className="rounded-full px-3 py-1 transition-all active:scale-95 flex items-center gap-1"
              style={{
                backgroundColor: 'rgba(0,85,255,0.06)',
                color: 'var(--primary)',
                border: 'none',
              }}
            >
              <Plus size={13} />
              <span className="detail-medium">Adicionar texto</span>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {variacao.textosFixos.map((texto, ti) => (
              <div key={ti} className="flex gap-2 animate-fade-in">
                <input
                  type="text"
                  value={texto}
                  onChange={(e) => {
                    const newTextos = [...variacao.textosFixos]
                    newTextos[ti] = e.target.value
                    updateVariacao(estruturaIndex, variacaoIndex, { textosFixos: newTextos })
                  }}
                  placeholder="Texto fixo da peça..."
                  className="flex-1 px-4 py-2.5 outline-none transition-all focus-ring"
                  style={{
                    backgroundColor: 'var(--input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--foreground)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
                {variacao.textosFixos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTextoFixo(estruturaIndex, variacaoIndex, ti)}
                    className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--destructive)',
                      border: '1px solid rgba(231,0,11,0.15)',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
