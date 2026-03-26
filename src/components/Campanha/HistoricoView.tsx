import { useState } from 'react'
import { useHistoryStore } from '../../stores/historyStore'
import type { SavedCampaign } from '../../stores/historyStore'
import type { GeneratedCreative } from '../../stores/campanhaStore'
import {
  X, Trash2, ChevronDown, ChevronRight,
  ImageIcon, Video, Images, Clock, Download,
  LayoutGrid, Smartphone, AlertCircle, Pencil, Check,
} from 'lucide-react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function deleteVideoOnServer(videoUrl: string) {
  try {
    const filename = videoUrl.split('/').pop()
    if (!filename) return
    await fetch(`/api/ai/video/${encodeURIComponent(filename)}`, { method: 'DELETE' })
  } catch {
    // best-effort
  }
}

const TYPE_COLOR: Record<string, string> = {
  image:     'rgba(0,85,255,0.12)',
  video:     'rgba(124,58,237,0.12)',
  carrossel: 'rgba(5,150,105,0.12)',
}
const TYPE_TEXT_COLOR: Record<string, string> = {
  image:     '#0055FF',
  video:     '#7C3AED',
  carrossel: '#059669',
}
const FORMAT_LABEL: Record<string, string> = {
  '4:5':      'Feed 4:5',
  '9:16':     'Story 9:16',
  'carrossel':'Carrossel',
  'video':    'Vídeo 9:16',
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function HistoricoView({ onClose }: Props) {
  const { campaigns, deleteCampaign, deleteCreative, renameCampaign } = useHistoryStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filterType, setFilterType]       = useState<'all' | 'image' | 'video' | 'carrossel'>('all')
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editingName, setEditingName]     = useState('')
  const [exporting, setExporting]         = useState<string | null>(null)

  const handleDeleteCampaign = async (campaign: SavedCampaign) => {
    // Delete video files from server
    const videos = campaign.creatives.filter((c) => c.tipo === 'video' && c.videoUrl)
    await Promise.all(videos.map((v) => deleteVideoOnServer(v.videoUrl!)))
    deleteCampaign(campaign.id)
    setConfirmDelete(null)
    if (expandedId === campaign.id) setExpandedId(null)
  }

  const handleDeleteCreative = async (campaignId: string, creative: GeneratedCreative) => {
    if (creative.tipo === 'video' && creative.videoUrl) {
      await deleteVideoOnServer(creative.videoUrl)
    }
    deleteCreative(campaignId, creative.id)
  }

  const handleExportCampaign = async (campaign: SavedCampaign) => {
    setExporting(campaign.id)
    const zip = new JSZip()

    for (const c of campaign.creatives) {
      if (c.tipo === 'carrossel' && c.carrosselImages?.length) {
        const folder = zip.folder(`E${c.estrutura}_carrossel`)
        c.carrosselImages.forEach((img, i) => {
          if (!img) return
          const b64 = img.replace(/^data:image\/\w+;base64,/, '')
          folder?.file(`slide_${i + 1}.jpg`, b64, { base64: true })
        })
      } else if (c.backgroundImage) {
        const b64  = c.backgroundImage.replace(/^data:image\/\w+;base64,/, '')
        const name = `E${c.estrutura}V${c.variacao}_${(c.formato as string).replace(':', 'x')}.jpg`
        zip.file(name, b64, { base64: true })
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `${campaign.name || 'campanha'}_criativos.zip`)
    setExporting(null)
  }

  const handleStartRename = (campaign: SavedCampaign) => {
    setEditingId(campaign.id)
    setEditingName(campaign.name)
  }

  const handleConfirmRename = () => {
    if (editingId && editingName.trim()) {
      renameCampaign(editingId, editingName.trim())
    }
    setEditingId(null)
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Clock size={40} style={{ color: 'var(--border)' }} />
        <div className="flex flex-col items-center gap-1 text-center">
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
            Nenhuma campanha salva
          </span>
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, color: 'var(--muted-foreground)' }}>
            Gere e salve uma campanha para ela aparecer aqui
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--foreground)' }}>
            Histórico de campanhas
          </span>
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: 'var(--muted-foreground)' }}>
            {campaigns.length} projeto{campaigns.length !== 1 ? 's' : ''} salvo{campaigns.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
          style={{ backgroundColor: 'var(--secondary)', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13 }}
        >
          <X size={14} /> Fechar
        </button>
      </div>

      {/* Campaign list */}
      <div className="flex flex-col gap-3">
        {campaigns.map((campaign) => {
          const images    = campaign.creatives.filter((c) => c.tipo === 'image')
          const videos    = campaign.creatives.filter((c) => c.tipo === 'video')
          const carrossels = campaign.creatives.filter((c) => c.tipo === 'carrossel')
          const isExpanded = expandedId === campaign.id

          const filteredCreatives = campaign.creatives.filter((c) => {
            if (filterType === 'all')      return true
            if (filterType === 'image')    return c.tipo === 'image'
            if (filterType === 'video')    return c.tipo === 'video'
            if (filterType === 'carrossel') return c.tipo === 'carrossel'
            return true
          })

          return (
            <div
              key={campaign.id}
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            >
              {/* Campaign header row */}
              <div className="px-5 py-4 flex items-center gap-3">

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                  className="flex-shrink-0 p-1 rounded-lg transition-all"
                  style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {/* Name (editable) */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {editingId === campaign.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
                        onBlur={handleConfirmRename}
                        className="flex-1 px-2 py-1 rounded-lg"
                        style={{ backgroundColor: 'var(--input)', border: '1px solid var(--primary)', color: 'var(--foreground)', outline: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 600 }}
                      />
                      <button onClick={handleConfirmRename} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                        <Check size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                        {campaign.name || 'Campanha sem nome'}
                      </span>
                      <button
                        onClick={() => handleStartRename(campaign)}
                        className="flex-shrink-0 p-1 rounded transition-all opacity-0 group-hover:opacity-100"
                        style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats chips */}
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                  {images.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: TYPE_COLOR.image, color: TYPE_TEXT_COLOR.image, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 600 }}>
                      <ImageIcon size={10} />{images.length}
                    </span>
                  )}
                  {carrossels.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: TYPE_COLOR.carrossel, color: TYPE_TEXT_COLOR.carrossel, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 600 }}>
                      <Images size={10} />{carrossels.length}
                    </span>
                  )}
                  {videos.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: TYPE_COLOR.video, color: TYPE_TEXT_COLOR.video, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 600 }}>
                      <Video size={10} />{videos.length}
                    </span>
                  )}
                </div>

                {/* Date */}
                <span className="hidden md:block flex-shrink-0" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: 'var(--muted-foreground)' }}>
                  {formatDate(campaign.savedAt)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleExportCampaign(campaign)}
                    disabled={exporting === campaign.id}
                    title="Exportar ZIP"
                    className="p-2 rounded-full transition-all hover:opacity-80"
                    style={{ backgroundColor: 'var(--secondary)', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(campaign.id)}
                    title="Excluir campanha"
                    className="p-2 rounded-full transition-all hover:opacity-80"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Confirm delete banner */}
              {confirmDelete === campaign.id && (
                <div className="px-5 py-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(239,68,68,0.06)', borderTop: '1px solid rgba(239,68,68,0.15)' }}>
                  <AlertCircle size={15} style={{ color: '#EF4444', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: '#EF4444', flex: 1 }}>
                    Excluir "{campaign.name}"? Imagens, vídeos e arquivos do servidor serão removidos.
                  </span>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--secondary)', border: 'none', color: 'var(--secondary-foreground)', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(campaign)}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: '#EF4444', border: 'none', color: '#fff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Excluir
                  </button>
                </div>
              )}

              {/* Expanded: filter + creatives grid */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {/* Filter bar */}
                  <div className="px-5 py-3 flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
                    {(
                      [
                        { id: 'all',       label: 'Todos',    icon: LayoutGrid },
                        { id: 'image',     label: 'Imagens',  icon: ImageIcon },
                        { id: 'carrossel', label: 'Carrossel',icon: Images },
                        { id: 'video',     label: 'Vídeos',   icon: Video },
                      ] as const
                    ).map(({ id, label, icon: Icon }) => {
                      const count = id === 'all' ? campaign.creatives.length
                        : campaign.creatives.filter((c) => c.tipo === id).length
                      if (id !== 'all' && count === 0) return null
                      return (
                        <button
                          key={id}
                          onClick={() => setFilterType(id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                          style={{
                            backgroundColor: filterType === id ? 'var(--primary)' : 'var(--secondary)',
                            color: filterType === id ? '#fff' : 'var(--secondary-foreground)',
                            border: 'none',
                            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          <Icon size={12} />{label} <span style={{ opacity: 0.7 }}>({count})</span>
                        </button>
                      )
                    })}

                    {/* Bulk delete type */}
                    {filterType !== 'all' && filteredCreatives.length > 0 && (
                      <button
                        onClick={async () => {
                          for (const c of filteredCreatives) {
                            await handleDeleteCreative(campaign.id, c)
                          }
                        }}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                        style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: 'none', color: '#EF4444', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, cursor: 'pointer' }}
                      >
                        <Trash2 size={12} /> Excluir todos ({filteredCreatives.length})
                      </button>
                    )}
                  </div>

                  {/* Creatives grid */}
                  <div className="p-5">
                    {filteredCreatives.length === 0 ? (
                      <div className="py-8 flex items-center justify-center">
                        <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: 'var(--muted-foreground)' }}>
                          Nenhuma peça nesta categoria
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {filteredCreatives.map((creative) => (
                          <CreativeHistoryCard
                            key={creative.id}
                            creative={creative}
                            onDelete={() => handleDeleteCreative(campaign.id, creative)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Creative mini-card ────────────────────────────────────────────────────────

function CreativeHistoryCard({
  creative,
  onDelete,
}: {
  creative: GeneratedCreative
  onDelete: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)

  const isVideo     = creative.tipo === 'video'
  const isCarrossel = creative.tipo === 'carrossel'
  const thumbnail   = isCarrossel ? (creative.carrosselImages?.[0] ?? null) : creative.backgroundImage
  const paddingTop  = creative.formato === '9:16' ? '177%' : '125%'

  const label = isCarrossel
    ? 'Carrossel'
    : isVideo
    ? `Vídeo ${creative.videoDuracao ?? ''}`
    : FORMAT_LABEL[creative.formato] ?? creative.formato

  const typeColor     = TYPE_COLOR[creative.tipo]     ?? 'rgba(0,85,255,0.12)'
  const typeTextColor = TYPE_TEXT_COLOR[creative.tipo] ?? '#0055FF'

  return (
    <div
      className="relative rounded-xl overflow-hidden group"
      style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)' }}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ paddingTop }}>
        {thumbnail ? (
          <img src={thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : isVideo && creative.videoUrl ? (
          <video
            src={creative.videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            playsInline
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: typeColor }}>
            {isVideo     ? <Video size={18} style={{ color: typeTextColor }} />
            : isCarrossel ? <Images size={18} style={{ color: typeTextColor }} />
            : creative.formato === '9:16' ? <Smartphone size={18} style={{ color: typeTextColor }} />
            : <LayoutGrid size={18} style={{ color: typeTextColor }} />}
          </div>
        )}

        {/* Delete overlay on hover */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          {confirmDel ? (
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDel(false) }}
                className="px-2 py-1 rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', color: '#000', fontSize: 11, cursor: 'pointer' }}
              >
                Não
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="px-2 py-1 rounded-lg"
                style={{ backgroundColor: '#EF4444', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                Sim
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDel(true) }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg"
              style={{ backgroundColor: 'rgba(239,68,68,0.9)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              <Trash2 size={11} /> Excluir
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-2 py-1.5 flex flex-col gap-0">
        <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 10, color: 'var(--muted-foreground)' }}>
          E{creative.estrutura}{creative.variacao > 0 ? ` V${creative.variacao}` : ''} · {label}
        </span>
        <span className="truncate" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 600, color: 'var(--foreground)' }}>
          {creative.copy.headline}
        </span>
      </div>
    </div>
  )
}
