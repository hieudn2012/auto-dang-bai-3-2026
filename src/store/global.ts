import { MainConfig } from "electron/types";
import { create } from "zustand";

interface GlobalStore {
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  captions: string[],
  setCaptions: (captions: string[]) => void
  mainConfig: MainConfig,
  setMainConfig: (mainConfig: MainConfig) => void
}

export const useGlobalStore = create<GlobalStore>((set) => ({
  isLoading: false,
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  captions: [],
  setCaptions: (captions: string[]) => set({ captions }),
  mainConfig: {},
  setMainConfig: (mainConfig: MainConfig) => set({ mainConfig }),
}))
