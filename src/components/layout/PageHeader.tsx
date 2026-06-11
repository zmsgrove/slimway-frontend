import React from 'react'
import { Search, X } from 'lucide-react'

interface PageHeaderSearch {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  search?: PageHeaderSearch
  filters?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, search, filters, actions }: PageHeaderProps) {
  return (
    <div style={{
      paddingBottom: 'var(--fib-3)',
      borderBottom: '1px solid var(--border)',
      marginBottom: 'var(--fib-3)',
    }}>
      {/* Row 1: title + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--fib-2)' }}>
        <div>
          <h1 style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            color: 'var(--text)',
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 'var(--leading-tight)',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
              margin: 0,
              marginTop: 3,
              lineHeight: 'var(--leading-normal)',
            }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>

      {/* Row 2: search + filters */}
      {(search || filters) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'var(--fib-2)', flexWrap: 'wrap' }}>
          {search && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 36, padding: '0 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              minWidth: 200, flex: '0 1 280px',
              transition: 'border-color 150ms ease-out',
            }}
              onFocus={() => {}}
            >
              <Search size={13} strokeWidth={1.75} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                style={{
                  flex: 1, background: 'none', border: 'none',
                  color: 'var(--text)', fontSize: 'var(--text-sm)',
                  outline: 'none', fontFamily: 'inherit',
                }}
                placeholder={search.placeholder ?? 'Поиск...'}
                value={search.value}
                onChange={e => search.onChange(e.target.value)}
              />
              {search.value && (
                <button
                  onClick={() => search.onChange('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: 'var(--text-muted)' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          {filters && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {filters}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
