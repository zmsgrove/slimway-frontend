import { supabase } from './supabase'

export type ThemeMode   = 'light' | 'dark'
export type AccentColor = 'teal' | 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'gray'
export type Theme       = ThemeMode  // backward compat

export interface ThemePreference {
  mode:   ThemeMode
  accent: AccentColor
}

const STORAGE_KEY = 'slimway_theme'
const DEFAULT: ThemePreference = { mode: 'dark', accent: 'teal' }

export function applyTheme(pref: ThemePreference): void {
  const { mode, accent } = pref
  const el = document.documentElement

  // Always set both attributes so :root[data-theme="dark"][data-accent="X"] selectors work
  el.setAttribute('data-theme', mode)
  el.setAttribute('data-accent', accent)
  el.style.colorScheme = mode

  localStorage.setItem(STORAGE_KEY, JSON.stringify(pref))
}

export function getStoredTheme(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemePreference>
      return { ...DEFAULT, ...parsed }
    }
    // Migrate old 'theme' key (was just 'dark'|'light')
    const oldMode = localStorage.getItem('theme') as ThemeMode | null
    if (oldMode === 'light' || oldMode === 'dark') {
      return { mode: oldMode, accent: 'teal' }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT }
}

export async function loadTheme(userId: string): Promise<ThemePreference> {
  const { data } = await supabase
    .from('profiles')
    .select('theme_preference')
    .eq('id', userId)
    .single()
  const tp = (data as { theme_preference?: ThemePreference } | null)?.theme_preference
  if (tp?.mode && tp?.accent) return tp
  return getStoredTheme()
}

export async function saveTheme(userId: string, pref: ThemePreference): Promise<void> {
  await supabase
    .from('profiles')
    .update({ theme_preference: pref })
    .eq('id', userId)
  applyTheme(pref)
}
