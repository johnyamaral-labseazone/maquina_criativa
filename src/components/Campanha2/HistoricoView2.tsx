import { useHistory2Store } from '../../stores/history2Store'
import { Clock, Trash2, Image, Film, PenLine, CheckCircle2, AlertCircle, X } from 'lucide-react'

interface Props {
  onClose(): void
}

export function HistoricoView2({ onClose }: Props) {
  const { campaigns, remove, clear } = useHistory2Store()

  return (
    <div
      className="fixed inset-0 flex items-start justify-end z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="h-full overflow-y-auto flex flex-col"
        style={{
          width: 420, maxWidth: '100vw',
          backgroundColor: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0" style={{ backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 1 }}>
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: 'var(--muted-foreground)' }} />
            <span className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Histórico de campanhas</span>
          </div>
          <div className="flex items-center gap-2">
            {campaigns.length > 0 && (
              <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 11 }}>
                Limpar tudo
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 p-4">
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Clock size={32} style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
              <span style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>Nenhuma campanha salva ainda</span>
            </div>
          ) : (
            campaigns.map(c => (
              <div
                key={c.id}
                className="flex flex-col gap-3 p-4 rounded-2xl"
                style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground)' }}>{c.name || c.produto}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{c.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.review && (
                      c.review.aprovado
                        ? <CheckCircle2 size={14} style={{ color: '#5EA500' }} />
                        : <AlertCircle size={14} style={{ color: '#EF4444' }} />
                    )}
                    <button
                      onClick={() => remove(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Thumbnails */}
                {c.thumbnails.length > 0 && (
                  <div className="flex gap-2">
                    {c.thumbnails.slice(0, 3).map((t, i) => (
                      <div key={i} style={{
                        width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
                        backgroundColor: '#0A2060', border: '1px solid var(--border)', flexShrink: 0,
                      }}>
                        <img src={t} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-3">
                  {[
                    { icon: Image, label: `${c.imagesCount} imgs`, color: '#7C3AED' },
                    { icon: Film, label: `${c.videosCount} vídeos`, color: '#0891B2' },
                    { icon: PenLine, label: `${c.copiesCount} copies`, color: '#EA580C' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                      <s.icon size={11} style={{ color: s.color }} />
                      {s.label}
                    </div>
                  ))}
                </div>

                {/* Review score */}
                {c.review && (
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: `${c.review.score}%`, height: 4, borderRadius: 99,
                        backgroundColor: c.review.score >= 80 ? '#5EA500' : c.review.score >= 60 ? '#EA580C' : '#EF4444',
                        transition: 'width 0.6s',
                      }}
                    />
                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)', flexShrink: 0 }}>{c.review.score}/100</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
