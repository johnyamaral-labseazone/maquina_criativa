import { useRef, useEffect } from 'react'
import { useWhatsappStore, type WaTextElement, CTA_ID } from '../../stores/whatsappEditorStore'
import { Logo } from '../../imports/Logo1'

// ─── Constants ────────────────────────────────────────────────────────────────

const DIMENSIONS = {
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
}

const PREVIEW_SCALE = 0.454

const LOGO_W      = 192
const LOGO_H      = 62
const LOGO_TOP    = 64
const LOGO_SIDE   = 80

// Safe zone: texts & CTA cannot be dragged outside this
const SAFE = {
  top:    LOGO_TOP + LOGO_H + 54,  // ≈ 180px
  left:   LOGO_SIDE,
  right:  LOGO_SIDE,
  bottom: 80,
}

const ELEMENT_MARGIN = 10

// ─── Helpers ─────────────────────────────────────────────────────────────────

const estimateH = (el: WaTextElement) => Math.ceil(el.fontSize * 1.4)

function hasCollision(
  moving: WaTextElement,
  nx: number, ny: number,
  all: WaTextElement[],
): boolean {
  const mW = moving.width
  const mH = estimateH(moving)
  const M  = ELEMENT_MARGIN
  for (const other of all) {
    if (other.id === moving.id) continue
    const separated =
      nx + mW + M <= other.x     ||
      other.x + other.width + M <= nx ||
      ny + mH + M <= other.y     ||
      other.y + estimateH(other) + M <= ny
    if (!separated) return true
  }
  return false
}

