import { useState, useEffect } from 'react'
import { branchesApi, type BranchRaw } from '../../api/branches.api'

interface Props {
  role: string
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function BranchSelector({ role, selectedIds, onChange }: Props) {
  const [branches, setBranches] = useState<BranchRaw[]>([])

  const canSee = role === 'developer' || role === 'owner'

  useEffect(() => {
    if (!canSee) return
    branchesApi.getAll().then(setBranches).catch(() => { /* ignore */ })
  }, [canSee])

  if (!canSee || branches.length < 2) return null

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      // Don't deselect if it's the last one
      if (selectedIds.length === 1) return
      onChange(selectedIds.filter(x => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21,
      padding: '8px 13px',
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 13,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 0 }}>
        Филиалы
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {branches.map(branch => {
          const selected = selectedIds.includes(branch.id)
          return (
            <button
              key={branch.id}
              onClick={() => toggle(branch.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                background: selected ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                border: `1px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
                color: selected ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: selected ? 600 : 400,
                transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: selected ? 'var(--accent)' : 'var(--text-muted)',
                border: selected ? 'none' : '1px solid var(--border)',
                transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out',
              }} />
              {branch.name}
              {branch.city && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 2 }}>{branch.city}</span>
              )}
            </button>
          )
        })}
      </div>
      {selectedIds.length > 1 && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {selectedIds.length} филиала
        </span>
      )}
    </div>
  )
}
