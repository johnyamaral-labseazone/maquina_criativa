import { create } from 'zustand'

export type AgentId = 'atendimento' | 'redator' | 'designer' | 'videoMaker' | 'diretorArte'
export type AgentStatus = 'idle' | 'working' | 'done' | 'error' | 'waiting'
export type Campanha2Step = 'briefing' | 'assets' | 'parametros' | 'agencia' | 'resultados'

export interface AgentLog {
  time: string
  msg: string
  type: 'info' | 'success' | 'error' | 'action'
}

export interface AgentBase {
  status: AgentStatus
  progress: number
  message: string
  logs: AgentLog[]
}

export interface ParsedBriefing2 {
  produto: string
  publicoAlvo: string
  mensagensPrincipais: string[]
  tom: string
  diferenciais: string[]
  cta: string
  observacoes: string
  valorInvestimento: string
  rendaMensal: string
  roi: string
  taxaOcupacao: string
  localizacao: string
  paginasLidas: string[]
  resumoExecutivo: string
}

export interface CopySet2 {
  estrutura: number
  variacao: number
  headline: string
  body: string
  cta: string
  videoRoteiro?: string
  edited?: boolean
}

export interface Roteiro {
  estrutura: number
  titulo: string
  roteiro: string
  duracao: string
  legenda: string
}

export interface DesignerCreative {
  id: string
  estrutura: number
  variacao: number
  formato: '4:5' | '9:16'
  imageDataUrl: string
  copy: CopySet2
  status: 'pending' | 'generating' | 'done' | 'error'
}

export interface VideoOutput {
  id: string
  tipo: 'narrado' | 'apresentadora'
  estrutura: number
  videoUrl: string
  audioUrl?: string
  roteiro: Roteiro
  status: 'pending' | 'generating' | 'done' | 'error'
}

export interface ArtReview {
  aprovado: boolean
  score: number
  pontos: string[]
  problemas: string[]
  relatorio: string
  sugestoes: string[]
}

export interface ReferenceImage2 {
  id: string
  name: string
  dataUrl: string
}

const defaultAgent: AgentBase = {
  status: 'idle',
  progress: 0,
  message: 'Aguardando...',
  logs: [],
}

function apiFetch(url: string, body: object, timeoutMs = 55000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  }).finally(() => clearTimeout(timer))
}

interface Campanha2Store {
  step: Campanha2Step

  briefingUrls: string
  briefingText: string
  assetsUrl: string
  assetsContext: string
  referenceImages: ReferenceImage2[]
  presenterImage: string | null
  presenterImageName: string | null
  campaignName: string

  estruturasCount: number
  variacoesCount: number
  narradoCount: number
  apresentadoraCount: number
  incluirImagens: boolean
  incluirNarrado: boolean
  incluirApresentadora: boolean

  atendimento: AgentBase & { result: ParsedBriefing2 | null }
  redator: AgentBase & { copies: CopySet2[] | null; roteirosNarrado: Roteiro[]; roteirosApresentadora: Roteiro[]; legendas: string[]; previousFeedback: string[] }
  designer: AgentBase & { creatives: DesignerCreative[] }
  videoMaker: AgentBase & { videos: VideoOutput[] }
  diretorArte: AgentBase & { review: ArtReview | null }

  _cancel: { v: boolean }

  setStep(s: Campanha2Step): void
  setBriefingUrls(v: string): void
  setBriefingText(v: string): void
  setAssetsUrl(v: string): void
  setAssetsContext(v: string): void
  setPresenterImage(img: string | null, name: string | null): void
  addReferenceImage(img: ReferenceImage2): void
  removeReferenceImage(id: string): void
  setCampaignName(v: string): void
  setEstruturasCount(n: number): void
  setVariacoesCount(n: number): void
  setIncluirImagens(v: boolean): void
  setIncluirNarrado(v: boolean): void
  setIncluirApresentadora(v: boolean): void
  setNarradoCount(n: number): void
  setApresentadoraCount(n: number): void
  updateCopy(idx: number, fields: Partial<CopySet2>): void

  startAgency(): void
  approveRedator(): void
  cancelAgency(): void
  restartWithFeedback(obs: string): void

  _patch<K extends AgentId>(id: K, u: Partial<Campanha2Store[K]>): void
  _log(id: AgentId, msg: string, type?: AgentLog['type']): void
}

