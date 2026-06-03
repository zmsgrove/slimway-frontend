import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, AlertCircle, MapPin, Clock, CheckCircle, Plus, Zap, Users } from 'lucide-react'
import { employeesApi } from '../../api/employees.api'
import { shiftsApi } from '../../api/shifts.api'
import { useAuth } from '../../hooks/useAuth'
import type { Employee, Shift } from '../../types'

// ─── helpers ────────────────────────────────────────────────────────────────

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function toISO(d: Date): string { return d.toISOString().slice(0, 10) }

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day  = date.getDay()
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

function fmtRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('ru-RU', opts)} — ${end.toLocaleDateString('ru-RU', { ...opts, year: 'numeric' })}`
}

function fmtTime(ts: string): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isWeekend(d: Date): boolean { return d.getDay() === 0 || d.getDay() === 6 }

function weekdayIndex(d: Date): number { const n = d.getDay(); return n === 0 ? 6 : n - 1 }

function isDayOffShift(s: Shift): boolean {
  return s.time_start === '00:00:00' || s.time_start === '00:00'
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
  scheduled: '#10b981',
  active:    '#02BDB6',
  completed: '#71717A',
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
  const isDayOff  = existing ? isDayOffShift(existing) : false
  const [timeStart, setTimeStart] = useState(existing && !isDayOff ? ft(existing.time_start) : '09:00')
  const [timeEnd, setTimeEnd]     = useState(existing && !isDayOff ? ft(existing.time_end)   : '18:00')
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

  const handleDayOff = async () => {
    setSaving(true); setError(null)
    try {
      let shift: Shift
      if (existing) {
        shift = await shiftsApi.update(existing.id, { time_start: '00:00', time_end: '00:00' })
      } else {
        shift = await shiftsApi.create({ employee_id: employee.id, date, time_start: '00:00', time_end: '00:00' })
      }
      onSaved(shift)
    } catch {
      setError('Не удалось сохранить выходной')
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
      setError('Не удалось удалить')
    } finally {
      setDeleting(false)
    }
  }

  const dateLabel   = new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  const initials    = employee.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const colors      = ['#02BDB6', '#263CD9', '#8b5cf6', '#f59e0b', '#10b981']
  const avatarColor = colors[employee.full_name.charCodeAt(0) % colors.length]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 420, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: avatarColor + '20', border: `2px solid ${avatarColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: avatarColor, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {existing ? (isDayOff ? 'Выходной день' : 'Редактировать смену') : 'Назначить смену'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{employee.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, textTransform: 'capitalize' }}>{dateLabel}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 21, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        {isDayOff ? (
          <div style={{ textAlign: 'center', padding: '13px 0 21px', fontSize: 13, color: 'var(--text-muted)' }}>
            День отмечен как выходной
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 21 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Начало</div>
              <input type="time" style={inputStyle} value={timeStart} onChange={e => setTimeStart(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Конец</div>
              <input type="time" style={inputStyle} value={timeEnd} onChange={e => setTimeEnd(e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, paddingTop: 21, borderTop: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
          {existing && onDeleted && (
            <button onClick={() => void handleDelete()} disabled={deleting}
              style={{ height: 36, padding: '0 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 12, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
              {deleting ? '...' : 'Очистить'}
            </button>
          )}
          {!isDayOff && (
            <button onClick={() => void handleDayOff()} disabled={saving}
              style={{ height: 36, padding: '0 13px', background: 'rgba(113,113,122,0.08)', border: '1px solid rgba(113,113,122,0.25)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              Выходной
            </button>
          )}
          {isDayOff ? (
            <button onClick={() => void handleSave()} disabled={saving}
              style={{ flex: 1, height: 36, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '...' : 'Назначить смену'}
            </button>
          ) : (
            <button onClick={() => void handleSave()} disabled={saving}
              style={{ flex: 1, height: 36, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, minWidth: 90 }}>
              {saving ? '...' : existing ? 'Сохранить' : 'Назначить'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── BulkAssignModal ─────────────────────────────────────────────────────────

type RepeatType = 'weekdays' | 'daily' | 'every-n'

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface BulkAssignModalProps {
  employees: Employee[]
  onClose: () => void
  onDone: (shifts: Shift[]) => void
}

function BulkAssignModal({ employees, onClose, onDone }: BulkAssignModalProps) {
  const todayISO = toISO(new Date())
  const [empId,     setEmpId]     = useState('')
  const [timeStart, setTimeStart] = useState('09:00')
  const [timeEnd,   setTimeEnd]   = useState('18:00')
  const [shiftType, setShiftType] = useState<'shift' | 'dayoff'>('shift')
  const [repeat,    setRepeat]    = useState<RepeatType>('weekdays')
  const [everyN,    setEveryN]    = useState(2)
  const [workDays,  setWorkDays]  = useState(2)
  const [offDays,   setOffDays]   = useState(2)
  const [weekdaysMask, setWeekdaysMask] = useState<boolean[]>([true, true, true, true, true, false, false])
  const [dateFrom,  setDateFrom]  = useState(todayISO)
  const [dateTo,    setDateTo]    = useState(toISO(addDays(new Date(), 13)))
  const [saving,    setSaving]    = useState(false)
  const [clearing,  setClearing]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const toggleWeekday = (idx: number) => {
    setWeekdaysMask(prev => { const next = [...prev]; next[idx] = !next[idx]; return next })
  }

  // Генерация дат для «будние» / «каждый день» / «каждые N»
  const generateDatesSimple = (): string[] => {
    const from = new Date(dateFrom + 'T00:00:00')
    const to   = new Date(dateTo   + 'T00:00:00')
    const dates: string[] = []
    let cur = new Date(from), idx = 0
    while (cur <= to) {
      const dow = weekdayIndex(cur) // 0=Пн … 6=Вс
      if (repeat === 'weekdays') {
        if (weekdaysMask[dow]) dates.push(toISO(cur))
      } else if (repeat === 'daily') {
        dates.push(toISO(cur))
      } else if (repeat === 'every-n') {
        if (idx % everyN === 0) dates.push(toISO(cur))
      }
      cur = addDays(cur, 1); idx++
    }
    return dates
  }

  // Генерация для режима чередования: workDays рабочих → offDays выходных
  const generateDatesAlternating = (): Array<{ date: string; isWork: boolean }> => {
    const from = new Date(dateFrom + 'T00:00:00')
    const to   = new Date(dateTo   + 'T00:00:00')
    const result: Array<{ date: string; isWork: boolean }> = []
    let cur = new Date(from), phase = 0, phaseDay = 0
    while (cur <= to) {
      const isWork = phase === 0
      result.push({ date: toISO(cur), isWork })
      phaseDay++
      if (isWork && phaseDay >= workDays) { phase = 1; phaseDay = 0 }
      else if (!isWork && phaseDay >= offDays) { phase = 0; phaseDay = 0 }
      cur = addDays(cur, 1)
    }
    return result
  }

  const empSelected = empId !== ''
  const empList = empSelected ? employees.filter(e => e.id === empId) : employees

  const preview = (() => {
    if (repeat === 'every-n' && shiftType === 'shift') {
      const alt = generateDatesAlternating()
      const workCount = alt.filter(d => d.isWork).length
      const offCount  = alt.filter(d => !d.isWork).length
      return `${workCount} раб. / ${offCount} вых. × ${empList.length} сотр. = ${alt.length * empList.length} записей`
    }
    const dates = generateDatesSimple()
    const total = dates.length * empList.length
    return `${dates.length} дн. × ${empList.length} сотр. = ${total} смен`
  })()

  const handleApply = async () => {
    setSaving(true); setError(null)
    try {
      let payload: Array<{ employee_id: string; date: string; time_start: string; time_end: string; status?: string }>

      if (repeat === 'every-n' && shiftType === 'shift') {
        const alt = generateDatesAlternating()
        if (alt.length === 0) { setError('Нет дат для назначения'); setSaving(false); return }
        payload = empList.flatMap(emp =>
          alt.map(({ date, isWork }) => ({
            employee_id: emp.id,
            date,
            time_start: isWork ? timeStart : '00:00',
            time_end:   isWork ? timeEnd   : '00:00',
            status: 'scheduled',
          }))
        )
      } else {
        const dates = generateDatesSimple()
        if (dates.length === 0) { setError('Нет дат для назначения'); setSaving(false); return }
        const ts = shiftType === 'dayoff' ? '00:00' : timeStart
        const te = shiftType === 'dayoff' ? '00:00' : timeEnd
        payload = empList.flatMap(emp =>
          dates.map(date => ({ employee_id: emp.id, date, time_start: ts, time_end: te, status: 'scheduled' }))
        )
      }

      if (payload.length > 500) { setError('Слишком много смен (макс 500)'); setSaving(false); return }

      const created = await shiftsApi.bulkCreate(payload)
      onDone(created)
    } catch {
      setError('Не удалось создать смены')
    } finally {
      setSaving(false)
    }
  }

  const handleClearShifts = async () => {
    if (!empId) return
    setClearing(true)
    try {
      await shiftsApi.bulkDelete({ employee_id: empId, date_from: dateFrom, date_end: dateTo })
      setConfirmClear(false)
    } catch {
      setError('Не удалось удалить смены')
    } finally {
      setClearing(false)
    }
  }

  const selectedEmp = employees.find(e => e.id === empId)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(2,189,182,0.12)', border: '1px solid rgba(2,189,182,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#02BDB6" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Быстрое назначение</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Массовое создание смен</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        {/* Диалог подтверждения очистки */}
        {confirmClear && selectedEmp && (
          <div style={{ padding: 13, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, marginBottom: 13 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
              Удалить все смены <strong>{selectedEmp.full_name}</strong> с <strong>{dateFrom}</strong> по <strong>{dateTo}</strong>?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => void handleClearShifts()} disabled={clearing}
                style={{ height: 32, padding: '0 13px', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: clearing ? 'not-allowed' : 'pointer', opacity: clearing ? 0.6 : 1 }}>
                {clearing ? 'Удаление...' : 'Удалить'}
              </button>
              <button onClick={() => setConfirmClear(false)} style={{ height: 32, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>Отмена</button>
            </div>
          </div>
        )}

        {/* Сотрудник */}
        <div style={{ marginBottom: 21 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={11} />Сотрудник
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...inputStyle, cursor: 'pointer', flex: 1 }} value={empId} onChange={e => setEmpId(e.target.value)}>
              <option value="">Все сотрудники</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
            {empSelected && dateFrom && dateTo && (
              <button onClick={() => setConfirmClear(true)}
                style={{ height: 36, padding: '0 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 12, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                Очистить смены
              </button>
            )}
          </div>
        </div>

        {/* Тип */}
        <div style={{ marginBottom: 21, paddingTop: 21, borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Тип</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['shift', 'dayoff'] as const).map(t => (
              <button key={t} onClick={() => setShiftType(t)}
                style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                  background: shiftType === t ? (t === 'dayoff' ? 'rgba(113,113,122,0.15)' : 'rgba(2,189,182,0.12)') : 'transparent',
                  borderColor: shiftType === t ? (t === 'dayoff' ? 'rgba(113,113,122,0.4)' : 'rgba(2,189,182,0.4)') : 'var(--glass-border)',
                  color: shiftType === t ? (t === 'dayoff' ? 'var(--text-secondary)' : '#02BDB6') : 'var(--text-muted)',
                }}>
                {t === 'shift' ? 'Смена' : 'Выходной'}
              </button>
            ))}
          </div>
        </div>

        {/* Время (только для смен) */}
        {shiftType === 'shift' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 21 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Начало</div>
              <input type="time" style={inputStyle} value={timeStart} onChange={e => setTimeStart(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Конец</div>
              <input type="time" style={inputStyle} value={timeEnd} onChange={e => setTimeEnd(e.target.value)} />
            </div>
          </div>
        )}

        {/* Повторение */}
        <div style={{ marginBottom: 21, paddingTop: 21, borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Режим</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['weekdays', 'daily', 'every-n'] as RepeatType[]).map(r => (
              <button key={r} onClick={() => setRepeat(r)}
                style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                  background: repeat === r ? 'rgba(2,189,182,0.08)' : 'transparent',
                  borderColor: repeat === r ? 'rgba(2,189,182,0.35)' : 'var(--glass-border)',
                  color: repeat === r ? '#02BDB6' : 'var(--text-muted)',
                }}>
                {r === 'weekdays' ? 'Будние' : r === 'daily' ? 'Каждый день' : 'Каждые N'}
              </button>
            ))}
          </div>

          {/* Будние — 7 чекбоксов */}
          {repeat === 'weekdays' && (
            <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
              {WEEKDAY_LABELS.map((label, idx) => (
                <button key={idx} onClick={() => toggleWeekday(idx)}
                  style={{ flex: 1, height: 32, borderRadius: 7, border: '1px solid', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                    background: weekdaysMask[idx] ? 'rgba(2,189,182,0.12)' : 'transparent',
                    borderColor: weekdaysMask[idx] ? 'rgba(2,189,182,0.4)' : 'var(--glass-border)',
                    color: weekdaysMask[idx] ? '#02BDB6' : 'var(--text-muted)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Каждые N — обычное поле */}
          {repeat === 'every-n' && shiftType !== 'shift' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Каждые</span>
              <input type="number" min={1} max={30} style={{ ...inputStyle, width: 72 }} value={everyN}
                onChange={e => setEveryN(Math.max(1, parseInt(e.target.value) || 1))} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>дней</span>
            </div>
          )}

          {/* Каждые N + смена → чередование */}
          {repeat === 'every-n' && shiftType === 'shift' && (
            <div style={{ marginTop: 10, padding: 10, background: 'rgba(2,189,182,0.06)', border: '1px solid rgba(2,189,182,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>График чередования</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Рабочих дней</div>
                  <input type="number" min={1} max={30} style={{ ...inputStyle, height: 32 }} value={workDays}
                    onChange={e => setWorkDays(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Выходных дней</div>
                  <input type="number" min={1} max={30} style={{ ...inputStyle, height: 32 }} value={offDays}
                    onChange={e => setOffDays(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Период */}
        <div style={{ marginBottom: 21, paddingTop: 21, borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Период</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>С</div>
              <input type="date" style={inputStyle} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>По</div>
              <input type="date" style={inputStyle} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>{preview}</div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 13 }}>
          <button onClick={() => void handleApply()} disabled={saving}
            style={{ flex: 1, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Создание...' : 'Применить'}
          </button>
          <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ScheduleWorkPage ────────────────────────────────────────────────────────

export default function ScheduleWorkPage() {
  const { user } = useAuth()
  const [monday, setMonday]              = useState(() => getMonday(new Date()))
  const [employees, setEmployees]        = useState<Employee[]>([])
  const [shifts, setShifts]             = useState<Shift[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [shiftModal, setShiftModal]     = useState<{ employee: Employee; date: string; existing?: Shift } | null>(null)
  const [bulkModal, setBulkModal]       = useState(false)
  const [checkoutId, setCheckoutId]     = useState<string | null>(null)
  const [locLoading, setLocLoading]     = useState<string | null>(null)
  const notifTimer = useRef<ReturnType<typeof setTimeout> | undefined>()
  const [notification, setNotification] = useState<string | null>(null)
  const [visibleDays, setVisibleDays]   = useState(14)
  const gridContainerRef = useRef<HTMLDivElement>(null)

  const canManage = user?.role === 'developer' || user?.role === 'owner' || user?.role === 'franchisee' || user?.role === 'admin'

  const twoWeekDays = Array.from({ length: visibleDays }, (_, i) => addDays(monday, i))
  const weekStart   = toISO(monday)
  const weekEnd     = toISO(addDays(monday, visibleDays - 1))
  const todayISO    = toISO(new Date())

  useEffect(() => () => clearTimeout(notifTimer.current), [])

  useEffect(() => {
    const el = gridContainerRef.current
    if (!el) return
    const calc = () => {
      const days = Math.min(60, Math.max(7, Math.floor(el.clientWidth / 52)))
      setVisibleDays(days)
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  const shiftMap = new Map<string, Shift>()
  for (const s of shifts) shiftMap.set(`${s.employee_id}:${s.date}`, s)

  const todayShifts = shifts.filter(s => s.date === todayISO && !isDayOffShift(s))

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

  const handleBulkDone = (created: Shift[]) => {
    setShifts(prev => {
      const next = [...prev]
      for (const s of created) {
        const idx = next.findIndex(x => x.id === s.id)
        if (idx >= 0) next[idx] = s; else next.push(s)
      }
      return next
    })
    setBulkModal(false)
    showNotif(`Создано ${created.length} смен`)
  }

  const handleCheckin = async (shift: Shift) => {
    setLocLoading(shift.id)
    try {
      let location: string | undefined
      try { location = await getLocation() } catch { /* skip */ }
      await shiftsApi.checkin(shift.id, { location, checkin_type: 'regular' })
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
      showNotif('Смена завершена')
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, flexWrap: 'wrap', gap: 13 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>График смен</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Расписание и учёт рабочего времени</p>
        </div>
        {canManage && (
          <button onClick={() => setBulkModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            <Zap size={14} />Быстрое назначение
          </button>
        )}
      </div>

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
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />{ft(shift.time_start)} — {ft(shift.time_end)}
                    </div>
                    {checkin?.location && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={10} />{checkin.location.slice(0, 60)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: sColor + '18', color: sColor, border: `1px solid ${sColor}33`, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                      {STATUS_LABEL[shift.status]}
                    </span>
                    {isDone ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {checkin?.checkin_at ? fmtTime(checkin.checkin_at) : ''}{checkin?.checkout_at ? ` — ${fmtTime(checkin.checkout_at)}` : ''}
                      </div>
                    ) : isActive ? (
                      <button onClick={() => void handleCheckout(shift)} disabled={isCoLoad}
                        style={{ height: 28, padding: '0 11px', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: isCoLoad ? 'not-allowed' : 'pointer', opacity: isCoLoad ? 0.6 : 1 }}>
                        {isCoLoad ? '...' : 'Завершить'}
                      </button>
                    ) : (
                      <button onClick={() => void handleCheckin(shift)} disabled={isLocLoad}
                        style={{ height: 28, padding: '0 11px', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 11, fontWeight: 600, cursor: isLocLoad ? 'not-allowed' : 'pointer', opacity: isLocLoad ? 0.6 : 1 }}>
                        {isLocLoad ? 'Геолок...' : 'Отметиться'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Period navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: '8px 13px', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => setMonday(m => addDays(m, -visibleDays))}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          {fmtRange(monday, addDays(monday, visibleDays - 1))}
        </span>
        <button onClick={() => setMonday(m => addDays(m, visibleDays))}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
          <div ref={gridContainerRef} style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: 160 + visibleDays * 52 }}>
              <colgroup>
                <col style={{ width: 160, minWidth: 160 }} />
                {twoWeekDays.map((_, i) => <col key={i} />)}
              </colgroup>
              <thead>
                <tr>
                  <th style={{ padding: '10px 13px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--glass-border)', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 2 }}>
                    Сотрудник
                  </th>
                  {twoWeekDays.map(d => {
                    const iso     = toISO(d)
                    const isToday = iso === todayISO
                    const wknd    = isWeekend(d)
                    const wIdx    = weekdayIndex(d)
                    return (
                      <th key={iso} style={{ padding: '5px 3px', textAlign: 'center', borderBottom: '1px solid var(--glass-border)', borderLeft: '1px solid var(--glass-border)', background: isToday ? 'rgba(2,189,182,0.10)' : wknd ? 'rgba(255,255,255,0.015)' : 'transparent', overflow: 'hidden' }}>
                        <div style={{ fontSize: 10, fontWeight: 500, color: isToday ? '#02BDB6' : wknd ? 'rgba(255,255,255,0.2)' : 'var(--text-muted)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                          {WEEKDAYS_SHORT[wIdx]}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? '#02BDB6' : wknd ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1.3 }}>
                          {d.getDate()}
                        </div>
                        <div style={{ fontSize: 9, color: isToday ? 'rgba(2,189,182,0.7)' : 'var(--text-muted)', lineHeight: 1.2, opacity: 0.8, whiteSpace: 'nowrap' }}>
                          {d.toLocaleDateString('ru-RU', { month: 'short' }).replace(/\./g, '')}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '8px 13px', position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 1, borderRight: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 135 }}>{emp.full_name}</div>
                      {emp.position && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{emp.position}</div>}
                    </td>
                    {twoWeekDays.map(d => {
                      const iso      = toISO(d)
                      const shift    = shiftMap.get(`${emp.id}:${iso}`)
                      const isToday  = iso === todayISO
                      const wknd     = isWeekend(d)
                      const dayOff   = shift ? isDayOffShift(shift) : false
                      const isActive = shift?.status === 'active'

                      return (
                        <td
                          key={iso}
                          onClick={() => canManage && setShiftModal({ employee: emp, date: iso, existing: shift })}
                          style={{
                            padding: '3px 4px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            borderLeft: '1px solid var(--glass-border)',
                            background: isToday ? 'rgba(2,189,182,0.05)' : wknd ? 'rgba(255,255,255,0.01)' : 'transparent',
                            cursor: canManage ? 'pointer' : 'default',
                            height: 50,
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => { if (canManage) (e.currentTarget as HTMLTableCellElement).style.background = isToday ? 'rgba(2,189,182,0.10)' : 'rgba(255,255,255,0.04)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLTableCellElement).style.background = isToday ? 'rgba(2,189,182,0.05)' : wknd ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                        >
                          {dayOff ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, width: 42, height: 36, fontSize: 9, fontWeight: 700, color: '#EF4444', letterSpacing: 0.4 }}>
                              ВЫХ
                            </div>
                          ) : shift ? (
                            <div className={isActive ? 'shift-active-pulse' : undefined} style={{
                              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              background: isActive ? 'rgba(2,189,182,0.15)' : 'rgba(16,185,129,0.12)',
                              border: `1px solid ${isActive ? 'rgba(2,189,182,0.45)' : 'rgba(16,185,129,0.3)'}`,
                              borderRadius: 6, width: 42, height: 36,
                            }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: isActive ? '#02BDB6' : '#10b981', lineHeight: 1.3 }}>{ft(shift.time_start)}</div>
                              <div style={{ fontSize: 9, color: isActive ? 'rgba(2,189,182,0.65)' : 'rgba(16,185,129,0.65)', lineHeight: 1.3 }}>{ft(shift.time_end)}</div>
                            </div>
                          ) : canManage ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 36 }}>
                              <Plus size={12} strokeWidth={2} color="var(--text-muted)" style={{ opacity: 0.2 }} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 26, height: 14, borderRadius: 4, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Смена</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 26, height: 14, borderRadius: 4, background: 'rgba(2,189,182,0.15)', border: '1px solid rgba(2,189,182,0.45)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>На смене</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 26, height: 14, borderRadius: 4, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Выходной</span>
        </div>
      </div>

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

      {bulkModal && (
        <BulkAssignModal
          employees={employees}
          onClose={() => setBulkModal(false)}
          onDone={handleBulkDone}
        />
      )}
    </div>
  )
}
