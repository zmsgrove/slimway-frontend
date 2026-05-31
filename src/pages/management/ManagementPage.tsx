import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import {
  Cpu, Plus, Trash2, AlertCircle, Building2, Briefcase, LayoutGrid,
  CreditCard, Package, Edit2, X, ChevronDown, Shield, Users, Tag, ClipboardList,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { usePermissionOverrides } from '../../hooks/usePermissionOverrides'
import { permissionsApi } from '../../api/permissions.api'
import { employeesApi } from '../../api/employees.api'
import { branchesApi, type BranchRaw } from '../../api/branches.api'
import {
  DEFAULT_PERMISSIONS, getCellState,
  canEditRolePermissions as canEditPermFn,
} from '../../lib/permissions'
import type { PermissionOverride, Role as PermRole, PermissionState } from '../../lib/permissions'
import type {
  Device, DeviceType, DeviceGroup, DeviceStatus, Department, Position,
  SubscriptionTemplate, CatalogItem, BranchSubscriptionTemplate, Employee,
} from '../../types'
import { devicesApi } from '../../api/devices.api'
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
const thStyle: React.CSSProperties = {
  padding: '10px 13px', borderBottom: '1px solid var(--glass-border)',
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: 0.5,
  background: 'var(--bg-elevated)', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = { padding: '6px 13px', fontSize: 13, color: 'var(--text-primary)' }

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

// ─── PromoCodesSection ───────────────────────────────────────────────────────

interface PromoCode {
  id: string
  branch_id: string
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

function PromoCodesSection() {
  const [codes,    setCodes]    = useState<PromoCode[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [code,          setCode]          = useState('')
  const [discountType,  setDiscountType]  = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUses,       setMaxUses]       = useState('')
  const [expiresAt,     setExpiresAt]     = useState('')

  const { api: apiLib } = { api: null }

  useEffect(() => {
    import('../../lib/api').then(m => {
      m.api.get('/promo-codes')
        .then(r => setCodes((r.data as PromoCode[]) ?? []))
        .catch(() => setError('Не удалось загрузить промокоды'))
        .finally(() => setLoading(false))
    })
  }, [])

  const resetForm = () => { setCode(''); setDiscountType('fixed'); setDiscountValue(''); setMaxUses(''); setExpiresAt(''); setFormError(null) }

  const handleCreate = async () => {
    if (!code.trim()) { setFormError('Введите код'); return }
    if (!discountValue || Number(discountValue) <= 0) { setFormError('Укажите размер скидки'); return }
    setSaving(true); setFormError(null)
    try {
      const { api: a } = await import('../../lib/api')
      const { data } = await a.post('/promo-codes', {
        code: code.trim(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt || null,
      })
      setCodes(prev => [data as PromoCode, ...prev])
      setShowForm(false); resetForm()
    } catch (e: unknown) {
      setFormError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка')
    } finally { setSaving(false) }
  }

  const handleToggle = async (promo: PromoCode) => {
    try {
      const { api: a } = await import('../../lib/api')
      const { data } = await a.patch(`/promo-codes/${promo.id}`, { is_active: !promo.is_active })
      setCodes(prev => prev.map(c => c.id === promo.id ? data as PromoCode : c))
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить промокод?')) return
    try {
      const { api: a } = await import('../../lib/api')
      await a.delete(`/promo-codes/${id}`)
      setCodes(prev => prev.filter(c => c.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <Section title="Промокоды" icon={<Tag size={15} strokeWidth={1.75} color="#02BDB6" />}>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{error}</div>}
      {loading ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div> : (
        <>
          {codes.map(promo => (
            <div key={promo.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: 1 }}>{promo.code}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: promo.discount_type === 'percent' ? 'rgba(139,92,246,0.10)' : 'rgba(2,189,182,0.10)', color: promo.discount_type === 'percent' ? '#8b5cf6' : '#02BDB6', border: `1px solid ${promo.discount_type === 'percent' ? 'rgba(139,92,246,0.25)' : 'rgba(2,189,182,0.25)'}` }}>
                    -{promo.discount_value}{promo.discount_type === 'percent' ? '%' : ' ₸'}
                  </span>
                  {!promo.is_active && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'rgba(113,113,122,0.10)', color: '#71717A', border: '1px solid rgba(113,113,122,0.2)' }}>Неактивен</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>Использовано: {promo.uses_count}{promo.max_uses ? `/${promo.max_uses}` : ''}</span>
                  {promo.expires_at && <span>До {new Date(promo.expires_at + 'T00:00:00').toLocaleDateString('ru-RU')}</span>}
                </div>
              </div>
              <button onClick={() => void handleToggle(promo)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: promo.is_active ? '1px solid rgba(2,189,182,0.3)' : '1px solid var(--glass-border)', background: promo.is_active ? 'rgba(2,189,182,0.08)' : 'transparent', color: promo.is_active ? '#02BDB6' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                {promo.is_active ? 'Активен' : 'Включить'}
              </button>
              <button onClick={() => void handleDelete(promo.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                <Trash2 size={12} strokeWidth={1.75} />
              </button>
            </div>
          ))}
          {codes.length === 0 && !showForm && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>Промокодов нет</div>}

          {showForm && (
            <div style={{ marginTop: 13, padding: 13, background: 'var(--bg-elevated)', borderRadius: 13, border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Новый промокод</div>
                <button onClick={() => { setShowForm(false); resetForm() }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
              </div>
              {formError && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{formError}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div><label style={labelStyle}>Код *</label><input style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }} placeholder="SUMMER25" value={code} onChange={e => setCode(e.target.value.toUpperCase())} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={labelStyle}>Тип скидки</label>
                    <select style={selectStyle} value={discountType} onChange={e => setDiscountType(e.target.value as 'fixed' | 'percent')}>
                      <option value="fixed">Фиксированная (₸)</option>
                      <option value="percent">Процент (%)</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Размер скидки *</label><input type="number" min={0} style={inputStyle} placeholder={discountType === 'percent' ? '10' : '5000'} value={discountValue} onChange={e => setDiscountValue(e.target.value)} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={labelStyle}>Макс. использований</label><input type="number" min={1} style={inputStyle} placeholder="∞" value={maxUses} onChange={e => setMaxUses(e.target.value)} /></div>
                  <div><label style={labelStyle}>Действует до</label><input type="date" style={inputStyle} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
                <button onClick={() => void handleCreate()} disabled={saving} style={{ flex: 1, height: 34, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Создание...' : 'Создать'}</button>
                <button onClick={() => { setShowForm(false); resetForm() }} style={{ height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
              </div>
            </div>
          )}
          {!showForm && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                <Plus size={14} strokeWidth={2} />Добавить промокод
              </button>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

// ─── PermissionsTab ──────────────────────────────────────────────────────────

const PERM_ROLES: PermRole[] = ['owner', 'franchisee', 'admin', 'staff', 'technical']

const PERM_ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец', franchisee: 'Франчайзи', admin: 'Адм.', staff: 'Мен.', technical: 'Тех.',
}

const RESOURCE_LABELS: Record<string, string> = {
  clients: 'Клиенты', leads: 'Лиды', bookings: 'Бронирования', subscriptions: 'Абонементы',
  schedule: 'Расписание', shifts: 'График', employees: 'Сотрудники', warehouse: 'Склад',
  analytics: 'Аналитика', tasks: 'Задачи', management: 'Управление', settings: 'Настройки',
  permissions: 'Права доступа',
}

const ACTION_LABELS: Record<string, string> = {
  view: 'Просмотр', create: 'Создание', edit: 'Редактирование', delete: 'Удаление',
  cancel_early: 'Отмена (>24ч)', cancel_late: 'Отмена (<24ч)',
}

const ROLE_RANK: Partial<Record<string, number>> = {
  developer: 0, owner: 1, franchisee: 2, admin: 3, staff: 4, technical: 5,
}

function isSetByHigherRole(override: PermissionOverride | undefined, myRole: string): boolean {
  if (!override?.set_by || myRole === 'developer') return false
  return (ROLE_RANK[override.set_by] ?? 99) < (ROLE_RANK[myRole] ?? 99)
}

const PERM_OPTIONS_DEV: { state: PermissionState; label: string; icon: string }[] = [
  { state: 'deny',   label: 'Запрещено',     icon: '⬜' },
  { state: 'allow',  label: 'Разрешено',     icon: '✅' },
  { state: 'locked', label: 'Заблокировано', icon: '🔒' },
]

const PERM_OPTIONS_OTHER: { state: PermissionState; label: string; icon: string }[] = [
  { state: 'deny',  label: 'Запрещено', icon: '⬜' },
  { state: 'allow', label: 'Разрешено', icon: '✅' },
]

interface PermDropdown { key: string; top: number; left: number }

function PermissionsTab() {
  const perm = usePermissions()
  const { overrides: contextOverrides, refresh } = usePermissionOverrides()
  const [localOverrides, setLocalOverrides] = useState<PermissionOverride[]>([])
  const [saving,   setSaving]   = useState<string | null>(null)
  const [dropdown, setDropdown] = useState<PermDropdown | null>(null)

  // Sync local copy from context (after refresh or initial load)
  useEffect(() => { setLocalOverrides(contextOverrides) }, [contextOverrides])

  useEffect(() => {
    if (!dropdown) return
    const close = () => setDropdown(null)
    document.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [dropdown])

  const openDropdown = (e: React.MouseEvent<HTMLButtonElement>, key: string) => {
    e.stopPropagation()
    if (dropdown?.key === key) { setDropdown(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    setDropdown({ key, top: rect.bottom + 4, left: rect.left })
  }

  const handleSelect = async (targetRole: PermRole, resource: string, action: string, newState: PermissionState) => {
    setDropdown(null)
    const key = `${targetRole}:${resource}:${action}`
    setSaving(key)

    // Optimistic update
    setLocalOverrides(prev => {
      const filtered = prev.filter(
        o => !(o.role === targetRole && o.resource === resource && o.action === action)
      )
      if (newState === 'deny') return filtered
      return [...filtered, { role: targetRole, resource, action, state: newState, set_by: perm.role as PermRole, branch_id: null }]
    })

    try {
      await api.post('/permissions', { role: targetRole, resource, action, state: newState })
      refresh() // sync real IDs from server
    } catch (e) {
      console.error('[permissions save]', e)
      setLocalOverrides(contextOverrides) // rollback
    } finally {
      setSaving(null)
    }
  }

  const options = perm.canSetLocked ? PERM_OPTIONS_DEV : PERM_OPTIONS_OTHER
  const [dropRole, dropResource, dropAction] = dropdown?.key.split(':') ?? []
  const dropCurrentState = dropRole && dropResource && dropAction
    ? getCellState(dropRole as PermRole, dropResource, dropAction, localOverrides)
    : null

  return (
    <>
      {dropdown && ReactDOM.createPortal(
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', top: dropdown.top, left: dropdown.left, zIndex: 9999,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)', minWidth: 170,
          }}
        >
          {options.map(opt => {
            const isActive = dropCurrentState === opt.state
            return (
              <button
                key={opt.state}
                onClick={() => void handleSelect(dropRole as PermRole, dropResource, dropAction, opt.state)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 14px', border: 'none',
                  background: isActive ? 'var(--accent-muted)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text)',
                  cursor: 'pointer', fontSize: 13, textAlign: 'left', fontWeight: isActive ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{opt.icon}</span>
                {opt.label}
              </button>
            )
          })}
        </div>,
        document.body
      )}

      <div style={{ overflowX: 'auto', margin: -21 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '13px 21px 8px' }}>
          ✓ — разрешено · — — запрещено · ✕ — заблокировано. Нажмите на ячейку для изменения.
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 660 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: 110 }}>Ресурс</th>
              <th style={{ ...thStyle, textAlign: 'left', width: 140 }}>Действие</th>
              {PERM_ROLES.map(r => (
                <th key={r} style={{ ...thStyle, textAlign: 'center', width: 76 }}>{PERM_ROLE_LABELS[r]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(DEFAULT_PERMISSIONS).flatMap(([resource, actions]) =>
              Object.keys(actions).map((action, actionIdx) => {
                const actionCount = Object.keys(actions).length
                return (
                  <tr key={`${resource}:${action}`} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    {actionIdx === 0 && (
                      <td
                        rowSpan={actionCount}
                        style={{ ...tdStyle, fontWeight: 600, fontSize: 12, verticalAlign: 'middle', borderRight: '1px solid var(--glass-border)', background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}
                      >
                        {RESOURCE_LABELS[resource] ?? resource}
                      </td>
                    )}
                    <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-secondary)', borderRight: '1px solid var(--glass-border)' }}>
                      {ACTION_LABELS[action] ?? action}
                    </td>
                    {PERM_ROLES.map(targetRole => {
                      const state = getCellState(targetRole, resource, action, localOverrides)
                      const canEdit = canEditPermFn(perm.role as PermRole, targetRole)
                      const cellOverride = localOverrides.find(o => o.role === targetRole && o.resource === resource && o.action === action)
                      const frozenByHigher = isSetByHigherRole(cellOverride, perm.role as string)
                      const isLocked = state === 'locked' && !perm.canSetLocked
                      const clickable = canEdit && !isLocked && !frozenByHigher
                      const isSaving = saving === `${targetRole}:${resource}:${action}`
                      const cellKey = `${targetRole}:${resource}:${action}`
                      const isOpen = dropdown?.key === cellKey

                      return (
                        <td key={targetRole} style={{ ...tdStyle, textAlign: 'center', padding: '4px 8px' }}>
                          <button
                            onClick={e => clickable && !isSaving ? openDropdown(e, cellKey) : e.stopPropagation()}
                            title={
                              frozenByHigher ? 'Установлено вышестоящей ролью' :
                              isLocked       ? 'Заблокировано' :
                              !canEdit       ? 'Нет прав на изменение' :
                              undefined
                            }
                            style={{
                              width: 30, height: 30, borderRadius: 7, border: 'none',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              cursor: clickable && !isSaving ? 'pointer' : 'not-allowed',
                              background: state === 'allow'  ? 'rgba(2,189,182,0.12)' :
                                          state === 'locked' ? 'rgba(239,68,68,0.10)' : 'transparent',
                              color:      state === 'allow'  ? '#02BDB6' :
                                          state === 'locked' ? '#ef4444' : 'var(--text-muted)',
                              opacity: isSaving ? 0.4 : (!clickable ? 0.5 : 1),
                              outline: isOpen ? '2px solid var(--accent)' : 'none',
                              outlineOffset: 2,
                              fontSize: 15, fontWeight: 700,
                              transition: 'all 0.1s',
                            }}
                          >
                            {isSaving ? '·' : state === 'allow' ? '✓' : state === 'locked' ? '✕' : '—'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── UsersTab ────────────────────────────────────────────────────────────────

interface EmployeeWithRole extends Employee {
  profile?: { role: string; full_name?: string } | null
}

const USER_ROLES: string[] = ['owner', 'franchisee', 'admin', 'staff', 'technical']
const USER_ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец', franchisee: 'Франчайзи', admin: 'Администратор',
  staff: 'Менеджер', technical: 'Тех. персонал',
}

function UsersTab() {
  const [employees, setEmployees] = useState<EmployeeWithRole[]>([])
  const [branches,  setBranches]  = useState<BranchRaw[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    Promise.all([
      employeesApi.getAll() as Promise<EmployeeWithRole[]>,
      branchesApi.getAll(),
    ])
      .then(([emps, brs]) => { setEmployees(emps); setBranches(brs) })
      .catch(() => setError('Не удалось загрузить пользователей'))
      .finally(() => setLoading(false))
  }, [])

  const handleRoleChange = async (employeeId: string, newRole: string) => {
    const key = `role:${employeeId}`
    setSaving(key)
    try {
      await api.patch(`/employees/${employeeId}/role`, { role: newRole })
      setEmployees(prev => prev.map(e =>
        e.id === employeeId
          ? { ...e, profile: { ...(e.profile ?? {}), role: newRole } }
          : e
      ))
      showToast('Роль обновлена', true)
    } catch (e) {
      console.error('[role change]', e)
      showToast('Ошибка при смене роли', false)
    } finally { setSaving(null) }
  }

  const handleBranchChange = async (emp: EmployeeWithRole, newBranchId: string) => {
    const key = `branch:${emp.id}`
    setSaving(key)
    try {
      const role = emp.profile?.role ?? 'staff'
      await api.patch(`/employees/${emp.id}/role`, { role, branch_id: newBranchId || null })
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, branch_id: newBranchId } : e))
      showToast('Филиал обновлён', true)
    } catch (e) {
      console.error('[branch change]', e)
      showToast('Ошибка при смене филиала', false)
    } finally { setSaving(null) }
  }

  if (loading) return <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '21px 0', textAlign: 'center' }}>Загрузка...</div>
  if (error)   return <div style={{ fontSize: 13, color: '#ef4444', padding: '13px 0' }}>{error}</div>

  return (
    <div>
      {toast && (
        <div style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: toast.ok ? '#02BDB618' : '#ef444418', color: toast.ok ? '#02BDB6' : '#ef4444', border: `1px solid ${toast.ok ? '#02BDB640' : '#ef444440'}` }}>
          {toast.msg}
        </div>
      )}
      <div style={{ overflowX: 'auto', margin: -21, marginTop: toast ? -10 : -21 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }}>Сотрудник</th>
              <th style={{ ...thStyle, textAlign: 'left', width: 170 }}>Роль</th>
              <th style={{ ...thStyle, textAlign: 'left', width: 190 }}>Филиал</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              const currentRole    = emp.profile?.role ?? ''
              const isSavingRole   = saving === `role:${emp.id}`
              const isSavingBranch = saving === `branch:${emp.id}`

              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{emp.full_name}</div>
                    {emp.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.phone}</div>}
                  </td>
                  <td style={{ ...tdStyle, padding: '6px 8px' }}>
                    <select
                      value={currentRole}
                      disabled={isSavingRole}
                      onChange={e => void handleRoleChange(emp.id, e.target.value)}
                      style={{ ...selectStyle, opacity: isSavingRole ? 0.6 : 1, fontSize: 12 }}
                    >
                      {currentRole && !USER_ROLES.includes(currentRole) && (
                        <option value={currentRole}>{currentRole}</option>
                      )}
                      {USER_ROLES.map(r => (
                        <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ ...tdStyle, padding: '6px 8px' }}>
                    <select
                      value={emp.branch_id ?? ''}
                      disabled={isSavingBranch}
                      onChange={e => void handleBranchChange(emp, e.target.value)}
                      style={{ ...selectStyle, opacity: isSavingBranch ? 0.6 : 1, fontSize: 12 }}
                    >
                      <option value="">— Нет —</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}{b.city ? ` (${b.city})` : ''}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', padding: '34px 0' }}>
                  Сотрудники не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── BranchSettingsSection ───────────────────────────────────────────────────

interface BranchSettings {
  work_time_start: string | null
  work_time_end: string | null
  timezone: string | null
  currency: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  address: string | null
  booking_interval_min: number | null
  max_bookings_per_day: number | null
}

const SETTINGS_DEFAULTS: BranchSettings = {
  work_time_start: '08:00', work_time_end: '22:00',
  timezone: 'UTC+5', currency: 'KZT',
  contact_phone: '', contact_email: '', website: '', address: '',
  booking_interval_min: 60, max_bookings_per_day: null,
}

const TIMEZONES_LIST = [
  { value: 'UTC+3',  label: 'UTC+3 — Москва' },
  { value: 'UTC+4',  label: 'UTC+4 — Самара, Баку' },
  { value: 'UTC+5',  label: 'UTC+5 — Астана, Ташкент' },
  { value: 'UTC+6',  label: 'UTC+6 — Алматы, Омск' },
  { value: 'UTC+7',  label: 'UTC+7 — Красноярск, Бангкок' },
  { value: 'UTC+8',  label: 'UTC+8 — Иркутск' },
  { value: 'UTC+9',  label: 'UTC+9 — Якутск' },
  { value: 'UTC+10', label: 'UTC+10 — Владивосток' },
  { value: 'UTC+11', label: 'UTC+11 — Магадан' },
  { value: 'UTC+12', label: 'UTC+12 — Камчатка' },
]

function BranchSettingsSection() {
  const { user } = useAuth()
  const isDeveloperOrOwner = user?.role === 'developer' || user?.role === 'owner'

  const [branches,    setBranches]   = useState<BranchRaw[]>([])
  const [branchId,    setBranchId]   = useState(localStorage.getItem('activeBranchId') ?? '')
  const [settings,    setSettings]   = useState<BranchSettings>(SETTINGS_DEFAULTS)
  const [saving,      setSaving]     = useState(false)
  const [saved,       setSaved]      = useState(false)
  const [loading,     setLoading]    = useState(true)

  useEffect(() => {
    if (!isDeveloperOrOwner) return
    branchesApi.getAll().then(brs => {
      setBranches(brs)
      if (!branchId && brs.length > 0) setBranchId(brs[0].id)
    }).catch(() => {})
  }, [isDeveloperOrOwner])

  const loadSettings = useCallback((bid: string) => {
    setLoading(true)
    const prev = localStorage.getItem('activeBranchId')
    if (bid) localStorage.setItem('activeBranchId', bid)
    api.get('/branch-settings')
      .then(r => {
        const d = r.data
        setSettings({
          work_time_start:      d.work_time_start      ?? '08:00',
          work_time_end:        d.work_time_end        ?? '22:00',
          timezone:             d.timezone             ?? 'UTC+5',
          currency:             d.currency             ?? 'KZT',
          contact_phone:        d.contact_phone        ?? '',
          contact_email:        d.contact_email        ?? '',
          website:              d.website              ?? '',
          address:              d.address              ?? '',
          booking_interval_min: d.booking_interval_min ?? 60,
          max_bookings_per_day: d.max_bookings_per_day ?? null,
        })
      })
      .catch(() => {})
      .finally(() => {
        if (prev !== null) localStorage.setItem('activeBranchId', prev)
        else localStorage.removeItem('activeBranchId')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (branchId) loadSettings(branchId)
    else if (!isDeveloperOrOwner) loadSettings('')
  }, [branchId, loadSettings, isDeveloperOrOwner])

  const save = async () => {
    setSaving(true)
    const prev = localStorage.getItem('activeBranchId')
    if (branchId) localStorage.setItem('activeBranchId', branchId)
    try {
      await api.patch('/branch-settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* ignore */ }
    finally {
      if (prev !== null) localStorage.setItem('activeBranchId', prev)
      else localStorage.removeItem('activeBranchId')
      setSaving(false)
    }
  }

  const field = (key: keyof BranchSettings) => ({
    value: String(settings[key] ?? ''),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setSettings(s => ({ ...s, [key]: e.target.value || null })),
  })

  const CURRENCIES = ['KZT', 'RUB', 'USD', 'EUR']
  const INTERVALS  = [15, 20, 30, 45, 60, 90]

  if (loading) return <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Загрузка...</div>

  return (
    <div>
      {/* Branch selector for owner/developer */}
      {isDeveloperOrOwner && branches.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Филиал</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} style={selectStyle}>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}{b.city ? ` (${b.city})` : ''}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 13 }}>
        <div>
          <label style={labelStyle}>Начало работы</label>
          <input type="time" style={inputStyle} {...field('work_time_start')} />
        </div>
        <div>
          <label style={labelStyle}>Конец работы</label>
          <input type="time" style={inputStyle} {...field('work_time_end')} />
        </div>
        <div>
          <label style={labelStyle}>Часовой пояс</label>
          <select style={selectStyle} {...field('timezone')}>
            {TIMEZONES_LIST.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Валюта</label>
          <select style={selectStyle} {...field('currency')}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Интервал записи (мин)</label>
          <select style={selectStyle} {...field('booking_interval_min')}>
            {INTERVALS.map(i => <option key={i} value={i}>{i} мин</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Макс. записей в день</label>
          <input type="number" min={1} max={999} style={inputStyle}
            value={settings.max_bookings_per_day ?? ''}
            onChange={e => setSettings(s => ({ ...s, max_bookings_per_day: e.target.value ? Number(e.target.value) : null }))} />
        </div>
        <div>
          <label style={labelStyle}>Контактный телефон</label>
          <input type="text" style={inputStyle} {...field('contact_phone')} placeholder="+7 700 000 0000" />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" style={inputStyle} {...field('contact_email')} placeholder="studio@example.com" />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Сайт</label>
          <input type="text" style={inputStyle} {...field('website')} placeholder="https://example.com" />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Адрес</label>
          <input type="text" style={inputStyle} {...field('address')} placeholder="г. Алматы, ул. Примерная, 1" />
        </div>
      </div>

      <button onClick={save} disabled={saving}
        style={{ height: 36, padding: '0 21px', background: saved ? '#02BDB6' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
        {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить'}
      </button>
    </div>
  )
}

// ─── AuditLogSection ─────────────────────────────────────────────────────────

interface AuditEntry {
  id: string
  entity_type: string | null
  entity_id: string | null
  action: string
  actor_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  create: '#02BDB6', update: '#8b5cf6', delete: '#ef4444',
  status_change: '#f59e0b', follow_up_reminder: '#3b82f6', deadline_reminder: '#f97316',
}

function AuditLogSection() {
  const [entries, setEntries]     = useState<AuditEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [entityType, setEntityType] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '150' })
      if (entityType) params.set('entity_type', entityType)
      const { data } = await api.get(`/audit-log?${params}`)
      setEntries(data ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [entityType])

  useEffect(() => { load() }, [load])

  const tdS: React.CSSProperties = { padding: '9px 12px', fontSize: 12, borderBottom: '1px solid var(--glass-border)', verticalAlign: 'middle' }

  const ENTITY_TYPES = ['client', 'lead', 'task', 'subscription', 'employee', 'shift', 'booking', 'warehouse_item', 'supplier_order']

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 13, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={entityType} onChange={e => setEntityType(e.target.value)}
          style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="">Все типы</option>
          {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          Обновить
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{entries.length} записей</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>Загрузка...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>Записей нет</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)' }}>
                {['Время', 'Тип', 'ID объекта', 'Действие', 'Актор'].map(h => (
                  <th key={h} style={{ ...tdS, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const color = ACTION_COLORS[e.action] ?? '#6b7280'
                const dt = new Date(e.created_at)
                const dateStr = dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
                const timeStr = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={tdS}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>{timeStr}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{dateStr}</div>
                    </td>
                    <td style={tdS}>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                        {e.entity_type ?? '—'}
                      </span>
                    </td>
                    <td style={{ ...tdS, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.entity_id ? e.entity_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td style={tdS}>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: color + '18', color }}>
                        {e.action}
                      </span>
                    </td>
                    <td style={{ ...tdS, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                      {e.actor_id ? e.actor_id.slice(0, 8) + '…' : 'system'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

type ManagementTab = 'general' | 'subscriptions' | 'catalog' | 'permissions' | 'users' | 'audit' | 'branch_settings'

export default function ManagementPage() {
  const { user } = useAuth()
  const perm = usePermissions()
  const isDeveloperOrOwner = user?.role === 'developer' || user?.role === 'owner'
  const [tab, setTab] = useState<ManagementTab>('general')

  const TABS: { id: ManagementTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general',       label: 'Общее',       icon: <Cpu size={14} strokeWidth={1.75} /> },
    { id: 'subscriptions', label: 'Абонементы',  icon: <CreditCard size={14} strokeWidth={1.75} /> },
    ...(isDeveloperOrOwner ? [{ id: 'catalog' as ManagementTab, label: 'Каталог', icon: <Package size={14} strokeWidth={1.75} /> }] : []),
    ...(perm.can('permissions', 'view') ? [{ id: 'permissions' as ManagementTab, label: 'Права доступа', icon: <Shield size={14} strokeWidth={1.75} /> }] : []),
    ...(user?.role === 'developer' ? [{ id: 'users' as ManagementTab, label: 'Пользователи', icon: <Users size={14} strokeWidth={1.75} /> }] : []),
    ...(isDeveloperOrOwner || user?.role === 'admin' ? [{ id: 'audit' as ManagementTab, label: 'Аудит', icon: <ClipboardList size={14} strokeWidth={1.75} /> }] : []),
    ...(isDeveloperOrOwner || user?.role === 'admin' ? [{ id: 'branch_settings' as ManagementTab, label: 'Настройки', icon: <Cpu size={14} strokeWidth={1.75} /> }] : []),
  ]

  return (
    <div>
      <div style={{ marginBottom: 21, maxWidth: 700 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Управление</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Оборудование, структура, абонементы, каталог</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 21, background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: 4, maxWidth: 700 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, background: tab === t.id ? 'var(--bg-elevated)' : 'transparent', color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)', justifyContent: 'center', transition: 'all 0.15s' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div style={{ maxWidth: 700 }}>
          <DevicesSection />
          <DepartmentsSection />
          <PositionsSection />
          {isDeveloperOrOwner && <BranchesSection />}
        </div>
      )}
      {tab === 'subscriptions' && <div style={{ maxWidth: 700 }}><SubscriptionTemplatesSection /><PromoCodesSection /></div>}
      {tab === 'catalog' && isDeveloperOrOwner && <div style={{ maxWidth: 700 }}><CatalogSection /></div>}
      {tab === 'permissions' && perm.can('permissions', 'view') && (
        <Section title="Матрица прав доступа" icon={<Shield size={15} strokeWidth={1.75} color="#02BDB6" />}>
          <PermissionsTab />
        </Section>
      )}
      {tab === 'users' && user?.role === 'developer' && (
        <Section title="Пользователи" icon={<Users size={15} strokeWidth={1.75} color="#02BDB6" />}>
          <UsersTab />
        </Section>
      )}
      {tab === 'audit' && (isDeveloperOrOwner || user?.role === 'admin') && (
        <Section title="Журнал аудита" icon={<ClipboardList size={15} strokeWidth={1.75} color="#02BDB6" />}>
          <AuditLogSection />
        </Section>
      )}
      {tab === 'branch_settings' && (isDeveloperOrOwner || user?.role === 'admin') && (
        <div style={{ maxWidth: 700 }}>
          <Section title="Настройки филиала" icon={<Cpu size={15} strokeWidth={1.75} color="#02BDB6" />}>
            <BranchSettingsSection />
          </Section>
        </div>
      )}
    </div>
  )
}
