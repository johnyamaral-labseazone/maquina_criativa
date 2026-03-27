import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CopySet2, ArtReview, DesignerCreative, VideoOutput } from './campanha2Store'

export interface Campaign2Snapshot {
  id: string
  date: string
  name: string
  produto: string
  thumbnails: string[]
  imagesCount: number
  videosCount: number
  copiesCount: number
  copies: CopySet2[]
  creatives: DesignerCreative[]
  videos: VideoOutput[]
  review: ArtReview | null
  legendas: string[]
}

interface History2Store {
  campaigns: Campaign2Snapshot[]
  save(snap: Campaign2Snapshot): void
  remove(id: string): void
  clear(): void
}

export const useHistory2Store = create<History2Store>()(
  persist(
    (set) => ({
      campaigns: [],
      save: (snap) => set((s) => ({
        campaigns: [snap, ...s.campaigns.filter(c => c.id !== snap.id)].slice(0, 10),
      })),
      remove: (id) => set((s) => ({ campaigns: s.campaigns.filter(c => c.id !== id) })),
      clear: () => set({ campaigns: [] }),
    }),
    {
      name: 'seazone-campaign2-history',
      onRehydrateStorage: () => (state) => {
        // Limit thumbnails size on rehydration to avoid localStorage quota
        if (state?.campaigns) {
          state.campaigns = state.campaigns.map(c => ({
            ...c,
            thumbnails: c.thumbnails.slice(0, 2),
            creatives: c.creatives.map(cr => ({ ...cr, imageDataUrl: cr.imageDataUrl ? cr.imageDataUrl.slice(0, 200) + '…' : '' })),
          }))
        }
      },
    }
  )
)
