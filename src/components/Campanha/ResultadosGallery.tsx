import { useState } from 'react'
import { useCampanhaStore } from '../../stores/campanhaStore'
import { useHistoryStore } from '../../stores/historyStore'
import type { GeneratedCreative, CampanhaFormato } from '../../stores/campanhaStore'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import {
  LayoutGrid, Smartphone, Square, Video, Download,
  RotateCcw, Loader2, Eye, X, CheckSquare, Images, BookmarkPlus, Check,
} from 'lucide-react'

type FilterTab = 'todos' | CampanhaFormato | 'video' | 'carrossel'

const FILTER_TABS: { id: FilterTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'todos',     label: 'Todos',    icon: LayoutGrid },
  { id: '4:5',       label: 'Feed',     icon: LayoutGrid },
  { id: '9:16',      label: 'Story',    icon: Smartphone },
  { id: '1:1',       label: 'WhatsApp', icon: Square },
  { id: 'carrossel', label: 'Carrossel',icon: Images },
  { id: 'video',     label: 'Vídeos',   icon: Video },
]

const FORMAT_LABEL: Record<string, string> = {
  '4:5':      'Feed 4:5',
  '9:16':     'Story 9:16',
  '1:1':      'WhatsApp 1:1',
  'video':    'Vídeo 9:16',
  'carrossel':'Carrossel',
}

const ESTRUTURA_COLORS: Record<number, string> = {
  1: '#0055FF',
  2: '#7C3AED',
  3: '#059669',
}

const ESTRUTURA_LABELS: Record<number, string> = {
  1: 'Estrutura 1 — Retorno Financeiro',
  2: 'Estrutura 2 — Localização & Lifestyle',
  3: 'Estrutura 3 — Gestão Profissional',
}

