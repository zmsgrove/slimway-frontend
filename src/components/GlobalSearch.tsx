import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Users, Target, CheckSquare, CreditCard } from 'lucide-react'
import { api } from '../lib/api'

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  type: 'client' | 'lead' | 'task' | 'subscription'
  href: string
}

const TYPE_ICONS = {
  client:       <Users size={13} />,
  lead:         <Target size={13} />,
  task:         <CheckSquare size={13} />,
  subscription: <CreditCard size={13} />,
}

const TYPE_LABELS = {
  client:       'Клиент',
  lead:         'Лид',
  task:         'Задача',
  subscription: 'Абонемент',
}

const TYPE_COLORS = {
  client:       'var(--accent)',
  lead:         '#f59e0b',
  task:         '#8b5cf6',
  subscription: '#263CD9',
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor,  setCursor]  = useState(0)
  const inputRef  = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openSearch = useCallback(() => { setOpen(true); setQuery(''); setResults([]) }, [])
  const closeSearch = useCallback(() => { setOpen(false); setQuery(''); setResults([]) }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        open ? closeSearch() : openSearch()
      }
      if (e.key === 'Escape' && open) closeSearch()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, openSearch, closeSearch])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim() || query.length < 2) { setResults([]); return }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const q = encodeURIComponent(query.trim())
        const [clientsRes, leadsRes, tasksRes] = await Promise.allSettled([
          api.get(`/clients?search=${q}`),
          api.get(`/leads?search=${q}`),
          api.get(`/tasks`),
        ])

        const out: SearchResult[] = []

        if (clientsRes.status === 'fulfilled') {
          const clients = (clientsRes.value.data ?? []) as Array<{ id: string; full_name: string; phone?: string }>
          clients.slice(0, 5).forEach(c => out.push({
            id: c.id, title: c.full_name, subtitle: c.phone ?? undefined,
            type: 'client', href: `/clients`,
          }))
        }

        if (leadsRes.status === 'fulfilled') {
          const leads = (leadsRes.value.data ?? []) as Array<{ id: string; full_name: string; phone?: string; status: string }>
          leads.filter(l => l.full_name.toLowerCase().includes(query.toLowerCase())).slice(0, 5).forEach(l => out.push({
            id: l.id, title: l.full_name, subtitle: l.phone ?? undefined,
            type: 'lead', href: `/leads`,
          }))
        }

        if (tasksRes.status === 'fulfilled') {
          const tasks = (tasksRes.value.data ?? []) as Array<{ id: string; title: string; status: string }>
          tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase())).slice(0, 5).forEach(t => out.push({
            id: t.id, title: t.title, subtitle: t.status,
            type: 'task', href: `/tasks`,
          }))
        }

        setResults(out)
        setCursor(0)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }, 300)
  }, [query])

  const handleSelect = (r: SearchResult) => {
    closeSearch()
    navigate(r.href)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
      if (e.key === 'Enter' && results[cursor]) handleSelect(results[cursor])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, cursor])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}>
      <div onClick={closeSearch} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: results.length > 0 || loading ? '1px solid var(--border)' : 'none' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск клиентов, лидов, задач..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 15, fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <kbd style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>ESC</kbd>
            <button onClick={closeSearch} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}><X size={14} /></button>
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Поиск...</div>
        )}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div style={{ padding: '21px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Ничего не найдено</div>
        )}
        {results.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <button key={r.id + r.type} onClick={() => handleSelect(r)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', background: i === cursor ? 'var(--bg-surface)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: TYPE_COLORS[r.type] + '18', color: TYPE_COLORS[r.type], flexShrink: 0 }}>
                  {TYPE_ICONS[r.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  {r.subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.subtitle}</div>}
                </div>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: TYPE_COLORS[r.type] + '18', color: TYPE_COLORS[r.type], flexShrink: 0 }}>
                  {TYPE_LABELS[r.type]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Footer hint */}
        {!loading && query.length < 2 && (
          <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 13 }}>
            <span><kbd style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>↑↓</kbd> навигация</span>
            <span><kbd style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>Enter</kbd> выбрать</span>
            <span><kbd style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>Ctrl+K</kbd> закрыть</span>
          </div>
        )}
      </div>
    </div>
  )
}
