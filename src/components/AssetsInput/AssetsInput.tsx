import { useBriefingStore } from '../../stores/StoreContext'
import { useCallback, useRef } from 'react'
import {
  Link, Upload, X, ArrowLeft, ArrowRight,
  ImageIcon, Palette, Plus, CheckCircle2, Images, Wand2
} from 'lucide-react'
import { AiTab } from '../shared/AiTab'

export function AssetsInput() {
  const briefing = useBriefingStore((s) => s.briefing)
  const setDriveLink = useBriefingStore((s) => s.setDriveLink)
  const setReferenceImage = useBriefingStore((s) => s.setReferenceImage)
  const setLogoImage = useBriefingStore((s) => s.setLogoImage)
  const setAccentColor = useBriefingStore((s) => s.setAccentColor)
  const addBackgroundImage = useBriefingStore((s) => s.addBackgroundImage)
  const removeBackgroundImage = useBriefingStore((s) => s.removeBackgroundImage)
  const setStep = useBriefingStore((s) => s.setStep)
  const bgInputRef = useRef<HTMLInputElement>(null)

  const readFile = (file: File): Promise<string> =>
    new Promise((res) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.readAsDataURL(file)
    })

  const handleBgUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      for (const file of files) {
        const dataUrl = await readFile(file)
        addBackgroundImage(dataUrl)
      }
      e.target.value = ''
    },
    [addBackgroundImage]
  )

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) setLogoImage(await readFile(file))
    },
    [setLogoImage]
  )

  const handleRefUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) setReferenceImage(await readFile(file))
    },
    [setReferenceImage]
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2>Assets</h2>
        <span className="subtle-regular" style={{ color: 'var(--muted-foreground)' }}>
          Faça upload das fotos do imóvel, logo e referência visual
        </span>
      </div>

      {/* ─── Fotos de fundo ─────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, var(--cores-azul-50) 0%, rgba(0,85,255,0.03) 100%)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-full" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
              <Images size={16} />
            </span>
            <div>
              <span className="body block" style={{ color: 'var(--foreground)' }}>Fotos do imóvel</span>
              <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
                {briefing.backgroundImages.length} foto(s) · usadas como fundo do criativo
              </span>
            </div>
          </div>
          {briefing.backgroundImages.length > 0 && (
            <CheckCircle2 size={18} style={{ color: 'var(--cores-verde-600, #5EA500)' }} />
          )}
        </div>

        <div className="p-5">
          {/* Grid de thumbnails */}
          {briefing.backgroundImages.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
              {briefing.backgroundImages.map((img, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden animate-scale-in" style={{ aspectRatio: '3/4' }}>
                  <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <button
                      onClick={() => removeBackgroundImage(i)}
                      className="w-8 h-8 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: 'var(--destructive)', color: '#fff', border: 'none' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <span
                    className="absolute bottom-1 left-1 detail-medium px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Botão adicionar */}
          <input ref={bgInputRef} type="file" accept="image/*" multiple onChange={handleBgUpload} className="hidden" />
          <button
            onClick={() => bgInputRef.current?.click()}
            className="w-full py-3 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 hover-glow"
            style={{ border: '2px dashed var(--border)', backgroundColor: 'transparent', color: 'var(--muted-foreground)' }}
          >
            <Plus size={16} />
            <span className="p-ui-medium">Adicionar fotos</span>
          </button>
        </div>
      </div>

      {/* ─── Gerar com IA ──────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(0,85,255,0.25)', backgroundColor: 'var(--card)', boxShadow: 'var(--elevation-sm)', background: 'linear-gradient(135deg, rgba(0,85,255,0.04) 0%, var(--card) 100%)' }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(0,85,255,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg, #0055FF, #6593FF)', color: '#fff' }}>
              <Wand2 size={16} />
            </span>
            <div>
              <span className="body block" style={{ color: 'var(--foreground)' }}>Gerar fundo com IA</span>
              <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
                Claude analisa a referência → Flux gera o fundo
              </span>
            </div>
          </div>
        </div>
        <div className="p-5">
          <AiTab
            aspectRatio="4:5"
            context="arte 4:5 feed Instagram para imóvel, identidade Seazone"
            onGenerated={(dataUrl) => addBackgroundImage(dataUrl)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ─── Logo ──────────────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--cores-azul-50) 0%, transparent 100%)' }}>
            <span className="w-8 h-8 flex items-center justify-center rounded-full" style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}>
              <ImageIcon size={14} />
            </span>
            <div>
              <span className="body block" style={{ color: 'var(--foreground)' }}>Logo</span>
              <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
                {briefing.logoImage ? 'Customizado' : 'Seazone padrão'}
              </span>
            </div>
          </div>
          <div className="p-4">
            {briefing.logoImage ? (
              <div className="relative flex items-center justify-center mb-3 rounded-lg p-3"
                style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)' }}>
                <img src={briefing.logoImage} alt="Logo" className="max-h-12 max-w-full object-contain" />
                <button
                  onClick={() => setLogoImage(null)}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--destructive)', color: '#fff', border: 'none' }}
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center mb-3 rounded-lg p-3"
                style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', height: '60px' }}>
                <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>Logo Seazone</span>
              </div>
            )}
            <label className="w-full flex items-center justify-center gap-2 py-2 rounded-full cursor-pointer transition-all active:scale-95"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)', border: 'none' }}>
              <Upload size={13} />
              <span className="detail-medium">{briefing.logoImage ? 'Trocar logo' : 'Upload logo'}</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* ─── Referência visual ─────────────────────────────── */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--cores-azul-50) 0%, transparent 100%)' }}>
            <span className="w-8 h-8 flex items-center justify-center rounded-full" style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}>
              <ImageIcon size={14} />
            </span>
            <div>
              <span className="body block" style={{ color: 'var(--foreground)' }}>Ref. visual</span>
              <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>Estilo a seguir</span>
            </div>
          </div>
          <div className="p-4">
            {briefing.referenceImage ? (
              <div className="relative mb-3">
                <img src={briefing.referenceImage} alt="Referência" className="w-full rounded-lg object-cover" style={{ maxHeight: '60px', objectFit: 'cover' }} />
                <button
                  onClick={() => setReferenceImage(null)}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--destructive)', color: '#fff', border: 'none' }}
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center mb-3 rounded-lg" style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', height: '60px' }}>
                <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>Sem referência</span>
              </div>
            )}
            <label className="w-full flex items-center justify-center gap-2 py-2 rounded-full cursor-pointer transition-all active:scale-95"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)', border: 'none' }}>
              <Upload size={13} />
              <span className="detail-medium">{briefing.referenceImage ? 'Trocar' : 'Upload'}</span>
              <input type="file" accept="image/*" onChange={handleRefUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* ─── Cor de destaque ───────────────────────────────── */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--cores-azul-50) 0%, transparent 100%)' }}>
            <span className="w-8 h-8 flex items-center justify-center rounded-full" style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}>
              <Palette size={14} />
            </span>
            <div>
              <span className="body block" style={{ color: 'var(--foreground)' }}>Cor de destaque</span>
              <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>Headline e badges</span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex-shrink-0 border" style={{ backgroundColor: briefing.accentColor, borderColor: 'var(--border)' }} />
              <div className="flex flex-col gap-1.5">
                {['#F1605D', '#0055FF', '#FF8904', '#5EA500', '#9810FA'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-all active:scale-95"
                    style={{
                      backgroundColor: c,
                      borderColor: briefing.accentColor === c ? 'var(--foreground)' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
            <input
              type="color"
              value={briefing.accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-full h-9 rounded-full cursor-pointer"
              style={{ border: '1px solid var(--border)', padding: '2px 6px' }}
            />
          </div>
        </div>
      </div>

      {/* ─── Google Drive ──────────────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="w-9 h-9 flex items-center justify-center rounded-full" style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}>
            <Link size={15} />
          </span>
          <div>
            <span className="body block" style={{ color: 'var(--foreground)' }}>Google Drive (referência)</span>
            <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
              Link da pasta com os assets — para consulta manual
            </span>
          </div>
          {briefing.driveLink && <CheckCircle2 size={18} className="ml-auto" style={{ color: 'var(--cores-verde-600, #5EA500)' }} />}
        </div>
        <input
          type="url"
          value={briefing.driveLink}
          onChange={(e) => setDriveLink(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
          className="w-full px-4 py-2.5 outline-none transition-all"
          style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--foreground)' }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setStep(0)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full transition-all active:scale-95 hover-lift"
          style={{ backgroundColor: 'transparent', color: 'var(--foreground)', border: '1.5px solid var(--border)' }}
        >
          <ArrowLeft size={16} />
          <span className="p-ui-medium">Voltar</span>
        </button>
        <button
          onClick={() => setStep(2)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full transition-all hover:opacity-90 active:scale-95 hover-lift"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none' }}
        >
          <span className="p-ui">Próximo: Preview</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
