import React, { useState, useEffect } from 'react'
import { CreditCard, Plus, X, AlertCircle, Trash2, Eye, ToggleLeft, ToggleRight, Search, Link, Unlink } from 'lucide-react'
import { subscriptionTemplatesApi } from '../../api/subscription-templates.api'
import { branchSubscriptionTemplatesApi } from '../../api/branch-subscription-templates.api'
import { subscriptionsApi } from '../../api/subscriptions.api'
import { useAuth } from '../../hooks/useAuth'
import { ContextMenu, type ContextMenuEntry } from '../../components/ContextMenu'
import type { SubscriptionTemplate, BranchSubscriptionTemplate, Subscription, DeviceType } from '../../types'

// ─── constants ─────────────────────────────────────────────────────────────

const DEVICE_TYPES: { value: DeviceType; label: string; color: string }[] = [
  { value: 'vacuactiv',  label: 'VacuActiv',  color: '#02BDB6' },
  { value: 'rollshape',  label: 'RollShape',  color: '#263CD9' },
  { value: 'infrastep',  label: 'InfraStep',  color: '#8b5cf6' },
  { value: 'infrashape', label: 'InfraShape', color: '#f59e0b' },
]

function typeColor(t: DeviceType) { return DEVICE_TYPES.find(d => d.value === t)?.color ?? '#71717A' }
function typeLabel(t: DeviceType) { return DEVICE_TYPES.find(d => d.value === t)?.label ?? t }

function getServerError(e: unknown): string | null {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? null
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}

// ─── AddFromCatalogModal ──────────────────────────────────────────────────────

interface AddFromCatalogModalProps {
  allTemplates: SubscriptionTemplate[]
  connected: BranchSubscriptionTemplate[]
  onConnect: (tpl: SubscriptionTemplate) => Promise<void>
  onClose: () => void
}

