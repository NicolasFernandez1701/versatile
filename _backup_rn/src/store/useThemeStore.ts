import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'system', // Default to system theme
  setThemeMode: (themeMode) => set({ themeMode }),
}));
