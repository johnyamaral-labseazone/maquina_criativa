import { useRef, useState } from 'react'
import { toJpeg } from 'html-to-image'
import { Download, Loader2 } from 'lucide-react'
import type { DesignerCreative, CopySet2 } from '../../stores/campanha2Store'

interface Props {
  creative: DesignerCreative
  copy: CopySet2
  compact?: boolean
}

export function CreativeCard2({ creative, copy, compact = false }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const isStory = creative.formato === '9:16'

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return
    setDownloading(true)
    try {
      const dataUrl = await toJpeg(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        skipFonts: false,
      })
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

  const fs = compact
    ? { h: isStory ? '0.72rem' : '0.65rem', b: '0.58rem', cta: '0.55rem', p: compact ? 10 : 14, gap: 5 }
    : { h: isStory ? '1rem' : '0.85rem', b: '0.7rem', cta: '0.68rem', p: 16, gap: 8 }

  return (
    <div className="relative group" style={{ width: '100%' }}>
      {/* Creative canvas — exported as JPG */}
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: isStory ? '9 / 16' : '4 / 5',
          overflow: 'hidden',
          borderRadius: compact ? 8 : 12,
          backgroundColor: '#0A2060',
          backgroundImage: creative.imageDataUrl ? `url(${creative.imageDataUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.08) 35%, rgba(0,0,0,0.72) 85%, rgba(0,0,0,0.85) 100%)',
        }} />

        {/* Top: Seazone brand bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: `${fs.p * 0.75}px ${fs.p}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0))',
        }}>
          <span style={{
            color: '#fff', fontWeight: 900, letterSpacing: '0.08em', fontSize: fs.h,
            textTransform: 'uppercase',
          }}>SEAZONE</span>
          <span style={{
            backgroundColor: '#0055FF', color: '#fff',
            fontSize: fs.cta, fontWeight: 700, padding: `${fs.p * 0.25}px ${fs.p * 0.6}px`,
            borderRadius: 999, letterSpacing: '0.04em',
          }}>GESTÃO IMOBILIÁRIA</span>
        </div>

        {/* Bottom: Copy content */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: fs.p,
          display: 'flex', flexDirection: 'column', gap: fs.gap,
        }}>
          {/* Headline */}
          <h3 style={{
            color: '#fff', fontWeight: 800, margin: 0,
            fontSize: fs.h, lineHeight: 1.2,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}>
            {copy.headline}
          </h3>

          {/* Body */}
          {copy.body && !compact && (
            <p style={{
              color: 'rgba(255,255,255,0.88)', fontSize: fs.b, margin: 0, lineHeight: 1.4,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}>
              {copy.body}
            </p>
          )}

          {/* CTA button */}
          <div style={{
            backgroundColor: '#0055FF', color: '#fff',
            padding: `${fs.p * 0.4}px ${fs.p * 0.85}px`,
            borderRadius: 999, alignSelf: 'flex-start',
            fontSize: fs.cta, fontWeight: 700, letterSpacing: '0.03em',
          }}>
            {copy.cta} →
          </div>
        </div>

        {/* No background placeholder */}
        {!creative.imageDataUrl && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Sem imagem</span>
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', borderRadius: compact ? 8 : 12 }}
      >
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ backgroundColor: '#fff', border: 'none', cursor: downloading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, color: '#111' }}
        >
          {downloading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
          {downloading ? 'Exportando...' : 'JPG'}
        </button>
      </div>
    </div>
  )
}
