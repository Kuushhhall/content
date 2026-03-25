import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UIState = {
  selectedArticleId: string | null
  selectedDraftId: string | null
  scheduleDraftId: string | null
  isMenuOpen: boolean
  isDarkMode: boolean
  setSelectedArticleId: (id: string | null) => void
  setSelectedDraftId: (id: string | null) => void
  setScheduleDraftId: (id: string | null) => void
  setMenuOpen: (open: boolean) => void
  toggleDarkMode: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      selectedArticleId: null,
      selectedDraftId: null,
      scheduleDraftId: null,
      isMenuOpen: false,
      isDarkMode: true, // Default to dark mode
      setSelectedArticleId: (selectedArticleId) => set({ selectedArticleId }),
      setSelectedDraftId: (selectedDraftId) => set({ selectedDraftId }),
      setScheduleDraftId: (scheduleDraftId) => set({ scheduleDraftId }),
      setMenuOpen: (isMenuOpen) => set({ isMenuOpen }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    {
      name: 'lawxy-ui-storage',
    }
  )
)
