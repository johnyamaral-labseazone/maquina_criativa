import { useBriefingStore } from '../../stores/StoreContext'
import { FormatSelector } from './FormatSelector'
import { SafeZoneOverlay } from './SafeZoneOverlay'
import { CreativeCanvas } from './CreativeCanvas'
import { ArrowLeft, ArrowRight, MousePointerClick, Info, ImageIcon } from 'lucide-react'

const DIMENSIONS = {
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
}

const PREVIEW_SCALE = 0.32

export function CreativePreview() {
  const briefing = useBriefingStore((s) => s.briefing)
  const formato = useBriefingStore((s) => s.formato)
  const safeZone = useBriefingStore((s) => s.safeZone)
  const estruturas = useBriefingStore((s) => s.briefing.estruturas)
  const selectedEstrutura = useBriefingStore((s) => s.selectedEstrutura)
  const selectedVariacao = useBriefingStore((s) => s.selectedVariacao)
  const setSelectedEstrutura = useBriefingStore((s) => s.setSelectedEstrutura)
  const setSelectedVariacao = useBriefingStore((s) => s.setSelectedVariacao)
  const setVariacaoBackground = useBriefingStore((s) => s.setVariacaoBackground)
  const updateVariacao = useBriefingStore((s) => s.updateVariacao)
  const setStep = useBriefingStore((s) => s.setStep)

  const estrutura = estruturas[selectedEstrutura]
  const variacao = estrutura?.variacoes[selectedVariacao]
  const dim = DIMENSIONS[formato]

  if (!estrutura || !variacao) {
    return (
      <div className="text-center py-16 rounded-xl animate-fade-in"
        style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)' }}>
        <Info size={40} className="mx-auto mb-3" style={{ color: 'var(--muted-foreground)' }} />
        <span className="body block" style={{ color: 'var(--muted-foreground)' }}>Preencha o briefing primeiro</span>
        <button onClick={() => setStep(0)}
          className="mt-4 px-6 py-2.5 rounded-full transition-all hover:opacity-90 active:scale-95 hover-lift"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none' }}>
          <span className="body">Ir para Briefing</span>
        </button>
      </div>
    )
  }

  const bgImages = briefing.backgroundImages
  const hasBgImages = bgImages.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2>Preview</h2>
      </div>

      {/* Navigation */}
      <div className="flex gap-6 flex-wrap p-4 rounded-xl"
        style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)' }}>

        {/* Formato — primeiro */}
        <div>
          <span className="detail-medium block mb-2" style={{ color: 'var(--muted-foreground)' }}>Formato</span>
          <FormatSelector />
        </div>

        <div className="w-px self-stretch" style={{ backgroundColor: 'var(--border)' }} />

        <div>
          <span className="detail-medium block mb-2" style={{ color: 'var(--muted-foreground)' }}>Estrutura</span>
          <div className="flex gap-1.5 flex-wrap">
            {estruturas.map((e, i) => (
              <button key={e.id} onClick={() => setSelectedEstrutura(i)}
                className="px-4 py-1.5 rounded-full transition-all active:scale-95 hover-lift"
                style={{
                  backgroundColor: i === selectedEstrutura ? 'var(--primary)' : 'var(--card)',
                  color: i === selectedEstrutura ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  border: i === selectedEstrutura ? 'none' : '1px solid var(--border)',
                  boxShadow: i === selectedEstrutura ? '0 2px 8px rgba(0,85,255,0.3)' : 'none',
                }}>
                <span className="body">{e.nome || `E${i + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="detail-medium block mb-2" style={{ color: 'var(--muted-foreground)' }}>Variação</span>
          <div className="flex gap-1.5">
            {estrutura.variacoes.map((v, i) => (
              <button key={v.id} onClick={() => setSelectedVariacao(i)}
                className="w-9 h-9 rounded-full transition-all active:scale-95 hover-lift"
                style={{
                  backgroundColor: i === selectedVariacao ? 'var(--primary)' : 'var(--card)',
                  color: i === selectedVariacao ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  border: i === selectedVariacao ? 'none' : '1px solid var(--border)',
                  boxShadow: i === selectedVariacao ? '0 2px 8px rgba(0,85,255,0.3)' : 'none',
                }}>
                <span className="body">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas + Side panel */}
      <div className="flex gap-6 flex-wrap lg:flex-nowrap">

        {/* Canvas */}
        <div className="relative flex-shrink-0 overflow-hidden animate-scale-in"
          style={{
            width: dim.width * PREVIEW_SCALE,
            height: dim.height * PREVIEW_SCALE,
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          }}>
          <div
            className="origin-top-left absolute top-0 left-0"
            style={{
              width: dim.width,
              height: dim.height,
              transform: `scale(${PREVIEW_SCALE})`,
            }}
          >
            <CreativeCanvas
              estrutura={estrutura}
              variacao={variacao}
              briefing={briefing}
              formato={formato}
              safeZone={safeZone}
              selectedEstrutura={selectedEstrutura}
              selectedVariacao={selectedVariacao}
              onEditHeadline={(value) =>
                updateVariacao(selectedEstrutura, selectedVariacao, { fraseDestaque: value })
              }
              onEditTexto={(index, value) => {
                const newTextos = [...variacao.textosFixos]
                newTextos[index] = value
                updateVariacao(selectedEstrutura, selectedVariacao, { textosFixos: newTextos })
              }}
            />
          </div>
        </div>

        {/* Side Panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Info variação */}
          <div className="p-4 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--cores-azul-50) 0%, rgba(0,85,255,0.03) 100%)', border: '1px solid var(--border)' }}>
            <span className="body" style={{ color: 'var(--foreground)' }}>Info da variação</span>
            <dl className="flex flex-col gap-2 mt-2">
              <div>
                <dt className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>Estrutura</dt>
                <dd className="body" style={{ color: 'var(--foreground)' }}>{estrutura.nome || '(sem nome)'}</dd>
              </div>
              <div>
                <dt className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>Variação</dt>
                <dd className="body" style={{ color: 'var(--foreground)' }}>{selectedVariacao + 1} de {estrutura.variacoes.length}</dd>
              </div>
              <div>
                <dt className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>Dimensão</dt>
                <dd className="body" style={{ color: 'var(--foreground)' }}>{dim.width} × {dim.height}px</dd>
              </div>
              <div>
                <dt className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>Cor de destaque</dt>
                <dd style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: briefing.accentColor, display: 'inline-block' }} />
                  <span className="body" style={{ color: 'var(--foreground)' }}>{briefing.accentColor}</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Seletor de foto de fundo */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={14} style={{ color: 'var(--primary)' }} />
              <span className="body" style={{ color: 'var(--foreground)' }}>Foto de fundo</span>
            </div>

            {hasBgImages ? (
              <div className="grid grid-cols-3 gap-2">
                {bgImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setVariacaoBackground(selectedEstrutura, selectedVariacao, i)}
                    className="relative rounded-lg overflow-hidden transition-all active:scale-95"
                    style={{
                      aspectRatio: '3/4',
                      border: variacao.backgroundImageIndex === i
                        ? `3px solid var(--primary)`
                        : '2px solid transparent',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    {variacao.backgroundImageIndex === i && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(0,85,255,0.15)' }}>
                        <span style={{ fontSize: 10, color: 'white', fontWeight: 700, backgroundColor: 'var(--primary)', borderRadius: 9999, padding: '2px 6px' }}>✓</span>
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 detail-medium px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10 }}>
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <ImageIcon size={24} style={{ color: 'var(--muted-foreground)' }} />
                <span className="detail-regular text-center" style={{ color: 'var(--muted-foreground)' }}>
                  Adicione fotos na etapa Assets
                </span>
                <button onClick={() => setStep(1)}
                  className="px-4 py-1.5 rounded-full transition-all active:scale-95"
                  style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)', border: 'none' }}>
                  <span className="detail-medium">Ir para Assets</span>
                </button>
              </div>
            )}
          </div>

          <SafeZoneOverlay />

          <div className="flex items-center gap-2 p-3 rounded-full"
            style={{ backgroundColor: 'rgba(0,85,255,0.04)', border: '1px solid rgba(0,85,255,0.08)' }}>
            <MousePointerClick size={14} style={{ color: 'var(--primary)' }} />
            <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
              Clique nos textos do preview para editar inline
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep(1)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full transition-all active:scale-95 hover-lift"
          style={{ backgroundColor: 'transparent', color: 'var(--foreground)', border: '1.5px solid var(--border)' }}>
          <ArrowLeft size={16} />
          <span className="p-ui-medium">Voltar</span>
        </button>
        <button onClick={() => setStep(3)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full transition-all hover:opacity-90 active:scale-95 hover-lift"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none' }}>
          <span className="p-ui">Próximo: Exportar</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
