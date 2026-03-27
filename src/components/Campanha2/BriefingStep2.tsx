import { useRef, useState } from 'react'
import { useCampanha2Store } from '../../stores/campanha2Store'
import { Link2, FileText, Plus, X, ChevronRight, Image, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function BriefingStep2() {
  const { briefingUrls, briefingText, campaignName, setBriefingUrls, setBriefingText, setCampaignName, setStep } = useCampanha2Store()

  const [screenshots, setScreenshots] = useState<Array<{ dataUrl: string; name: string }>>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [analyzeSuccess, setAnalyzeSuccess] = useState('')
  const screenshotInputRef = useRef<HTMLInputElement>(null)

  const urls = briefingUrls.split('\n').map(u => u.trim()).filter(Boolean)
  const canContinue = urls.length > 0 || briefingText.trim().length > 10 || screenshots.length > 0

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - screenshots.length)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setScreenshots(prev => [...prev, { dataUrl: ev.target?.result as string, name: file.name }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleAnalyze = async () => {
    if (!screenshots.length || analyzing) return
    setAnalyzing(true)
    setAnalyzeError('')
    setAnalyzeSuccess('')
    try {
      const extracts: string[] = []
      for (const shot of screenshots) {
        const r = await fetch('/api/campanha/parse-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'image', imageData: shot.dataUrl }),
        })
        const d = await r.json() as { briefing?: Record<string, unknown>; error?: string }
        if (!r.ok || d.error) throw new Error(d.error ?? `Erro ${r.status}`)
        if (d.briefing) {
          const b = d.briefing
          const lines = [
            b.produto && `Produto: ${b.produto}`,
            b.localizacao && `Localização: ${b.localizacao}`,
            b.publicoAlvo && `Público-alvo: ${b.publicoAlvo}`,
            b.tom && `Tom: ${b.tom}`,
            b.valorInvestimento && `Investimento: ${b.valorInvestimento}`,
            b.rendaMensal && `Renda mensal: ${b.rendaMensal}`,
            b.roi && `ROI: ${b.roi}`,
            b.taxaOcupacao && `Taxa de ocupação: ${b.taxaOcupacao}`,
            b.cta && `CTA: ${b.cta}`,
            Array.isArray(b.diferenciais) && b.diferenciais.length && `Diferenciais: ${(b.diferenciais as string[]).join(', ')}`,
            Array.isArray(b.mensagensPrincipais) && b.mensagensPrincipais.length && `Mensagens: ${(b.mensagensPrincipais as string[]).join(' | ')}`,
            b.observacoes && `Observações: ${b.observacoes}`,
          ].filter(Boolean).join('\n')
          if (lines) extracts.push(lines)
        }
      }
      if (extracts.length) {
        const extracted = extracts.join('\n\n---\n\n')
        setBriefingText(briefingText ? `${briefingText}\n\n${extracted}` : extracted)
        setAnalyzeSuccess(`${screenshots.length} print(s) analisado(s) — briefing extraído com sucesso ✓`)
      }
    } catch (err) {
      setAnalyzeError(String(err).replace('Error: ', ''))
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h2 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 700 }}>Briefing da campanha</h2>
        <p className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
          Envie links e informações para o Agente de Atendimento organizar tudo para a equipe.
        </p>
      </div>

      {/* Campaign name */}
      <div
        className="flex flex-col gap-3 p-5 rounded-2xl"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Nome da campanha</label>
        <input
          value={campaignName}
          onChange={e => setCampaignName(e.target.value)}
          placeholder="Ex: Lançamento Edifício Brava Coast"
          className="px-4 py-2.5 rounded-xl body"
          style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', width: '100%' }}
        />
      </div>

      {/* URLs */}
      <div
        className="flex flex-col gap-3 p-5 rounded-2xl"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Link2 size={16} style={{ color: 'var(--primary)' }} />
          <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Links do briefing</label>
          <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>— Lovable, Google Docs, sites, etc.</span>
        </div>

        {/* URL list */}
        <div className="flex flex-col gap-2">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)' }}>
              <Link2 size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
              <span className="body-small flex-1 truncate" style={{ color: 'var(--foreground)' }}>{url}</span>
              <button
                onClick={() => {
                  const newUrls = urls.filter((_, j) => j !== i)
                  setBriefingUrls(newUrls.join('\n'))
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add URL */}
        <div className="flex gap-2">
          <input
            id="url-input"
            placeholder="Cole um link aqui..."
            className="flex-1 px-3 py-2 rounded-xl body-small"
            style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none' }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim()
                if (val) {
                  setBriefingUrls([...urls, val].join('\n'));
                  (e.target as HTMLInputElement).value = ''
                }
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.getElementById('url-input') as HTMLInputElement
              const val = input?.value.trim()
              if (val) { setBriefingUrls([...urls, val].join('\n')); input.value = '' }
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>
      </div>

      {/* Screenshot upload */}
      <div
        className="flex flex-col gap-3 p-5 rounded-2xl"
        style={{ backgroundColor: 'var(--card)', border: '1.5px solid rgba(0,85,255,0.18)' }}
      >
        <div className="flex items-center gap-2">
          <Image size={16} style={{ color: 'var(--primary)' }} />
          <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Print / Screenshot</label>
          <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>— a IA lê e extrai o briefing</span>
        </div>

        {screenshots.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {screenshots.map((s, i) => (
              <div key={i} className="relative group" style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                <img src={s.dataUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => setScreenshots(prev => prev.filter((_, j) => j !== i))}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {screenshots.length < 5 && (
            <button
              onClick={() => screenshotInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-1 justify-center"
              style={{ border: '1.5px dashed var(--border)', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 13 }}
            >
              <Plus size={14} />
              {screenshots.length === 0 ? 'Adicionar print' : 'Adicionar outro'}
            </button>
          )}
          {screenshots.length > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl"
              style={{
                backgroundColor: analyzing ? 'var(--secondary)' : 'var(--primary)',
                color: analyzing ? 'var(--muted-foreground)' : '#fff',
                border: 'none', cursor: analyzing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}
            >
              {analyzing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Image size={14} />}
              {analyzing ? 'Analisando...' : 'Analisar com IA'}
            </button>
          )}
        </div>

        {analyzeError && (
          <div className="flex items-start gap-2" style={{ color: '#EF4444', fontSize: 12 }}>
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {analyzeError}
          </div>
        )}
        {analyzeSuccess && (
          <div className="flex items-center gap-2" style={{ color: '#5EA500', fontSize: 12 }}>
            <CheckCircle2 size={13} /> {analyzeSuccess}
          </div>
        )}

        <p className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
          Suba prints de apresentações, PDFs, tabelas ou qualquer material visual. A IA extrai o briefing automaticamente.
        </p>

        <input ref={screenshotInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleScreenshotUpload} />
      </div>

      {/* Manual text */}
      <div
        className="flex flex-col gap-3 p-5 rounded-2xl"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color: 'var(--primary)' }} />
          <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Briefing adicional</label>
          <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>— Informações complementares</span>
        </div>
        <textarea
          value={briefingText}
          onChange={e => setBriefingText(e.target.value)}
          placeholder="Descreva aqui pontos importantes: produto, diferenciais, tom de voz, público-alvo, proibições, dados financeiros..."
          rows={6}
          className="px-4 py-3 rounded-xl body-regular resize-none"
          style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', width: '100%' }}
        />
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <button
          onClick={() => setStep('assets')}
          disabled={!canContinue}
          className="flex items-center gap-2 px-6 py-3 rounded-full transition-all hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: canContinue ? 'var(--primary)' : 'var(--secondary)',
            color: canContinue ? '#fff' : 'var(--muted-foreground)',
            border: 'none', cursor: canContinue ? 'pointer' : 'not-allowed',
          }}
        >
          <span className="p-ui">Continuar para Assets</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
