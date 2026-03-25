import { create } from 'zustand'

import type { TabKey } from '../types'

type UIState = {
  tab: TabKey
  selectedArticleId: string | null
  selectedDraftId: string | null
  scheduleDraftId: string | null
  setTab: (tab: TabKey) => void
  setSelectedArticleId: (id: string | null) => void
  setSelectedDraftId: (id: string | null) => void
  setScheduleDraftId: (id: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  tab: 'dashboard',
  selectedArticleId: null,
  selectedDraftId: null,
  scheduleDraftId: null,
  setTab: (tab) => set({ tab }),
  setSelectedArticleId: (selectedArticleId) => set({ selectedArticleId }),
  setSelectedDraftId: (selectedDraftId) => set({ selectedDraftId }),
  setScheduleDraftId: (scheduleDraftId) => set({ scheduleDraftId }),
}))