export function ResultadosGallery() {
  const creatives    = useCampanhaStore((s) => s.creatives)
  const campaignName = useCampanhaStore((s) => s.campaignName)
  const tom          = useCampanhaStore((s) => s.tom)
  const reset        = useCampanhaStore((s) => s.reset)

  const saveCampaign = useHistoryStore((s) => s.saveCampaign)

  const [activeTab, setActiveTab]   = useState<FilterTab>('todos')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [previewing, setPreviewing] = useState<GeneratedCreative | null>(null)
  const [exporting, setExporting]   = useState(false)
  const [saved, setSaved]           = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)

  const handleSave = () => {
    const result = saveCampaign({ name: campaignName || 'Campanha', tom, creatives })
    if (result.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setSaveError(result.error ?? 'Erro ao salvar')
      setTimeout(() => setSaveError(null), 5000)
    }
  }

  const hasVideos    = creatives.some((c) => c.tipo === 'video')
  const hasCarrossel = creatives.some((c) => c.tipo === 'carrossel')

  const filtered = creatives.filter((c) => {
    if (activeTab === 'todos')     return true
    if (activeTab === 'video')     return c.tipo === 'video'
    if (activeTab === 'carrossel') return c.tipo === 'carrossel'
    return c.formato === activeTab && c.tipo === 'image'
  })

  const visibleTabs = FILTER_TABS.filter((t) => {
    if (t.id === 'video')     return hasVideos
    if (t.id === 'carrossel') return hasCarrossel
    if (t.id === 'todos')     return true
    if (t.id === '1:1')       return creatives.some((c) => c.formato === '1:1' && c.tipo === 'image')
    return creatives.some((c) => c.formato === t.id && c.tipo === 'image')
  })

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(filtered.map((c) => c.id)))
  const clearAll  = () => setSelected(new Set())

  const handleExportZip = async () => {
    setExporting(true)
    const zip = new JSZip()
    const toExport = selected.size > 0
      ? creatives.filter((c) => selected.has(c.id))
      : creatives.filter((c) => (c.tipo === 'image' && c.backgroundImage) || (c.tipo === 'carrossel' && c.carrosselImages?.length))

    for (const creative of toExport) {
      if (creative.tipo === 'carrossel' && creative.carrosselImages?.length) {
        const folder = zip.folder(`E${creative.estrutura}_carrossel`)
        creative.carrosselImages.forEach((img, i) => {
          if (!img) return
          const base64 = img.replace(/^data:image\/\w+;base64,/, '')
          folder?.file(`slide_${i + 1}.jpg`, base64, { base64: true })
        })
      } else if (creative.backgroundImage) {
        const base64 = creative.backgroundImage.replace(/^data:image\/\w+;base64,/, '')
        const name = `${campaignName || 'campanha'}_E${creative.estrutura}V${creative.variacao}_${creative.formato.replace(':', 'x')}.jpg`
        zip.file(name, base64, { base64: true })
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `${campaignName || 'campanha'}_criativos.zip`)
    setExporting(false)
  }

  const totalDone = creatives.filter((c) => c.status === 'done').length

  // Group filtered creatives by estrutura for section headers
  const estruturas = [1, 2, 3].filter((e) => filtered.some((c) => c.estrutura === e))

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span
            style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--foreground)' }}
          >
            {campaignName || 'Campanha'}
          </span>
          <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
            {totalDone} peças geradas
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-95"
            style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, cursor: 'pointer' }}
          >
            <RotateCcw size={14} />
            Nova campanha
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-95"
            style={{
              backgroundColor: saved ? 'rgba(34,197,94,0.1)' : 'var(--secondary)',
              color: saved ? '#22C55E' : 'var(--secondary-foreground)',
              border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 13,
              cursor: saved ? 'default' : 'pointer',
            }}
          >
            {saved ? <Check size={14} /> : <BookmarkPlus size={14} />}
            {saved ? 'Salvo!' : 'Salvar no histórico'}
          </button>
          <button
            onClick={handleExportZip}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2 rounded-full transition-all hover:opacity-90 active:scale-95 hover-lift"
            style={{
              backgroundColor: exporting ? 'var(--muted)' : '#22C55E',
              color: '#fff',
              border: 'none',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 13, fontWeight: 600,
              cursor: exporting ? 'not-allowed' : 'pointer',
            }}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {selected.size > 0 ? `Exportar ${selected.size} peças` : 'Exportar tudo'}
          </button>
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: '#EF4444' }}>{saveError}</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); clearAll() }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all"
            style={{
              backgroundColor: activeTab === id ? 'var(--primary)' : 'var(--secondary)',
              color: activeTab === id ? '#fff' : 'var(--secondary-foreground)',
              border: 'none',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 13, fontWeight: activeTab === id ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
        {filtered.length > 1 && (
          <button
            onClick={selected.size > 0 ? clearAll : selectAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all ml-auto"
            style={{
              backgroundColor: 'var(--secondary)',
              color: 'var(--secondary-foreground)',
              border: 'none',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <CheckSquare size={13} />
            {selected.size > 0 ? 'Desmarcar' : 'Selecionar tudo'}
          </button>
        )}
      </div>

      {/* Grouped by estrutura */}
      {estruturas.map((e) => {
        const group = filtered.filter((c) => c.estrutura === e)
        if (group.length === 0) return null
        const color = ESTRUTURA_COLORS[e] ?? 'var(--primary)'
        return (
          <div key={e} className="flex flex-col gap-3">
            {/* Section header */}
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color, color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                {e}
              </span>
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                {ESTRUTURA_LABELS[e]}
              </span>
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: 'var(--muted-foreground)' }}>
                · {group.filter((c) => c.status === 'done').length}/{group.length} prontas
              </span>
            </div>

            {/* Grid for this estrutura */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.map((creative) => (
                <CreativeCard
                  key={creative.id}
                  creative={creative}
                  isSelected={selected.has(creative.id)}
                  onSelect={toggleSelect}
                  onPreview={() => setPreviewing(creative)}
                  estruturaColor={color}
                />
              ))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 py-16"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Video size={32} style={{ opacity: 0.4 }} />
          <span className="body-regular">Nenhuma peça nesta categoria</span>
        </div>
      )}

      {/* Preview modal */}
      {previewing && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setPreviewing(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-2xl overflow-hidden animate-fade-in-up"
            style={{ backgroundColor: 'var(--card)', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="body-medium" style={{ color: 'var(--foreground)' }}>
                  {previewing.tipo === 'carrossel'
                    ? `Carrossel — ${ESTRUTURA_LABELS[previewing.estrutura] ?? `Estrutura ${previewing.estrutura}`}`
                    : `E${previewing.estrutura} V${previewing.variacao} · ${FORMAT_LABEL[previewing.tipo === 'video' ? 'video' : previewing.formato]}`}
                </span>
                <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
                  {previewing.copy.headline}
                </span>
              </div>
              <button
                onClick={() => setPreviewing(null)}
                className="p-2 rounded-full transition-all"
                style={{ backgroundColor: 'var(--secondary)', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              {/* Carrossel: 5-image grid */}
              {previewing.tipo === 'carrossel' ? (
                previewing.carrosselImages && previewing.carrosselImages.length > 0 ? (
                  <div className="grid grid-cols-5 gap-1.5">
                    {previewing.carrosselImages.map((img, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden" style={{ paddingTop: '125%' }}>
                        {img ? (
                          <img src={img} alt={`Slide ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--secondary)' }}>
                            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 10, color: 'var(--muted-foreground)' }}>{i + 1}</span>
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                          {i + 1}/5
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full rounded-xl flex items-center justify-center" style={{ height: 120, backgroundColor: 'var(--secondary)' }}>
                    <span className="body-regular" style={{ color: 'var(--muted-foreground)' }}>Slides em geração...</span>
                  </div>
                )
              ) : previewing.backgroundImage ? (
                <img
                  src={previewing.backgroundImage}
                  alt="preview"
                  className="w-full rounded-xl"
                  style={{ objectFit: 'cover', maxHeight: 400 }}
                />
              ) : (
                <div
                  className="w-full rounded-xl flex items-center justify-center"
                  style={{ height: 200, backgroundColor: 'var(--secondary)' }}
                >
                  <span className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
                    Imagem em geração...
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <div>
                  <span className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>Headline</span>
                  <p className="body-medium mt-0.5" style={{ color: 'var(--foreground)', margin: 0 }}>{previewing.copy.headline}</p>
                </div>
                <div>
                  <span className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>Texto</span>
                  <p className="body-regular mt-0.5" style={{ color: 'var(--foreground)', margin: 0 }}>{previewing.copy.body}</p>
                </div>
                <div>
                  <span className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>CTA</span>
                  <p className="body-medium mt-0.5" style={{ color: 'var(--primary)', margin: 0 }}>{previewing.copy.cta}</p>
                </div>
                {previewing.copy.videoRoteiro && (
                  <div>
                    <span className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>Roteiro de vídeo</span>
                    <p className="body-regular mt-0.5" style={{ color: 'var(--foreground)', margin: 0 }}>{previewing.copy.videoRoteiro}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CreativeCard({
  creative, isSelected, onSelect, onPreview, estruturaColor,
}: {
  creative: GeneratedCreative
  isSelected: boolean
  onSelect: (id: string) => void
  onPreview: () => void
  estruturaColor: string
}) {
  const isVideo     = creative.tipo === 'video'
  const isCarrossel = creative.tipo === 'carrossel'

  // For carrossel: use first slide as thumbnail
  const thumbnail = isCarrossel
    ? (creative.carrosselImages?.[0] ?? null)
    : creative.backgroundImage

  // Aspect ratio: carrossel uses 4:5
  const paddingTop = creative.formato === '9:16' ? '177%' : creative.formato === '4:5' || isCarrossel ? '125%' : '100%'

  return (
    <div
      className="relative rounded-2xl overflow-hidden transition-all hover-lift group"
      style={{
        backgroundColor: 'var(--card)',
        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
        boxShadow: isSelected ? '0 0 0 3px rgba(0,85,255,0.12)' : 'var(--elevation-sm)',
        cursor: 'pointer',
      }}
      onClick={() => onSelect(creative.id)}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ paddingTop }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--secondary)' }}
          >
            {creative.status === 'generating' || creative.status === 'pending'
              ? <Loader2 size={20} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
              : <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>–</span>
            }
          </div>
        )}

        {/* Carrossel: show slide count overlay */}
        {isCarrossel && creative.carrosselImages && creative.carrosselImages.length > 0 && (
          <div
            className="absolute bottom-2 left-2 right-2 flex gap-0.5"
          >
            {creative.carrosselImages.map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{ height: 3, backgroundColor: i === 0 ? '#fff' : 'rgba(255,255,255,0.45)' }}
              />
            ))}
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onPreview() }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#000', border: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <Eye size={13} /> Ver
          </button>
        </div>

        {/* Type badge */}
        {isVideo && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(124,58,237,0.9)', color: '#fff' }}
          >
            <Video size={10} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>
              {creative.videoDuracao ?? 'Vídeo'}
            </span>
          </div>
        )}
        {isCarrossel && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(0,85,255,0.85)', color: '#fff' }}
          >
            <Images size={10} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>5 slides</span>
          </div>
        )}

        {/* Selection indicator */}
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.85)',
            border: isSelected ? 'none' : '1.5px solid rgba(0,0,0,0.15)',
          }}
        >
          {isSelected && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className="detail-medium"
            style={{ color: 'var(--muted-foreground)', fontSize: 11 }}
          >
            {isCarrossel
              ? 'Carrossel'
              : `V${creative.variacao} · ${FORMAT_LABEL[isVideo ? 'video' : creative.formato]}`}
          </span>
          {/* Estrutura dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: estruturaColor }}
          />
        </div>
        <span
          className="truncate"
          style={{
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 12, fontWeight: 600, color: 'var(--foreground)',
          }}
        >
          {creative.copy.headline}
        </span>
      </div>
    </div>
  )
}
