import { useEffect, useRef, useState } from 'react'
import { useCampanhaStore } from '../../stores/campanhaStore'
import type { GeneratedCreative, CopyVariation } from '../../stores/campanhaStore'
import { CheckCircle2, Circle, Loader2, XCircle, SkipForward, Zap, AlertCircle, ShieldCheck, FastForward, Ban } from 'lucide-react'

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

async function apiFetch(url: string, body: unknown, timeoutMs = 90_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `Erro em ${url}`)
    return data
  } finally {
    clearTimeout(timer)
  }
}

// Steps that the user can manually skip while running
const SKIPPABLE_STEPS = new Set(['images', 'apresentadora', 'narrado'])

export function GeracaoProgress() {
  const geracaoSteps     = useCampanhaStore((s) => s.geracaoSteps)
  const isGenerating     = useCampanhaStore((s) => s.isGenerating)
  const geracaoError     = useCampanhaStore((s) => s.geracaoError)
  const incluirImagens        = useCampanhaStore((s) => s.incluirImagens)
  const incluirNarrado        = useCampanhaStore((s) => s.incluirNarrado)
  const incluirApresentadora  = useCampanhaStore((s) => s.incluirApresentadora)
  const estruturasCount       = useCampanhaStore((s) => s.estruturasCount)
  const variacoesCount        = useCampanhaStore((s) => s.variacoesCount)
  // narradoCount and apresentadoraCount accessed via useCampanhaStore.getState() in pipeline
  const creatives             = useCampanhaStore((s) => s.creatives)

  const advanceStep     = useCampanhaStore((s) => s.advanceStep)
  const setCreatives    = useCampanhaStore((s) => s.setCreatives)
  const updateCreative  = useCampanhaStore((s) => s.updateCreative)
  const setGeracaoError = useCampanhaStore((s) => s.setGeracaoError)
  const setStep         = useCampanhaStore((s) => s.setStep)


  const didStart = useRef(false)

  // Cancel signals — set by UI buttons, read by the pipeline
  const cancelSignal = useRef({ skipStep: false, cancelAll: false })

  // Track which step is being skipped (for loading state on the button)
  const [skippingStep, setSkippingStep] = useState<string | null>(null)

  const totalPecas = creatives.length
  const donePecas  = creatives.filter((c) => c.status === 'done').length

  useEffect(() => {
    if (!isGenerating || didStart.current) return
    didStart.current = true
    cancelSignal.current = { skipStep: false, cancelAll: false }
    runPipeline()
  }, [isGenerating])

  // ── Cancel helpers ──────────────────────────────────────────────────────────
  const handleSkipStep = (stepId: string) => {
    setSkippingStep(stepId)
    cancelSignal.current.skipStep = true
  }

  const handleCancelAll = () => {
    cancelSignal.current.cancelAll = true
    cancelSignal.current.skipStep  = true
  }

  // Check for full campaign cancel — throws a special sentinel to exit pipeline
  const checkCancelAll = () => {
    if (cancelSignal.current.cancelAll) throw new Error('__CANCELLED__')
  }

  // ── Main pipeline ───────────────────────────────────────────────────────────
  const runPipeline = async () => {
    const state = useCampanhaStore.getState()
    const copies: CopyVariation[] = state.copyVariations
    const vpE    = state.narradoCount
    const cCount = state.apresentadoraCount

    try {
      // ── Step 1: parse ──────────────────────────────────────────────────────
      advanceStep('parse', 'active')
      await delay(300); checkCancelAll()
      advanceStep('parse', 'done')

      // ── Step 2: copy — build initial creative list ─────────────────────────
      advanceStep('copy', 'active')
      const initialCreatives: GeneratedCreative[] = []
      for (let e = 1; e <= estruturasCount; e++) {
        for (let v = 1; v <= variacoesCount; v++) {
          const copy = copies.find((c) => c.estrutura === e && c.variacao === v)
            ?? { estrutura: e, variacao: v, headline: `E${e}V${v}`, body: '', cta: 'Saiba mais' }

          initialCreatives.push({ id: `e${e}v${v}-feed`,  estrutura: e, variacao: v, formato: '4:5',  tipo: 'image', copy, backgroundImage: null, videoUrl: null, status: 'pending' })
          initialCreatives.push({ id: `e${e}v${v}-story`, estrutura: e, variacao: v, formato: '9:16', tipo: 'image', copy, backgroundImage: null, videoUrl: null, status: 'pending' })

          // Narrated videos — up to narradoCount per estrutura
          if (incluirNarrado && v <= vpE) {
            const duracao: '30-40s' | '10-20s' = v <= Math.ceil(vpE * 0.6) ? '30-40s' : '10-20s'
            initialCreatives.push({ id: `e${e}v${v}-narrado`, estrutura: e, variacao: v, formato: '9:16', tipo: 'narrado', videoDuracao: duracao, copy, backgroundImage: null, videoUrl: null, status: 'pending' })
          }
        }
        // Presenter videos — one per estrutura up to apresentadoraCount
        if (incluirApresentadora && e <= cCount) {
          const firstCopy = copies.find((c) => c.estrutura === e && c.variacao === 1)
            ?? { estrutura: e, variacao: 1, headline: '', body: '', cta: '' }
          initialCreatives.push({ id: `e${e}-apresentadora`, estrutura: e, variacao: 0, formato: '9:16', tipo: 'apresentadora', copy: firstCopy, backgroundImage: null, videoUrl: null, status: 'pending' })
        }
      }
      setCreatives(initialCreatives)
      await delay(300); checkCancelAll()
      advanceStep('copy', 'done')

      // ── Step 3: validate ───────────────────────────────────────────────────
      advanceStep('validate', 'active')
      try {
        const allText = copies.map((c) => `${c.headline} ${c.body} ${c.cta}`).join('\n')
        const validation = await apiFetch('/api/campanha/validate', { contents: [allText] }, 30_000)
        if (validation.warnings?.length > 0) console.warn('[validate] Avisos:', validation.warnings)
      } catch (err) {
        console.warn('[validate] Ignorando erro de validação:', err)
      }
      checkCancelAll()
      advanceStep('validate', 'done')

      // ── Step 4: images ─────────────────────────────────────────────────────
      if (!incluirImagens) {
        advanceStep('images', 'skipped')
      } else {
      advanceStep('images', 'active')
      cancelSignal.current.skipStep = false
      setSkippingStep(null)

      const imageCreatives = initialCreatives.filter((c) => c.tipo === 'image')
      let imagesSkipped = false

      if (cancelSignal.current.skipStep) {
        imagesSkipped = true
      } else {
        // Mark all as generating immediately so progress bar fills as they complete
        imageCreatives.forEach((c) => updateCreative(c.id, { status: 'generating' }))

        // Run ALL images in parallel — background gen (AI) and Puppeteer render happen
        // concurrently across all images, so total time ≈ slowest single image
        await Promise.all(imageCreatives.map(async (creative) => {
          if (cancelSignal.current.cancelAll || cancelSignal.current.skipStep) {
            updateCreative(creative.id, { status: 'error' })
            return
          }
          try {
            const data = await apiFetch('/api/campanha/generate-creative', {
              copy: creative.copy,
              formato: creative.formato,
              briefing: state.parsedBriefing,
              referenceImages: state.referenceImages.map((r) => r.data),
              assetsContext: state.assetsContext,
            }, 120_000)
            updateCreative(creative.id, { backgroundImage: data.imageDataUrl, status: 'done' })
          } catch (err) {
            console.warn(`[images] Falhou ${creative.id}:`, err)
            updateCreative(creative.id, { status: 'error' })
          }
        }))

        if (cancelSignal.current.skipStep) imagesSkipped = true
      }

      cancelSignal.current.skipStep = false
      setSkippingStep(null)
      checkCancelAll()
      advanceStep('images', imagesSkipped ? 'skipped' : 'done')
      } // end incluirImagens else

      // ── Step 5: vídeos apresentadora ───────────────────────────────────────
      if (!incluirApresentadora) {
        advanceStep('apresentadora', 'skipped')
      } else {
        advanceStep('apresentadora', 'active')
        cancelSignal.current.skipStep = false
        setSkippingStep(null)

        const apCreatives = initialCreatives.filter((c) => c.tipo === 'apresentadora')
        let apSkipped = false

        for (const creative of apCreatives) {
          if (cancelSignal.current.skipStep) { apSkipped = true; break }
          checkCancelAll()

          updateCreative(creative.id, { status: 'generating' })
          try {
            const prompt = `${creative.copy.videoRoteiro ?? creative.copy.headline}. ${creative.copy.body}. ${creative.copy.cta}. Seazone real estate Brazil.`
            const data = await apiFetch('/api/ai/generate-video', {
              prompt,
              aspectRatio: '9:16',
              durationSeconds: 8,
              tipo: 'apresentadora',
              presenterImage: state.presenterImage,
            }, 180_000)
            updateCreative(creative.id, { videoUrl: data.videoUrl, status: 'done' })
          } catch (err) {
            console.warn(`[apresentadora] Falhou E${creative.estrutura}:`, err)
            updateCreative(creative.id, { status: 'error' })
          }
        }

        cancelSignal.current.skipStep = false
        setSkippingStep(null)
        checkCancelAll()
        advanceStep('apresentadora', apSkipped ? 'skipped' : 'done')
      }

      // ── Step 6: vídeos narrados ────────────────────────────────────────────
      if (!incluirNarrado) {
        advanceStep('narrado', 'skipped')
      } else {
        advanceStep('narrado', 'active')
        cancelSignal.current.skipStep = false
        setSkippingStep(null)

        const narradoCreatives = useCampanhaStore.getState().creatives.filter((c) => c.tipo === 'narrado')
        let narradoSkipped = false

        for (const vc of narradoCreatives) {
          if (cancelSignal.current.skipStep) { narradoSkipped = true; break }
          checkCancelAll()

          updateCreative(vc.id, { status: 'generating' })
          try {
            const durationSecs = vc.videoDuracao === '30-40s' ? 8 : 5
            const prompt = `${vc.copy.videoRoteiro ?? vc.copy.headline}. ${vc.copy.body}. Seazone real estate Brazil. Narrated video showcasing luxury real estate.`
            const data = await apiFetch('/api/ai/generate-video', {
              prompt,
              aspectRatio: '9:16',
              durationSeconds: durationSecs,
              tipo: 'narrado',
              assetsUrl: state.assetsUrl,
              assetsContext: state.assetsContext,
            }, 180_000)
            updateCreative(vc.id, { videoUrl: data.videoUrl, status: 'done' })
          } catch {
            updateCreative(vc.id, { status: 'error' })
          }
        }

        cancelSignal.current.skipStep = false
        setSkippingStep(null)
        checkCancelAll()
        advanceStep('narrado', narradoSkipped ? 'skipped' : 'done')
      }

      // ── Step 7: done ───────────────────────────────────────────────────────
      advanceStep('done', 'active')
      await delay(600)
      advanceStep('done', 'done')
      await delay(400)
      setStep('resultados')

    } catch (err) {
      const msg = String(err)
      if (msg.includes('__CANCELLED__')) {
        // User cancelled — go back to parametros cleanly
        setGeracaoError(null)
        didStart.current = false
        setStep('parametros')
        // Reset store generating state
        useCampanhaStore.setState({ isGenerating: false })
      } else {
        setGeracaoError(msg)
      }
    }
  }

  const activeStep = geracaoSteps.find((s) => s.status === 'active')

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto w-full items-center">

      {/* Icon + title */}
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-20 h-20 flex items-center justify-center rounded-full"
          style={{
            background: geracaoError
              ? 'rgba(239,68,68,0.1)'
              : 'linear-gradient(135deg, rgba(0,85,255,0.12) 0%, rgba(124,58,237,0.12) 100%)',
            border: geracaoError ? '2px solid rgba(239,68,68,0.3)' : '2px solid rgba(0,85,255,0.2)',
          }}
        >
          {geracaoError
            ? <XCircle size={36} style={{ color: '#EF4444' }} />
            : isGenerating
              ? <Loader2 size={36} style={{ color: 'var(--primary)' }} className="animate-spin" />
              : <CheckCircle2 size={36} style={{ color: '#22C55E' }} />}
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--foreground)' }}>
            {geracaoError ? 'Erro na geração' : isGenerating ? 'Gerando sua campanha...' : 'Campanha gerada!'}
          </span>
          {activeStep && !geracaoError && (
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, color: 'var(--muted-foreground)' }}>
              {activeStep.description}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isGenerating && totalPecas > 0 && (
        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between">
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: 'var(--muted-foreground)' }}>Peças geradas</span>
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{donePecas}/{totalPecas}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill transition-all duration-500" style={{ width: totalPecas > 0 ? `${(donePecas / totalPecas) * 100}%` : '0%' }} />
          </div>
        </div>
      )}

      {/* Steps list */}
      <div className="w-full flex flex-col gap-2">
        {geracaoSteps.map((s) => {
          const isActive   = s.status === 'active'
          const isSkippable = isActive && SKIPPABLE_STEPS.has(s.id)
          const isBeingSkipped = skippingStep === s.id

          const Icon =
            s.status === 'done'    ? CheckCircle2 :
            s.status === 'active'  ? Loader2 :
            s.status === 'error'   ? XCircle :
            s.status === 'skipped' ? SkipForward :
            s.id === 'validate'    ? ShieldCheck : Circle

          const iconColor =
            s.status === 'done'    ? '#22C55E' :
            s.status === 'active'  ? 'var(--primary)' :
            s.status === 'error'   ? '#EF4444' :
            s.status === 'skipped' ? 'var(--muted-foreground)' : 'var(--border)'

          return (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{
                backgroundColor: isActive ? 'rgba(0,85,255,0.06)' : 'var(--card)',
                border: isActive ? '1px solid rgba(0,85,255,0.15)' : '1px solid var(--border)',
                opacity: s.status === 'skipped' ? 0.45 : 1,
              }}
            >
              <Icon
                size={18}
                style={{ color: iconColor, flexShrink: 0 }}
                className={isActive ? 'animate-spin' : ''}
              />
              <div className="flex flex-col gap-0.5 flex-1">
                <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400, color: s.status === 'skipped' ? 'var(--muted-foreground)' : 'var(--foreground)' }}>
                  {s.label}
                </span>
                {isActive && (
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: 'var(--muted-foreground)' }}>
                    {s.description}
                  </span>
                )}
              </div>

              {/* Skip step button — only on active & skippable steps */}
              {isSkippable && !isBeingSkipped && (
                <button
                  onClick={() => handleSkipStep(s.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all active:scale-95 flex-shrink-0"
                  style={{
                    backgroundColor: 'rgba(0,85,255,0.1)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(0,85,255,0.2)',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <FastForward size={11} />
                  Pular etapa
                </button>
              )}

              {/* Skipping indicator */}
              {isBeingSkipped && (
                <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0 }}>
                  Pulando...
                </span>
              )}

              {s.status === 'skipped' && !isBeingSkipped && (
                <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0 }}>
                  Pulada
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Cancel campaign button — visible while generating */}
      {isGenerating && !geracaoError && (
        <button
          onClick={handleCancelAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all active:scale-95"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--muted-foreground)',
            border: '1px solid var(--border)',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Ban size={14} />
          Cancelar geração
        </button>
      )}

      {/* Error */}
      {geracaoError && (
        <div className="w-full flex items-start gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
          <div className="flex flex-col gap-2 flex-1">
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: '#EF4444' }}>{geracaoError}</span>
            <button
              onClick={() => { didStart.current = false; setStep('parametros') }}
              className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: 'none', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, cursor: 'pointer' }}
            >
              <Zap size={13} /> Tentar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
