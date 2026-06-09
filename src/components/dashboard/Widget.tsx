import React from 'react'
import { GripVertical, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface WidgetProps {
  id: string
  title: string
  icon?: React.ReactNode
  editMode?: boolean
  onRemove?: (id: string) => void
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  children: React.ReactNode
  contentStyle?: React.CSSProperties
  noPadding?: boolean
}

export function Widget({
  id, title, icon, editMode, onRemove, loading, error, onRetry, children, contentStyle, noPadding,
}: WidgetProps) {
  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      outline: editMode ? '2px solid color-mix(in srgb, var(--accent) 40%, transparent)' : 'none',
      transition: 'outline-color 150ms ease-out',
    }}>
      <CardHeader
        className={editMode ? 'drag-handle' : undefined}
        style={{
          paddingBottom: 8,
          cursor: editMode ? 'grab' : 'default',
          userSelect: editMode ? 'none' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {editMode && <GripVertical size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          {icon && <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{icon}</span>}
          <CardTitle style={{ flex: 1, fontSize: 13 }}>{title}</CardTitle>
          {editMode && onRemove && (
            <button
              onClick={() => onRemove(id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, border: 'none', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 4,
                transition: 'color 150ms ease-out, background 150ms ease-out',
                flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-danger-muted)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: noPadding ? 0 : undefined, ...contentStyle }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-full" style={{ marginTop: 8 }} />
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</span>
            {onRetry && (
              <button className="btn btn-secondary btn-sm" onClick={onRetry}>Повторить</button>
            )}
          </div>
        ) : children}
      </CardContent>
    </Card>
  )
}
