import { useState, useEffect, useRef } from 'react'
import { useLandingPageStore } from '../../stores/landingPageStore'
import type { LandingPage } from '../../types/landingPage'

interface WizardCreateProps {
  onComplete: (pageId: string) => void
  onCancel: () => void
}

type WizardStep = 'briefing' | 'photos' | 'generating' | 'done'

const STAGES = [
  'Lendo briefing do empreendimento',
  'Extraindo dados financeiros e diferenciais',
  'Organizando imagens estrategicamente',
  'Criando estrutura e hierarquia de blocos',
  'Escrevendo titulos e textos persuasivos',
  'Definindo CTAs de alta conversao',
  'Aplicando identidade visual Seazone',
  'Finalizando landing page',
]

export function WizardCreate({ onComplete, onCancel }: WizardCreateProps) {
  const { addPage } = useLandingPageStore()

  const [step, setStep] = useState<WizardStep>('briefing')
  const [briefingUrl, setBriefingUrl] = useState('')
  const [briefingText, setBriefingText] = useState('')
  const [briefingMode, setBriefingMode] = useState<'url' | 'text'>('url')
  const [photoInput, setPhotoInput] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [stageIndex, setStageIndex] = useState(0)
  const [doneStages, setDoneStages] = useState<number[]>([])
  const [error, setError] = useState('')
  const [pageName, setPageName] = useState('')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const addPhoto = () => {
    const t = photoInput.trim()
    if (!t) return
    setPhotoUrls(p => [...p, t])
    setPhotoInput('')
  }

  const removePhoto = (i: number) => setPhotoUrls(p => p.filter((_, idx) => idx !== i))

  const handleGenerate = async () => {
    if (!briefingUrl && !briefingText) { setError('Adicione um link ou cole o texto do briefing.'); return }
    setError('')
    setStep('generating')
    setStageIndex(0)
    setDoneStages([])

    const perStage = 18000 / STAGES.length
    STAGES.forEach((_, i) => {
      const t = setTimeout(() => {
        setStageIndex(i)
        if (i > 0) setDoneStages(d => Array.from(new Set([...d, ...Array.from({ length: i }, (_, k) => k)])))
      }, i * perStage)
      timers.current.push(t)
    })

    try {
      const body: Record<string, unknown> = { photoUrls }
      if (briefingMode === 'url' && briefingUrl) body.briefingUrl = briefingUrl
      else body.briefingText = briefingText

      const resp = await fetch('/api/lp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error ?? 'Erro na geracao')

      clearTimers()
      setDoneStages(STAGES.map((_, i) => i))
      setPageName(data.meta?.name ?? 'LP Gerada por IA')

      const genId = () =>
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)

      const newPage: LandingPage = {
        id: genId(),
        name: data.meta?.name ?? 'LP Gerada por IA',
        productName: data.meta?.productName ?? 'Empreendimento',
        description: '',
        blocks: data.blocks ?? [],
        primaryColor: data.meta?.primaryColor ?? '#1C398E',
        secondaryColor: data.meta?.secondaryColor ?? '#5EA500',
        backgroundColor: data.meta?.backgroundColor ?? '#FFFFFF',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        published: false,
      }
      addPage(newPage)
      setTimeout(() => { setStep('done'); setTimeout(() => onComplete(newPage.id), 1000) }, 600)
    } catch (err) {
      clearTimers()
      setError(String(err))
      setStep('briefing')
    }
  }

  useEffect(() => () => clearTimers(), [])

  const inp: React.CSSProperties = {
    padding: '13px 16px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14,
    outline: 'none', width: '100%', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  }
  const btnP: React.CSSProperties = {
    padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600,
    background: 'linear-gradient(135deg, #1C398E, #2B52C8)',
    color: '#fff', boxShadow: '0 4px 16px rgba(28,57,142,0.4)',
  }
  const btnS: React.CSSProperties = {
    padding: '12px 20px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer', fontSize: 14,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(5,11,24,0.94)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 560, backgroundColor: '#0D1526',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20,
        boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(28,57,142,0.25)',
        overflow: 'hidden',
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #1C398E 0%, #5EA500 100%)' }} />
        <div style={{ padding: '32px 36px' }}>

          {/* BRIEFING */}
          {step === 'briefing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>PASSO 1 DE 2</p>
                <h2 style={{ color: '#fff', margin: 0, fontSize: 22, fontWeight: 700 }}>Briefing do empreendimento</h2>
                <p style={{ color: 'rgba(255,255,255,0.45)', margin: '8px 0 0', fontSize: 14, lineHeight: 1.5 }}>
                  Cole o link do Google Docs ou descreva o empreendimento
                </p>
              </div>

              <div style={{ display: 'flex', gap: 6, padding: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                {(['url', 'text'] as const).map(m => (
                  <button key={m} onClick={() => setBriefingMode(m)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500,
                    backgroundColor: briefingMode === m ? 'rgba(28,57,142,0.75)' : 'transparent',
                    color: briefingMode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}>
                    {m === 'url' ? 'Link (Google Docs)' : 'Texto livre'}
                  </button>
                ))}
              </div>

              {briefingMode === 'url' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>URL DO BRIEFING</label>
                  <input type="url" value={briefingUrl} onChange={e => setBriefingUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..." style={inp}
                    onFocus={e => (e.target.style.borderColor = 'rgba(28,57,142,0.8)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                  <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, margin: 0 }}>
                    O documento precisa estar publico ("Qualquer pessoa com o link pode ver")
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>BRIEFING</label>
                  <textarea value={briefingText} onChange={e => setBriefingText(e.target.value)}
                    placeholder="Nome, localizacao, unidades, valor de investimento, ROI projetado, diferenciais, publico-alvo, CTA..."
                    rows={7} style={{ ...inp, resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(28,57,142,0.8)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                </div>
              )}

              {error && <p style={{ color: '#FF7272', fontSize: 13, margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onCancel} style={btnS}>Cancelar</button>
                <button onClick={() => {
                  if (!briefingUrl && !briefingText) { setError('Preencha o briefing.'); return }
                  setError(''); setStep('photos')
                }} style={btnP}>Continuar &rarr;</button>
              </div>
            </div>
          )}

          {/* PHOTOS */}
          {step === 'photos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>PASSO 2 DE 2</p>
                <h2 style={{ color: '#fff', margin: 0, fontSize: 22, fontWeight: 700 }}>Fotos do empreendimento</h2>
                <p style={{ color: 'rgba(255,255,255,0.45)', margin: '8px 0 0', fontSize: 14, lineHeight: 1.5 }}>
                  Adicione links das fotos. A IA posiciona as imagens estrategicamente.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input type="url" value={photoInput} onChange={e => setPhotoInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPhoto()}
                  placeholder="https://... (URL direta da imagem)"
                  style={{ ...inp, flex: 1 }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(94,165,0,0.7)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                <button onClick={addPhoto} style={{
                  padding: '12px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 20, fontWeight: 700, backgroundColor: 'rgba(94,165,0,0.2)',
                  color: '#5EA500', flexShrink: 0,
                }}>+</button>
              </div>

              {photoUrls.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 190, overflowY: 'auto' }}>
                  {photoUrls.map((url, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', backgroundColor: 'rgba(94,165,0,0.07)', borderRadius: 8, border: '1px solid rgba(94,165,0,0.14)' }}>
                      <span style={{ color: '#5EA500', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>#{i + 1}</span>
                      <span style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                      <button onClick={() => removePhoto(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.6)', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>&#215;</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 20, textAlign: 'center', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.07)' }}>
                  <p style={{ color: 'rgba(255,255,255,0.2)', margin: 0, fontSize: 13 }}>Sem fotos &mdash; a LP sera criada com os dados do briefing</p>
                </div>
              )}

              {error && <p style={{ color: '#FF7272', fontSize: 13, margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <button onClick={() => setStep('briefing')} style={btnS}>&larr; Voltar</button>
                <button onClick={handleGenerate} style={{
                  ...btnP, background: 'linear-gradient(135deg, #1C398E 0%, #5EA500 100%)',
                  boxShadow: '0 4px 20px rgba(94,165,0,0.25)',
                }}>&#10024; Gerar Landing Page</button>
              </div>
            </div>
          )}

          {/* GENERATING / DONE */}
          {(step === 'generating' || step === 'done') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '4px 0' }}>
              <div style={{ textAlign: 'center' }}>
                {step === 'done' ? (
                  <><div style={{ fontSize: 44, marginBottom: 12 }}>&#9989;</div>
                    <h2 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>Landing page pronta!</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', margin: '8px 0 0', fontSize: 14 }}>{pageName}</p>
                  </>
                ) : (
                  <><div style={{ width: 48, height: 48, margin: '0 auto 16px', borderRadius: '50%', border: '3px solid rgba(28,57,142,0.2)', borderTopColor: '#1C398E', animation: 'lpSpin 0.9s linear infinite' }} />
                    <h2 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>Gerando sua landing page</h2>
                    <p style={{ color: 'rgba(255,255,255,0.35)', margin: '8px 0 0', fontSize: 14 }}>A IA esta lendo o briefing e montando os blocos...</p>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {STAGES.map((label, i) => {
                  const isDone = doneStages.includes(i)
                  const isActive = stageIndex === i && step === 'generating'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: isDone || isActive ? 1 : 0.28, transition: 'opacity 0.5s' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                        backgroundColor: isDone ? '#5EA500' : isActive ? 'rgba(28,57,142,0.9)' : 'rgba(255,255,255,0.05)',
                        border: isActive ? '2px solid rgba(28,57,142,0.8)' : 'none',
                        boxShadow: isActive ? '0 0 10px rgba(28,57,142,0.5)' : 'none', transition: 'all 0.4s',
                      }}>
                        {isDone && <span style={{ color: '#fff', fontWeight: 700, fontSize: 10 }}>&#10003;</span>}
                        {isActive && !isDone && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fff', display: 'block', animation: 'lpPulse 0.8s ease infinite' }} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isDone ? 'rgba(255,255,255,0.8)' : isActive ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.4s' }}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${step === 'done' ? 100 : (doneStages.length / STAGES.length) * 100}%`,
                  background: 'linear-gradient(90deg, #1C398E, #5EA500)', transition: 'width 1s ease',
                }} />
              </div>
            </div>
          )}

        </div>
      </div>
      <style>{`@keyframes lpSpin{to{transform:rotate(360deg)}}@keyframes lpPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.5)}}`}</style>
    </div>
  )
}
