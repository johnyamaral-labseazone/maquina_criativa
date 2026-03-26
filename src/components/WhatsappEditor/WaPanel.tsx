import { useRef, useState, type ReactNode } from 'react'
import { toPng } from 'html-to-image'
import { saveAs } from 'file-saver'
import {
  Image, Type, Plus, Trash2, Download,
  Bold, AlignLeft, AlignCenter, AlignRight,
  Eye, EyeOff, Loader2, Square, Smartphone, Move,
  Sparkles, MousePointerClick, Wand2,
} from 'lucide-react'
import { AiTab } from '../shared/AiTab'
import { useWhatsappStore, type WaFormat, CTA_ID } from '../../stores/whatsappEditorStore'

// ─── Brandbook palette ────────────────────────────────────────────────────────

const BRAND_PRIMARY = [
  { hex: '#00143D', name: 'Deep Navy' },
  { hex: '#0055FF', name: 'Brand Blue' },
  { hex: '#FC6058', name: 'Coral Red' },
]
const BRAND_SECONDARY = [
  { hex: '#FFF6F5', name: 'Blush White' },
  { hex: '#FFCECD', name: 'Light Salmon' },
  { hex: '#FF8882', name: 'Salmon' },
  { hex: '#E8EFFE', name: 'Ice Blue' },
  { hex: '#6593FF', name: 'Periwinkle Blue' },
  { hex: '#0048D7', name: 'Royal Blue' },
  { hex: '#00247A', name: 'Dark Navy' },
  { hex: '#2E2E2E', name: 'Charcoal' },
  { hex: '#7C7C7C', name: 'Medium Gray' },
]
const BRAND_SUPPORT = [
  { hex: '#E1F8ED', name: 'Mint Light' },
  { hex: '#77DBA4', name: 'Mint Medium' },
  { hex: '#2BBD68', name: 'Emerald Green' },
  { hex: '#249555', name: 'Deep Green' },
  { hex: '#FCC74D', name: 'Light Amber' },
  { hex: '#FAA200', name: 'Amber' },
  { hex: '#D88800', name: 'Dark Amber' },
]

const TEXT_COLORS = [
  { hex: '#FFFFFF',   name: 'Branco' },
  { hex: '#FFFFFFCC', name: 'Branco 80%' },
  { hex: '#000000',   name: 'Preto' },
  ...BRAND_PRIMARY,
  { hex: '#6593FF', name: 'Periwinkle Blue' },
  { hex: '#0048D7', name: 'Royal Blue' },
  { hex: '#00247A', name: 'Dark Navy' },
  { hex: '#2E2E2E', name: 'Charcoal' },
  { hex: '#7C7C7C', name: 'Medium Gray' },
  { hex: '#2BBD68', name: 'Emerald Green' },
  { hex: '#FAA200', name: 'Amber' },
]

const DIMENSIONS = {
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
}
const ALIGN_OPTIONS = [
  { value: 'left'   as const, icon: AlignLeft },
  { value: 'center' as const, icon: AlignCenter },
  { value: 'right'  as const, icon: AlignRight },
]
const FORMATS: { value: WaFormat; label: string; icon: typeof Square }[] = [
  { value: '1:1',  label: 'WhatsApp 1:1', icon: Square },
  { value: '9:16', label: 'Story 9:16',   icon: Smartphone },
]

type Tab = 'arte' | 'textos' | 'ia' | 'exportar'
const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: 'arte',     label: 'Arte',     icon: Sparkles },
  { id: 'textos',   label: 'Textos',   icon: Type },
  { id: 'ia',       label: 'IA',       icon: Wand2 },
  { id: 'exportar', label: 'Exportar', icon: Download },
]

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="detail-medium" style={{ color: 'var(--muted-foreground)', display: 'block', marginBottom: 6 }}>
      {children}
    </span>
  )
}

function Divider() {
  return <div style={{ gridColumn: '1 / -1', height: 1, backgroundColor: 'var(--border)' }} />
}

