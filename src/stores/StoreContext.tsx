import { createContext, useContext } from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { BriefingState } from './briefingStore'
import { variacoesStore } from './briefingStore'

// Context
const StoreCtx = createContext<StoreApi<BriefingState>>(variacoesStore)

// Provider — cada app envolve seus componentes com a instância correta
export function StoreProvider({
  store,
  children,
}: {
  store: StoreApi<BriefingState>
  children: React.ReactNode
}) {
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
}

// Hook para todos os componentes — lê do store atual no contexto
export function useBriefingStore<T>(selector: (s: BriefingState) => T): T {
  const store = useContext(StoreCtx)
  return useStore(store, selector)
}