/** Rough pixel width of the CTA box at full resolution */
function estimateCtaW(text1: string, text2: string, fontSize: number) {
  const chars = text1.length + text2.length
  return Math.round(chars * fontSize * 0.52 + fontSize * 2.2)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WaCanvas() {
  const formato       = useWhatsappStore((s) => s.formato)
  const bgImage       = useWhatsappStore((s) => s.backgroundImage)
  const logoImage     = useWhatsappStore((s) => s.logoImage)
  const logoVisible   = useWhatsappStore((s) => s.logoVisible)
  const logo2Image    = useWhatsappStore((s) => s.logo2Image)
  const logo2Visible  = useWhatsappStore((s) => s.logo2Visible)
  const accentColor   = useWhatsappStore((s) => s.accentColor)
  const elements      = useWhatsappStore((s) => s.elements)
  const selectedId    = useWhatsappStore((s) => s.selectedId)
  const selectElement = useWhatsappStore((s) => s.selectElement)
  const updateElement = useWhatsappStore((s) => s.updateElement)

  // CTA
  const ctaVisible     = useWhatsappStore((s) => s.ctaVisible)
  const ctaText1       = useWhatsappStore((s) => s.ctaText1)
  const ctaText2       = useWhatsappStore((s) => s.ctaText2)
  const ctaX           = useWhatsappStore((s) => s.ctaX)
  const ctaY           = useWhatsappStore((s) => s.ctaY)
  const ctaBorderColor = useWhatsappStore((s) => s.ctaBorderColor)
  const ctaFontSize    = useWhatsappStore((s) => s.ctaFontSize)
  const setCtaPos      = useWhatsappStore((s) => s.setCtaPos)

  const dim = DIMENSIONS[formato]

  // Live ref so drag closures always see fresh elements
  const elementsRef = useRef(elements)
  useEffect(() => { elementsRef.current = elements }, [elements])

  const dragRef = useRef<{
    kind: 'el' | 'cta'
    id?: string
    startX: number; startY: number
    ox: number;     oy: number
  } | null>(null)

  // ── Text element drag ──────────────────────────────────────────────────────
  const startElDrag = (e: React.MouseEvent, id: string, ox: number, oy: number) => {
    e.stopPropagation()
    selectElement(id)
    dragRef.current = { kind: 'el', id, startX: e.clientX, startY: e.clientY, ox, oy }

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current || dragRef.current.kind !== 'el') return
      const { id: dId, startX, startY, ox: elX, oy: elY } = dragRef.current
      const all    = elementsRef.current
      const moving = all.find((e) => e.id === dId)
      if (!moving) return

      const dx = (me.clientX - startX) / PREVIEW_SCALE
      const dy = (me.clientY - startY) / PREVIEW_SCALE
      const nx = Math.max(SAFE.left, Math.min(dim.width  - moving.width   - SAFE.right,  Math.round(elX + dx)))
      const ny = Math.max(SAFE.top,  Math.min(dim.height - estimateH(moving) - SAFE.bottom, Math.round(elY + dy)))

      if (!hasCollision(moving, nx, ny, all)) {
        updateElement(dId!, { x: nx, y: ny })
      }
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── CTA drag ──────────────────────────────────────────────────────────────
  const startCtaDrag = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectElement(CTA_ID)
    dragRef.current = { kind: 'cta', startX: e.clientX, startY: e.clientY, ox: ctaX, oy: ctaY }

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current || dragRef.current.kind !== 'cta') return
      const { startX, startY, ox, oy } = dragRef.current
      const dx = (me.clientX - startX) / PREVIEW_SCALE
      const dy = (me.clientY - startY) / PREVIEW_SCALE
      const ctaW = estimateCtaW(ctaText1, ctaText2, ctaFontSize)
      const ctaH = Math.round(ctaFontSize * 1.4 + ctaFontSize * 0.9) // height ≈ fontSize + vertical padding
      const nx = Math.max(SAFE.left, Math.min(dim.width  - ctaW - SAFE.right,  Math.round(ox + dx)))
      const ny = Math.max(SAFE.top,  Math.min(dim.height - ctaH - SAFE.bottom, Math.round(oy + dy)))
      setCtaPos(nx, ny)
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const ctaSelected = selectedId === CTA_ID
  const font = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  return (
    <div style={{
      position: 'relative',
      width:  dim.width  * PREVIEW_SCALE,
      height: dim.height * PREVIEW_SCALE,
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.1)',
      flexShrink: 0,
    }}>
      {/* Full-res inner canvas */}
      <div
        id="creative-preview"
        onClick={() => selectElement(null)}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: dim.width, height: dim.height,
          transformOrigin: 'top left',
          transform: `scale(${PREVIEW_SCALE})`,
          backgroundColor: accentColor,
          overflow: 'hidden',
          fontFamily: font,
        }}
      >
        {/* Background */}
        {bgImage && (
          <img src={bgImage} alt="fundo" draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.50) 45%, rgba(0,0,0,0.80) 100%)',
        }} />

        {/* Accent bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 12, backgroundColor: accentColor, pointerEvents: 'none',
        }} />

        {/* Logo 1 — top-left */}
        {logoVisible && (
          <div style={{ position: 'absolute', top: LOGO_TOP, left: LOGO_SIDE, width: LOGO_W, pointerEvents: 'none' }}>
            {logoImage
              ? <img src={logoImage} alt="Logo" draggable={false} style={{ height: LOGO_H, objectFit: 'contain' }} />
              : <Logo variant="white" />
            }
          </div>
        )}

        {/* Logo 2 — top-right */}
        {logo2Visible && (
          <div style={{ position: 'absolute', top: LOGO_TOP, right: LOGO_SIDE, width: LOGO_W, pointerEvents: 'none', display: 'flex', justifyContent: 'flex-end' }}>
            {logo2Image
              ? <img src={logo2Image} alt="Logo 2" draggable={false} style={{ height: LOGO_H, objectFit: 'contain' }} />
              : <Logo variant="white" />
            }
          </div>
        )}

        {/* ── CTA box ── */}
        {ctaVisible && (
          <div
            onMouseDown={startCtaDrag}
            style={{
              position: 'absolute',
              left: ctaX,
              top:  ctaY,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              padding: `${Math.round(ctaFontSize * 0.42)}px ${Math.round(ctaFontSize * 0.9)}px`,
              borderRadius: 999,                              // full pill
              border: `3px solid ${ctaBorderColor}`,
              backgroundColor: 'rgba(0, 20, 61, 0.72)',
              boxShadow: ctaSelected
                ? `0 0 0 3px rgba(255,255,255,0.5), 0 0 40px ${ctaBorderColor}66`
                : `0 0 32px ${ctaBorderColor}44`,
              cursor: 'grab',
              userSelect: 'none',
              transition: 'box-shadow 0.15s',
              fontFamily: font,
            }}
          >
            <span style={{ color: '#FFFFFF', fontSize: ctaFontSize, fontWeight: 400, lineHeight: 1 }}>
              {ctaText1.trimEnd()}
            </span>
            <span style={{ color: '#FFFFFF', fontSize: ctaFontSize, fontWeight: 400, lineHeight: 1 }}>{' '}</span>
            <span style={{ color: '#FFFFFF', fontSize: ctaFontSize, fontWeight: 700, lineHeight: 1 }}>
              {ctaText2.trimStart()}
            </span>
          </div>
        )}

        {/* Draggable text elements */}
        {elements.map((el) => (
          <div key={el.id}
            onMouseDown={(e) => startElDrag(e, el.id, el.x, el.y)}
            style={{
              position: 'absolute',
              left: el.x, top: el.y,
              width: el.width,
              fontSize: el.fontSize,
              color: el.color,
              fontWeight: el.fontWeight,
              textAlign: el.textAlign,
              cursor: 'grab',
              userSelect: 'none',
              lineHeight: 1.2,
              fontFamily: font,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              padding: '4px 8px',
              borderRadius: 4,
              outline: selectedId === el.id ? '3px solid rgba(255,255,255,0.85)' : '3px solid transparent',
              outlineOffset: 8,
              transition: 'outline-color 0.15s',
            }}
          >
            {el.content}
          </div>
        ))}
      </div>
    </div>
  )
}
