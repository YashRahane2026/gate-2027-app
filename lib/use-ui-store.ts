import { create } from "zustand";

interface UIState {
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  redirectToDmUserId: string | null;
  
  setRedirectToDmUserId: (userId: string | null) => void;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (val: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (val: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  redirectToDmUserId: null,
  
  setRedirectToDmUserId: (userId) => set({ redirectToDmUserId: userId }),
  toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (val) => set({ isSidebarCollapsed: val }),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setMobileSidebarOpen: (val) => set({ isMobileSidebarOpen: val }),
}));
