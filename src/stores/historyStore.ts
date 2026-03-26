import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GeneratedCreative } from './campanhaStore'

export interface SavedCampaign {
  id: string
  name: string
  savedAt: string   // ISO date string
  tom: string
  creatives: GeneratedCreative[]
}

interface HistoryState {
  campaigns: SavedCampaign[]
  saveCampaign: (data: Omit<SavedCampaign, 'id' | 'savedAt'>) => { ok: boolean; error?: string }
  deleteCampaign: (id: string) => void
  deleteCreative: (campaignId: string, creativeId: string) => void
  renameCampaign: (id: string, name: string) => void
}

const MAX_CAMPAIGNS = 10

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      campaigns: [],

      saveCampaign: (data) => {
        const newCampaign: SavedCampaign = {
          ...data,
          id: `camp_${Date.now()}`,
          savedAt: new Date().toISOString(),
        }

        // Keep only last MAX_CAMPAIGNS
        const current = get().campaigns
        const updated  = [newCampaign, ...current].slice(0, MAX_CAMPAIGNS)

        try {
          set({ campaigns: updated })
          return { ok: true }
        } catch {
          // localStorage quota — try saving without images
          try {
            const slim: SavedCampaign = {
              ...newCampaign,
              creatives: newCampaign.creatives.map((c) => ({
                ...c,
                backgroundImage: null,
                carrosselImages: [],
              })),
            }
            set({ campaigns: [slim, ...current].slice(0, MAX_CAMPAIGNS) })
            return { ok: true }
          } catch {
            return { ok: false, error: 'Armazenamento local cheio. Exclua campanhas antigas.' }
          }
        }
      },

      deleteCampaign: (id) =>
        set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) })),

      deleteCreative: (campaignId, creativeId) =>
        set((s) => ({
          campaigns: s.campaigns.map((camp) =>
            camp.id === campaignId
              ? { ...camp, creatives: camp.creatives.filter((c) => c.id !== creativeId) }
              : camp,
          ),
        })),

      renameCampaign: (id, name) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, name } : c)),
        })),
    }),
    {
      name: 'seazone-campaign-history',
      // Catch serialization errors silently
      onRehydrateStorage: () => (state, error) => {
        if (error) console.warn('[history] Falha ao reidratrar histórico:', error)
      },
    },
  ),
)
