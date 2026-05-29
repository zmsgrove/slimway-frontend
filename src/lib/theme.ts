import { supabase } from './supabase'

export type ThemeId =
  | 'black' | 'dark' | 'dark-blue' | 'dark-green' | 'dark-purple' | 'coffee'
  | 'white' | 'cream' | 'light-blue' | 'light-green' | 'lavender' | 'light-gray'

export type AccentColor = 'teal' | 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'gray'

// Backward compat
export type ThemeMode = 'light' | 'dark'
export type Theme     = ThemeMode

export interface ThemePreference {
  theme:  ThemeId
  accent: AccentColor
}

export interface ThemeDef {
  id:      ThemeId
  label:   string
  bg:      string
  sidebar: string
  isDark:  boolean
}

export const THEMES: ThemeDef[] = [
  { id: 'black',       label: 'Чёрная',        bg: '#000000', sidebar: '#050505', isDark: true  },
  { id: 'dark',        label: 'Тёмная',         bg: '#0f0f0f', sidebar: '#111111', isDark: true  },
  { id: 'dark-blue',   label: 'Тёмно-синяя',   bg: '#0f1729', sidebar: '#0d1422', isDark: true  },
  { id: 'dark-green',  label: 'Тёмно-зелёная', bg: '#0d1f0f', sidebar: '#0a1a0c', isDark: true  },
  { id: 'dark-purple', label: 'Тёмно-фиолет',  bg: '#12092e', sidebar: '#0e0726', isDark: true  },
  { id: 'coffee',      label: 'Кофейная',       bg: '#1a0f0a', sidebar: '#150c08', isDark: true  },
  { id: 'white',       label: 'Белая',          bg: '#ffffff', sidebar: '#f4f4f5', isDark: false },
  { id: 'cream',       label: 'Кремовая',       bg: '#fdf6ec', sidebar: '#f5ead8', isDark: false },
  { id: 'light-blue',  label: 'Голубая',        bg: '#f0f7ff', sidebar: '#e0effe', isDark: false },
  { id: 'light-green', label: 'Мятная',         bg: '#f0faf4', sidebar: '#dcfce7', isDark: false },
  { id: 'lavender',    label: 'Лавандовая',     bg: '#f5f0ff', sidebar: '#ede9fe', isDark: false },
  { id: 'light-gray',  label: 'Серая',          bg: '#f4f4f5', sidebar: '#e4e4e7', isDark: false },
]

export const ACCENTS: { id: AccentColor; label: string; color: string }[] = [
  { id: 'teal',   label: 'Бирюзовый',  color: '#0d9488' },
  { id: 'purple', label: 'Фиолетовый', color: '#7c3aed' },
  { id: 'blue',   label: 'Синий',      color: '#2563eb' },
  { id: 'green',  label: 'Зелёный',    color: '#16a34a' },
  { id: 'orange', label: 'Оранжевый',  color: '#ea580c' },
  { id: 'pink',   label: 'Розовый',    color: '#db2777' },
  { id: 'gray',   label: 'Серый',      color: '#6b7280' },
]

const DARK_IDS = new Set<ThemeId>(['black', 'dark', 'dark-blue', 'dark-green', 'dark-purple', 'coffee'])
export const isDarkTheme = (id: ThemeId): boolean => DARK_IDS.has(id)

const STORAGE_KEY = 'slimway_theme'
const DEFAULT: ThemePreference = { theme: 'dark', accent: 'teal' }

export function applyTheme(pref: ThemePreference): void {
  const el = document.documentElement
  el.setAttribute('data-theme', pref.theme)
  el.setAttribute('data-accent', pref.accent)
  el.style.colorScheme = isDarkTheme(pref.theme) ? 'dark' : 'light'
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pref))
}

export function getStoredTheme(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>
      // Migrate old { mode, accent } → { theme, accent }
      if ('mode' in parsed && !('theme' in parsed)) {
        return {
          theme:  parsed.mode === 'light' ? 'light-gray' : 'dark',
          accent: (parsed.accent || 'teal') as AccentColor,
        }
      }
      if ('theme' in parsed && 'accent' in parsed) {
        return { theme: parsed.theme as ThemeId, accent: parsed.accent as AccentColor }
      }
    }
    // Migrate old standalone 'theme' key
    const old = localStorage.getItem('theme')
    if (old === 'light') return { theme: 'light-gray', accent: 'teal' }
    if (old === 'dark')  return { ...DEFAULT }
  } catch { /* ignore */ }
  return { ...DEFAULT }
}

export async function loadTheme(userId: string): Promise<ThemePreference> {
  const { data } = await supabase
    .from('profiles')
    .select('theme_preference')
    .eq('id', userId)
    .single()
  const raw = (data as { theme_preference?: Record<string, string> } | null)?.theme_preference
  if (raw?.accent) {
    if ('mode' in raw && !('theme' in raw)) {
      return { theme: raw.mode === 'light' ? 'light-gray' : 'dark', accent: raw.accent as AccentColor }
    }
    if ('theme' in raw) {
      return { theme: raw.theme as ThemeId, accent: raw.accent as AccentColor }
    }
  }
  return getStoredTheme()
}

export async function saveTheme(userId: string, pref: ThemePreference): Promise<void> {
  await supabase
    .from('profiles')
    .update({ theme_preference: pref })
    .eq('id', userId)
  applyTheme(pref)
}
