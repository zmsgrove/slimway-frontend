import React, { useState, useEffect } from 'react'
import { Cpu, Plus, Trash2, AlertCircle, Building2, Briefcase, LayoutGrid } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { Device, DeviceType, DeviceGroup, DeviceStatus, Department, Position } from '../../types'
import { devicesApi } from '../../api/devices.api'
import { branchesApi, type BranchRaw } from '../../api/branches.api'
import { departmentsApi, positionsApi } from '../../api/departments.api'

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

// ─── constants ─────────────────────────────────────────────────────────────────

const DEVICE_TYPES: { value: DeviceType; label: string }[] = [
  { value: 'vacuactiv',  label: 'VacuActiv'  },
  { value: 'rollshape',  label: 'RollShape'  },
  { value: 'infrastep',  label: 'InfraStep'  },
  { value: 'infrashape', label: 'InfraShape' },
]

const STATUS_COLORS: Record<DeviceStatus, string> = {
  active:      '#02BDB6',
  maintenance: '#f59e0b',
  disabled:    '#71717A',
}
const STATUS_LABELS: Record<DeviceStatus, string> = {
  active:      'Активен',
  maintenance: 'Обслуживание',
  disabled:    'Отключён',
}

// ─── DevicesSection ─────────────────────────────────────────────────────────────

interface AddDeviceForm { type: DeviceType; number: string; device_group: DeviceGroup }

function DevicesSection() {
  const [devices,   setDevices]   = useState<Device[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<AddDeviceForm>({ type: 'vacuactiv', number: '', device_group: 'A' })

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
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Тип</div>
                <select style={selectStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DeviceType }))}>
                  {DEVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Номер</div>
                <input style={inputStyle} placeholder="01" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Группа</div>
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
              <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Название *</div><input style={inputStyle} placeholder="Главный офис" value={name} onChange={e => setName(e.target.value)} /></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Город</div><input style={inputStyle} placeholder="Алматы" value={city} onChange={e => setCity(e.target.value)} /></div>
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

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ManagementPage() {
  const { user } = useAuth()
  const isDeveloperOrOwner = user?.role === 'developer' || user?.role === 'owner'

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Управление</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Оборудование, структура, филиалы</p>
      </div>

      <DevicesSection />
      <DepartmentsSection />
      <PositionsSection />
      {isDeveloperOrOwner && <BranchesSection />}
    </div>
  )
}
