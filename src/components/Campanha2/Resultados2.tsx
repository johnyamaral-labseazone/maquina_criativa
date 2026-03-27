import { useState } from 'react'
import { useCampanha2Store } from '../../stores/campanha2Store'
import type { DesignerCreative, VideoOutput } from '../../stores/campanha2Store'
import { useHistory2Store } from '../../stores/history2Store'
import { CheckCircle2, AlertCircle, RotateCcw, Play, ArrowLeft, Save, Download, Film, X, AlertTriangle } from 'lucide-react'
import { CreativeCard2 } from './CreativeCard2'

export default function Resultados2() {
  const state = useCampanha2Store()
  const { atendimento, redator, designer, videoMaker, diretorArte, setStep, campaignName, restartWithFeedback } = state
  const { save } = useHistory2Store()
  const [saved, setSaved] = useState(false)

  const review = diretorArte.review
  const images = designer.creatives.filter(c => c.status === 'done')
  const videos = videoMaker.videos.filter(v => v.status === 'done' || v.videoUrl)

  // Preview modal state
  const [previewImage, setPreviewImage] = useState<DesignerCreative | null>(null)
  const [previewVideo, setPreviewVideo] = useState<VideoOutput | null>(null)

  // Restart confirmation state
  const [confirmingRestart, setConfirmingRestart] = useState(false)

  const handleSave = () => {
    const snap = {
      id: `camp-${Date.now()}`,
      date: new Date().toLocaleString('pt-BR'),
      name: campaignName || atendimento.result?.produto || 'Campanha',
      produto: atendimento.result?.produto ?? '',
      thumbnails: images.slice(0, 3).map(c => c.imageDataUrl).filter(Boolean),
      imagesCount: images.length,
      videosCount: videos.length,
      copiesCount: redator.copies?.length ?? 0,
      copies: redator.copies ?? [],
      creatives: designer.creatives,
      videos: videoMaker.videos,
      review,
      legendas: redator.legendas,
    }
    save(snap)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const downloadVideo = (url: string, id: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `${id}.mp4`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const estruturas = [...new Set(images.map(c => c.estrutura))].sort()

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <h2 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 700 }}>Resultados</h2>
          {(campaignName || atendimento.result?.produto) && (
            <span className="body-small" style={{ color: 'var(--muted-foreground)' }}>
              {campaignName || atendimento.result?.produto}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep('parametros')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 12 }}
          >
            <ArrowLeft size={13} /> Nova campanha
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all hover:opacity-90"
            style={{
              backgroundColor: saved ? '#5EA500' : '#0055FF',
              color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            <Save size={13} />
            {saved ? 'Salvo!' : 'Salvar no histórico'}
          </button>
        </div>
      </div>

      {/* Director's verdict */}
      {review && (
        <div
          className="flex flex-col gap-4 p-5 rounded-2xl"
          style={{
            border: `1.5px solid ${review.aprovado ? 'rgba(94,165,0,0.3)' : 'rgba(239,68,68,0.3)'}`,
            background: review.aprovado
              ? 'linear-gradient(135deg, rgba(94,165,0,0.05), transparent)'
              : 'linear-gradient(135deg, rgba(239,68,68,0.05), transparent)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {review.aprovado
                ? <CheckCircle2 size={22} style={{ color: '#5EA500', flexShrink: 0 }} />
                : <AlertCircle size={22} style={{ color: '#EF4444', flexShrink: 0 }} />
              }
              <div>
                <p style={{ color: review.aprovado ? '#5EA500' : '#EF4444', fontWeight: 700, fontSize: 14, margin: 0 }}>
                  {review.aprovado ? 'Campanha aprovada pelo Diretor de Arte' : 'Campanha com ajustes recomendados'}
                </p>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 12, margin: '2px 0 0' }}>{review.relatorio}</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl flex-shrink-0" style={{ backgroundColor: review.aprovado ? 'rgba(94,165,0,0.1)' : 'rgba(239,68,68,0.1)' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: review.aprovado ? '#5EA500' : '#EF4444' }}>{review.score}</span>
              <span style={{ fontSize: 9, color: 'var(--muted-foreground)' }}>/100</span>
            </div>
          </div>

          {review.pontos.length > 0 && (
            <div className="flex flex-col gap-1">
              {review.pontos.map((p, i) => (
                <div key={i} className="flex gap-2" style={{ fontSize: 12, color: 'var(--foreground)' }}>
                  <span style={{ color: '#5EA500', flexShrink: 0 }}>✓</span> {p}
                </div>
              ))}
            </div>
          )}

          {review.problemas.length > 0 && (
            <div className="flex flex-col gap-2">
              {review.problemas.map((p, i) => (
                <div key={i} className="flex gap-2" style={{ fontSize: 12, color: 'var(--foreground)' }}>
                  <span style={{ color: '#EF4444', flexShrink: 0 }}>✗</span> {p}
                </div>
              ))}
            </div>
          )}

          {/* Restart option — only shown when score < 70 */}
          {review.score < 70 && !confirmingRestart && (
            <button
              onClick={() => setConfirmingRestart(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl self-start"
              style={{ backgroundColor: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              <RotateCcw size={12} /> Reiniciar com correções (nota {review.score}/100)
            </button>
          )}

          {/* Human authorization confirmation */}
          {review.score < 70 && confirmingRestart && (
            <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.3)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>Autorização necessária para reiniciar</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>
                Isso irá regenerar <strong>todas as imagens, vídeos e copies</strong> incorporando os {review.problemas.length} problema(s) identificado(s) pelo Diretor de Arte. A campanha atual será substituída.
              </p>
              {review.sugestoes?.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>O que será corrigido</span>
                  {review.sugestoes.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--foreground)' }}>→ {s}</div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setConfirmingRestart(false); restartWithFeedback([...review.problemas, ...(review.sugestoes ?? [])].join('. ')) }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl"
                  style={{ backgroundColor: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                >
                  <RotateCcw size={12} /> Confirmar reinício
                </button>
                <button
                  onClick={() => setConfirmingRestart(false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 12 }}
                >
                  Cancelar
                </button>
              </div>
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

      {/* ── Images gallery — grouped by estrutura ── */}
      {images.length > 0 && (
        <div className="flex flex-col gap-5">
          <h3 style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
            Imagens geradas — {images.length} criativos
          </h3>

          {estruturas.map(e => {
            const eCrs = images.filter(c => c.estrutura === e)
            return (
              <div key={e} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                    Estrutura {e}
                  </span>
                  {atendimento.result && (
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                      — {['Retorno Financeiro', 'Localização e Lifestyle', 'Gestão Profissional'][e - 1] ?? `E${e}`}
                    </span>
                  )}
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
                </div>

                {/* Feed 4:5 */}
                {eCrs.filter(c => c.formato === '4:5').length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase' }}>Feed 4:5</span>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                      {eCrs.filter(c => c.formato === '4:5').map(cr => (
                        <div key={cr.id} className="flex flex-col gap-1.5">
                          <CreativeCard2 creative={cr} copy={cr.copy} compact briefing={atendimento.result} onPreview={() => setPreviewImage(cr)} />
                          <span style={{ fontSize: 10, color: 'var(--muted-foreground)', textAlign: 'center' }}>V{cr.variacao}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Story 9:16 */}
                {eCrs.filter(c => c.formato === '9:16').length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase' }}>Story 9:16</span>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                      {eCrs.filter(c => c.formato === '9:16').map(cr => (
                        <div key={cr.id} className="flex flex-col gap-1.5">
                          <CreativeCard2 creative={cr} copy={cr.copy} compact briefing={atendimento.result} onPreview={() => setPreviewImage(cr)} />
                          <span style={{ fontSize: 10, color: 'var(--muted-foreground)', textAlign: 'center' }}>V{cr.variacao}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Videos ── */}
      {videoMaker.videos.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
            Vídeos gerados — {videos.length} prontos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoMaker.videos.map(v => (
              <div
                key={v.id}
                className="flex flex-col gap-3 p-4 rounded-2xl"
                style={{
                  backgroundColor: 'var(--card)', border: '1px solid var(--border)',
                  opacity: v.status === 'error' ? 0.5 : 1,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: v.tipo === 'narrado' ? '#7C3AED' : '#EA580C' }}
                    >
                      <Film size={14} style={{ color: '#fff' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--foreground)', margin: 0 }}>
                        {v.tipo === 'narrado' ? 'Vídeo Narrado' : 'Vídeo Apresentadora'} — E{v.estrutura}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0 }}>{v.roteiro.titulo}</p>
                    </div>
                  </div>

                  {v.videoUrl ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setPreviewVideo(v)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl"
                        style={{ backgroundColor: '#0891B2', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                      >
                        <Play size={11} /> Ver
                      </button>
                      <button
                        onClick={() => downloadVideo(v.videoUrl, v.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl"
                        style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 11, color: 'var(--foreground)' }}
                      >
                        <Download size={11} /> MP4
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#EF4444' }}>Falhou</span>
                  )}
                </div>

                {/* Video player */}
                {v.videoUrl && (
                  <video
                    src={v.videoUrl}
                    controls
                    style={{ width: '100%', borderRadius: 8, maxHeight: 200, backgroundColor: '#000' }}
                  />
                )}

                {/* Audio player */}
                {v.audioUrl && (
                  <div className="flex flex-col gap-1">
                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', fontWeight: 600 }}>Narração</span>
                    <audio controls src={v.audioUrl} style={{ width: '100%', height: 32 }} />
                  </div>
                )}

                {/* Roteiro */}
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
                  {v.roteiro.roteiro.slice(0, 180)}{v.roteiro.roteiro.length > 180 ? '...' : ''}
                </p>

                {/* Legenda */}
                {v.roteiro.legenda && (
                  <p style={{ fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic', margin: 0 }}>📱 {v.roteiro.legenda}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Copies & Legendas ── */}
      {redator.copies && redator.copies.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>Copies aprovadas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {redator.copies.map((c, i) => (
              <div key={i} className="flex flex-col gap-1.5 p-4 rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#EA580C', textTransform: 'uppercase' }}>E{c.estrutura} · V{c.variacao}</span>
                  {c.edited && <span style={{ fontSize: 9, color: '#EA580C', background: 'rgba(234,88,12,0.1)', padding: '1px 5px', borderRadius: 99 }}>Editado</span>}
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>{c.headline}</p>
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

      {/* ── Image preview modal ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative"
            style={{ maxHeight: '92vh', width: previewImage.formato === '9:16' ? 'auto' : 'min(480px, 90vw)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full"
              style={{ backgroundColor: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
            >
              <X size={15} style={{ color: '#111' }} />
            </button>
            <div style={{ maxHeight: '88vh', overflow: 'hidden', borderRadius: 12 }}>
              <CreativeCard2
                creative={previewImage}
                copy={previewImage.copy}
                compact={false}
                briefing={atendimento.result}
              />
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
              {previewImage.formato === '4:5' ? 'Feed 4:5 — 1080×1350px' : 'Reels 9:16 — 1080×1920px'} · E{previewImage.estrutura} V{previewImage.variacao}
            </p>
          </div>
        </div>
      )}

      {/* ── Video preview modal ── */}
      {previewVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className="flex flex-col gap-3 p-5 rounded-2xl"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground)', margin: 0 }}>
                  {previewVideo.tipo === 'narrado' ? 'Vídeo Narrado' : 'Vídeo Apresentadora'} — E{previewVideo.estrutura}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>{previewVideo.roteiro.titulo}</p>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <X size={15} style={{ color: 'var(--foreground)' }} />
              </button>
            </div>
            <video
              src={previewVideo.videoUrl}
              controls
              autoPlay
              style={{ width: '100%', borderRadius: 8, backgroundColor: '#000' }}
            />
            {previewVideo.audioUrl && (
              <div className="flex flex-col gap-1">
                <span style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', fontWeight: 600 }}>Narração</span>
                <audio controls src={previewVideo.audioUrl} style={{ width: '100%', height: 32 }} />
              </div>
            )}
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>{previewVideo.roteiro.roteiro}</p>
            <button
              onClick={() => downloadVideo(previewVideo.videoUrl, previewVideo.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl self-start"
              style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--foreground)' }}
            >
              <Download size={13} /> Baixar MP4
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
