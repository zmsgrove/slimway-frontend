import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Theme } from './theme'
import { applyTheme, getStoredTheme, loadTheme, saveTheme } from './theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme, userId: string) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: async () => {},
})

export function ThemeProvider({
  children,
  userId,
}: {
  children: React.ReactNode
  userId: string | null
}) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    applyTheme(getStoredTheme())
  }, [])

  useEffect(() => {
    if (!userId) return
    loadTheme(userId).then(t => {
      setThemeState(t)
      applyTheme(t)
    })
  }, [userId])

  const setTheme = async (t: Theme, uid: string) => {
    setThemeState(t)
    await saveTheme(uid, t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
