import { useCampanha2Store } from '../../stores/campanha2Store'
import { CheckCircle2, AlertCircle, Download, RotateCcw, Eye, Play, ArrowLeft } from 'lucide-react'
import { saveAs } from 'file-saver'

export default function Resultados2() {
  const { atendimento, redator, designer, videoMaker, diretorArte, setStep, campaignName, restartWithFeedback } = useCampanha2Store()
  const review = diretorArte.review
  const images = designer.creatives.filter(c => c.status === 'done' && c.imageDataUrl)
  const videos = videoMaker.videos.filter(v => v.status === 'done' && v.videoUrl)

  const downloadImage = (dataUrl: string, name: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = name
    a.click()
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 700 }}>Resultados da campanha</h2>
          {campaignName && <span className="body-small" style={{ color: 'var(--muted-foreground)' }}>{campaignName}</span>}
        </div>
        <button
          onClick={() => setStep('parametros')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 12 }}
        >
          <ArrowLeft size={13} /> Parâmetros
        </button>
      </div>

      {/* Director's verdict */}
      {review && (
        <div
          className="flex flex-col gap-4 p-5 rounded-2xl"
          style={{
            border: `1.5px solid ${review.aprovado ? 'rgba(94,165,0,0.3)' : 'rgba(239,68,68,0.3)'}`,
            background: review.aprovado ? 'linear-gradient(135deg, rgba(94,165,0,0.05), transparent)' : 'linear-gradient(135deg, rgba(239,68,68,0.05), transparent)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {review.aprovado
                ? <CheckCircle2 size={24} style={{ color: '#5EA500', flexShrink: 0 }} />
                : <AlertCircle size={24} style={{ color: '#EF4444', flexShrink: 0 }} />
              }
              <div>
                <h3 style={{ color: review.aprovado ? '#5EA500' : '#EF4444', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
                  {review.aprovado ? 'Campanha aprovada pelo Diretor de Arte' : 'Campanha com ajustes recomendados'}
                </h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: 0 }}>{review.relatorio}</p>
              </div>
            </div>
            <div
              className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl flex-shrink-0"
              style={{ backgroundColor: review.aprovado ? 'rgba(94,165,0,0.1)' : 'rgba(239,68,68,0.1)' }}
            >
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: review.aprovado ? '#5EA500' : '#EF4444' }}>{review.score}</span>
              <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>/ 100</span>
            </div>
          </div>

          {review.pontos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span style={{ fontSize: 11, fontWeight: 700, color: '#5EA500', textTransform: 'uppercase' }}>Pontos positivos</span>
              {review.pontos.map((p, i) => (
                <div key={i} className="flex gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                  <span style={{ color: '#5EA500', flexShrink: 0 }}>✓</span> {p}
                </div>
              ))}
            </div>
          )}

          {!review.aprovado && review.problemas.length > 0 && (
            <div className="flex flex-col gap-2">
              <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>Problemas identificados</span>
              {review.problemas.map((p, i) => (
                <div key={i} className="flex gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                  <span style={{ color: '#EF4444', flexShrink: 0 }}>✗</span> {p}
                </div>
              ))}
              <button
                onClick={() => restartWithFeedback(review.problemas.join('. '))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl mt-2 self-start"
                style={{ backgroundColor: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                <RotateCcw size={12} /> Reiniciar com correções
              </button>
            </div>
          )}

          {review.sugestoes.length > 0 && (
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Sugestões</span>
              {review.sugestoes.map((s, i) => (
                <p key={i} style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>• {s}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Imagens', value: images.length, color: '#7C3AED' },
          { label: 'Vídeos', value: videos.length, color: '#0891B2' },
          { label: 'Copies', value: redator.copies?.length ?? 0, color: '#EA580C' },
        ].map(s => (
          <div key={s.label} className="flex flex-col gap-1 p-4 rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Images gallery */}
      {images.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>Imagens geradas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {images.map(cr => (
              <div key={cr.id} className="flex flex-col gap-2">
                <div
                  className="relative group rounded-xl overflow-hidden"
                  style={{ aspectRatio: cr.formato === '4:5' ? '4/5' : '9/16', border: '1px solid var(--border)' }}
                >
                  <img src={cr.imageDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <button
                      onClick={() => downloadImage(cr.imageDataUrl, `${cr.id}.jpg`)}
                      className="flex items-center justify-center w-8 h-8 rounded-full"
                      style={{ backgroundColor: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground)' }}>E{cr.estrutura} V{cr.variacao}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{cr.formato}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>Vídeos gerados</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map(v => (
              <div key={v.id} className="flex flex-col gap-3 p-4 rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{v.tipo === 'narrado' ? 'Vídeo Narrado' : 'Vídeo Apresentadora'} — E{v.estrutura}</span>
                    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>{v.roteiro.titulo}</p>
                  </div>
                  <a
                    href={v.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                    style={{ backgroundColor: '#0891B2', color: '#fff', textDecoration: 'none', fontSize: 12 }}
                  >
                    <Play size={12} /> Ver vídeo
                  </a>
                </div>
                {v.audioUrl && (
                  <audio controls src={v.audioUrl} style={{ width: '100%', height: 36 }} />
                )}
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>{v.roteiro.roteiro.slice(0, 150)}...</p>
                {v.roteiro.legenda && (
                  <p style={{ fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic', margin: 0 }}>📱 {v.roteiro.legenda}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copies reference */}
      {redator.copies && redator.copies.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>Copies e legendas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {redator.copies.map((c, i) => (
              <div key={i} className="flex flex-col gap-1.5 p-4 rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#EA580C', textTransform: 'uppercase' }}>E{c.estrutura} · V{c.variacao}</span>
                  {c.edited && <span style={{ fontSize: 9, color: '#EA580C', background: 'rgba(234,88,12,0.1)', padding: '1px 6px', borderRadius: 99 }}>Editado</span>}
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{c.headline}</p>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>{c.body}</p>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0055FF' }}>→ {c.cta}</span>
              </div>
            ))}
          </div>
          {redator.legendas.length > 0 && (
            <div className="flex flex-col gap-2 p-4 rounded-2xl" style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Legendas para redes sociais</span>
              {redator.legendas.map((l, i) => (
                <p key={i} style={{ fontSize: 12, color: 'var(--foreground)', margin: 0, padding: '8px 0', borderBottom: i < redator.legendas.length - 1 ? '1px solid var(--border)' : 'none' }}>{l}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
