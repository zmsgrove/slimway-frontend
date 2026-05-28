import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, AlertCircle, MapPin, Clock, CheckCircle, Plus } from 'lucide-react'
import { employeesApi } from '../../api/employees.api'
import { shiftsApi } from '../../api/shifts.api'
import { useAuth } from '../../hooks/useAuth'
import type { Employee, Shift } from '../../types'

// ─── helpers ────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function toISO(d: Date): string { return d.toISOString().slice(0, 10) }

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

function ft(t: string): string { return t.slice(0, 5) }

function fmtWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${monday.toLocaleDateString('ru-RU', opts)} — ${sunday.toLocaleDateString('ru-RU', { ...opts, year: 'numeric' })}`
}

function fmtTime(ts: string): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function getLocation(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { resolve('Геолокация недоступна'); return }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`)
          const data = await res.json() as { display_name?: string }
          resolve(data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        } catch {
          resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        }
      },
      () => reject(new Error('Не удалось определить местоположение'))
    )
  })
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#71717A',
  active:    '#10b981',
  completed: '#02BDB6',
}
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'По графику',
  active:    'На смене',
  completed: 'Завершена',
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 13px',
  background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
  borderRadius: 8, color: 'var(--text-primary)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

// ─── ShiftModal ──────────────────────────────────────────────────────────────

interface ShiftModalProps {
  employee: Employee
  date: string
  existing?: Shift
  onClose: () => void
  onSaved: (shift: Shift) => void
  onDeleted?: (id: string) => void
}

