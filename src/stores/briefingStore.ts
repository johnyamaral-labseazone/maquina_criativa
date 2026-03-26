import { createStore } from 'zustand'
import type { Briefing, Estrutura, Variacao, SafeZone, FormatoExport } from '../types/briefing'
import { createBriefing, createEstrutura, createVariacao } from '../types/briefing'

export interface BriefingState {
  briefing: Briefing
  currentStep: number
  selectedEstrutura: number
  selectedVariacao: number
  formato: FormatoExport
  availableFormats: FormatoExport[]
  safeZone: SafeZone

  // Briefing auto-fill
  briefingPdf: string | null
  briefingPdfName: string | null
  briefingUrl: string
  setBriefingPdf: (data: string | null, name: string | null) => void
  setBriefingUrl: (url: string) => void

  // Creative types selection (for Variações step)
  selectedCreativeTypes: string[]
  toggleCreativeType: (type: string) => void

  // Generation
  isGenerating: boolean
  setIsGenerating: (v: boolean) => void

  setStep: (step: number) => void
  setSelectedEstrutura: (index: number) => void
  setSelectedVariacao: (index: number) => void
  setFormato: (formato: FormatoExport) => void
  setSafeZone: (zone: Partial<SafeZone>) => void

  // Assets
  setDriveLink: (link: string) => void
  setReferenceImage: (image: string | null) => void
  setLogoImage: (image: string | null) => void
  setAccentColor: (color: string) => void
  addBackgroundImage: (image: string) => void
  removeBackgroundImage: (index: number) => void
  setVariacaoBackground: (ei: number, vi: number, imageIndex: number) => void

  // Estruturas
  updateEstrutura: (index: number, data: Partial<Estrutura>) => void
  addEstrutura: () => void
  removeEstrutura: (index: number) => void

  // Variações
  updateVariacao: (ei: number, vi: number, data: Partial<Variacao>) => void
  addVariacao: (ei: number) => void
  removeVariacao: (ei: number, vi: number) => void

  // Textos fixos
  addTextoFixo: (ei: number, vi: number) => void
  removeTextoFixo: (ei: number, vi: number, ti: number) => void

  // Pontos fortes
  addPontoForte: (ei: number, ponto: string) => void
  removePontoForte: (ei: number, pi: number) => void

  importJson: (data: Briefing) => void
  reset: () => void
}

interface StoreConfig {
  defaultFormato: FormatoExport
  availableFormats: FormatoExport[]
}

