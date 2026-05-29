import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ThemePreference, ThemeMode, AccentColor } from './theme'
import { applyTheme, getStoredTheme, loadTheme, saveTheme } from './theme'

const DEFAULT_PREF: ThemePreference = { mode: 'dark', accent: 'teal' }

interface ThemeContextValue {
  pref:      ThemePreference
  setPref:   (p: ThemePreference, userId: string) => Promise<void>
  setAccent: (accent: AccentColor, userId: string) => Promise<void>
  // backward compat for AppLayout theme toggle
  theme:     ThemeMode
  setTheme:  (mode: ThemeMode, userId: string) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue>({
  pref:      DEFAULT_PREF,
  setPref:   async () => {},
  setAccent: async () => {},
  theme:     'dark',
  setTheme:  async () => {},
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

  const setAccent = async (accent: AccentColor, uid: string) => {
    const next: ThemePreference = { ...pref, accent }
    setPrefState(next)
    await saveTheme(uid, next)
  }

  const setTheme = async (mode: ThemeMode, uid: string) => {
    const next: ThemePreference = { ...pref, mode }
    setPrefState(next)
    await saveTheme(uid, next)
  }

  return (
    <ThemeContext.Provider value={{ pref, setPref, setAccent, theme: pref.mode, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
