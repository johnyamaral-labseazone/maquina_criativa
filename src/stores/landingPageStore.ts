import { create } from 'zustand'
import type { LandingPageState, LandingPage, Block } from '../types/landingPage'

const generateId = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2)

const DEFAULT_LANDING_PAGE: LandingPage = {
  id: generateId(),
  name: 'Nova Landing Page',
  productName: 'Produto',
  description: 'Descrição do seu produto',
  blocks: [
    {
      id: generateId(),
      order: 0,
      type: 'image',
      data: {
        id: generateId(),
        type: 'image',
        src: 'https://via.placeholder.com/1200x600',
        alt: 'Imagem principal',
        width: 1200,
        height: 600,
        maxWidth: 100,
      },
      paddingTop: 0,
      paddingBottom: 40,
    },
    {
      id: generateId(),
      order: 1,
      type: 'text',
      data: {
        id: generateId(),
        type: 'text',
        content: 'Título da página',
        fontSize: 48,
        fontWeight: 'bold',
        color: '#1C398E',
        align: 'center',
      },
      paddingTop: 0,
      paddingBottom: 16,
    },
    {
      id: generateId(),
      order: 2,
      type: 'text',
      data: {
        id: generateId(),
        type: 'text',
        content: 'Subtítulo ou descrição breve do produto',
        fontSize: 18,
        fontWeight: 'normal',
        color: '#666',
        align: 'center',
      },
      paddingTop: 0,
      paddingBottom: 40,
    },
    {
      id: generateId(),
      order: 3,
      type: 'cta',
      data: {
        id: generateId(),
        type: 'cta',
        text: 'Conheça agora',
        url: '#',
        buttonColor: '#7C3AED',
        textColor: '#fff',
        size: 'lg',
      },
      paddingTop: 0,
      paddingBottom: 60,
    },
  ],
  primaryColor: '#7C3AED',
  secondaryColor: '#EA580C',
  backgroundColor: '#fff',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  published: false,
}

export const useLandingPageStore = create<LandingPageState>((set) => ({
  pages: [],
  currentPageId: null,

  addPage: (page) =>
    set((state) => ({
      pages: [...state.pages, page],
      currentPageId: page.id,
    })),

  updatePage: (id, updates) =>
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    })),

  deletePage: (id) =>
    set((state) => ({
      pages: state.pages.filter((p) => p.id !== id),
      currentPageId: state.currentPageId === id ? null : state.currentPageId,
    })),

  setCurrentPage: (id) => set({ currentPageId: id }),

  duplicatePage: (id) =>
    set((state) => {
      const page = state.pages.find((p) => p.id === id)
      if (!page) return state

      const newPage: LandingPage = {
        ...page,
        id: generateId(),
        name: `${page.name} (cópia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: page.blocks.map((b) => ({
          ...b,
          id: generateId(),
          data: { ...b.data, id: generateId() },
        })),
      }

      return {
        pages: [...state.pages, newPage],
        currentPageId: newPage.id,
      }
    }),

  addBlock: (pageId, block) =>
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              blocks: [...p.blocks, block].sort((a, b) => a.order - b.order),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),

  updateBlock: (pageId, blockId, updates) =>
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              blocks: p.blocks.map((b) =>
                b.id === blockId ? { ...b, ...updates } : b
              ),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),

  deleteBlock: (pageId, blockId) =>
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              blocks: p.blocks.filter((b) => b.id !== blockId),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),

  reorderBlocks: (pageId, blocks) =>
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              blocks: blocks.sort((a, b) => a.order - b.order),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),
}))

export const createDefaultPage = (): LandingPage => ({
  ...DEFAULT_LANDING_PAGE,
  id: generateId(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})
