import { useRef, useState, useEffect } from 'react'
import { useCampanhaStore } from '../../stores/campanhaStore'
import {
  Link2, FileText, PenLine, Upload, X, ArrowRight,
  Loader2, CheckCircle2, AlertCircle, MessageSquare, ImageIcon, Server, WifiOff,
} from 'lucide-react'

type TabId = 'url' | 'pdf' | 'manual' | 'image'

const TABS: { id: TabId; label: string; icon: typeof Link2 }[] = [
  { id: 'url',    label: 'Link',    icon: Link2 },
  { id: 'pdf',    label: 'PDF',     icon: FileText },
  { id: 'image',  label: 'Imagem',  icon: ImageIcon },
  { id: 'manual', label: 'Texto',   icon: PenLine },
]

export function BriefingInput() {
  const briefingType      = useCampanhaStore((s) => s.briefingType)
  const briefingUrl       = useCampanhaStore((s) => s.briefingUrl)
  const briefingPdf       = useCampanhaStore((s) => s.briefingPdf)
  const briefingPdfName   = useCampanhaStore((s) => s.briefingPdfName)
  const briefingManual    = useCampanhaStore((s) => s.briefingManual)
  const briefingImage     = useCampanhaStore((s) => s.briefingImage)
  const briefingImageName = useCampanhaStore((s) => s.briefingImageName)
  const briefingContext   = useCampanhaStore((s) => s.briefingContext)
  const parsedBriefing    = useCampanhaStore((s) => s.parsedBriefing)

  const setBriefingType    = useCampanhaStore((s) => s.setBriefingType)
  const setBriefingUrl     = useCampanhaStore((s) => s.setBriefingUrl)
  const setBriefingPdf     = useCampanhaStore((s) => s.setBriefingPdf)
  const setBriefingManual  = useCampanhaStore((s) => s.setBriefingManual)
  const setBriefingImage   = useCampanhaStore((s) => s.setBriefingImage)
  const setBriefingContext = useCampanhaStore((s) => s.setBriefingContext)
  const setParsedBriefing  = useCampanhaStore((s) => s.setParsedBriefing)
  const setCampaignName    = useCampanhaStore((s) => s.setCampaignName)
  const setStep            = useCampanhaStore((s) => s.setStep)

  const [analyzing, setAnalyzing]       = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [serverOk, setServerOk]         = useState<boolean | null>(null)
  const fileRef  = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  // Ping server status on mount
  useEffect(() => {
    let cancelled = false
    const ping = async () => {
      try {
        const res = await fetch('/api/ai/status', { signal: AbortSignal.timeout(4000) })
        if (!cancelled) setServerOk(res.ok)
      } catch {
        if (!cancelled) setServerOk(false)
      }
    }
    ping()
    return () => { cancelled = true }
  }, [])

  const hasContent =
    (briefingType === 'url'    && briefingUrl.trim().length > 8) ||
    (briefingType === 'pdf'    && !!briefingPdf) ||
    (briefingType === 'image'  && !!briefingImage) ||
    (briefingType === 'manual' && briefingManual.trim().length > 20)

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setBriefingPdf(ev.target?.result as string, file.name)
    reader.readAsDataURL(file)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setBriefingImage(ev.target?.result as string, file.name)
    reader.readAsDataURL(file)
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setAnalyzeError(null)
    setParsedBriefing(null)

    // Re-check server before attempting
    try {
      const ping = await fetch('/api/ai/status', { signal: AbortSignal.timeout(3000) })
      setServerOk(ping.ok)
      if (!ping.ok) {
        setAnalyzeError('Servidor de IA offline. Execute: npm run dev:full na pasta do projeto.')
        setAnalyzing(false)
        return
      }
    } catch {
      setServerOk(false)
      setAnalyzeError('Servidor de IA offline. Execute: npm run dev:full na pasta do projeto.')
      setAnalyzing(false)
      return
    }

    try {
      const res = await fetch('/api/campanha/parse-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: briefingType,
          url: briefingUrl,
          pdfData: briefingPdf,
          imageData: briefingImage,
          manual: briefingManual,
          context: briefingContext.trim() || undefined,
        }),
      })

      // Guard against empty body before calling .json()
      const text = await res.text()
      if (!text || text.trim() === '') {
        throw new Error('O servidor não respondeu. Verifique se ele está rodando (npm run dev:full).')
      }

      let data: Record<string, unknown>
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Resposta inválida do servidor: ${text.slice(0, 150)}`)
      }

      if (!res.ok) throw new Error((data.error as string) ?? 'Erro ao analisar briefing')
      setParsedBriefing(data.briefing as Parameters<typeof setParsedBriefing>[0])
      const briefing = data.briefing as { produto?: string } | null
      if (briefing?.produto) setCampaignName(briefing.produto)
    } catch (err) {
      setAnalyzeError(String(err))
    }

    setAnalyzing(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* Server status banner */}
      {serverOk === false && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <WifiOff size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 600, color: '#EF4444' }}>
              Servidor de IA offline
            </span>
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: 'rgba(239,68,68,0.8)' }}>
              Execute no terminal: <code style={{ backgroundColor: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>npm run dev:full</code> dentro de <code style={{ backgroundColor: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>C:\Users\Seazone\creative-automation</code>
            </span>
          </div>
        </div>
      )}
      {serverOk === true && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <Server size={13} style={{ color: '#22C55E', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: '#22C55E' }}>Servidor de IA online</span>
        </div>
      )}

      {/* Source tabs */}
      <div
        className="flex rounded-2xl overflow-hidden p-1"
        style={{ backgroundColor: 'var(--secondary)', gap: 2 }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setBriefingType(id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all"
            style={{
              backgroundColor: briefingType === id ? 'var(--card)' : 'transparent',
              color: briefingType === id ? 'var(--foreground)' : 'var(--muted-foreground)',
              border: 'none',
              boxShadow: briefingType === id ? 'var(--elevation-sm)' : 'none',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 14,
              fontWeight: briefingType === id ? 600 : 400,
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* URL */}
        {briefingType === 'url' && (
          <div className="p-6 flex flex-col gap-3">
            <label className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>
              Link do briefing
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }}
                />
                <input
                  type="url"
                  value={briefingUrl}
                  onChange={(e) => setBriefingUrl(e.target.value)}
                  placeholder="https://docs.google.com/..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl body"
                  style={{
                    backgroundColor: 'var(--input)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    outline: 'none',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  }}
                />
              </div>
            </div>
            <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
              Suportado: Google Docs, Notion, links públicos
            </span>
          </div>
        )}

        {/* PDF */}
        {briefingType === 'pdf' && (
          <div className="p-6">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />
            {briefingPdf ? (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'rgba(0,85,255,0.06)', border: '1px solid rgba(0,85,255,0.15)' }}
              >
                <FileText size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <span className="body-medium truncate block" style={{ color: 'var(--foreground)' }}>
                    {briefingPdfName}
                  </span>
                  <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
                    PDF carregado com sucesso
                  </span>
                </div>
                <button
                  onClick={() => setBriefingPdf(null, null)}
                  className="p-1.5 rounded-full transition-all"
                  style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-3 py-10 rounded-2xl transition-all hover:opacity-80"
                style={{
                  backgroundColor: 'var(--secondary)',
                  border: '2px dashed var(--border)',
                  cursor: 'pointer',
                }}
              >
                <Upload size={28} style={{ color: 'var(--muted-foreground)' }} />
                <div className="flex flex-col items-center gap-1">
                  <span className="body-medium" style={{ color: 'var(--foreground)' }}>
                    Clique para fazer upload do PDF
                  </span>
                  <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
                    ou arraste e solte aqui
                  </span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Image upload */}
        {briefingType === 'image' && (
          <div className="p-6">
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            {briefingImage ? (
              <div className="flex flex-col gap-3">
                {/* Preview */}
                <div className="relative rounded-2xl overflow-hidden" style={{ maxHeight: 320, backgroundColor: 'var(--secondary)' }}>
                  <img
                    src={briefingImage}
                    alt="briefing"
                    className="w-full object-contain"
                    style={{ maxHeight: 320 }}
                  />
                  <button
                    onClick={() => setBriefingImage(null, null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full transition-all"
                    style={{ backgroundColor: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* File info + change button */}
                <div className="flex items-center justify-between gap-3">
                  <span className="detail-regular truncate" style={{ color: 'var(--muted-foreground)' }}>
                    {briefingImageName}
                  </span>
                  <button
                    onClick={() => imageRef.current?.click()}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                    style={{ backgroundColor: 'var(--secondary)', border: 'none', color: 'var(--secondary-foreground)', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, cursor: 'pointer' }}
                  >
                    <Upload size={12} /> Trocar imagem
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => imageRef.current?.click()}
                className="w-full flex flex-col items-center gap-3 py-10 rounded-2xl transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--secondary)', border: '2px dashed var(--border)', cursor: 'pointer' }}
              >
                <ImageIcon size={28} style={{ color: 'var(--muted-foreground)' }} />
                <div className="flex flex-col items-center gap-1">
                  <span className="body-medium" style={{ color: 'var(--foreground)' }}>
                    Clique para enviar um print do briefing
                  </span>
                  <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
                    PNG, JPG, WEBP — a IA vai ler o conteúdo da imagem
                  </span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Manual text */}
        {briefingType === 'manual' && (
          <div className="p-6 flex flex-col gap-3">
            <label className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>
              Cole ou escreva o briefing
            </label>
            <textarea
              value={briefingManual}
              onChange={(e) => setBriefingManual(e.target.value)}
              placeholder="Descreva o produto, público-alvo, mensagens principais, tom desejado, diferenciais, prazo..."
              rows={8}
              className="w-full px-4 py-3 rounded-xl body resize-none"
              style={{
                backgroundColor: 'var(--input)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                outline: 'none',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                lineHeight: 1.6,
              }}
            />
            <div className="flex justify-end">
              <span className="detail-regular" style={{ color: briefingManual.length > 3000 ? 'var(--destructive)' : 'var(--muted-foreground)' }}>
                {briefingManual.length} / 3000
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Extra context / guidance for AI */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div
          className="px-5 py-3 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <MessageSquare size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          <span className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>
            Orientações adicionais para a IA  <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span>
          </span>
        </div>
        <div className="p-5">
          <textarea
            value={briefingContext}
            onChange={(e) => setBriefingContext(e.target.value)}
            placeholder={'Ex: "Analise a aba estrutura de criativos e extraia os diferenciais de gestão"\nEx: "Foque nos dados financeiros da seção de investimento"\nEx: "O produto principal é o Empreendimento X, ignore as informações gerais"'}
            rows={3}
            className="w-full px-4 py-3 rounded-xl body resize-none"
            style={{
              backgroundColor: 'var(--input)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              outline: 'none',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          />
        </div>
      </div>

      {/* Analyze button */}
      {!parsedBriefing && (
        <button
          onClick={handleAnalyze}
          disabled={!hasContent || analyzing}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full transition-all hover:opacity-90 active:scale-95 hover-lift"
          style={{
            backgroundColor: hasContent && !analyzing ? 'var(--primary)' : 'var(--muted)',
            color: hasContent && !analyzing ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            border: 'none',
            opacity: !hasContent ? 0.5 : 1,
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          }}
        >
          {analyzing
            ? <Loader2 size={17} className="animate-spin" />
            : <CheckCircle2 size={17} />
          }
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {analyzing ? 'Analisando briefing com IA...' : 'Analisar briefing'}
          </span>
        </button>
      )}

      {/* Error */}
      {analyzeError && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
          <span className="body-regular" style={{ color: '#EF4444' }}>{analyzeError}</span>
        </div>
      )}

      {/* Parsed briefing preview */}
      {parsedBriefing && (
        <div
          className="rounded-2xl overflow-hidden animate-fade-in-up"
          style={{ backgroundColor: 'var(--card)', border: '1.5px solid rgba(0,85,255,0.2)' }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ backgroundColor: 'rgba(0,85,255,0.06)', borderBottom: '1px solid rgba(0,85,255,0.1)' }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--primary)' }} />
            <span className="body-medium" style={{ color: 'var(--primary)' }}>
              Briefing analisado com sucesso
            </span>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <BriefingField label="Produto / Campanha" value={parsedBriefing.produto} />
            <BriefingField label="Público-alvo" value={parsedBriefing.publicoAlvo} />
            <BriefingField label="Tom" value={parsedBriefing.tom} />
            <BriefingField label="CTA principal" value={parsedBriefing.cta} />
            {parsedBriefing.mensagensPrincipais.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>
                  Mensagens principais
                </span>
                <div className="flex flex-col gap-1">
                  {parsedBriefing.mensagensPrincipais.map((m, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span style={{ color: 'var(--primary)', fontSize: 12, marginTop: 3 }}>•</span>
                      <span className="body-regular" style={{ color: 'var(--foreground)' }}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setParsedBriefing(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-95"
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13 }}
              >
                Reanalisar
              </button>
              <button
                onClick={() => setStep('assets')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-full transition-all hover:opacity-90 active:scale-95 hover-lift"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 600 }}
              >
                Continuar para Assets
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BriefingField({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-1">
      <span className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <span className="body-regular" style={{ color: 'var(--foreground)' }}>{value}</span>
    </div>
  )
}
