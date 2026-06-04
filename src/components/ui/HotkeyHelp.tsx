import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const HOTKEYS = [
  { key: 'N', description: 'Новый клиент' },
  { key: 'L', description: 'Новый лид' },
  { key: 'T', description: 'Новая задача' },
  { key: '/', description: 'Фокус на поиске' },
  { key: 'Esc', description: 'Закрыть модал' },
  { key: '?', description: 'Показать горячие клавиши' },
]

export function HotkeyHelp() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const handleKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'
      || (e.target as HTMLElement)?.isContentEditable

    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === '?') { setOpen(o => !o); return }

    if (isInput) return

    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('slimway:focus-search'))
      return
    }

    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return

    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); navigate('/clients', { state: { autoNew: true } }); return }
    if (e.key === 'l' || e.key === 'L') { e.preventDefault(); navigate('/leads',   { state: { autoNew: true } }); return }
    if (e.key === 't' || e.key === 'T') { e.preventDefault(); navigate('/tasks',   { state: { autoNew: true } }); return }
  }, [navigate])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Горячие клавиши"
        style={{
          position: 'fixed', bottom: 21, right: 21, zIndex: 9000,
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--bg-card)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out',
        }}
      >
        ?
      </button>
    )
  }

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 9001, background: 'rgba(9,9,11,0.5)' }}
      />
      <div style={{
        position: 'fixed', bottom: 21, right: 21, zIndex: 9002,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 21, minWidth: 260,
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 13 }}>
          Горячие клавиши
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {HOTKEYS.map(({ key, description }) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 21 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{description}</span>
              <kbd style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 24, height: 22, padding: '0 6px',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 5, fontSize: 11, fontWeight: 600, color: 'var(--text)',
                fontFamily: 'monospace', flexShrink: 0,
              }}>{key}</kbd>
            </div>
          ))}
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            marginTop: 13, width: '100%', padding: '7px 0',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          Закрыть
        </button>
      </div>
    </>
  )
}
