import { create } from 'zustand'

export type CampanhaStep = 'briefing' | 'assets' | 'parametros' | 'editarCopies' | 'gerando' | 'resultados'

export interface ReferenceImage {
  data: string        // base64 data URL
  name: string
  stylePrompt?: string   // extracted by AI analysis
  styleDescription?: string
}
export type CampanhaTom = 'profissional' | 'amigavel' | 'urgente' | 'luxo'
export type CampanhaFormato = '4:5' | '9:16' | '1:1'
export type GeracaoStepStatus = 'pending' | 'active' | 'done' | 'error' | 'skipped'

export interface ParsedBriefing {
  produto: string
  publicoAlvo: string
  mensagensPrincipais: string[]
  tom: string
  diferenciais: string[]
  cta: string
  observacoes: string
  // Financial data
  valorInvestimento: string
  rendaMensal: string
  roi: string
  taxaOcupacao: string
  localizacao: string
}

export interface CopyVariation {
  estrutura: number
  variacao: number
  headline: string
  body: string
  cta: string
  videoRoteiro?: string  // script/voiceover for narrated video
}

export interface GeneratedCreative {
  id: string
  estrutura: number        // 1 | 2 | 3
  variacao: number         // 1 | 2 | 3 | 4 | 5
  formato: CampanhaFormato // '4:5' | '9:16' | '1:1'
  tipo: 'image' | 'narrado' | 'apresentadora' | 'video' | 'carrossel'
  //   image        → static feed/story image
  //   narrado      → narrated video (voiceover + property visuals)
  //   apresentadora → presenter video (host appears on screen)
  //   video        → legacy video type (saved campaigns)
  //   carrossel    → carousel of images
  videoDuracao?: '30-40s' | '10-20s'
  copy: CopyVariation
  backgroundImage: string | null
  videoUrl: string | null
  carrosselImages?: string[] | null
  status: 'pending' | 'generating' | 'done' | 'error'
  validationWarnings?: string[]
}

export interface GeracaoStepDef {
  id: string
  label: string
  description: string
  status: GeracaoStepStatus
  dependsOnImagens?: boolean
  dependsOnNarrado?: boolean
  dependsOnApresentadora?: boolean
}

// Max limits
export const ESTRUTURAS_MAX = 3
export const VARIACOES_MAX  = 5

export const ESTRUTURAS_COUNT        = ESTRUTURAS_MAX
export const VARIACOES_PER_ESTRUTURA = VARIACOES_MAX

const GERACAO_STEPS: GeracaoStepDef[] = [
  {
    id: 'parse',
    label: 'Analisando briefing',
    description: 'Extraindo informações e dados financeiros com Gemini',
    status: 'pending',
  },
  {
    id: 'copy',
    label: 'Gerando copies (3 estruturas × 5 variações)',
    description: 'Criando headlines, textos e roteiros para 15 variações',
    status: 'pending',
  },
  {
    id: 'validate',
    label: 'Validando conteúdo',
    description: 'Verificando elementos proibidos e conformidade Seazone',
    status: 'pending',
  },
  {
    id: 'images',
    label: 'Gerando imagens Feed + Story',
    description: 'Criando imagens com IA para todos os formatos',
    status: 'pending',
    dependsOnImagens: true,
  },
  {
    id: 'apresentadora',
    label: 'Gerando vídeos com apresentadora',
    description: 'Criando vídeos com a apresentadora Seazone',
    status: 'pending',
    dependsOnApresentadora: true,
  },
  {
    id: 'narrado',
    label: 'Gerando vídeos narrados',
    description: 'Criando vídeos narrados com imagens dos empreendimentos',
    status: 'pending',
    dependsOnNarrado: true,
  },
  {
    id: 'done',
    label: 'Finalizando',
    description: 'Preparando resultados para download',
    status: 'pending',
  },
]

interface CampanhaState {
  step: CampanhaStep

  // — Briefing
  briefingType: 'pdf' | 'url' | 'manual' | 'image'
  briefingUrl: string
  briefingPdf: string | null
  briefingPdfName: string | null
  briefingManual: string
  briefingImage: string | null
  briefingImageName: string | null
  briefingContext: string
  parsedBriefing: ParsedBriefing | null

  // — Assets (new step after briefing)
  assetsUrl: string           // Google Drive link
  assetsContext: string       // free text guidance for AI
  presenterImage: string | null       // base64 data URL of presenter photo
  presenterImageName: string | null
  referenceImages: ReferenceImage[]   // visual style references (max 3)