function ShiftModal({ employee, date, existing, onClose, onSaved, onDeleted }: ShiftModalProps) {
  const [timeStart, setTimeStart] = useState(existing ? ft(existing.time_start) : '09:00')
  const [timeEnd, setTimeEnd]     = useState(existing ? ft(existing.time_end) : '18:00')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      let shift: Shift
      if (existing) {
        shift = await shiftsApi.update(existing.id, { time_start: timeStart, time_end: timeEnd })
      } else {
        shift = await shiftsApi.create({ employee_id: employee.id, date, time_start: timeStart, time_end: timeEnd })
      }
      onSaved(shift)
    } catch {
      setError('Не удалось сохранить смену')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existing || !onDeleted) return
    setDeleting(true)
    try {
      await shiftsApi.delete(existing.id)
      onDeleted(existing.id)
    } catch {
      setError('Не удалось удалить смену')
    } finally {
      setDeleting(false)
    }
  }

  const dateLabel = new Date(date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            {existing ? 'Редактировать смену' : 'Назначить смену'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, marginBottom: 13, border: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{employee.full_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, textTransform: 'capitalize' }}>{dateLabel}</div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 21 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Начало</div>
            <input type="time" style={inputStyle} value={timeStart} onChange={e => setTimeStart(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Конец</div>
            <input type="time" style={inputStyle} value={timeEnd} onChange={e => setTimeEnd(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {existing && onDeleted && (
            <button onClick={() => void handleDelete()} disabled={deleting}
              style={{ height: 38, padding: '0 13px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
              Удалить
            </button>
          )}
          <button onClick={() => void handleSave()} disabled={saving}
            style={{ flex: 1, height: 38, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Сохранение...' : existing ? 'Сохранить' : 'Назначить'}
          </button>
          <button onClick={onClose} style={{ height: 38, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
        </div>
      </div>
    </div>
  )
}

// ─── ScheduleWorkPage ────────────────────────────────────────────────────────

export default function ScheduleWorkPage() {
  const { user } = useAuth()
  const [monday, setMonday]         = useState(() => getMonday(new Date()))
  const [employees, setEmployees]   = useState<Employee[]>([])
  const [shifts, setShifts]         = useState<Shift[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [shiftModal, setShiftModal] = useState<{ employee: Employee; date: string; existing?: Shift } | null>(null)
  const [checkinId, setCheckinId]   = useState<string | null>(null)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [locLoading, setLocLoading] = useState<string | null>(null)
  const notifTimer = useRef<ReturnType<typeof setTimeout> | undefined>()
  const [notification, setNotification] = useState<string | null>(null)

  const canManage = user?.role === 'owner' || user?.role === 'franchisee' || user?.role === 'admin'
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const weekStart = toISO(monday)
  const weekEnd   = toISO(addDays(monday, 6))
  const todayISO  = toISO(new Date())

  useEffect(() => () => clearTimeout(notifTimer.current), [])

  const showNotif = (msg: string) => {
    setNotification(msg)
    clearTimeout(notifTimer.current)
    notifTimer.current = setTimeout(() => setNotification(null), 3000)
  }

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [emps, sh] = await Promise.all([
        employeesApi.getAll(),
        shiftsApi.getWeek(weekStart, weekEnd),
      ])
      setEmployees(emps)
      setShifts(sh)
    } catch {
      setError('Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }, [weekStart, weekEnd])

  useEffect(() => { void loadData() }, [loadData])

  const prevWeek = () => setMonday(m => addDays(m, -7))
  const nextWeek = () => setMonday(m => addDays(m,  7))

  // Map: "employee_id:date" → Shift
  const shiftMap = new Map<string, Shift>()
  for (const s of shifts) shiftMap.set(`${s.employee_id}:${s.date}`, s)

  // Today's shifts
  const todayShifts = shifts.filter(s => s.date === todayISO)

  const handleShiftSaved = (shift: Shift) => {
    setShifts(prev => {
      const idx = prev.findIndex(s => s.id === shift.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = shift; return next }
      return [...prev, shift]
    })
    setShiftModal(null)
  }

  const handleShiftDeleted = (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id))
    setShiftModal(null)
  }

  const handleCheckin = async (shift: Shift) => {
    setLocLoading(shift.id)
    try {
      let location: string | undefined
      try { location = await getLocation() } catch { /* no location */ }
      await shiftsApi.checkin(shift.id, { location, is_own_shift: true })
      showNotif(`${shift.employees?.full_name ?? 'Сотрудник'} отметился на смене`)
      await loadData()
    } catch {
      showNotif('Ошибка при отметке')
    } finally {
      setLocLoading(null)
    }
  }

  const handleCheckout = async (shift: Shift) => {
    setCheckoutId(shift.id)
    try {
      await shiftsApi.checkout(shift.id)
      showNotif(`Смена завершена`)
      await loadData()
    } catch {
      showNotif('Ошибка при завершении смены')
    } finally {
      setCheckoutId(null)
    }
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>График смен</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Расписание и учёт рабочего времени</p>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#10b981' }}>
          <CheckCircle size={13} />{notification}
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
          <AlertCircle size={13} />{error}
        </div>
      )}

      {/* Today panel */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21, marginBottom: 13 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 13 }}>
          Сегодня — {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        {todayShifts.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>На сегодня смены не назначены</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayShifts.map(shift => {
              const checkin   = shift.shift_checkins?.find(c => c.checkin_at)
              const isActive  = shift.status === 'active'
              const isDone    = shift.status === 'completed'
              const sColor    = STATUS_COLOR[shift.status]
              const isLocLoad = locLoading === shift.id
              const isCoLoad  = checkoutId === shift.id
              return (
                <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 13, border: `1px solid ${sColor}33`, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {shift.employees?.full_name ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {ft(shift.time_start)} — {ft(shift.time_end)}
                    </div>
                    {checkin?.location && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={10} />{checkin.location.slice(0, 60)}...
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: sColor + '18', color: sColor, border: `1px solid ${sColor}33`, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                      {STATUS_LABEL[shift.status]}
                    </span>
                    {isDone ? (
                      <div style={{ fontSize: 12, color: '#02BDB6' }}>
                        {checkin?.checkin_at ? fmtTime(checkin.checkin_at) : ''} — {checkin?.checkout_at ? fmtTime(checkin.checkout_at) : ''}
                      </div>
                    ) : isActive ? (
                      <button onClick={() => void handleCheckout(shift)} disabled={isCoLoad}
                        style={{ height: 30, padding: '0 12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: isCoLoad ? 'not-allowed' : 'pointer', opacity: isCoLoad ? 0.6 : 1 }}>
                        {isCoLoad ? '...' : 'Завершить'}
                      </button>
                    ) : (
                      <button onClick={() => void handleCheckin(shift)} disabled={isLocLoad}
                        style={{ height: 30, padding: '0 12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontSize: 12, fontWeight: 600, cursor: isLocLoad ? 'not-allowed' : 'pointer', opacity: isLocLoad ? 0.6 : 1 }}>
                        {isLocLoad ? 'Геолокация...' : 'Отметиться'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: '8px 13px', backdropFilter: 'blur(12px)' }}>
        <button onClick={prevWeek} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{fmtWeekRange(monday)}</span>
        <button onClick={nextWeek} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
      ) : employees.length === 0 ? (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, textAlign: 'center' }}>
          <Clock size={28} strokeWidth={1.5} color="var(--text-muted)" />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Нет сотрудников</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Добавьте сотрудников на странице «Сотрудники»</div>
        </div>
      ) : (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 13px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--glass-border)', whiteSpace: 'nowrap', minWidth: 160, position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 2 }}>
                    Сотрудник
                  </th>
                  {weekDays.map((d, i) => {
                    const iso    = toISO(d)
                    const isToday = iso === todayISO
                    const isWknd  = i >= 5
                    return (
                      <th key={iso} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: isToday ? '#02BDB6' : isWknd ? 'var(--text-muted)' : 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)', borderLeft: '1px solid var(--glass-border)', background: isToday ? 'rgba(2,189,182,0.08)' : isWknd ? 'rgba(255,255,255,0.02)' : 'transparent', minWidth: 80 }}>
                        <div>{WEEKDAYS[i]}</div>
                        <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? '#02BDB6' : 'var(--text-primary)' }}>
                          {d.getDate()}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    {/* Employee name cell */}
                    <td style={{ padding: '10px 13px', position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 1, borderRight: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{emp.full_name}</div>
                      {emp.position && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.position}</div>}
                    </td>

                    {/* Day cells */}
                    {weekDays.map((d, i) => {
                      const iso    = toISO(d)
                      const shift  = shiftMap.get(`${emp.id}:${iso}`)
                      const isToday = iso === todayISO
                      const isWknd  = i >= 5
                      const sColor  = shift ? STATUS_COLOR[shift.status] : null

                      return (
                        <td
                          key={iso}
                          onClick={() => canManage && setShiftModal({ employee: emp, date: iso, existing: shift })}
                          title={canManage ? (shift ? 'Редактировать смену' : 'Назначить смену') : undefined}
                          style={{
                            padding: '6px 4px',
                            verticalAlign: 'top',
                            textAlign: 'center',
                            borderLeft: '1px solid var(--glass-border)',
                            background: isToday ? 'rgba(2,189,182,0.05)' : isWknd ? 'rgba(255,255,255,0.01)' : 'transparent',
                            cursor: canManage ? 'pointer' : 'default',
                            minWidth: 80,
                            height: 56,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (canManage) (e.currentTarget as HTMLTableCellElement).style.background = isToday ? 'rgba(2,189,182,0.10)' : 'rgba(255,255,255,0.04)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLTableCellElement).style.background = isToday ? 'rgba(2,189,182,0.05)' : isWknd ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                        >
                          {shift ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: sColor + '15', border: `1px solid ${sColor}30`, borderRadius: 8, padding: '4px 8px', minWidth: 58 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: sColor! }}>{ft(shift.time_start)}</div>
                              <div style={{ fontSize: 10, color: sColor!, opacity: 0.8 }}>{ft(shift.time_end)}</div>
                              {shift.status !== 'scheduled' && (
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: sColor!, marginTop: 2 }} />
                              )}
                            </div>
                          ) : canManage ? (
                            <div style={{ color: 'var(--glass-border)', fontSize: 18, lineHeight: '44px' }}>
                              <Plus size={14} strokeWidth={2} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                            </div>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 13, marginTop: 13, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[k] + '30', border: `1px solid ${STATUS_COLOR[k]}60` }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Shift modal */}
      {shiftModal && (
        <ShiftModal
          employee={shiftModal.employee}
          date={shiftModal.date}
          existing={shiftModal.existing}
          onClose={() => setShiftModal(null)}
          onSaved={handleShiftSaved}
          onDeleted={shiftModal.existing ? handleShiftDeleted : undefined}
        />
      )}
    </div>
  )
}