export function createBriefingStore(config: StoreConfig) {
  return createStore<BriefingState>((set) => ({
    briefing: createBriefing(),
    currentStep: 0,
    selectedEstrutura: 0,
    selectedVariacao: 0,
    formato: config.defaultFormato,
    availableFormats: config.availableFormats,
    safeZone: { top: 120, bottom: 120, left: 40, right: 40 },
    briefingPdf: null,
    briefingPdfName: null,
    briefingUrl: '',
    selectedCreativeTypes: ['feed-static', 'story-static'],
    isGenerating: false,

    setStep: (step) => set({ currentStep: step }),
    setSelectedEstrutura: (index) => set({ selectedEstrutura: index, selectedVariacao: 0 }),
    setSelectedVariacao: (index) => set({ selectedVariacao: index }),
    setFormato: (formato) => set({ formato }),
    setSafeZone: (zone) => set((s) => ({ safeZone: { ...s.safeZone, ...zone } })),

    setDriveLink: (link) => set((s) => ({ briefing: { ...s.briefing, driveLink: link } })),
    setReferenceImage: (image) => set((s) => ({ briefing: { ...s.briefing, referenceImage: image } })),
    setLogoImage: (image) => set((s) => ({ briefing: { ...s.briefing, logoImage: image } })),
    setAccentColor: (color) => set((s) => ({ briefing: { ...s.briefing, accentColor: color } })),

    addBackgroundImage: (image) =>
      set((s) => ({ briefing: { ...s.briefing, backgroundImages: [...s.briefing.backgroundImages, image] } })),

    removeBackgroundImage: (index) =>
      set((s) => {
        const backgroundImages = s.briefing.backgroundImages.filter((_, i) => i !== index)
        const estruturas = s.briefing.estruturas.map((e) => ({
          ...e,
          variacoes: e.variacoes.map((v) => ({
            ...v,
            backgroundImageIndex: v.backgroundImageIndex >= backgroundImages.length
              ? Math.max(0, backgroundImages.length - 1)
              : v.backgroundImageIndex,
          })),
        }))
        return { briefing: { ...s.briefing, backgroundImages, estruturas } }
      }),

    setVariacaoBackground: (ei, vi, imageIndex) =>
      set((s) => {
        const estruturas = [...s.briefing.estruturas]
        const variacoes = [...estruturas[ei].variacoes]
        variacoes[vi] = { ...variacoes[vi], backgroundImageIndex: imageIndex }
        estruturas[ei] = { ...estruturas[ei], variacoes }
        return { briefing: { ...s.briefing, estruturas } }
      }),

    updateEstrutura: (index, data) =>
      set((s) => {
        const estruturas = [...s.briefing.estruturas]
        estruturas[index] = { ...estruturas[index], ...data }
        return { briefing: { ...s.briefing, estruturas } }
      }),

    addEstrutura: () =>
      set((s) => ({
        briefing: {
          ...s.briefing,
          estruturas: [...s.briefing.estruturas, createEstrutura(s.briefing.estruturas.length)],
        },
      })),

    removeEstrutura: (index) =>
      set((s) => ({
        briefing: { ...s.briefing, estruturas: s.briefing.estruturas.filter((_, i) => i !== index) },
        selectedEstrutura: Math.max(0, s.selectedEstrutura - (index <= s.selectedEstrutura ? 1 : 0)),
      })),

    updateVariacao: (ei, vi, data) =>
      set((s) => {
        const estruturas = [...s.briefing.estruturas]
        const variacoes = [...estruturas[ei].variacoes]
        variacoes[vi] = { ...variacoes[vi], ...data }
        estruturas[ei] = { ...estruturas[ei], variacoes }
        return { briefing: { ...s.briefing, estruturas } }
      }),

    addVariacao: (ei) =>
      set((s) => {
        const estruturas = [...s.briefing.estruturas]
        const variacoes = [...estruturas[ei].variacoes, createVariacao(estruturas[ei].variacoes.length)]
        estruturas[ei] = { ...estruturas[ei], variacoes }
        return { briefing: { ...s.briefing, estruturas } }
      }),

    removeVariacao: (ei, vi) =>
      set((s) => {
        const estruturas = [...s.briefing.estruturas]
        if (estruturas[ei].variacoes.length <= 1) return s
        const variacoes = estruturas[ei].variacoes.filter((_, i) => i !== vi)
        estruturas[ei] = { ...estruturas[ei], variacoes }
        return {
          briefing: { ...s.briefing, estruturas },
          selectedVariacao: Math.min(s.selectedVariacao, variacoes.length - 1),
        }
      }),

    addTextoFixo: (ei, vi) =>
      set((s) => {
        const estruturas = [...s.briefing.estruturas]
        const variacoes = [...estruturas[ei].variacoes]
        variacoes[vi] = { ...variacoes[vi], textosFixos: [...variacoes[vi].textosFixos, ''] }
        estruturas[ei] = { ...estruturas[ei], variacoes }
        return { briefing: { ...s.briefing, estruturas } }
      }),

    removeTextoFixo: (ei, vi, ti) =>
      set((s) => {
        const estruturas = [...s.briefing.estruturas]
        const variacoes = [...estruturas[ei].variacoes]
        variacoes[vi] = { ...variacoes[vi], textosFixos: variacoes[vi].textosFixos.filter((_, i) => i !== ti) }
        estruturas[ei] = { ...estruturas[ei], variacoes }
        return { briefing: { ...s.briefing, estruturas } }
      }),

    addPontoForte: (ei, ponto) =>
      set((s) => {
        const estruturas = [...s.briefing.estruturas]
        estruturas[ei] = { ...estruturas[ei], pontosFortes: [...estruturas[ei].pontosFortes, ponto] }
        return { briefing: { ...s.briefing, estruturas } }
      }),

    removePontoForte: (ei, pi) =>
      set((s) => {
        const estruturas = [...s.briefing.estruturas]
        estruturas[ei] = { ...estruturas[ei], pontosFortes: estruturas[ei].pontosFortes.filter((_, i) => i !== pi) }
        return { briefing: { ...s.briefing, estruturas } }
      }),

    importJson: (data) => set({ briefing: data }),
    reset: () => set({ briefing: createBriefing(), selectedEstrutura: 0, selectedVariacao: 0 }),
  }))
}

// ── Instâncias de cada app ───────────────────────────────────────
export const variacoesStore = createBriefingStore({
  defaultFormato: '4:5',
  availableFormats: ['4:5', '9:16'],
})

export const whatsappStore = createBriefingStore({
  defaultFormato: '1:1',
  availableFormats: ['1:1', '9:16'],
})
