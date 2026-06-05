import React, { useState, useEffect } from 'react'
import { Calendar, Check } from 'lucide-react'
import type { PeriodType } from '../../hooks/usePeriodFilter'

export type { PeriodType }

const PERIODS: { type: PeriodType; label: string }[] = [
  { type: 'today',     label: 'Сегодня' },
  { type: 'yesterday', label: 'Вчера'   },
  { type: 'week',      label: 'Неделя'  },
  { type: 'month',     label: 'Месяц'   },
  { type: 'quarter',   label: 'Квартал' },
]

interface PeriodFilterProps {
  period: PeriodType
  customFrom?: string
  customTo?: string
  remember: boolean
  onChange: (type: PeriodType, custom?: { from: string; to: string }) => void
  onRememberChange: (v: boolean) => void
}

export function PeriodFilter({
  period,
  customFrom,
  customTo,
  remember,
  onChange,
  onRememberChange,
}: PeriodFilterProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [pickFrom, setPickFrom] = useState(customFrom ?? '')
  const [pickTo,   setPickTo]   = useState(customTo   ?? '')

  useEffect(() => {
    if (period === 'custom') {
      setPickFrom(customFrom ?? '')
      setPickTo(customTo ?? '')
    }
  }, [period, customFrom, customTo])

  const pillStyle = (active: boolean): React.CSSProperties => ({
    height: 28,
    padding: '0 11px',
    background: active
      ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
      : 'transparent',
    border: `1px solid ${active
      ? 'color-mix(in srgb, var(--accent) 45%, transparent)'
      : 'var(--border)'}`,
    borderRadius: 20,
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: 12,
    fontWeight: active ? 500 : 400,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
    transition: 'all 150ms ease-out',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  })

  const handleQuick = (type: PeriodType) => {
    setShowPicker(false)
    onChange(type)
  }

  const handleCustomToggle = () => {
    if (showPicker) {
      setShowPicker(false)
    } else {
      const today = new Date().toISOString().slice(0, 10)
      setPickFrom(customFrom ?? today)
      setPickTo(customTo ?? today)
      setShowPicker(true)
    }
  }

  const handleApply = () => {
    if (pickFrom && pickTo) {
      onChange('custom', { from: pickFrom, to: pickTo })
      setShowPicker(false)
    }
  }

  const customLabel =
    period === 'custom' && customFrom && customTo
      ? `${customFrom.slice(5).replace('-', '.')} — ${customTo.slice(5).replace('-', '.')}`
      : null

  const dateInputStyle: React.CSSProperties = {
    height: 28,
    padding: '0 8px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 12,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap' as const,
    }}>
      {PERIODS.map(p => (
        <button
          key={p.type}
          onClick={() => handleQuick(p.type)}
          style={pillStyle(period === p.type)}
        >
          {p.label}
        </button>
      ))}

      <button
        onClick={handleCustomToggle}
        style={pillStyle(period === 'custom')}
      >
        <Calendar size={11} />
        {customLabel ?? 'Диапазон'}
      </button>

      {showPicker && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, marginLeft: 4,
        }}>
          <input
            type="date"
            value={pickFrom}
            onChange={e => setPickFrom(e.target.value)}
            style={dateInputStyle}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
          <input
            type="date"
            value={pickTo}
            onChange={e => setPickTo(e.target.value)}
            style={dateInputStyle}
          />
          <button
            onClick={handleApply}
            style={{
              height: 28, padding: '0 12px',
              background: 'var(--accent)', border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'opacity 150ms ease-out',
            }}
          >
            Применить
          </button>
        </div>
      )}

      <button
        onClick={() => onRememberChange(!remember)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          cursor: 'pointer', marginLeft: 6,
          fontSize: 12, color: remember ? 'var(--accent)' : 'var(--text-muted)',
          background: 'transparent', border: 'none',
          fontFamily: 'inherit', padding: 0,
          transition: 'color 150ms ease-out',
        }}
      >
        <span style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          border: `1px solid ${remember ? 'var(--accent)' : 'var(--border)'}`,
          background: remember ? 'var(--accent)' : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms ease-out',
        }}>
          {remember && <Check size={8} strokeWidth={3} color="#fff" />}
        </span>
        Запомнить
      </button>
    </div>
  )
}
