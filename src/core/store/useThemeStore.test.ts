import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from './useThemeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    // Reseteamos al estado inicial
    useThemeStore.setState({ theme: 'system' });
    // Limpiamos localStorage que usa el persist middleware
    localStorage.clear();
  });

  it('debería arrancar con theme system por defecto', () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBe('system');
  });

  it('setTheme debería cambiar el theme', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');

    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('debería persistir el theme en localStorage', () => {
    useThemeStore.getState().setTheme('dark');

    const stored = JSON.parse(localStorage.getItem('theme-storage') || '{}');
    expect(stored.state.theme).toBe('dark');
  });
});
