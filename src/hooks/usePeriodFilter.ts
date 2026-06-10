import { useState, useMemo, useCallback } from 'react'

export type PeriodType = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'custom'

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function getDatesForPeriod(
  type: PeriodType,
  customFrom?: string,
  customTo?: string,
): { dateFrom: Date; dateTo: Date } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  switch (type) {
    case 'today':
      return { dateFrom: today, dateTo: todayEnd }

    case 'yesterday': {
      const d = new Date(today)
      d.setDate(d.getDate() - 1)
      const e = new Date(d)
      e.setHours(23, 59, 59, 999)
      return { dateFrom: d, dateTo: e }
    }

    case 'week': {
      const d = new Date(today)
      d.setDate(today.getDate() - 6)
      return { dateFrom: d, dateTo: todayEnd }
    }

    case 'month': {
      const d = new Date(today)
      d.setDate(today.getDate() - 29)
      return { dateFrom: d, dateTo: todayEnd }
    }

    case 'quarter': {
      const d = new Date(today)
      d.setDate(today.getDate() - 89)
      return { dateFrom: d, dateTo: todayEnd }
    }

    case 'custom': {
      const from = customFrom ? new Date(customFrom + 'T00:00:00') : today
      const to   = customTo   ? new Date(customTo   + 'T23:59:59') : todayEnd
      return { dateFrom: from, dateTo: to }
    }

    default:
      return { dateFrom: today, dateTo: todayEnd }
  }
}

interface SavedState {
  type: PeriodType
  customFrom?: string
  customTo?: string
}

export function usePeriodFilter(pageName: string) {
  const storageKey  = `periodFilter_${pageName}`
  const rememberKey = `periodFilterRemember_${pageName}`

  const [remember, setRememberState] = useState<boolean>(() => {
    return localStorage.getItem(rememberKey) === 'true'
  })

  const [state, setStateInternal] = useState<SavedState>(() => {
    if (localStorage.getItem(rememberKey) === 'true') {
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) return JSON.parse(raw) as SavedState
      } catch { /* ignore */ }
    }
    return { type: 'today' }
  })

  const setPeriod = useCallback(
    (type: PeriodType, custom?: { from: string; to: string }) => {
      const next: SavedState = { type, customFrom: custom?.from, customTo: custom?.to }
      setStateInternal(next)
      if (localStorage.getItem(rememberKey) === 'true') {
        localStorage.setItem(storageKey, JSON.stringify(next))
      }
    },
    [storageKey, rememberKey],
  )

  const setRemember = useCallback(
    (v: boolean) => {
      setRememberState(v)
      localStorage.setItem(rememberKey, String(v))
      if (v) {
        setStateInternal(curr => {
          localStorage.setItem(storageKey, JSON.stringify(curr))
          return curr
        })
      } else {
        localStorage.removeItem(storageKey)
      }
    },
    [storageKey, rememberKey],
  )

  const { dateFrom, dateTo } = useMemo(
    () => getDatesForPeriod(state.type, state.customFrom, state.customTo),
    [state],
  )

  return {
    period:      state.type,
    customFrom:  state.customFrom,
    customTo:    state.customTo,
    dateFrom,
    dateTo,
    dateFromStr: toISO(dateFrom),
    dateToStr:   toISO(dateTo),
    setPeriod,
    remember,
    setRemember,
  }
}
