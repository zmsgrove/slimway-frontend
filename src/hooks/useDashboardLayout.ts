import { useState, useEffect, useCallback, useRef } from 'react'
import { dashboardLayoutsApi } from '../api/dashboard-layouts.api'
import type { DashboardLayoutItem, DashboardLayoutData } from '../types'

const CACHE_KEY = 'dashboard_layout_cache_v3'

function loadCache(): DashboardLayoutData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as DashboardLayoutData) : null
  } catch { return null }
}

function saveCache(data: DashboardLayoutData) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

export function useDashboardLayout() {
  const [layout,  setLayout]  = useState<DashboardLayoutItem[]>([])
  const [widgets, setWidgets] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving,  setIsSaving]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load on mount — cache first, then API
  useEffect(() => {
    const cached = loadCache()
    if (cached) {
      setLayout(cached.layout)
      setWidgets(cached.widgets)
      setIsLoading(false)
    }
    dashboardLayoutsApi.get()
      .then(data => {
        setLayout(data.layout)
        setWidgets(data.widgets)
        saveCache(data)
      })
      .catch(() => { /* use cache */ })
      .finally(() => setIsLoading(false))
  }, [])

  const persist = useCallback((data: DashboardLayoutData) => {
    saveCache(data)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setIsSaving(true)
      dashboardLayoutsApi.save(data)
        .catch(() => { /* silent */ })
        .finally(() => setIsSaving(false))
    }, 1000)
  }, [])

  const updateLayout = useCallback((newLayout: DashboardLayoutItem[]) => {
    setLayout(newLayout)
    setWidgets(prev => {
      const data = { layout: newLayout, widgets: prev }
      persist(data)
      return prev
    })
  }, [persist])

  const addWidget = useCallback((id: string, defaultItem: Omit<DashboardLayoutItem, 'i'>) => {
    setLayout(prev => {
      if (prev.find(l => l.i === id)) return prev
      const next = [...prev, { i: id, ...defaultItem }]
      setWidgets(ws => {
        const nextW = ws.includes(id) ? ws : [...ws, id]
        persist({ layout: next, widgets: nextW })
        return nextW
      })
      return next
    })
  }, [persist])

  const removeWidget = useCallback((id: string) => {
    setLayout(prev => {
      const next = prev.filter(l => l.i !== id)
      setWidgets(ws => {
        const nextW = ws.filter(w => w !== id)
        persist({ layout: next, widgets: nextW })
        return nextW
      })
      return next
    })
  }, [persist])

  const saveNow = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setIsSaving(true)
    try {
      await dashboardLayoutsApi.save({ layout, widgets })
      saveCache({ layout, widgets })
    } finally {
      setIsSaving(false)
    }
  }, [layout, widgets])

  const resetAll = useCallback((data: DashboardLayoutData) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setLayout(data.layout)
    setWidgets(data.widgets)
    saveCache(data)
  }, [])

  return { layout, widgets, isLoading, isSaving, updateLayout, addWidget, removeWidget, saveNow, resetAll }
}
