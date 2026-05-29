import React, { useState, useEffect } from 'react'
import { Cpu, Plus, Trash2, AlertCircle, Building2, Briefcase, LayoutGrid, CreditCard, Package, Edit2, X, ChevronDown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { Device, DeviceType, DeviceGroup, DeviceStatus, Department, Position, SubscriptionTemplate, CatalogItem, BranchSubscriptionTemplate } from '../../types'
import { devicesApi } from '../../api/devices.api'
import { branchesApi, type BranchRaw } from '../../api/branches.api'
import { departmentsApi, positionsApi } from '../../api/departments.api'
import { subscriptionTemplatesApi } from '../../api/subscription-templates.api'
import { branchSubscriptionTemplatesApi } from '../../api/branch-subscription-templates.api'
import { catalogApi } from '../../api/catalog.api'

// ─── shared ────────────────────────────────────────────────────────────────────

interface SectionProps { title: string; icon: React.ReactNode; children: React.ReactNode }
function Section({ title, icon, children }: SectionProps) {
  return (
    <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, overflow: 'hidden', marginBottom: 13 }}>
      <div style={{ padding: '13px 21px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
        {icon}{title}
      </div>
      <div style={{ padding: 21 }}>{children}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
const labelStyle: React.CSSProperties  = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

// ─── constants ─────────────────────────────────────────────────────────────────

const DEVICE_TYPES: { value: DeviceType; label: string }[] = [
  { value: 'vacuactiv',  label: 'VacuActiv'  },
  { value: 'rollshape',  label: 'RollShape'  },
  { value: 'infrastep',  label: 'InfraStep'  },
  { value: 'infrashape', label: 'InfraShape' },
]

const DEVICE_TYPE_COLORS: Record<DeviceType, string> = {
  vacuactiv: '#02BDB6', rollshape: '#263CD9', infrastep: '#8b5cf6', infrashape: '#f59e0b',
}

const STATUS_COLORS: Record<DeviceStatus, string> = {
  active: '#02BDB6', maintenance: '#f59e0b', disabled: '#71717A',
}
const STATUS_LABELS: Record<DeviceStatus, string> = {
  active: 'Активен', maintenance: 'Обслуживание', disabled: 'Отключён',
}

const DURATIONS = [15, 20, 25, 30, 45, 60]

const CATALOG_CATEGORIES = [
  { value: 'merch', label: 'Мерч' },
  { value: 'nutrition', label: 'Питание' },
  { value: 'equipment', label: 'Оборудование' },
  { value: 'other', label: 'Прочее' },
]

// ─── DevicesSection ─────────────────────────────────────────────────────────────

interface AddDeviceForm { type: DeviceType; number: string; device_group: DeviceGroup }

function DevicesSection() {
  const [devices,  setDevices]  = useState<Device[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState<AddDeviceForm>({ type: 'vacuactiv', number: '', device_group: 'A' })

  useEffect(() => {
    devicesApi.getAll().then(setDevices).catch(() => setError('Не удалось загрузить оборудование')).finally(() => setLoading(false))
  }, [])

  const reload = async () => { const list = await devicesApi.getAll(); setDevices(list) }

  const handleAdd = async () => {
    if (!form.number.trim()) { setError('Введите номер тренажёра'); return }
    setSaving(true); setError(null)
    try { await devicesApi.create(form) }
    catch (e: unknown) { setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка'); setSaving(false); return }
    try { await reload() } catch { /* ignore */ }
    setForm({ type: 'vacuactiv', number: '', device_group: 'A' })
    setShowForm(false); setSaving(false)
  }

  const handleStatusCycle = async (device: Device) => {
    const next: DeviceStatus[] = ['active', 'maintenance', 'disabled']
    const newSt = next[(next.indexOf(device.status) + 1) % next.length]
    try { const updated = await devicesApi.updateStatus(device.id, newSt); setDevices(prev => prev.map(d => d.id === updated.id ? updated : d)) } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить тренажёр?')) return
    try { await devicesApi.delete(id); setDevices(prev => prev.filter(d => d.id !== id)) }
    catch (e: unknown) { setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка') }
  }

  const grouped = { A: devices.filter(d => d.device_group === 'A'), B: devices.filter(d => d.device_group === 'B') }

  return (
    <Section title="Оборудование" icon={<Cpu size={15} strokeWidth={1.75} color="#02BDB6" />}>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
          <AlertCircle size={13} />{error}
        </div>
      )}
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '13px 0' }}>Загрузка...</div>
      ) : (
        <>
          {(['A', 'B'] as DeviceGroup[]).map(grp => (
            grouped[grp].length > 0 && (
              <div key={grp} style={{ marginBottom: 13 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Группа {grp}</div>
                {grouped[grp].map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: DEVICE_TYPE_COLORS[d.type], flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{DEVICE_TYPES.find(t => t.value === d.type)?.label ?? d.type}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>#{d.number}</span>
                    </div>
                    <button onClick={() => void handleStatusCycle(d)} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, border: `1px solid ${STATUS_COLORS[d.status]}33`, background: `${STATUS_COLORS[d.status]}12`, color: STATUS_COLORS[d.status], cursor: 'pointer' }}>
                      {STATUS_LABELS[d.status]}
                    </button>
                    <button onClick={() => void handleDelete(d.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Trash2 size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>
            )
          ))}
          {devices.length === 0 && !showForm && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>Тренажёры не добавлены</div>}
          {showForm && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8, marginTop: 8 }}>
              <div>
                <label style={labelStyle}>Тип</label>
                <select style={selectStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DeviceType }))}>
                  {DEVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Номер</label>
                <input style={inputStyle} placeholder="01" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Группа</label>
                <select style={selectStyle} value={form.device_group} onChange={e => setForm(f => ({ ...f, device_group: e.target.value as DeviceGroup }))}>
                  <option value="A">Группа A</option>
                  <option value="B">Группа B</option>
                </select>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {showForm ? (
              <>
                <button onClick={() => void handleAdd()} disabled={saving} style={{ flex: 1, height: 34, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Сохранение...' : 'Добавить'}</button>
                <button onClick={() => { setShowForm(false); setError(null) }} style={{ height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
              </>
            ) : (
              <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                <Plus size={14} strokeWidth={2} />Добавить тренажёр
              </button>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

// ─── BranchesSection ─────────────────────────────────────────────────────────

function BranchesSection() {
  const [branches,  setBranches]  = useState<BranchRaw[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [name,      setName]      = useState('')
  const [city,      setCity]      = useState('')
  const [franchise, setFranchise] = useState(false)

  useEffect(() => { branchesApi.getAll().then(setBranches).catch(() => setError('Не удалось загрузить филиалы')).finally(() => setLoading(false)) }, [])

  const handleAdd = async () => {
    if (!name.trim()) { setError('Введите название филиала'); return }
    setSaving(true); setError(null)
    try {
      const created = await branchesApi.create({ name: name.trim(), city: city.trim() || undefined, is_franchise: franchise })
      setBranches(prev => [...prev, created]); setName(''); setCity(''); setFranchise(false); setShowForm(false)
    } catch (e: unknown) { setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка') }
    finally { setSaving(false) }
  }

  return (
    <Section title="Филиалы" icon={<Building2 size={15} strokeWidth={1.75} color="#02BDB6" />}>
      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}><AlertCircle size={13} />{error}</div>}
      {loading ? <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '13px 0' }}>Загрузка...</div> : (
        <>
          {branches.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{b.name}</div>
                {b.city && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{b.city}</div>}
              </div>
              {b.is_franchise && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(38,60,217,0.10)', color: '#263CD9', border: '1px solid rgba(38,60,217,0.25)', fontWeight: 600 }}>Франшиза</span>}
            </div>
          ))}
          {branches.length === 0 && !showForm && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>Филиалов нет</div>}
          {showForm && (
            <div style={{ marginTop: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><label style={labelStyle}>Название *</label><input style={inputStyle} placeholder="Главный офис" value={name} onChange={e => setName(e.target.value)} /></div>
              <div><label style={labelStyle}>Город</label><input style={inputStyle} placeholder="Алматы" value={city} onChange={e => setCity(e.target.value)} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}><input type="checkbox" checked={franchise} onChange={e => setFranchise(e.target.checked)} />Франшиза</label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
            {showForm ? (
              <>
                <button onClick={() => void handleAdd()} disabled={saving} style={{ flex: 1, height: 34, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Сохранение...' : 'Добавить'}</button>
                <button onClick={() => { setShowForm(false); setError(null) }} style={{ height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
              </>
            ) : (
              <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}><Plus size={14} strokeWidth={2} />Добавить филиал</button>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

// ─── DepartmentsSection ─────────────────────────────────────────────────────

function DepartmentsSection() {
  const [items,    setItems]    = useState<Department[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name,     setName]     = useState('')

  useEffect(() => { departmentsApi.getAll().then(setItems).catch(() => setError('Ошибка загрузки')).finally(() => setLoading(false)) }, [])

  const handleAdd = async () => {
    if (!name.trim()) { setError('Введите название'); return }
    setSaving(true); setError(null)
    try { const created = await departmentsApi.create(name.trim()); setItems(prev => [...prev, created]); setName(''); setShowForm(false) }
    catch (e: unknown) { setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить отдел?')) return
    try { await departmentsApi.delete(id); setItems(prev => prev.filter(i => i.id !== id)) } catch { /* ignore */ }
  }

  return (
    <Section title="Отделы" icon={<Briefcase size={15} strokeWidth={1.75} color="#02BDB6" />}>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{error}</div>}
      {loading ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div> : (
        <>
          {items.map(dep => (
            <div key={dep.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{dep.name}</span>
              <button onClick={() => void handleDelete(dep.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><Trash2 size={12} strokeWidth={1.75} /></button>
            </div>
          ))}
          {items.length === 0 && !showForm && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '13px 0' }}>Отделов нет</div>}
          {showForm && <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><input style={inputStyle} placeholder="Название отдела" value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }} /></div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {showForm ? (
              <>
                <button onClick={() => void handleAdd()} disabled={saving} style={{ flex: 1, height: 34, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? '...' : 'Добавить'}</button>
                <button onClick={() => { setShowForm(false); setError(null) }} style={{ height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
              </>
            ) : (
              <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}><Plus size={14} strokeWidth={2} />Добавить отдел</button>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

// ─── PositionsSection ───────────────────────────────────────────────────────

function PositionsSection() {
  const [items,    setItems]    = useState<Position[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name,     setName]     = useState('')

  useEffect(() => { positionsApi.getAll().then(setItems).catch(() => setError('Ошибка загрузки')).finally(() => setLoading(false)) }, [])

  const handleAdd = async () => {
    if (!name.trim()) { setError('Введите название'); return }
    setSaving(true); setError(null)
    try { const created = await positionsApi.create(name.trim()); setItems(prev => [...prev, created]); setName(''); setShowForm(false) }
    catch (e: unknown) { setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить должность?')) return
    try { await positionsApi.delete(id); setItems(prev => prev.filter(i => i.id !== id)) } catch { /* ignore */ }
  }

  return (
    <Section title="Должности" icon={<LayoutGrid size={15} strokeWidth={1.75} color="#02BDB6" />}>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{error}</div>}
      {loading ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div> : (
        <>
          {items.map(pos => (
            <div key={pos.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{pos.name}</span>
              <button onClick={() => void handleDelete(pos.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><Trash2 size={12} strokeWidth={1.75} /></button>
            </div>
          ))}
          {items.length === 0 && !showForm && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '13px 0' }}>Должностей нет</div>}
          {showForm && <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><input style={inputStyle} placeholder="Название должности" value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }} /></div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {showForm ? (
              <>
                <button onClick={() => void handleAdd()} disabled={saving} style={{ flex: 1, height: 34, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? '...' : 'Добавить'}</button>
                <button onClick={() => { setShowForm(false); setError(null) }} style={{ height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
              </>
            ) : (
              <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}><Plus size={14} strokeWidth={2} />Добавить должность</button>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

// ─── SubscriptionTemplatesSection ───────────────────────────────────────────

function SubscriptionTemplatesSection() {
  const [templates,  setTemplates]  = useState<SubscriptionTemplate[]>([])
  const [connected,  setConnected]  = useState<BranchSubscriptionTemplate[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // create form
  const [name,         setName]         = useState('')
  const [validityDays, setValidityDays] = useState(30)
  const [price,        setPrice]        = useState('')
  const [hasSlot2,     setHasSlot2]     = useState(false)
  const [slot1Type,    setSlot1Type]    = useState<DeviceType>('vacuactiv')
  const [slot1Dur,     setSlot1Dur]     = useState(30)
  const [slot1Ses,     setSlot1Ses]     = useState(8)
  const [slot2Type,    setSlot2Type]    = useState<DeviceType>('rollshape')
  const [slot2Dur,     setSlot2Dur]     = useState(20)
  const [slot2Ses,     setSlot2Ses]     = useState(8)
  const [saving,       setSaving]       = useState(false)
  const [formError,    setFormError]    = useState<string | null>(null)

  useEffect(() => {
    Promise.all([subscriptionTemplatesApi.getAll(), branchSubscriptionTemplatesApi.getAll()])
      .then(([tpls, conn]) => { setTemplates(tpls); setConnected(conn) })
      .catch(() => setError('Не удалось загрузить абонементы'))
      .finally(() => setLoading(false))
  }, [])

  const isConnected = (tplId: string) => connected.some(c => c.template_id === tplId)
  const connectedRecord = (tplId: string) => connected.find(c => c.template_id === tplId)

  const handleToggleConnection = async (tpl: SubscriptionTemplate) => {
    const rec = connectedRecord(tpl.id)
    if (rec) {
      try { await branchSubscriptionTemplatesApi.disconnect(rec.id); setConnected(prev => prev.filter(c => c.id !== rec.id)) } catch { /* ignore */ }
    } else {
      try { const created = await branchSubscriptionTemplatesApi.connect(tpl.id); setConnected(prev => [...prev, created]) } catch { /* ignore */ }
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) { setFormError('Введите название'); return }
    setSaving(true); setFormError(null)
    try {
      const tpl = await subscriptionTemplatesApi.create({
        name:                  name.trim(),
        slot_1_type:           slot1Type,
        slot_1_duration_min:   slot1Dur,
        slot_1_sessions_total: slot1Ses,
        slot_2_type:           hasSlot2 ? slot2Type : null,
        slot_2_duration_min:   hasSlot2 ? slot2Dur : null,
        slot_2_sessions_total: hasSlot2 ? slot2Ses : null,
        validity_days:         validityDays,
        price:                 price ? Number(price) : null,
      })
      setTemplates(prev => [tpl, ...prev])
      setShowCreate(false); setName(''); setPrice(''); setHasSlot2(false)
    } catch (e: unknown) {
      setFormError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить шаблон?')) return
    try {
      await subscriptionTemplatesApi.delete(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      setConnected(prev => prev.filter(c => c.template_id !== id))
    } catch { /* ignore */ }
  }

  const DEVICE_TYPE_LABELS: Record<DeviceType, string> = { vacuactiv: 'VacuActiv', rollshape: 'RollShape', infrastep: 'InfraStep', infrashape: 'InfraShape' }

  return (
    <Section title="Абонементы" icon={<CreditCard size={15} strokeWidth={1.75} color="#02BDB6" />}>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{error}</div>}
      {loading ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div> : (
        <>
          {templates.map(tpl => (
            <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{tpl.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {DEVICE_TYPE_LABELS[tpl.slot_1_type]} · {tpl.slot_1_duration_min} мин · {tpl.slot_1_sessions_total} сеансов
                  {tpl.slot_2_type && ` + ${DEVICE_TYPE_LABELS[tpl.slot_2_type]}`}
                  {' · '}{tpl.validity_days} дней
                  {tpl.price != null && ` · ${new Intl.NumberFormat('ru-KZ').format(tpl.price)} ₸`}
                </div>
              </div>
              <button
                onClick={() => void handleToggleConnection(tpl)}
                style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: isConnected(tpl.id) ? '1px solid rgba(2,189,182,0.4)' : '1px solid var(--glass-border)', background: isConnected(tpl.id) ? 'rgba(2,189,182,0.10)' : 'transparent', color: isConnected(tpl.id) ? '#02BDB6' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                {isConnected(tpl.id) ? '✓ Подключён' : 'Подключить'}
              </button>
              <button onClick={() => void handleDelete(tpl.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                <Trash2 size={12} strokeWidth={1.75} />
              </button>
            </div>
          ))}
          {templates.length === 0 && !showCreate && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>Шаблонов нет</div>}

          {showCreate && (
            <div style={{ marginTop: 13, padding: 13, background: 'var(--bg-elevated)', borderRadius: 13, border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Новый шаблон</div>
              {formError && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{formError}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div><label style={labelStyle}>Название *</label><input style={inputStyle} placeholder="Базовый 8 сеансов" value={name} onChange={e => setName(e.target.value)} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={labelStyle}>Срок (дней)</label><input type="number" min={1} style={inputStyle} value={validityDays} onChange={e => setValidityDays(Math.max(1, Number(e.target.value)))} /></div>
                  <div><label style={labelStyle}>Цена (₸)</label><input type="number" min={0} style={inputStyle} placeholder="0" value={price} onChange={e => setPrice(e.target.value)} /></div>
                </div>
                <div style={{ padding: 10, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Слот 1</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div><label style={labelStyle}>Тип</label>
                      <select style={selectStyle} value={slot1Type} onChange={e => setSlot1Type(e.target.value as DeviceType)}>
                        {DEVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div><label style={labelStyle}>Длит. (мин)</label>
                      <select style={selectStyle} value={slot1Dur} onChange={e => setSlot1Dur(Number(e.target.value))}>
                        {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div><label style={labelStyle}>Сеансов</label><input type="number" min={1} style={inputStyle} value={slot1Ses} onChange={e => setSlot1Ses(Math.max(1, Number(e.target.value)))} /></div>
                  </div>
                </div>
                <button onClick={() => setHasSlot2(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: hasSlot2 ? 'rgba(2,189,182,0.08)' : 'transparent', border: `1px solid ${hasSlot2 ? 'rgba(2,189,182,0.3)' : 'var(--glass-border)'}`, borderRadius: 8, color: hasSlot2 ? '#02BDB6' : 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
                  <ChevronDown size={13} style={{ transform: hasSlot2 ? 'rotate(180deg)' : 'none' }} />
                  {hasSlot2 ? 'Убрать Слот 2' : '+ Слот 2 (финишный тренажёр)'}
                </button>
                {hasSlot2 && (
                  <div style={{ padding: 10, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Слот 2</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div><label style={labelStyle}>Тип</label>
                        <select style={selectStyle} value={slot2Type} onChange={e => setSlot2Type(e.target.value as DeviceType)}>
                          {DEVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div><label style={labelStyle}>Длит. (мин)</label>
                        <select style={selectStyle} value={slot2Dur} onChange={e => setSlot2Dur(Number(e.target.value))}>
                          {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div><label style={labelStyle}>Сеансов</label><input type="number" min={1} style={inputStyle} value={slot2Ses} onChange={e => setSlot2Ses(Math.max(1, Number(e.target.value)))} /></div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
                <button onClick={() => void handleCreate()} disabled={saving} style={{ flex: 1, height: 34, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Создание...' : 'Создать'}</button>
                <button onClick={() => { setShowCreate(false); setFormError(null) }} style={{ height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
              </div>
            </div>
          )}

          {!showCreate && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                <Plus size={14} strokeWidth={2} />Новый шаблон
              </button>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

// ─── CatalogSection ──────────────────────────────────────────────────────────

function CatalogSection() {
  const [items,    setItems]    = useState<CatalogItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<CatalogItem | null>(null)

  const [name,  setName]  = useState('')
  const [sku,   setSku]   = useState('')
  const [cat,   setCat]   = useState('other')
  const [unit,  setUnit]  = useState('')
  const [desc,  setDesc]  = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    catalogApi.getAll().then(setItems).catch(() => setError('Не удалось загрузить каталог')).finally(() => setLoading(false))
  }, [])

  const resetForm = () => { setName(''); setSku(''); setCat('other'); setUnit(''); setDesc(''); setPrice(''); setFormError(null) }

  const startEdit = (item: CatalogItem) => {
    setEditItem(item); setName(item.name); setSku(item.sku ?? ''); setCat(item.category); setUnit(item.unit ?? ''); setDesc(item.description ?? ''); setPrice(item.price != null ? String(item.price) : '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!name.trim()) { setFormError('Введите название'); return }
    setSaving(true); setFormError(null)
    try {
      const payload = { name: name.trim(), sku: sku.trim() || null, category: cat as CatalogItem['category'], unit: unit.trim() || null, description: desc.trim() || null, price: price ? Number(price) : null }
      if (editItem) {
        const updated = await catalogApi.update(editItem.id, payload)
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      } else {
        const created = await catalogApi.create(payload)
        setItems(prev => [...prev, created])
      }
      setShowForm(false); setEditItem(null); resetForm()
    } catch (e: unknown) {
      setFormError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить позицию каталога?')) return
    try { await catalogApi.delete(id); setItems(prev => prev.filter(i => i.id !== id)) } catch { /* ignore */ }
  }

  const CATEGORY_COLORS: Record<string, string> = { merch: '#8b5cf6', nutrition: '#10b981', equipment: '#3b82f6', other: '#71717A' }

  return (
    <Section title="Каталог товаров" icon={<Package size={15} strokeWidth={1.75} color="#02BDB6" />}>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{error}</div>}
      {loading ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div> : (
        <>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[item.category] ?? '#71717A', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {item.sku && `SKU: ${item.sku} · `}{item.unit && `${item.unit} · `}
                  {CATALOG_CATEGORIES.find(c => c.value === item.category)?.label}
                  {item.price != null && ` · ${new Intl.NumberFormat('ru-KZ').format(item.price)} ₸`}
                </div>
              </div>
              <button onClick={() => startEdit(item)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit2 size={12} strokeWidth={1.75} /></button>
              <button onClick={() => void handleDelete(item.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><Trash2 size={12} strokeWidth={1.75} /></button>
            </div>
          ))}
          {items.length === 0 && !showForm && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>Каталог пуст</div>}

          {showForm && (
            <div style={{ marginTop: 13, padding: 13, background: 'var(--bg-elevated)', borderRadius: 13, border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{editItem ? 'Редактировать позицию' : 'Новая позиция'}</div>
                <button onClick={() => { setShowForm(false); setEditItem(null); resetForm() }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
              </div>
              {formError && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{formError}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div><label style={labelStyle}>Название *</label><input style={inputStyle} placeholder="Название товара" value={name} onChange={e => setName(e.target.value)} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={labelStyle}>SKU</label><input style={inputStyle} placeholder="SKU-001" value={sku} onChange={e => setSku(e.target.value)} /></div>
                  <div><label style={labelStyle}>Единица</label><input style={inputStyle} placeholder="шт / кг / л" value={unit} onChange={e => setUnit(e.target.value)} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={labelStyle}>Категория</label>
                    <select style={selectStyle} value={cat} onChange={e => setCat(e.target.value)}>
                      {CATALOG_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Цена (₸)</label><input type="number" min={0} style={inputStyle} placeholder="0" value={price} onChange={e => setPrice(e.target.value)} /></div>
                </div>
                <div><label style={labelStyle}>Описание</label><input style={inputStyle} placeholder="Краткое описание" value={desc} onChange={e => setDesc(e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
                <button onClick={() => void handleSave()} disabled={saving} style={{ flex: 1, height: 34, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Сохранение...' : editItem ? 'Сохранить' : 'Добавить'}</button>
                <button onClick={() => { setShowForm(false); setEditItem(null); resetForm() }} style={{ height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
              </div>
            </div>
          )}

          {!showForm && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                <Plus size={14} strokeWidth={2} />Добавить позицию
              </button>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

type ManagementTab = 'general' | 'subscriptions' | 'catalog'

export default function ManagementPage() {
  const { user } = useAuth()
  const isDeveloperOrOwner = user?.role === 'developer' || user?.role === 'owner'
  const [tab, setTab] = useState<ManagementTab>('general')

  const TABS: { id: ManagementTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general',       label: 'Общее',     icon: <Cpu size={14} strokeWidth={1.75} /> },
    { id: 'subscriptions', label: 'Абонементы', icon: <CreditCard size={14} strokeWidth={1.75} /> },
    ...(isDeveloperOrOwner ? [{ id: 'catalog' as ManagementTab, label: 'Каталог товаров', icon: <Package size={14} strokeWidth={1.75} /> }] : []),
  ]

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Управление</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Оборудование, структура, абонементы, каталог</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 21, background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, background: tab === t.id ? 'var(--bg-elevated)' : 'transparent', color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)', justifyContent: 'center', transition: 'all 0.15s' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <>
          <DevicesSection />
          <DepartmentsSection />
          <PositionsSection />
          {isDeveloperOrOwner && <BranchesSection />}
        </>
      )}
      {tab === 'subscriptions' && <SubscriptionTemplatesSection />}
      {tab === 'catalog' && isDeveloperOrOwner && <CatalogSection />}
    </div>
  )
}
