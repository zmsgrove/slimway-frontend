import { supabase } from './supabase'

export type Theme = 'dark' | 'light'

export function applyTheme(theme: Theme): void {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  localStorage.setItem('theme', theme)
}

export function getStoredTheme(): Theme {
  return (localStorage.getItem('theme') as Theme) ?? 'dark'
}

export async function loadTheme(userId: string): Promise<Theme> {
  const { data } = await supabase
    .from('profiles')
    .select('theme')
    .eq('id', userId)
    .single()
  const theme = (data as { theme?: string } | null)?.theme as Theme | undefined
  return theme ?? getStoredTheme()
}

export async function saveTheme(userId: string, theme: Theme): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ theme })
    .eq('id', userId)
  if (error) console.error('saveTheme:', error.message)
  applyTheme(theme)
}
