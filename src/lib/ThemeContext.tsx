import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ThemePreference, ThemeId, AccentColor } from './theme'
import { applyTheme, getStoredTheme, loadTheme, saveTheme, isDarkTheme } from './theme'

const DEFAULT_PREF: ThemePreference = { theme: 'dark', accent: 'teal' }

interface ThemeContextValue {
  pref:      ThemePreference
  setPref:   (p: ThemePreference, userId: string) => Promise<void>
  setTheme:  (theme: ThemeId,    userId: string) => Promise<void>
  setAccent: (accent: AccentColor, userId: string) => Promise<void>
  isDark:    boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  pref:      DEFAULT_PREF,
  setPref:   async () => {},
  setTheme:  async () => {},
  setAccent: async () => {},
  isDark:    true,
})

export function ThemeProvider({
  children,
  userId,
}: {
  children: React.ReactNode
  userId:   string | null
}) {
  const [pref, setPrefState] = useState<ThemePreference>(getStoredTheme)

  useEffect(() => {
    applyTheme(getStoredTheme())
  }, [])

  useEffect(() => {
    if (!userId) return
    loadTheme(userId).then(p => {
      setPrefState(p)
      applyTheme(p)
    })
  }, [userId])

  const setPref = async (p: ThemePreference, uid: string) => {
    setPrefState(p)
    await saveTheme(uid, p)
  }

  const setTheme = async (theme: ThemeId, uid: string) => {
    const next: ThemePreference = { ...pref, theme }
    setPrefState(next)
    await saveTheme(uid, next)
  }

  const setAccent = async (accent: AccentColor, uid: string) => {
    const next: ThemePreference = { ...pref, accent }
    setPrefState(next)
    await saveTheme(uid, next)
  }

  return (
    <ThemeContext.Provider value={{ pref, setPref, setTheme, setAccent, isDark: isDarkTheme(pref.theme) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