  // — Parâmetros
  campaignName: string
  estruturasCount: number        // 1 | 2 | 3
  variacoesCount: number         // 1 | 2 | 3 | 4 | 5
  incluirImagens: boolean        // static feed + story images
  incluirNarrado: boolean        // narrated videos (voiceover + property visuals)
  narradoCount: number           // videos per estrutura (1–variacoesCount)
  incluirApresentadora: boolean  // presenter videos
  apresentadoraCount: number     // how many apresentadora videos (1–estruturasCount)
  tom: CampanhaTom

  // — Geração
  isGenerating: boolean
  geracaoSteps: GeracaoStepDef[]
  currentStepIndex: number
  geracaoError: string | null

  // — Resultados
  copyVariations: CopyVariation[]
  creatives: GeneratedCreative[]

  // Actions
  setStep: (s: CampanhaStep) => void
  setBriefingType: (t: 'pdf' | 'url' | 'manual' | 'image') => void
  setBriefingUrl: (url: string) => void
  setBriefingPdf: (data: string | null, name: string | null) => void
  setBriefingManual: (text: string) => void
  setBriefingImage: (data: string | null, name: string | null) => void
  setBriefingContext: (ctx: string) => void
  setParsedBriefing: (b: ParsedBriefing | null) => void
  setAssetsUrl: (url: string) => void
  setAssetsContext: (ctx: string) => void
  setPresenterImage: (data: string | null, name: string | null) => void
  addReferenceImage: (img: ReferenceImage) => void
  removeReferenceImage: (index: number) => void
  updateReferenceImage: (index: number, updates: Partial<ReferenceImage>) => void
  setCampaignName: (n: string) => void
  setEstruturasCount: (n: number) => void
  setVariacoesCount: (n: number) => void
  setIncluirImagens: (v: boolean) => void
  setIncluirNarrado: (v: boolean) => void
  setNarradoCount: (n: number) => void
  setIncluirApresentadora: (v: boolean) => void
  setApresentadoraCount: (n: number) => void
  setTom: (t: CampanhaTom) => void
  startGenerating: () => void
  advanceStep: (stepId: string, status: GeracaoStepStatus) => void
  setCopyVariations: (c: CopyVariation[]) => void
  updateCopyVariation: (estrutura: number, variacao: number, updates: Partial<CopyVariation>) => void
  setCreatives: (c: GeneratedCreative[]) => void
  updateCreative: (id: string, updates: Partial<GeneratedCreative>) => void
  setGeracaoError: (e: string | null) => void
  reset: () => void
}

