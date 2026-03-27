import { useRef, useState } from 'react'
import { toJpeg } from 'html-to-image'
import { Download, Loader2 } from 'lucide-react'
import type { DesignerCreative, CopySet2, ParsedBriefing2 } from '../../stores/campanha2Store'

interface Props {
  creative: DesignerCreative
  copy: CopySet2
  compact?: boolean
  briefing?: ParsedBriefing2 | null
}

// Parse ROI string like "16,4% ao ano" → { value: "16,4%", period: "ao ano" }
function parseRoi(roi: string): { value: string; period: string } {
  if (!roi) return { value: '', period: '' }
  const m = roi.match(/^([\d\.,]+\s*%?)(.*)$/)
  return { value: m?.[1]?.trim() ?? roi, period: m?.[2]?.trim() || 'ao ano' }
}

export function CreativeCard2({ creative, copy, compact = false, briefing }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const isStory = creative.formato === '9:16'

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return
    setDownloading(true)
    try {
      const dataUrl = await toJpeg(cardRef.current, { quality: 0.95, pixelRatio: 2, skipFonts: false })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${creative.id}.jpg`
      a.click()
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const roi = parseRoi(briefing?.roi ?? '')
  const hasRoi = !!roi.value
  const location = briefing?.localizacao ?? ''
  const produto = briefing?.produto ?? ''

  // Photo takes top ~52% (feed) or ~44% (story)
  const photoH = isStory ? '44%' : '52%'
  // Dark panel overlaps slightly from photoH - 4%
  const panelTop = isStory ? '42%' : '50%'

  // Scaling: compact cards are ~140px wide, full cards are ~300px
  const scale = compact ? 0.48 : 1
  const px = (n: number) => `${Math.round(n * scale)}px`

  const DARK = '#0A1628'
  const ROI_BG = '#0D2266'
  const HIGHLIGHT = '#E53935'

  return (
    <div className="relative group" style={{ width: '100%' }}>
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: isStory ? '9 / 16' : '4 / 5',
          overflow: 'hidden',
          borderRadius: compact ? 6 : 10,
          backgroundColor: DARK,
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        {/* ── Photo section ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: photoH,
          backgroundImage: creative.imageDataUrl ? `url(${creative.imageDataUrl})` : undefined,
          backgroundColor: '#1a3060',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }} />

        {/* Gradient from photo to dark panel */}
        <div style={{
          position: 'absolute',
          top: `calc(${photoH} - 10%)`,
          left: 0, right: 0, height: '12%',
          background: `linear-gradient(to bottom, transparent, ${DARK})`,
          pointerEvents: 'none',
        }} />

        {/* Product brand on photo (top center) */}
        {produto && (
          <div style={{
            position: 'absolute', top: px(10), left: 0, right: 0,
            display: 'flex', justifyContent: 'center',
          }}>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.93)',
              borderRadius: px(6),
              padding: `${px(3)} ${px(12)}`,
              maxWidth: '70%',
            }}>
              <span style={{
                fontSize: px(10), fontWeight: 900, color: DARK,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {produto}
              </span>
            </div>
          </div>
        )}

        {/* ── Dark info panel ── */}
        <div style={{
          position: 'absolute', top: panelTop, bottom: 0, left: 0, right: 0,
          backgroundColor: DARK,
          padding: `${px(10)} ${px(12)} ${px(8)}`,
          display: 'flex', flexDirection: 'column', gap: px(7),
        }}>

          {/* Row 1: Location pill + Seazone branding */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: px(4) }}>
            {location ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: px(5),
                backgroundColor: '#fff', borderRadius: px(999),
                padding: `${px(3)} ${px(9)}`,
                maxWidth: '72%', overflow: 'hidden',
              }}>
                <div style={{
                  width: px(7), height: px(7), borderRadius: '50%',
                  backgroundColor: HIGHLIGHT, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: px(8), fontWeight: 700, color: DARK,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {location}
                </span>
              </div>
            ) : <div />}
            <span style={{
              fontSize: px(9), fontWeight: 900, color: '#fff',
              letterSpacing: '0.04em', flexShrink: 0,
              textTransform: 'lowercase',
            }}>
              seazone
            </span>
          </div>

          {/* Row 2: Badge + body copy */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: px(7) }}>
            <div style={{
              flexShrink: 0,
              border: `${px(1.5)} solid rgba(255,255,255,0.35)`,
              borderRadius: px(5),
              padding: `${px(3)} ${px(7)}`,
            }}>
              <span style={{
                fontSize: px(7), fontWeight: 800, color: '#fff',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {copy.cta || 'SAIBA MAIS'}
              </span>
            </div>
            <p style={{
              fontSize: px(8), color: 'rgba(255,255,255,0.92)', margin: 0,
              lineHeight: 1.35, fontWeight: 500,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {copy.body || copy.headline}
            </p>
          </div>

          {/* Row 3: ROI box + return description */}
          {hasRoi && (
            <div style={{ display: 'flex', alignItems: 'center', gap: px(10) }}>
              <div style={{
                backgroundColor: ROI_BG,
                borderRadius: px(7),
                padding: `${px(6)} ${px(10)}`,
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: px(52),
              }}>
                <span style={{
                  fontSize: px(20), fontWeight: 900, color: '#fff',
                  lineHeight: 1, display: 'block',
                }}>
                  {roi.value}
                </span>
                <span style={{
                  fontSize: px(7), color: 'rgba(255,255,255,0.65)',
                  fontWeight: 500,
                }}>
                  {roi.period || 'ao ano'}
                </span>
              </div>
              <p style={{ fontSize: px(9), color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.4 }}>
                de{' '}
                <span style={{
                  backgroundColor: HIGHLIGHT,
                  color: '#fff',
                  padding: `${px(1)} ${px(3)}`,
                  borderRadius: px(2),
                }}>
                  retorno líquido
                </span>
                {' '}com aluguel<br />por temporada
              </p>
            </div>
          )}

          {/* Headline (when no ROI data) */}
          {!hasRoi && (
            <h3 style={{
              color: '#fff', fontWeight: 800, margin: 0,
              fontSize: px(13), lineHeight: 1.25,
            }}>
              {copy.headline}
            </h3>
          )}

          {/* Disclaimer (only in non-compact mode) */}
          {!compact && (
            <p style={{
              fontSize: px(4.5), color: 'rgba(255,255,255,0.35)',
              margin: '0', lineHeight: 1.3, marginTop: 'auto',
            }}>
              *Este material tem caráter exclusivamente informativo e não constitui uma promessa de rentabilidade futura ou garantia de retorno financeiro. Os resultados financeiros do investimento dependem da performance do empreendimento após sua conclusão.
            </p>
          )}
        </div>
      </div>

      {/* Hover overlay with download button */}
      <div
        className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', borderRadius: compact ? 6 : 10 }}
      >
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{
            backgroundColor: '#fff', border: 'none',
            cursor: downloading ? 'wait' : 'pointer',
            fontSize: 12, fontWeight: 600, color: '#111',
          }}
        >
          {downloading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
          {downloading ? 'Exportando...' : 'JPG'}
        </button>
      </div>
    </div>
  )
}