function AddFromCatalogModal({ allTemplates, connected, onConnect, onClose }: AddFromCatalogModalProps) {
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const isConnected = (id: string) => connected.some(c => c.template_id === id)
  const filtered = search.trim()
    ? allTemplates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : allTemplates

  const handleConnect = async (tpl: SubscriptionTemplate) => {
    setLoading(tpl.id)
    try { await onConnect(tpl) } finally { setLoading(null) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '80vh', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '21px 21px 13px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Добавить из каталога</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '13px 21px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 13px', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 8 }}>
            <Search size={14} color="var(--text-muted)" />
            <input style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 21, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>Шаблонов нет</div>}
          {filtered.map(tpl => {
            const conn = isConnected(tpl.id)
            return (
              <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: conn ? 'rgba(2,189,182,0.06)' : 'var(--bg-surface)', border: `1px solid ${conn ? 'rgba(2,189,182,0.25)' : 'var(--glass-border)'}`, borderRadius: 13 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {typeLabel(tpl.slot_1_type)} · {tpl.slot_1_duration_min} мин · {tpl.slot_1_sessions_total} сеансов
                    {tpl.slot_2_type && ` + ${typeLabel(tpl.slot_2_type)}`}
                    {' · '}{tpl.validity_days} дней
                    {tpl.price != null && ` · ${new Intl.NumberFormat('ru-KZ').format(tpl.price)} ₸`}
                  </div>
                </div>
                {conn ? (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(2,189,182,0.12)', color: '#02BDB6', border: '1px solid rgba(2,189,182,0.3)' }}>✓ Подключён</span>
                ) : (
                  <button onClick={() => void handleConnect(tpl)} disabled={loading === tpl.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: loading === tpl.id ? 'wait' : 'pointer', opacity: loading === tpl.id ? 0.6 : 1 }}>
                    <Link size={12} />{loading === tpl.id ? '...' : 'Добавить'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── SubscriptionsPage ────────────────────────────────────────────────────────

type PageTab = 'branch' | 'sold'
interface CtxMenu { x: number; y: number; tpl: SubscriptionTemplate }

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const isDeveloperOrOwner = user?.role === 'developer' || user?.role === 'owner'
  const [tab, setTab]               = useState<PageTab>('branch')

  // Branch templates
  const [allTemplates, setAllTemplates]   = useState<SubscriptionTemplate[]>([])
  const [connected,    setConnected]      = useState<BranchSubscriptionTemplate[]>([])
  const [loadingBranch, setLoadingBranch] = useState(true)
  const [branchError,  setBranchError]    = useState<string | null>(null)
  const [showCatalog,  setShowCatalog]    = useState(false)
  const [ctxMenu,      setCtxMenu]        = useState<CtxMenu | null>(null)
  const [viewTpl,      setViewTpl]        = useState<SubscriptionTemplate | null>(null)

  // Sold subscriptions
  const [sold,         setSold]         = useState<Subscription[]>([])
  const [loadingSold,  setLoadingSold]  = useState(false)
  const [soldError,    setSoldError]    = useState<string | null>(null)
  const [search,       setSearch]       = useState('')

  useEffect(() => {
    const load = async () => {
      setLoadingBranch(true); setBranchError(null)
      try {
        const [tpls, conn] = await Promise.all([subscriptionTemplatesApi.getAll(), branchSubscriptionTemplatesApi.getAll()])
        setAllTemplates(tpls)
        setConnected(conn)
      } catch (e: unknown) {
        setBranchError(getServerError(e) ?? 'Не удалось загрузить данные')
      } finally { setLoadingBranch(false) }
    }
    void load()
  }, [])

  useEffect(() => {
    if (tab === 'sold' && sold.length === 0) {
      setLoadingSold(true); setSoldError(null)
      subscriptionsApi.getAll()
        .then(setSold)
        .catch(e => setSoldError(getServerError(e) ?? 'Ошибка загрузки'))
        .finally(() => setLoadingSold(false))
    }
  }, [tab, sold.length])

  const connectedTemplates = connected
    .map(c => c.subscription_templates)
    .filter((t): t is SubscriptionTemplate => Boolean(t))

  const handleConnect = async (tpl: SubscriptionTemplate) => {
    const created = await branchSubscriptionTemplatesApi.connect(tpl.id)
    setConnected(prev => [...prev, { ...created, subscription_templates: tpl }])
  }

  const handleDisconnect = async (tplId: string) => {
    const rec = connected.find(c => c.template_id === tplId)
    if (!rec) return
    await branchSubscriptionTemplatesApi.disconnect(rec.id)
    setConnected(prev => prev.filter(c => c.id !== rec.id))
  }

  const handleToggleActive = async (tpl: SubscriptionTemplate) => {
    try {
      const updated = await subscriptionTemplatesApi.update(tpl.id, { is_active: !tpl.is_active })
      setAllTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
    } catch { /* ignore */ }
  }

  const buildCtxItems = (tpl: SubscriptionTemplate): ContextMenuEntry[] => {
    const conn = connected.some(c => c.template_id === tpl.id)
    return [
      { label: 'Открыть карточку', icon: <Eye size={13} />, onClick: () => setViewTpl(tpl) },
      conn
        ? { label: 'Убрать из филиала', icon: <Unlink size={13} />, onClick: () => void handleDisconnect(tpl.id) }
        : { label: 'Добавить в филиал', icon: <Link size={13} />, onClick: async () => { try { await handleConnect(tpl) } catch { /* */ } } },
      { separator: true },
      { label: tpl.is_active ? 'Деактивировать' : 'Активировать', icon: tpl.is_active ? <ToggleLeft size={13} /> : <ToggleRight size={13} />, onClick: () => void handleToggleActive(tpl) },
    ]
  }

  const filteredSold = search.trim()
    ? sold.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.clients?.full_name?.toLowerCase().includes(search.toLowerCase()))
    : sold

  const TABS = [
    { id: 'branch' as PageTab, label: 'Доступные абонементы' },
    { id: 'sold'   as PageTab, label: 'Проданные абонементы' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Абонементы</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {connected.length} подключено к филиалу · {allTemplates.length} в каталоге
          </p>
        </div>
        {tab === 'branch' && (
          <button onClick={() => setShowCatalog(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 21px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={15} strokeWidth={2} />Добавить из каталога
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 21px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? '#02BDB6' : 'var(--text-secondary)', borderBottom: `2px solid ${tab === t.id ? '#02BDB6' : 'transparent'}`, transition: 'all 0.15s', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Branch templates tab */}
      {tab === 'branch' && (
        <>
          {branchError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
              <AlertCircle size={13} />{branchError}
            </div>
          )}
          {loadingBranch ? (
            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
            </div>
          ) : connectedTemplates.length === 0 ? (
            <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 21, background: 'rgba(2,189,182,0.08)', border: '1px solid rgba(2,189,182,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 13 }}>
                <CreditCard size={24} strokeWidth={1.5} color="#02BDB6" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Абонементов нет</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300, lineHeight: 1.6 }}>
                Нажмите «Добавить из каталога» чтобы подключить шаблоны к этому филиалу
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {connectedTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => setViewTpl(tpl)}
                  onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, tpl }) }}
                  style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: 21, cursor: 'pointer', opacity: tpl.is_active ? 1 : 0.55 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{tpl.name}</div>
                        {!tpl.is_active && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(113,113,122,0.15)', color: 'var(--text-muted)', border: '1px solid rgba(113,113,122,0.25)' }}>Неактивен</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Срок: {tpl.validity_days} дней</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {tpl.price != null && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{new Intl.NumberFormat('ru-KZ').format(tpl.price)} ₸</span>}
                      {isDeveloperOrOwner && (
                        <button onClick={e => { e.stopPropagation(); void handleDisconnect(tpl.id) }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                          title="Убрать из филиала">
                          <Unlink size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 120px', padding: '8px 13px', background: 'var(--bg-elevated)', borderRadius: 8, border: `1px solid ${typeColor(tpl.slot_1_type)}33` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: typeColor(tpl.slot_1_type) }}>{typeLabel(tpl.slot_1_type)}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tpl.slot_1_duration_min} мин</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{tpl.slot_1_sessions_total} сеансов</div>
                    </div>
                    {tpl.slot_2_type && tpl.slot_2_sessions_total && (
                      <div style={{ flex: '1 1 120px', padding: '8px 13px', background: 'var(--bg-elevated)', borderRadius: 8, border: `1px solid ${typeColor(tpl.slot_2_type!)}33` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: typeColor(tpl.slot_2_type!) }}>{typeLabel(tpl.slot_2_type!)}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tpl.slot_2_duration_min} мин</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{tpl.slot_2_sessions_total} сеансов</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sold subscriptions tab */}
      {tab === 'sold' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 13px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, marginBottom: 13 }}>
            <Search size={15} color="var(--text-muted)" />
            <input style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} placeholder="Поиск по клиенту или названию..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={13} /></button>}
          </div>
          {soldError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
              <AlertCircle size={13} />{soldError}
            </div>
          )}
          {loadingSold ? (
            <div style={{ padding: 55, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
          ) : filteredSold.length === 0 ? (
            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{search ? 'Ничего не найдено' : 'Проданных абонементов нет'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredSold.map(sub => {
                const statusColors: Record<string, string> = { active: '#10b981', frozen: '#f59e0b', expired: '#71717A', cancelled: '#ef4444' }
                const statusLabels: Record<string, string> = { active: 'Активен', frozen: 'Заморожен', expired: 'Истёк', cancelled: 'Отменён' }
                return (
                  <div key={sub.id} style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: 21 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{sub.name}</div>
                        {sub.clients?.full_name && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sub.clients.full_name}{sub.clients.phone && ` · ${sub.clients.phone}`}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {sub.price != null && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{new Intl.NumberFormat('ru-KZ').format(sub.price)} ₸</span>}
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${statusColors[sub.status] ?? '#71717A'}18`, color: statusColors[sub.status] ?? '#71717A', border: `1px solid ${statusColors[sub.status] ?? '#71717A'}33` }}>
                          {statusLabels[sub.status] ?? sub.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 13, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>{typeLabel(sub.slot_1_type)} · {sub.slot_1_sessions_left}/{sub.slot_1_sessions_total}</span>
                      {sub.slot_2_type && <span>{typeLabel(sub.slot_2_type!)} · {sub.slot_2_sessions_left}/{sub.slot_2_sessions_total}</span>}
                      <span>С {new Date(sub.date_start).toLocaleDateString('ru-RU')}</span>
                      {sub.date_end && <span>По {new Date(sub.date_end).toLocaleDateString('ru-RU')}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Template detail modal */}
      {viewTpl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
          <div onClick={() => setViewTpl(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
          <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 460, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(2,189,182,0.12)', border: '1px solid rgba(2,189,182,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={20} color="#02BDB6" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{viewTpl.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {viewTpl.validity_days} дней{viewTpl.price != null && ` · ${new Intl.NumberFormat('ru-KZ').format(viewTpl.price)} ₸`}
                </div>
              </div>
              <button onClick={() => setViewTpl(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 160px', padding: 13, background: 'var(--bg-surface)', borderRadius: 13, border: `1px solid ${typeColor(viewTpl.slot_1_type)}33` }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Слот 1</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: typeColor(viewTpl.slot_1_type) }}>{typeLabel(viewTpl.slot_1_type)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{viewTpl.slot_1_duration_min} мин · {viewTpl.slot_1_sessions_total} сеансов</div>
              </div>
              {viewTpl.slot_2_type && (
                <div style={{ flex: '1 1 160px', padding: 13, background: 'var(--bg-surface)', borderRadius: 13, border: `1px solid ${typeColor(viewTpl.slot_2_type!)}33` }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Слот 2</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: typeColor(viewTpl.slot_2_type!) }}>{typeLabel(viewTpl.slot_2_type!)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{viewTpl.slot_2_duration_min} мин · {viewTpl.slot_2_sessions_total} сеансов</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCatalog && (
        <AddFromCatalogModal
          allTemplates={allTemplates}
          connected={connected}
          onConnect={handleConnect}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildCtxItems(ctxMenu.tpl)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}