export const useCampanhaStore = create<CampanhaState>((set, get) => ({
  step: 'briefing',

  briefingType: 'url',
  briefingUrl: '',
  briefingPdf: null,
  briefingPdfName: null,
  briefingManual: '',
  briefingImage: null,
  briefingImageName: null,
  briefingContext: '',
  parsedBriefing: null,

  assetsUrl: '',
  assetsContext: '',
  presenterImage: null,
  presenterImageName: null,
  referenceImages: [],

  campaignName: '',
  estruturasCount: 3,
  variacoesCount: 5,
  incluirImagens: true,
  incluirNarrado: false,
  narradoCount: 3,
  incluirApresentadora: false,
  apresentadoraCount: 3,
  tom: 'profissional',

  isGenerating: false,
  geracaoSteps: GERACAO_STEPS.map((s) => ({ ...s })),
  currentStepIndex: -1,
  geracaoError: null,

  copyVariations: [],
  creatives: [],

  setStep: (step) => set({ step }),
  setBriefingType: (briefingType) => set({ briefingType }),
  setBriefingUrl: (briefingUrl) => set({ briefingUrl }),
  setBriefingPdf: (briefingPdf, briefingPdfName) => set({ briefingPdf, briefingPdfName }),
  setBriefingManual: (briefingManual) => set({ briefingManual }),
  setBriefingImage: (briefingImage, briefingImageName) => set({ briefingImage, briefingImageName }),
  setBriefingContext: (briefingContext) => set({ briefingContext }),
  setParsedBriefing: (parsedBriefing) => set({ parsedBriefing }),
  setAssetsUrl: (assetsUrl) => set({ assetsUrl }),
  setAssetsContext: (assetsContext) => set({ assetsContext }),
  setPresenterImage: (presenterImage, presenterImageName) => set({ presenterImage, presenterImageName }),
  addReferenceImage: (img) => set((s) => ({ referenceImages: [...s.referenceImages, img] })),
  removeReferenceImage: (index) => set((s) => ({ referenceImages: s.referenceImages.filter((_, i) => i !== index) })),
  updateReferenceImage: (index, updates) => set((s) => ({
    referenceImages: s.referenceImages.map((img, i) => i === index ? { ...img, ...updates } : img),
  })),
  setCampaignName: (campaignName) => set({ campaignName }),

  setEstruturasCount: (n) => set((s) => ({
    estruturasCount: Math.max(1, Math.min(ESTRUTURAS_MAX, n)),
    apresentadoraCount: Math.min(s.apresentadoraCount, Math.max(1, Math.min(ESTRUTURAS_MAX, n))),
  })),
  setVariacoesCount: (n) => set((s) => ({
    variacoesCount: Math.max(1, Math.min(VARIACOES_MAX, n)),
    narradoCount: Math.min(s.narradoCount, Math.max(1, Math.min(VARIACOES_MAX, n))),
  })),
  setIncluirImagens: (incluirImagens) => set({ incluirImagens }),
  setIncluirNarrado: (incluirNarrado) => set({ incluirNarrado }),
  setNarradoCount: (n) => set((s) => ({ narradoCount: Math.max(1, Math.min(s.variacoesCount, n)) })),
  setIncluirApresentadora: (incluirApresentadora) => set({ incluirApresentadora }),
  setApresentadoraCount: (n) => set((s) => ({ apresentadoraCount: Math.max(1, Math.min(s.estruturasCount, n)) })),
  setTom: (tom) => set({ tom }),

  startGenerating: () => {
    const { incluirImagens, incluirNarrado, incluirApresentadora, estruturasCount, variacoesCount, narradoCount, apresentadoraCount } = get()
    const stepUpdates: Record<string, string> = {
      copy:          `Criando headlines e textos para ${estruturasCount} estruturas × ${variacoesCount} variações`,
      images:        `Criando ${estruturasCount * variacoesCount * 2} imagens (${estruturasCount * variacoesCount} Feed + ${estruturasCount * variacoesCount} Story)`,
      apresentadora: `Criando ${apresentadoraCount} vídeo${apresentadoraCount > 1 ? 's' : ''} com a apresentadora Seazone`,
      narrado:       `Criando ${estruturasCount * narradoCount} vídeo${estruturasCount * narradoCount > 1 ? 's' : ''} narrados com imagens dos empreendimentos`,
    }
    set({
      isGenerating: true,
      geracaoError: null,
      currentStepIndex: 0,
      geracaoSteps: GERACAO_STEPS.map((s) => ({
        ...s,
        description: stepUpdates[s.id] ?? s.description,
        status:
          (s.dependsOnImagens && !incluirImagens) ||
          (s.dependsOnNarrado && !incluirNarrado) ||
          (s.dependsOnApresentadora && !incluirApresentadora)
            ? 'skipped'
            : 'pending',
      })),
      creatives: [],
      copyVariations: [],
    })
  },

  advanceStep: (stepId, status) =>
    set((s) => {
      const steps = s.geracaoSteps.map((st) =>
        st.id === stepId ? { ...st, status } : st,
      )
      const nextIndex = steps.findIndex((st) => st.status === 'pending')
      return {
        geracaoSteps: steps,
        currentStepIndex: nextIndex,
        isGenerating: nextIndex !== -1 || status === 'active',
      }
    }),

  setCopyVariations: (copyVariations) => set({ copyVariations }),
  updateCopyVariation: (estrutura, variacao, updates) => set((state) => ({
    copyVariations: state.copyVariations.map((cv) =>
      cv.estrutura === estrutura && cv.variacao === variacao ? { ...cv, ...updates } : cv
    ),
  })),
  setCreatives: (creatives) => set({ creatives }),
  updateCreative: (id, updates) =>
    set((s) => ({
      creatives: s.creatives.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  setGeracaoError: (geracaoError) => set({ geracaoError, isGenerating: false }),

  reset: () =>
    set({
      step: 'briefing',
      briefingUrl: '',
      briefingPdf: null,
      briefingPdfName: null,
      briefingManual: '',
      briefingImage: null,
      briefingImageName: null,
      briefingContext: '',
      parsedBriefing: null,
      assetsUrl: '',
      assetsContext: '',
      presenterImage: null,
      presenterImageName: null,
      referenceImages: [],
      campaignName: '',
      estruturasCount: 3,
      variacoesCount: 5,
      incluirImagens: true,
      incluirNarrado: false,
      narradoCount: 3,
      incluirApresentadora: false,
      apresentadoraCount: 3,
      tom: 'profissional',
      isGenerating: false,
      geracaoSteps: GERACAO_STEPS.map((s) => ({ ...s })),
      currentStepIndex: -1,
      geracaoError: null,
      copyVariations: [],
      creatives: [],
    }),
}))