export const useCampanha2Store = create<Campanha2Store>((set, get) => ({
  step: 'briefing',
  briefingUrls: '',
  briefingText: '',
  assetsUrl: '',
  assetsContext: '',
  referenceImages: [],
  presenterImage: null,
  presenterImageName: null,
  campaignName: '',

  estruturasCount: 3,
  narradoCount: 1,
  apresentadoraCount: 1,
  variacoesCount: 3,
  incluirImagens: true,
  incluirNarrado: true,
  incluirApresentadora: false,

  atendimento: { ...defaultAgent, result: null },
  redator: { ...defaultAgent, copies: null, roteirosNarrado: [], roteirosApresentadora: [], legendas: [], previousFeedback: [] },
  designer: { ...defaultAgent, creatives: [] },
  videoMaker: { ...defaultAgent, videos: [] },
  diretorArte: { ...defaultAgent, review: null },

  _cancel: { v: false },

  setStep: (s) => set({ step: s }),
  setBriefingUrls: (v) => set({ briefingUrls: v }),
  setBriefingText: (v) => set({ briefingText: v }),
  setAssetsUrl: (v) => set({ assetsUrl: v }),
  setAssetsContext: (v) => set({ assetsContext: v }),
  setPresenterImage: (img, name) => set({ presenterImage: img, presenterImageName: name }),
  addReferenceImage: (img) => set((s) => ({ referenceImages: [...s.referenceImages.slice(0, 4), img] })),
  removeReferenceImage: (id) => set((s) => ({ referenceImages: s.referenceImages.filter(i => i.id !== id) })),
  setCampaignName: (v) => set({ campaignName: v }),
  setEstruturasCount: (n) => set({ estruturasCount: Math.min(3, Math.max(1, n)) }),
  setVariacoesCount: (n) => set({ variacoesCount: Math.min(5, Math.max(1, n)) }),
  setIncluirImagens: (v) => set({ incluirImagens: v }),
  setIncluirNarrado: (v) => set({ incluirNarrado: v }),
  setIncluirApresentadora: (v) => set({ incluirApresentadora: v }),
  setNarradoCount: (n) => set({ narradoCount: Math.min(3, Math.max(1, n)) }),
  setApresentadoraCount: (n) => set({ apresentadoraCount: Math.min(3, Math.max(1, n)) }),

  updateCopy: (idx, fields) => set((s) => {
    const copies = [...(s.redator.copies ?? [])]
    if (copies[idx]) copies[idx] = { ...copies[idx], ...fields, edited: true }
    return { redator: { ...s.redator, copies } }
  }),

  _patch: (id, u) => set((s) => {
    const current = s[id as keyof Campanha2Store]
    if (typeof current !== 'object' || current === null) return {} as Partial<Campanha2Store>
    return { [id]: { ...(current as object), ...(u as object) } } as Partial<Campanha2Store>
  }),

  _log: (id, msg, type = 'info') => {
    const log: AgentLog = { time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), msg, type }
    set((s) => {
      const current = s[id as keyof Campanha2Store]
      if (typeof current !== 'object' || current === null) return {} as Partial<Campanha2Store>
      const agent = current as AgentBase
      return { [id]: { ...(current as object), logs: [...agent.logs, log] } } as Partial<Campanha2Store>
    })
  },

  cancelAgency: () => {
    get()._cancel.v = true
    set({ step: 'parametros' })
  },

  restartWithFeedback: (obs) => {
    const s = get()
    set({
      redator: { ...s.redator, previousFeedback: [...s.redator.previousFeedback, obs], copies: null, status: 'idle', logs: [], progress: 0, message: 'Aguardando...' },
      designer: { ...defaultAgent, creatives: [] },
      videoMaker: { ...defaultAgent, videos: [] },
      diretorArte: { ...defaultAgent, review: null },
    })
    get().approveRedator()
  },

  approveRedator: () => {
    const s = get()
    const cancel = s._cancel
    if (cancel.v) return
    set({ step: 'agencia' })

    const copies = s.redator.copies ?? []
    const refs = s.referenceImages.map(r => r.dataUrl)

    // ── Shared: trigger director once both agents finish ────────────────────
    let directorTriggered = false
    async function runDirector() {
      if (cancel.v || directorTriggered) return
      const st = get()
      const dDone = st.designer.status === 'done'
      const vDone = st.videoMaker.status === 'done'
      if (!dDone || !vDone) return
      directorTriggered = true

      get()._patch('diretorArte', { status: 'working', progress: 20, message: 'Revisando tudo...' })
      get()._log('diretorArte', 'Iniciando revisão dos materiais')
      try {
        const stNow = get()
        const r = await apiFetch('/api/v2/diretor', {
          briefing: stNow.atendimento.result,
          copies: stNow.redator.copies,
          creativesCount: stNow.designer.creatives.filter(c => c.status === 'done').length,
          videosCount: stNow.videoMaker.videos.filter(v => v.status === 'done').length,
          incluirImagens: s.incluirImagens,
          incluirNarrado: s.incluirNarrado,
          incluirApresentadora: s.incluirApresentadora,
        })
        const d = await r.json() as { review?: ArtReview; error?: string }
        if (!r.ok) throw new Error(d.error)
        get()._patch('diretorArte', { status: 'done', message: 'Revisão concluída', progress: 100, review: d.review ?? null })
        get()._log('diretorArte', d.review?.aprovado ? '✓ Campanha aprovada!' : '⚠ Ajustes sugeridos', d.review?.aprovado ? 'success' : 'action')
        set({ step: 'resultados' })
      } catch (err) {
        get()._patch('diretorArte', { status: 'error', message: String(err).slice(0, 120), progress: 0 })
        get()._log('diretorArte', `Erro: ${err}`, 'error')
        set({ step: 'resultados' })
      }
    }

    // ── DESIGNER ────────────────────────────────────────────────────────────
    if (s.incluirImagens) {
      const creatives: DesignerCreative[] = []
      for (let e = 1; e <= s.estruturasCount; e++) {
        for (let v = 1; v <= s.variacoesCount; v++) {
          const copy = copies.find(c => c.estrutura === e && c.variacao === v) ?? copies[(e - 1) * s.variacoesCount + (v - 1)] ?? copies[0]
          if (!copy) continue
          for (const fmt of ['4:5', '9:16'] as const) {
            creatives.push({ id: `e${e}v${v}-${fmt}`, estrutura: e, variacao: v, formato: fmt, imageDataUrl: '', copy, status: 'pending' })
          }
        }
      }
      get()._patch('designer', { creatives, status: 'working', progress: 5, message: 'Gerando imagens...' })
      get()._log('designer', `Iniciando geração de ${creatives.length} imagens`)

      const total = creatives.length
      let imgDone = 0

      Promise.all(creatives.map(async (cr) => {
        if (cancel.v) return
        set((st) => ({
          designer: { ...st.designer, creatives: st.designer.creatives.map(c => c.id === cr.id ? { ...c, status: 'generating' } : c) },
        }))
        try {
          const r = await apiFetch('/api/campanha/generate-creative', {
            copy: cr.copy, formato: cr.formato, referenceImages: refs, assetsContext: s.assetsContext,
          })
          const d = await r.json() as { imageDataUrl?: string }
          const img = d.imageDataUrl ?? ''
          imgDone++
          set((st) => ({
            designer: {
              ...st.designer,
              progress: Math.round((imgDone / total) * 100),
              message: `${imgDone}/${total} imagens geradas`,
              creatives: st.designer.creatives.map(c => c.id === cr.id ? { ...c, imageDataUrl: img, status: img ? 'done' : 'error' } : c),
            },
          }))
          get()._log('designer', `E${cr.estrutura}V${cr.variacao} ${cr.formato} ${img ? '✓' : '✗'}`, img ? 'success' : 'error')
        } catch (err) {
          imgDone++
          set((st) => ({
            designer: { ...st.designer, creatives: st.designer.creatives.map(c => c.id === cr.id ? { ...c, status: 'error' } : c) },
          }))
          get()._log('designer', `Erro: ${String(err).slice(0, 60)}`, 'error')
        }
      })).then(() => {
        if (cancel.v) return
        get()._patch('designer', { status: 'done', message: 'Imagens entregues', progress: 100 })
        get()._log('designer', `${imgDone}/${total} imagens finalizadas`, 'success')
        runDirector()
      })
    } else {
      get()._patch('designer', { status: 'done', message: 'Desativado', progress: 100 })
      runDirector()
    }

    // ── VIDEO MAKER ─────────────────────────────────────────────────────────
    const rotNarrado = s.redator.roteirosNarrado
    const rotApres = s.redator.roteirosApresentadora
    const videos: VideoOutput[] = []

    if (s.incluirNarrado) {
      for (let e = 1; e <= s.estruturasCount; e++) {
        for (let v = 1; v <= s.narradoCount; v++) {
          const rot = rotNarrado.find(r => r.estrutura === e) ?? rotNarrado[e - 1] ?? rotNarrado[0]
          if (rot) videos.push({ id: `narrado-e${e}v${v}`, tipo: 'narrado', estrutura: e, videoUrl: '', roteiro: rot, status: 'pending' })
        }
      }
    }
    if (s.incluirApresentadora) {
      for (let e = 1; e <= s.estruturasCount; e++) {
        for (let v = 1; v <= s.apresentadoraCount; v++) {
          const rot = rotApres.find(r => r.estrutura === e) ?? rotApres[e - 1] ?? rotApres[0]
          if (rot) videos.push({ id: `apresentadora-e${e}v${v}`, tipo: 'apresentadora', estrutura: e, videoUrl: '', roteiro: rot, status: 'pending' })
        }
      }
    }

    if (videos.length > 0) {
      get()._patch('videoMaker', { videos, status: 'working', progress: 5, message: 'Gerando vídeos...' })
      get()._log('videoMaker', `Iniciando ${videos.length} vídeo(s)`)

      let vidDone = 0
      const runVideosSeq = async () => {
        for (const vid of videos) {
          if (cancel.v) break
          set((st) => ({
            videoMaker: { ...st.videoMaker, videos: st.videoMaker.videos.map(v => v.id === vid.id ? { ...v, status: 'generating' } : v) },
          }))
          get()._log('videoMaker', `Gerando ${vid.tipo} E${vid.estrutura}...`)
          try {
            let audioUrl: string | undefined
            if (vid.tipo === 'narrado' && s.redator.roteirosNarrado.length > 0) {
              try {
                const ttsR = await apiFetch('/api/ai/tts', { text: vid.roteiro.roteiro }, 35000)
                const ttsD = await ttsR.json() as { audioUrl?: string }
                audioUrl = ttsD.audioUrl
              } catch { /* skip audio */ }
            }
            const vr = await apiFetch('/api/ai/generate-video', {
              prompt: vid.roteiro.roteiro.slice(0, 400),
              durationSeconds: 10,
              tipo: vid.tipo,
              presenterImage: vid.tipo === 'apresentadora' ? s.presenterImage : undefined,
              assetsContext: s.assetsContext,
            }, 120000)
            const vd = await vr.json() as { videoUrl?: string; error?: string }
            vidDone++
            set((st) => ({
              videoMaker: {
                ...st.videoMaker,
                progress: Math.round((vidDone / videos.length) * 100),
                message: `${vidDone}/${videos.length} vídeos prontos`,
                videos: st.videoMaker.videos.map(v => v.id === vid.id ? { ...v, videoUrl: vd.videoUrl ?? '', audioUrl, status: vd.videoUrl ? 'done' : 'error' } : v),
              },
            }))
            get()._log('videoMaker', `${vid.tipo} E${vid.estrutura} ${vd.videoUrl ? '✓' : '✗'}`, vd.videoUrl ? 'success' : 'error')
          } catch (err) {
            vidDone++
            set((st) => ({
              videoMaker: { ...st.videoMaker, videos: st.videoMaker.videos.map(v => v.id === vid.id ? { ...v, status: 'error' } : v) },
            }))
            get()._log('videoMaker', `Erro: ${String(err).slice(0, 80)}`, 'error')
          }
        }
        if (!cancel.v) {
          get()._patch('videoMaker', { status: 'done', message: 'Vídeos entregues', progress: 100 })
          get()._log('videoMaker', 'Todos os vídeos finalizados', 'success')
          runDirector()
        }
      }
      runVideosSeq()
    } else {
      get()._patch('videoMaker', { status: 'done', message: 'Desativado', progress: 100 })
      runDirector()
    }
  },

  startAgency: () => {
    const s = get()
    const cancel = { v: false }
    set({
      _cancel: cancel,
      step: 'agencia',
      atendimento: { ...defaultAgent, result: null },
      redator: { ...defaultAgent, copies: null, roteirosNarrado: [], roteirosApresentadora: [], legendas: [], previousFeedback: s.redator.previousFeedback },
      designer: { ...defaultAgent, creatives: [] },
      videoMaker: { ...defaultAgent, videos: [] },
      diretorArte: { ...defaultAgent, review: null },
    })

    const run = async () => {
      // ── ATENDIMENTO ──────────────────────────────────────────────────────────
      get()._patch('atendimento', { status: 'working', progress: 10, message: 'Lendo e organizando briefing...' })
      get()._log('atendimento', 'Iniciando leitura do briefing')

      const progressTimer = setInterval(() => {
        const cur = (get().atendimento.progress)
        if (cur < 75) get()._patch('atendimento', { progress: cur + 3 })
      }, 1000)

      try {
        const urls = s.briefingUrls.split('\n').map(u => u.trim()).filter(Boolean)
        get()._log('atendimento', `${urls.length} URL(s) encontrada(s)`)

        const r = await apiFetch('/api/v2/atendimento', {
          urls,
          text: s.briefingText,
          referenceImages: s.referenceImages.map(i => i.dataUrl).slice(0, 2),
        })
        clearInterval(progressTimer)
        if (cancel.v) return
        const d = await r.json() as { briefing?: ParsedBriefing2; error?: string }
        if (!r.ok) throw new Error(d.error)

        get()._patch('atendimento', { status: 'done', progress: 100, message: 'Briefing organizado com sucesso', result: d.briefing ?? null })
        get()._log('atendimento', `Produto: ${d.briefing?.produto}`, 'success')
        if (d.briefing?.paginasLidas?.length) get()._log('atendimento', `${d.briefing.paginasLidas.length} fonte(s) lida(s)`)
        get()._log('atendimento', 'Passando para o Redator', 'action')
      } catch (err) {
        clearInterval(progressTimer)
        get()._patch('atendimento', { status: 'error', message: String(err) })
        get()._log('atendimento', `Erro: ${err}`, 'error')
        return
      }

      if (cancel.v) return

      // ── REDATOR ──────────────────────────────────────────────────────────────
      const briefing = get().atendimento.result!
      get()._patch('redator', { status: 'working', progress: 10, message: 'Criando copies e roteiros...' })
      get()._log('redator', 'Recebendo briefing do Atendimento')

      const redProgress = setInterval(() => {
        const cur = get().redator.progress
        if (cur < 80) get()._patch('redator', { progress: cur + 2 })
      }, 800)

      try {
        const r = await apiFetch('/api/v2/redator', {
          briefing,
          estruturasCount: s.estruturasCount,
          variacoesCount: s.variacoesCount,
          narradoCount: s.narradoCount,
          apresentadoraCount: s.apresentadoraCount,
          incluirNarrado: s.incluirNarrado,
          incluirApresentadora: s.incluirApresentadora,
          previousFeedback: get().redator.previousFeedback,
          campaignName: s.campaignName,
        })
        clearInterval(redProgress)
        if (cancel.v) return
        const d = await r.json() as { copies?: CopySet2[]; roteirosNarrado?: Roteiro[]; roteirosApresentadora?: Roteiro[]; legendas?: string[]; error?: string }
        if (!r.ok) throw new Error(d.error)

        const totalCopies = (d.copies ?? []).length
        get()._patch('redator', {
          status: 'waiting',
          progress: 100,
          message: `${totalCopies} copies criadas — aguardando aprovação`,
          copies: d.copies ?? [],
          roteirosNarrado: d.roteirosNarrado ?? [],
          roteirosApresentadora: d.roteirosApresentadora ?? [],
          legendas: d.legendas ?? [],
        })
        get()._log('redator', `${totalCopies} copies criadas`, 'success')
        if (d.roteirosNarrado?.length) get()._log('redator', `${d.roteirosNarrado.length} roteiro(s) narrado`, 'success')
        if (d.roteirosApresentadora?.length) get()._log('redator', `${d.roteirosApresentadora.length} roteiro(s) apresentadora`, 'success')
        get()._log('redator', 'Aguardando revisão e aprovação', 'action')
      } catch (err) {
        clearInterval(redProgress)
        get()._patch('redator', { status: 'error', message: String(err) })
        get()._log('redator', `Erro: ${err}`, 'error')
      }
    }

    run()
  },
}))
