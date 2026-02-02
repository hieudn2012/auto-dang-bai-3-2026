import { create } from "zustand";

interface GlobalStore {
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  captions: string[],
  setCaptions: (captions: string[]) => void
}

export const useGlobalStore = create<GlobalStore>((set) => ({
  isLoading: false,
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  captions: [],
  setCaptions: (captions: string[]) => set({ captions }),
}))
