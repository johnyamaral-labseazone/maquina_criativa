import { create } from 'zustand'

export type WaFormat = '1:1' | '9:16'

export interface WaTextElement {
  id: string
  content: string
  x: number
  y: number
  fontSize: number
  color: string
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right'
  width: number
}

// '__cta__' is a reserved selectedId value meaning the CTA box is selected
export const CTA_ID = '__cta__'

interface WhatsappEditorState {
  formato: WaFormat
  backgroundImage: string | null
  logoImage: string | null
  logoVisible: boolean
  logo2Image: string | null
  logo2Visible: boolean
  accentColor: string
  elements: WaTextElement[]
  selectedId: string | null   // null | element id | '__cta__'

  // CTA box
  ctaVisible: boolean
  ctaText1: string            // normal-weight prefix  (combined ≤ 40 chars)
  ctaText2: string            // bold suffix
  ctaX: number
  ctaY: number
  ctaBorderColor: string
  ctaFontSize: number

  // actions
  setFormato: (f: WaFormat) => void
  setBackgroundImage: (img: string | null) => void
  setLogoImage: (img: string | null) => void
  setLogoVisible: (v: boolean) => void
  setLogo2Image: (img: string | null) => void
  setLogo2Visible: (v: boolean) => void
  setAccentColor: (c: string) => void
  addElement: () => void
  updateElement: (id: string, updates: Partial<Omit<WaTextElement, 'id'>>) => void
  removeElement: (id: string) => void
  selectElement: (id: string | null) => void
  // CTA
  setCtaVisible: (v: boolean) => void
  setCtaText1: (t: string) => void
  setCtaText2: (t: string) => void
  setCtaPos: (x: number, y: number) => void
  setCtaBorderColor: (c: string) => void
  setCtaFontSize: (size: number) => void
}

export const useWhatsappStore = create<WhatsappEditorState>((set, get) => ({
  formato: '1:1',
  backgroundImage: null,
  logoImage: null,
  logoVisible: true,
  logo2Image: null,
  logo2Visible: false,
  accentColor: '#0055FF',
  selectedId: null,
  elements: [
    {
      id: 'el-title',
      content: 'Título principal',
      x: 80, y: 400,
      fontSize: 88, color: '#FFFFFF',
      fontWeight: 'bold', textAlign: 'left', width: 920,
    },
    {
      id: 'el-sub',
      content: 'Subtítulo ou descrição do imóvel',
      x: 80, y: 530,
      fontSize: 46, color: '#FFFFFFCC',
      fontWeight: 'normal', textAlign: 'left', width: 920,
    },
  ],

  // CTA defaults
  ctaVisible: false,
  ctaText1: 'Reserve no ',
  ctaText2: 'link da bio',
  ctaX: 190,
  ctaY: 860,
  ctaBorderColor: '#2BBD68',
  ctaFontSize: 52,

  setFormato: (formato) => set({ formato }),
  setBackgroundImage: (backgroundImage) => set({ backgroundImage }),
  setLogoImage: (logoImage) => set({ logoImage }),
  setLogoVisible: (logoVisible) => set({ logoVisible }),
  setLogo2Image: (logo2Image) => set({ logo2Image }),
  setLogo2Visible: (logo2Visible) => set({ logo2Visible }),
  setAccentColor: (accentColor) => set({ accentColor }),

  addElement: () => {
    const count = get().elements.length
    set((s) => ({
      elements: [...s.elements, {
        id: `el-${Date.now()}`,
        content: 'Novo texto',
        x: 80, y: 220 + count * 140,
        fontSize: 52, color: '#FFFFFF',
        fontWeight: 'normal', textAlign: 'left', width: 920,
      }],
    }))
  },

  updateElement: (id, updates) =>
    set((s) => ({ elements: s.elements.map((el) => el.id === id ? { ...el, ...updates } : el) })),

  removeElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((el) => el.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  selectElement: (selectedId) => set({ selectedId }),

  setCtaVisible: (ctaVisible) => set({ ctaVisible }),
  setCtaText1: (ctaText1) => set({ ctaText1 }),
  setCtaText2: (ctaText2) => set({ ctaText2 }),
  setCtaPos: (ctaX, ctaY) => set({ ctaX, ctaY }),
  setCtaBorderColor: (ctaBorderColor) => set({ ctaBorderColor }),
  setCtaFontSize: (ctaFontSize) => set({ ctaFontSize }),
}))
