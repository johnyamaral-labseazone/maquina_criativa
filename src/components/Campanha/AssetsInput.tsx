import { useRef } from 'react'
import { useCampanhaStore } from '../../stores/campanhaStore'
import { Link2, FileText, User2, ChevronRight, Upload, X, CheckCircle2 } from 'lucide-react'

export function AssetsInput() {
  const assetsUrl      = useCampanhaStore((s) => s.assetsUrl)
  const assetsContext  = useCampanhaStore((s) => s.assetsContext)
  const presenterImage = useCampanhaStore((s) => s.presenterImage)
  const presenterImageName = useCampanhaStore((s) => s.presenterImageName)
  const parsedBriefing = useCampanhaStore((s) => s.parsedBriefing)

  const setAssetsUrl      = useCampanhaStore((s) => s.setAssetsUrl)
  const setAssetsContext   = useCampanhaStore((s) => s.setAssetsContext)
  const setPresenterImage  = useCampanhaStore((s) => s.setPresenterImage)
  const setStep            = useCampanhaStore((s) => s.setStep)

  const presenterInputRef = useRef<HTMLInputElement>(null)

  const handlePresenterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPresenterImage(ev.target?.result as string, file.name)
    }
    reader.readAsDataURL(file)
  }

  const canContinue = true // assets step is optional — always allow continuing

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* Briefing summary banner */}
      {parsedBriefing && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: 'rgba(0,85,255,0.06)', border: '1px solid rgba(0,85,255,0.15)' }}
        >
          <CheckCircle2 size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
            {parsedBriefing.produto}
          </span>
          <button
            onClick={() => setStep('briefing')}
            style={{ marginLeft: 'auto', backgroundColor: 'transparent', border: 'none', color: 'var(--muted-foreground)', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, cursor: 'pointer' }}
          >
            Editar briefing
          </button>
        </div>
      )}

      {/* Google Drive link */}
      <div
        className="p-6 rounded-2xl flex flex-col gap-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(0,85,255,0.1)' }}>
            <Link2 size={15} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>
              Link de assets (Google Drive)
            </span>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>
              Pasta com fotos, logotipos e materiais do empreendimento
            </p>
          </div>
        </div>

        <input
          type="url"
          value={assetsUrl}
          onChange={(e) => setAssetsUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
          className="w-full px-4 py-3 rounded-xl"
          style={{
            backgroundColor: 'var(--input)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            outline: 'none',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 14,
          }}
        />

        {/* Context guidance */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <FileText size={13} style={{ color: 'var(--muted-foreground)' }} />
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>
              Orientações para a IA
            </span>
          </div>
          <textarea
            value={assetsContext}
            onChange={(e) => setAssetsContext(e.target.value)}
            placeholder="Ex: Use as fotos aéreas do drone da pasta 'Externas', prefira imagens com o oceano ao fundo. Evite fotos de obra. A logo deve aparecer em todas as peças."
            rows={4}
            className="w-full px-4 py-3 rounded-xl resize-none"
            style={{
              backgroundColor: 'var(--input)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              outline: 'none',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          />
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: 'var(--muted-foreground)' }}>
            A IA vai usar esse texto para selecionar e usar os assets mais adequados da pasta
          </span>
        </div>
      </div>

      {/* Presenter photo */}
      <div
        className="p-6 rounded-2xl flex flex-col gap-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}>
            <User2 size={15} style={{ color: '#7C3AED' }} />
          </div>
          <div className="flex-1">
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>
              Foto da apresentadora
            </span>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>
              Referência usada nos vídeos com apresentadora — a IA a mantém consistente em todos os vídeos
            </p>
          </div>
          <span
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: '#7C3AED', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 10, flexShrink: 0 }}
          >
            Opcional
          </span>
        </div>

        {presenterImage ? (
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="relative flex-shrink-0">
              <img
                src={presenterImage}
                alt="Apresentadora"
                className="rounded-xl object-cover"
                style={{ width: 80, height: 100, objectFit: 'cover' }}
              />
              <button
                onClick={() => setPresenterImage(null, null)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                <X size={11} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>
                {presenterImageName ?? 'Foto carregada'}
              </span>
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: '#22C55E' }}>
                ✓ Será usada em todos os vídeos com apresentadora
              </span>
              <button
                onClick={() => presenterInputRef.current?.click()}
                style={{ alignSelf: 'flex-start', backgroundColor: 'transparent', border: 'none', color: 'var(--primary)', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, cursor: 'pointer', padding: 0 }}
              >
                Trocar foto
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => presenterInputRef.current?.click()}
            className="flex flex-col items-center gap-3 py-8 rounded-xl transition-all"
            style={{
              backgroundColor: 'rgba(124,58,237,0.04)',
              border: '1.5px dashed rgba(124,58,237,0.25)',
              cursor: 'pointer',
            }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}>
              <Upload size={18} style={{ color: '#7C3AED' }} />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 600, color: '#7C3AED' }}>
                Carregar foto da apresentadora
              </span>
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: 'var(--muted-foreground)' }}>
                PNG, JPG ou WEBP · Foto de rosto/corpo preferencialmente
              </span>
            </div>
          </button>
        )}

        <input
          ref={presenterInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handlePresenterUpload}
        />
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep('briefing')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all active:scale-95"
          style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, cursor: 'pointer' }}
        >
          ← Voltar
        </button>
        <button
          onClick={() => setStep('parametros')}
          disabled={!canContinue}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #1C398E 100%)',
            color: '#fff',
            border: 'none',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Continuar para parâmetros
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  )
}
