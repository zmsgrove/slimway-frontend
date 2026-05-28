import React, { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

export interface ContextMenuSeparator {
  separator: true
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator

interface Props {
  x: number
  y: number
  items: ContextMenuEntry[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey   = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  const MENU_W = 200
  const left   = Math.min(x, window.innerWidth  - MENU_W - 8)
  const top    = Math.min(y, window.innerHeight  - 280)

  return (
    <div
      ref={ref}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'fixed', left, top, zIndex: 9999,
        background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
        borderRadius: 13, padding: 6,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)', minWidth: MENU_W,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        userSelect: 'none',
      }}
    >
      {items.map((item, i) => {
        if ('separator' in item && item.separator) {
          return <div key={i} style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
        }
        const mi = item as ContextMenuItem
        return (
          <button
            key={i}
            onClick={() => { mi.onClick(); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '8px 10px', background: 'transparent', border: 'none',
              borderRadius: 8, color: mi.danger ? '#ef4444' : 'var(--text-primary)',
              fontSize: 13, cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = mi.danger
                ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            {mi.icon && (
              <span style={{ color: mi.danger ? '#ef4444' : 'var(--text-secondary)', display: 'flex', flexShrink: 0 }}>
                {mi.icon}
              </span>
            )}
            {mi.label}
          </button>
        )
      })}
    </div>
  )
}
