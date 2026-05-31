import React, { useState } from 'react'
import { Calendar } from 'lucide-react'

export type PeriodType = 'today' | 'week' | 'month' | 'custom'

export interface PeriodValue {
  type: PeriodType
  from: string  // YYYY-MM-DD
  to: string    // YYYY-MM-DD
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function getDefaultPeriod(type: Exclude<PeriodType, 'custom'>): PeriodValue {
  const today = new Date()
  if (type === 'today') {
    const s = toISO(today)
    return { type, from: s, to: s }
  }
  if (type === 'week') {
    const start = new Date(today)
    const dow = today.getDay() === 0 ? 6 : today.getDay() - 1
    start.setDate(today.getDate() - dow)
    return { type, from: toISO(start), to: toISO(today) }
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return { type, from: toISO(start), to: toISO(today) }
}

interface PeriodFilterProps {
  value: PeriodValue | null
  onChange: (v: PeriodValue | null) => void
  className?: string
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [cFrom, setCFrom] = useState('')
  const [cTo, setCTo]     = useState('')

  const QUICK: { type: Exclude<PeriodType, 'custom'>; label: string }[] = [
    { type: 'today', label: 'Сегодня' },
    { type: 'week',  label: 'Неделя'  },
    { type: 'month', label: 'Месяц'   },
  ]

  const btnStyle = (active: boolean): React.CSSProperties => ({
    height: 30, padding: '0 12px',
    background: active ? 'rgba(2,189,182,0.15)' : 'transparent',
    border: `1px solid ${active ? 'rgba(2,189,182,0.5)' : 'var(--glass-border)'}`,
    borderRadius: 8,
    color: active ? '#02BDB6' : 'var(--text-secondary)',
    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  })

  const handleQuick = (type: Exclude<PeriodType, 'custom'>) => {
    setShowCustom(false)
    if (value?.type === type) { onChange(null); return }
    onChange(getDefaultPeriod(type))
  }

  const handleCustomClick = () => {
    if (value?.type === 'custom' && !showCustom) { onChange(null); return }
    const s = toISO(new Date())
    setCFrom(value?.from ?? s)
    setCTo(value?.to ?? s)
    setShowCustom(v => !v)
  }

  const apply = () => {
    if (cFrom && cTo) {
      onChange({ type: 'custom', from: cFrom, to: cTo })
      setShowCustom(false)
    }
  }

  const dateInputStyle: React.CSSProperties = {
    height: 30, padding: '0 8px',
    background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
    borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {QUICK.map(b => (
        <button key={b.type} onClick={() => handleQuick(b.type)} style={btnStyle(value?.type === b.type)}>
          {b.label}
        </button>
      ))}
      <button
        onClick={handleCustomClick}
        style={{ ...btnStyle(value?.type === 'custom'), display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <Calendar size={12} />
        {value?.type === 'custom' ? `${value.from} — ${value.to}` : 'Даты'}
      </button>
      {showCustom && (
        <>
          <input type="date" value={cFrom} onChange={e => setCFrom(e.target.value)} style={dateInputStyle} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
          <input type="date" value={cTo} onChange={e => setCTo(e.target.value)} style={dateInputStyle} />
          <button
            onClick={apply}
            style={{ height: 30, padding: '0 12px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Применить
          </button>
        </>
      )}
    </div>
  )
}
