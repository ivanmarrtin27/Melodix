import { create } from 'zustand'

const IDLE = [0, 0, 0, 0]

export const useVisualizerStore = create((set) => ({
  levels: IDLE,
  active: false,
  setLevels: (levels) =>
    set({
      levels,
      active: levels.some((v) => v > 0.04),
    }),
  reset: () => set({ levels: IDLE, active: false }),
}))