function ColorSwatches({
  colors, selected, onSelect,
}: {
  colors: { hex: string; name: string }[]
  selected: string
  onSelect: (hex: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {colors.map(({ hex, name }) => {
        const isActive = selected.toUpperCase().startsWith(hex.toUpperCase().slice(0, 7))
        return (
          <button key={hex} title={name} onClick={() => onSelect(hex)}
            style={{
              width: 22, height: 22, borderRadius: '50%', backgroundColor: hex,
              border: isActive ? '3px solid var(--foreground)' : '1.5px solid var(--border)',
              outline: isActive ? '2px solid var(--background)' : 'none',
              outlineOffset: -1, cursor: 'pointer', flexShrink: 0,
            }} />
        )
      })}
      <label title="Cor personalizada" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <input type="color"
          value={selected.startsWith('#') ? selected.slice(0, 7) : '#0055ff'}
          onChange={(e) => onSelect(e.target.value)}
          style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid var(--border)', padding: 0, cursor: 'pointer', backgroundColor: 'transparent' }} />
      </label>
    </div>
  )
}

// Reusable logo upload block
function LogoBlock({
  label, visible, logoImage, onToggleVisible, onUpload, onRemove,
}: {
  label: string; visible: boolean; logoImage: string | null
  onToggleVisible: () => void; onUpload: (url: string) => void; onRemove: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl"
      style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)' }}>
      <SectionLabel>{label}</SectionLabel>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return
          const r = new FileReader(); r.onload = (ev) => onUpload(ev.target?.result as string); r.readAsDataURL(f)
          e.target.value = ''
        }} />
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={onToggleVisible}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95"
          style={{
            backgroundColor: visible ? 'var(--primary)' : 'var(--card)',
            color: visible ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            border: visible ? 'none' : '1px solid var(--border)',
          }}>
          {visible ? <Eye size={12} /> : <EyeOff size={12} />}
          <span className="body">{visible ? 'Visível' : 'Oculto'}</span>
        </button>
        {visible && (
          <button onClick={() => ref.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95"
            style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
            <span className="body">{logoImage ? 'Trocar' : 'Upload'}</span>
          </button>
        )}
        {logoImage && (
          <button onClick={onRemove} className="p-1.5 rounded-full transition-all"
            style={{ backgroundColor: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>
      {logoImage && visible && (
        <div className="rounded overflow-hidden flex items-center px-2" style={{ height: 28, width: 72, backgroundColor: '#00143D' }}>
          <img src={logoImage} className="h-full object-contain" alt={label} />
        </div>
      )}
    </div>
  )
}

// ─── Tab: Arte ────────────────────────────────────────────────────────────────

function ArteTab() {
  const formato      = useWhatsappStore((s) => s.formato)
  const bgImage      = useWhatsappStore((s) => s.backgroundImage)
  const logoImage    = useWhatsappStore((s) => s.logoImage)
  const logoVisible  = useWhatsappStore((s) => s.logoVisible)
  const logo2Image   = useWhatsappStore((s) => s.logo2Image)
  const logo2Visible = useWhatsappStore((s) => s.logo2Visible)
  const accentColor  = useWhatsappStore((s) => s.accentColor)

  const setFormato   = useWhatsappStore((s) => s.setFormato)
  const setBg        = useWhatsappStore((s) => s.setBackgroundImage)
  const setLogoImg   = useWhatsappStore((s) => s.setLogoImage)
  const setLogoVis   = useWhatsappStore((s) => s.setLogoVisible)
  const setLogo2Img  = useWhatsappStore((s) => s.setLogo2Image)
  const setLogo2Vis  = useWhatsappStore((s) => s.setLogo2Visible)
  const setAccent    = useWhatsappStore((s) => s.setAccentColor)

  const bgRef = useRef<HTMLInputElement>(null)

  return (
    /* 3-column grid — each section slots naturally */
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>

      {/* ── Formato — spans all 3 cols ── */}
      <div style={{ gridColumn: '1 / -1' }}>
        <SectionLabel>Formato</SectionLabel>
        <div className="flex gap-2">
          {FORMATS.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setFormato(value)}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-95"
              style={{
                backgroundColor: formato === value ? 'var(--primary)' : 'var(--input)',
                color: formato === value ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                border: formato === value ? 'none' : '1px solid var(--border)',
                boxShadow: formato === value ? '0 2px 8px rgba(0,85,255,0.25)' : 'none',
              }}>
              <Icon size={13} /><span className="body">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── Plano de fundo — col 1 ── */}
      <div className="flex flex-col gap-2 p-3 rounded-xl"
        style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)' }}>
        <SectionLabel>Plano de fundo</SectionLabel>
        <input ref={bgRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return
            const r = new FileReader(); r.onload = (ev) => setBg(ev.target?.result as string); r.readAsDataURL(f)
            e.target.value = ''
          }} />
        <div className="flex flex-col gap-2">
          {bgImage && (
            <div className="rounded-lg overflow-hidden" style={{ width: '100%', aspectRatio: '1', maxHeight: 80 }}>
              <img src={bgImage} className="w-full h-full object-cover" alt="bg" />
            </div>
          )}
          <button onClick={() => bgRef.current?.click()}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-full transition-all active:scale-95 hover-lift w-full"
            style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
            <Image size={13} />
            <span className="body">{bgImage ? 'Trocar' : 'Adicionar'}</span>
          </button>
          {bgImage && (
            <button onClick={() => setBg(null)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 w-full"
              style={{ backgroundColor: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <Trash2 size={12} /><span className="body">Remover</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Logo esquerdo — col 2 ── */}
      <LogoBlock label="Logo — esq." visible={logoVisible} logoImage={logoImage}
        onToggleVisible={() => setLogoVis(!logoVisible)}
        onUpload={setLogoImg} onRemove={() => setLogoImg(null)} />

      {/* ── Logo direito — col 3 ── */}
      <LogoBlock label="Logo — dir." visible={logo2Visible} logoImage={logo2Image}
        onToggleVisible={() => setLogo2Vis(!logo2Visible)}
        onUpload={setLogo2Img} onRemove={() => setLogo2Img(null)} />

      <Divider />

      {/* ── Cor de destaque — spans all 3 cols ── */}
      <div style={{ gridColumn: '1 / -1' }}>
        <SectionLabel>Cor de destaque (brandbook)</SectionLabel>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Principais</span>
              <ColorSwatches colors={BRAND_PRIMARY} selected={accentColor} onSelect={setAccent} />
            </div>
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Secundárias</span>
              <ColorSwatches colors={BRAND_SECONDARY} selected={accentColor} onSelect={setAccent} />
            </div>
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Apoio</span>
              <ColorSwatches colors={BRAND_SUPPORT} selected={accentColor} onSelect={setAccent} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CTA properties panel ─────────────────────────────────────────────────────

function CtaProperties() {
  const ctaText1       = useWhatsappStore((s) => s.ctaText1)
  const ctaText2       = useWhatsappStore((s) => s.ctaText2)
  const ctaBorderColor = useWhatsappStore((s) => s.ctaBorderColor)
  const ctaFontSize    = useWhatsappStore((s) => s.ctaFontSize)
  const setCtaText1    = useWhatsappStore((s) => s.setCtaText1)
  const setCtaText2    = useWhatsappStore((s) => s.setCtaText2)
  const setCtaBorder   = useWhatsappStore((s) => s.setCtaBorderColor)
  const setCtaFont     = useWhatsappStore((s) => s.setCtaFontSize)

  const total = ctaText1.length + ctaText2.length
  const remaining = 40 - total

  const handleText1 = (v: string) => {
    if (v.length + ctaText2.length <= 40) setCtaText1(v)
  }
  const handleText2 = (v: string) => {
    if (ctaText1.length + v.length <= 40) setCtaText2(v)
  }

  // Green tones from brandbook as border color options
  const BORDER_COLORS = [
    { hex: '#2BBD68', name: 'Emerald Green' },
    { hex: '#249555', name: 'Deep Green' },
    { hex: '#77DBA4', name: 'Mint Medium' },
    { hex: '#0055FF', name: 'Brand Blue' },
    { hex: '#6593FF', name: 'Periwinkle Blue' },
    { hex: '#FC6058', name: 'Coral Red' },
    { hex: '#FAA200', name: 'Amber' },
    { hex: '#FFFFFF', name: 'Branco' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>Editar: CTA</SectionLabel>

      {/* Preview do box */}
      <div className="flex items-center justify-center py-3 rounded-xl"
        style={{ backgroundColor: '#0a1628', border: '1px solid var(--border)' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '8px 20px', borderRadius: 999,
          border: `2px solid ${ctaBorderColor}`,
          backgroundColor: 'rgba(0,20,61,0.72)',
          boxShadow: `0 0 16px ${ctaBorderColor}55`,
        }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 400, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            {ctaText1.trimEnd()}
          </span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 400, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>{' '}</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            {ctaText2.trimStart()}
          </span>
        </div>
      </div>

      {/* Texto normal + bold */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="flex flex-col gap-1">
          <SectionLabel>Texto normal</SectionLabel>
          <input
            value={ctaText1}
            onChange={(e) => handleText1(e.target.value)}
            className="px-3 py-2 rounded-xl body"
            style={{
              backgroundColor: 'var(--input)', border: '1px solid var(--border)',
              color: 'var(--foreground)', outline: 'none', width: '100%',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <SectionLabel>Texto negrito</SectionLabel>
          <input
            value={ctaText2}
            onChange={(e) => handleText2(e.target.value)}
            className="px-3 py-2 rounded-xl body"
            style={{
              backgroundColor: 'var(--input)', border: '1px solid var(--border)',
              color: 'var(--foreground)', outline: 'none', width: '100%',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 700,
            }}
          />
        </div>
      </div>

      {/* Contador de caracteres */}
      <div className="flex justify-end">
        <span className="detail-regular"
          style={{ color: remaining <= 5 ? '#FC6058' : 'var(--muted-foreground)' }}>
          {total}/40 caracteres
        </span>
      </div>

      {/* Tamanho da fonte */}
      <div className="flex flex-col gap-1">
        <SectionLabel>Tamanho: {ctaFontSize}px</SectionLabel>
        <input type="range" min={28} max={100} step={2}
          value={ctaFontSize}
          onChange={(e) => setCtaFont(Number(e.target.value))}
          style={{ width: '100%' }} />
      </div>

      {/* Cor da borda */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Cor da borda</SectionLabel>
        <ColorSwatches colors={BORDER_COLORS} selected={ctaBorderColor} onSelect={setCtaBorder} />
      </div>
    </div>
  )
}

// ─── Tab: Textos ──────────────────────────────────────────────────────────────

function TextosTab() {
  const elements      = useWhatsappStore((s) => s.elements)
  const selectedId    = useWhatsappStore((s) => s.selectedId)
  const ctaVisible    = useWhatsappStore((s) => s.ctaVisible)
  const addElement    = useWhatsappStore((s) => s.addElement)
  const updateElement = useWhatsappStore((s) => s.updateElement)
  const removeElement = useWhatsappStore((s) => s.removeElement)
  const selectElement = useWhatsappStore((s) => s.selectElement)
  const setCtaVisible = useWhatsappStore((s) => s.setCtaVisible)

  const ctaSelected = selectedId === CTA_ID
  const selectedEl  = ctaSelected ? null : (elements.find((e) => e.id === selectedId) ?? null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'start' }}>

      {/* ── Left: list ── */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Caixas de texto</SectionLabel>

        {/* Regular text elements */}
        {elements.map((el, i) => (
          <button key={el.id}
            onClick={() => selectElement(selectedId === el.id ? null : el.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all w-full text-left"
            style={{
              backgroundColor: selectedId === el.id ? 'rgba(0,85,255,0.07)' : 'var(--input)',
              border: selectedId === el.id ? '1.5px solid var(--primary)' : '1px solid var(--border)',
              cursor: 'pointer',
            }}>
            <Move size={11} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
            <span className="detail-medium flex-shrink-0"
              style={{ color: selectedId === el.id ? 'var(--primary)' : 'var(--muted-foreground)', minWidth: 18 }}>
              T{i + 1}
            </span>
            <span className="body flex-1 truncate" style={{ color: 'var(--foreground)' }}>{el.content}</span>
            <span onClick={(e) => { e.stopPropagation(); removeElement(el.id) }}
              className="flex-shrink-0 p-1 rounded-full hover:opacity-70 transition-all"
              style={{ color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex' }}>
              <Trash2 size={12} />
            </span>
          </button>
        ))}

        {/* CTA item */}
        <button
          onClick={() => {
            if (!ctaVisible) { setCtaVisible(true); selectElement(CTA_ID) }
            else selectElement(ctaSelected ? null : CTA_ID)
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all w-full text-left"
          style={{
            backgroundColor: ctaSelected ? 'rgba(43,189,104,0.09)' : 'var(--input)',
            border: ctaSelected
              ? '1.5px solid #2BBD68'
              : ctaVisible
                ? '1px solid #2BBD6866'
                : '1px dashed var(--border)',
            cursor: 'pointer',
          }}>
          <Move size={11} style={{ color: ctaVisible ? '#2BBD68' : 'var(--muted-foreground)', flexShrink: 0 }} />
          <span className="detail-medium flex-shrink-0"
            style={{ color: ctaSelected ? '#2BBD68' : 'var(--muted-foreground)', minWidth: 18, fontSize: 10 }}>
            CTA
          </span>
          <span className="body flex-1 truncate" style={{ color: ctaVisible ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
            Reserve no link da bio
          </span>
          {ctaVisible && (
            <span
              onClick={(e) => { e.stopPropagation(); setCtaVisible(false); if (ctaSelected) selectElement(null) }}
              className="flex-shrink-0 p-1 rounded-full hover:opacity-70 transition-all"
              style={{ color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex' }}>
              <EyeOff size={12} />
            </span>
          )}
        </button>

        <button onClick={addElement}
          className="flex items-center gap-2 px-3 py-2 rounded-full transition-all active:scale-95 hover-lift"
          style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: 'none' }}>
          <Plus size={13} /><span className="body">Adicionar texto</span>
        </button>
      </div>

      {/* ── Right: properties ── */}
      <div className="flex flex-col gap-3">
        {ctaSelected ? (
          <CtaProperties />
        ) : selectedEl ? (
          <>
            <SectionLabel>Editar: T{elements.findIndex(e => e.id === selectedEl.id) + 1}</SectionLabel>

            <textarea value={selectedEl.content} rows={3}
              onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
              className="w-full px-3 py-2 rounded-xl body resize-none"
              style={{
                backgroundColor: 'var(--input)', border: '1.5px solid var(--primary)',
                color: 'var(--foreground)', outline: 'none', lineHeight: 1.5,
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="flex flex-col gap-1">
                <SectionLabel>Tamanho: {selectedEl.fontSize}px</SectionLabel>
                <input type="range" min={18} max={200} step={2}
                  value={selectedEl.fontSize}
                  onChange={(e) => updateElement(selectedEl.id, { fontSize: Number(e.target.value) })}
                  style={{ width: '100%' }} />
              </div>
              <div className="flex flex-col gap-1">
                <SectionLabel>Largura: {selectedEl.width}px</SectionLabel>
                <input type="range" min={200} max={1060} step={20}
                  value={selectedEl.width}
                  onChange={(e) => updateElement(selectedEl.id, { width: Number(e.target.value) })}
                  style={{ width: '100%' }} />
              </div>
            </div>

            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                <SectionLabel>Peso</SectionLabel>
                <button
                  onClick={() => updateElement(selectedEl.id, { fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95"
                  style={{
                    backgroundColor: selectedEl.fontWeight === 'bold' ? 'var(--primary)' : 'var(--input)',
                    color: selectedEl.fontWeight === 'bold' ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                    border: selectedEl.fontWeight === 'bold' ? 'none' : '1px solid var(--border)',
                  }}>
                  <Bold size={13} />
                  <span className="body">{selectedEl.fontWeight === 'bold' ? 'Bold' : 'Normal'}</span>
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <SectionLabel>Alinhamento</SectionLabel>
                <div className="flex gap-1">
                  {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
                    <button key={value}
                      onClick={() => updateElement(selectedEl.id, { textAlign: value })}
                      className="p-2 rounded-lg transition-all active:scale-95"
                      style={{
                        backgroundColor: selectedEl.textAlign === value ? 'var(--primary)' : 'var(--input)',
                        color: selectedEl.textAlign === value ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                        border: selectedEl.textAlign === value ? 'none' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}>
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <SectionLabel>Cor do texto</SectionLabel>
              <ColorSwatches colors={TEXT_COLORS} selected={selectedEl.color}
                onSelect={(hex) => updateElement(selectedEl.id, { color: hex })} />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 px-4 py-5 rounded-xl"
            style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)' }}>
            <MousePointerClick size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <span className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
              Clique em um item à esquerda para editar suas propriedades
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Exportar ────────────────────────────────────────────────────────────

function ExportarTab() {
  const formato = useWhatsappStore((s) => s.formato)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    const el = document.getElementById('creative-preview')
    if (!el) return
    setExporting(true)
    try {
      const { width, height } = DIMENSIONS[formato]
      const dataUrl = await toPng(el, { width, height, pixelRatio: 1 })
      saveAs(dataUrl, `seazone_whatsapp_${formato.replace(':', 'x')}.png`)
    } catch (err) {
      console.error('Export error:', err)
    }
    setExporting(false)
  }

  const { width, height } = DIMENSIONS[formato]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

      {/* Info */}
      <div className="p-4 rounded-xl flex flex-col gap-3"
        style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)' }}>
        <SectionLabel>Configuração atual</SectionLabel>
        {[
          ['Formato',   formato === '1:1' ? 'WhatsApp 1:1' : 'Story 9:16'],
          ['Dimensão',  `${width} × ${height}px`],
          ['Resolução', '72 dpi (tela)'],
          ['Saída',     'PNG'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between items-center">
            <span className="body-regular" style={{ color: 'var(--muted-foreground)' }}>{k}</span>
            <span className="body" style={{ color: 'var(--foreground)' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Export action */}
      <div className="flex flex-col gap-3">
        <SectionLabel>Download</SectionLabel>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl transition-all hover:opacity-90 active:scale-95 hover-lift"
          style={{
            backgroundColor: exporting ? 'var(--muted)' : 'var(--cores-verde-600, #5EA500)',
            color: exporting ? 'var(--muted-foreground)' : '#FFFFFF',
            border: 'none', opacity: exporting ? 0.7 : 1,
          }}>
          {exporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          <span className="p-ui" style={{ fontSize: 15 }}>
            {exporting ? 'Exportando...' : 'Baixar PNG'}
          </span>
        </button>
        <span className="detail-regular text-center" style={{ color: 'var(--muted-foreground)' }}>
          Exporta em {width}×{height}px — pronto para WhatsApp
        </span>
      </div>
    </div>
  )
}

// ─── Main panel with tabs ─────────────────────────────────────────────────────

export function WaPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('arte')
  const elements   = useWhatsappStore((s) => s.elements)
  const selectedId = useWhatsappStore((s) => s.selectedId)
  const formato    = useWhatsappStore((s) => s.formato)
  const setBg      = useWhatsappStore((s) => s.setBackgroundImage)

  return (
    <div className="flex flex-col"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--elevation-sm)',
      }}>

      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--input)' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive   = activeTab === id
          const showDot    = id === 'textos' && selectedId !== null
          const showBadge  = id === 'textos' && !showDot && elements.length > 0

          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex items-center justify-center gap-1.5 py-3.5 transition-all active:scale-95 relative flex-1"
              style={{
                backgroundColor: isActive ? 'var(--card)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
              }}>
              <Icon size={14} />
              <span className="body">{label}</span>
              {showDot && (
                <span style={{ position: 'absolute', top: 8, right: 14, width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
              )}
              {showBadge && (
                <span className="detail-medium"
                  style={{ fontSize: 10, backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', borderRadius: 999, padding: '1px 5px', lineHeight: 1.6 }}>
                  {elements.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: 20 }}>
        {activeTab === 'arte'     && <ArteTab />}
        {activeTab === 'textos'   && <TextosTab />}
        {activeTab === 'ia' && (
          <AiTab
            aspectRatio={formato}
            context={`arte ${formato} para imóvel, identidade Seazone`}
            onGenerated={setBg}
          />
        )}
        {activeTab === 'exportar' && <ExportarTab />}
      </div>
    </div>
  )
}
