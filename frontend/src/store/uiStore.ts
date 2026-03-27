import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UIState = {
  selectedArticleId: string | null
  selectedDraftId: string | null
  scheduleDraftId: string | null
  isMenuOpen: boolean
  isDarkMode: boolean
  isSidebarCollapsed: boolean
  setSelectedArticleId: (id: string | null) => void
  setSelectedDraftId: (id: string | null) => void
  setScheduleDraftId: (id: string | null) => void
  setMenuOpen: (open: boolean) => void
  toggleDarkMode: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      selectedArticleId: null,
      selectedDraftId: null,
      scheduleDraftId: null,
      isMenuOpen: false,
      isDarkMode: true, // Default to dark mode
      isSidebarCollapsed: false, // Default to expanded
      setSelectedArticleId: (selectedArticleId) => set({ selectedArticleId }),
      setSelectedDraftId: (selectedDraftId) => set({ selectedDraftId }),
      setScheduleDraftId: (scheduleDraftId) => set({ scheduleDraftId }),
      setMenuOpen: (isMenuOpen) => set({ isMenuOpen }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
    }),
    {
      name: 'lawxy-ui-storage',
    }
  )
)
