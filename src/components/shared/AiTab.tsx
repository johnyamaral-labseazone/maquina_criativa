import { useState, useRef, useEffect } from 'react'
import { Sparkles, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react'
import { checkAiStatus, generateFromReference, type AnalysisResult, type AiStatus } from '../../services/aiService'

interface AiTabProps {
  /** current canvas aspect ratio, e.g. '1:1', '9:16', '4:5' */
  aspectRatio: string
  /** called with the generated image dataURL so the parent can set it as background */
  onGenerated: (imageDataUrl: string) => void
  /** context hint passed to Claude (e.g. 'WhatsApp 1:1 para imóvel') */
  context?: string
}

type Phase =
  | 'idle'
  | 'analyzing'
  | 'generating'
  | 'done'
  | 'error'

export function AiTab({ aspectRatio, onGenerated, context }: AiTabProps) {
  const [status, setStatus]       = useState<AiStatus | null>(null)
  const [refImage, setRefImage]   = useState<string | null>(null)
  const [phase, setPhase]         = useState<Phase>('idle')
  const [analysis, setAnalysis]   = useState<AnalysisResult | null>(null)
  const [result, setResult]       = useState<string | null>(null)
  const [errorMsg, setErrorMsg]   = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Check AI server status on mount
  useEffect(() => {
    checkAiStatus().then(setStatus)
  }, [])

  const readFile = (file: File): Promise<string> =>
    new Promise((res) => {
      const r = new FileReader()
      r.onload = (ev) => res(ev.target?.result as string)
      r.readAsDataURL(file)
    })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRefImage(await readFile(file))
    setPhase('idle')
    setAnalysis(null)
    setResult(null)
    e.target.value = ''
  }

  const handleGenerate = async () => {
    if (!refImage) return
    setPhase('analyzing')
    setErrorMsg('')
    try {
      const ctx = context ?? `arte ${aspectRatio} para imóvel`
      setPhase('analyzing')
      const { imageDataUrl, analysis: a } = await generateFromReference(refImage, aspectRatio, ctx)
      setAnalysis(a)
      setResult(imageDataUrl)
      setPhase('done')
    } catch (err) {
      setPhase('error')
      setErrorMsg(String(err))
    }
  }

  const handleApply = () => {
    if (result) onGenerated(result)
  }

  const notReady = status && !status.ready

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Server status banner */}
      {notReady && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px', borderRadius: 12,
          backgroundColor: 'rgba(252,96,88,0.08)',
          border: '1px solid rgba(252,96,88,0.25)',
        }}>
          <AlertCircle size={15} style={{ color: '#FC6058', flexShrink: 0, marginTop: 1 }} />
          <div>
            <span className="detail-medium" style={{ color: 'var(--foreground)', display: 'block' }}>
              Servidor de IA não configurado
            </span>
            <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
              Execute <code style={{ backgroundColor: 'var(--input)', padding: '1px 4px', borderRadius: 4, fontSize: 11 }}>npm run dev:full</code> e preencha o arquivo <strong>.env</strong> com suas chaves de API.
            </span>
            <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!status.vision && (
                <span style={{ fontSize: 11, color: '#FC6058' }}>❌ ANTHROPIC_API_KEY</span>
              )}
              {!status.generation && (
                <span style={{ fontSize: 11, color: '#FC6058' }}>❌ REPLICATE_API_TOKEN</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reference image upload */}
      <div>
        <span className="detail-medium" style={{ color: 'var(--muted-foreground)', display: 'block', marginBottom: 8 }}>
          Referência visual
        </span>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

        {refImage ? (
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
            <img src={refImage} alt="referência" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
            <button
              onClick={() => { setRefImage(null); setPhase('idle'); setAnalysis(null); setResult(null) }}
              style={{
                position: 'absolute', top: 6, right: 6,
                width: 24, height: 24, borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%', padding: '20px 0', borderRadius: 12,
              border: '2px dashed var(--border)', backgroundColor: 'transparent',
              color: 'var(--muted-foreground)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
            <Upload size={18} />
            <span className="body">Upload da referência visual</span>
          </button>
        )}
      </div>

      {/* Generate button */}
      {refImage && phase !== 'done' && (
        <button
          onClick={handleGenerate}
          disabled={phase === 'analyzing' || phase === 'generating' || notReady === true}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 999,
            background: (phase === 'analyzing' || phase === 'generating' || notReady)
              ? 'var(--muted)'
              : 'linear-gradient(135deg, #0055FF 0%, #6593FF 100%)',
            color: (phase === 'analyzing' || phase === 'generating' || notReady)
              ? 'var(--muted-foreground)' : '#fff',
            border: 'none', cursor: (phase === 'analyzing' || phase === 'generating' || notReady) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity 0.2s',
          }}>
          {phase === 'analyzing' ? (
            <><Loader2 size={15} className="animate-spin" /><span className="p-ui">Analisando referência…</span></>
          ) : phase === 'generating' ? (
            <><Loader2 size={15} className="animate-spin" /><span className="p-ui">Gerando imagem…</span></>
          ) : (
            <><Sparkles size={15} /><span className="p-ui">Gerar fundo com IA</span></>
          )}
        </button>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          backgroundColor: 'rgba(252,96,88,0.08)',
          border: '1px solid rgba(252,96,88,0.25)',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <AlertCircle size={14} style={{ color: '#FC6058', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <span className="detail-medium" style={{ color: '#FC6058', display: 'block' }}>Erro ao gerar</span>
            <span className="detail-regular" style={{ color: 'var(--muted-foreground)', wordBreak: 'break-word' }}>{errorMsg}</span>
          </div>
          <button onClick={handleGenerate}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      {/* Result */}
      {phase === 'done' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Analysis summary */}
          {analysis && (
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              backgroundColor: 'rgba(0,85,255,0.06)',
              border: '1px solid rgba(0,85,255,0.15)',
            }}>
              <span className="detail-medium" style={{ color: 'var(--primary)', display: 'block', marginBottom: 4 }}>
                ✨ Estilo detectado — {analysis.mood}
              </span>
              <span className="detail-regular" style={{ color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                {analysis.description}
              </span>
            </div>
          )}

          {/* Result preview */}
          <div style={{ borderRadius: 10, overflow: 'hidden' }}>
            <img src={result} alt="gerado" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={handleApply}
              style={{
                padding: '10px 0', borderRadius: 999,
                background: 'linear-gradient(135deg, #0055FF 0%, #6593FF 100%)',
                color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <CheckCircle2 size={14} /><span className="p-ui">Aplicar</span>
            </button>
            <button onClick={handleGenerate}
              style={{
                padding: '10px 0', borderRadius: 999,
                backgroundColor: 'var(--input)', color: 'var(--foreground)',
                border: '1px solid var(--border)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <RefreshCw size={14} /><span className="p-ui">Regerar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
