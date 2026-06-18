// Global Zustand Store
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AppState {
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Library
  currentLibraryId: string | null;
  setCurrentLibraryId: (id: string | null) => void;

  // Search
  globalSearch: string;
  setGlobalSearch: (query: string) => void;

  // Selected items
  selectedStudents: string[];
  setSelectedStudents: (ids: string[]) => void;
  toggleStudentSelection: (id: string) => void;
  clearSelection: () => void;

  // UI State
  commandMenuOpen: boolean;
  setCommandMenuOpen: (open: boolean) => void;

  // Notifications
  unreadNotificationCount: number;
  setUnreadNotificationCount: (count: number) => void;

  // Filters
  studentFilters: {
    status: string;
    shiftId: string;
    paymentStatus: string;
    search: string;
  };
  setStudentFilters: (filters: Partial<AppState["studentFilters"]>) => void;
  resetStudentFilters: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Library
      currentLibraryId: null,
      setCurrentLibraryId: (id) => set({ currentLibraryId: id }),

      // Search
      globalSearch: "",
      setGlobalSearch: (query) => set({ globalSearch: query }),

      // Selected items
      selectedStudents: [],
      setSelectedStudents: (ids) => set({ selectedStudents: ids }),
      toggleStudentSelection: (id) =>
        set((state) => ({
          selectedStudents: state.selectedStudents.includes(id)
            ? state.selectedStudents.filter((s) => s !== id)
            : [...state.selectedStudents, id],
        })),
      clearSelection: () => set({ selectedStudents: [] }),

      // UI State
      commandMenuOpen: false,
      setCommandMenuOpen: (open) => set({ commandMenuOpen: open }),

      // Notifications
      unreadNotificationCount: 0,
      setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),

      // Filters
      studentFilters: {
        status: "all",
        shiftId: "all",
        paymentStatus: "all",
        search: "",
      },
      setStudentFilters: (filters) =>
        set((state) => ({
          studentFilters: { ...state.studentFilters, ...filters },
        })),
      resetStudentFilters: () =>
        set({
          studentFilters: {
            status: "all",
            shiftId: "all",
            paymentStatus: "all",
            search: "",
          },
        }),
    }),
    {
      name: "libraryhub-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        currentLibraryId: state.currentLibraryId,
      }),
    }
  )
);
