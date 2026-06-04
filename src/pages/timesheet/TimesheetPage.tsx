import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import { CalendarCheck, RefreshCw, Download } from 'lucide-react'
import { format, getDaysInMonth, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

interface TimesheetEntry {
  id: string
  employee_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'partial' | 'pending'
  hours: number | null
  employees: { id: string; full_name: string; position: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  present: 'Присутствовал',
  absent:  'Отсутствовал',
  late:    'Опоздал',
  partial: 'Неполный день',
  pending: '—',
}

const STATUS_COLOR: Record<string, string> = {
  present: 'var(--accent)',
  absent:  '#ef4444',
  late:    '#f59e0b',
  partial: '#a78bfa',
  pending: 'var(--text-muted)',
}

const STATUS_BG: Record<string, string> = {
  present: 'color-mix(in srgb, var(--accent) 15%, transparent)',
  absent:  'rgba(239,68,68,0.15)',
  late:    'rgba(245,158,11,0.15)',
  partial: 'rgba(167,139,250,0.15)',
  pending: 'var(--bg-card)',
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function TimesheetPage() {
  const [month,      setMonth]      = useState(currentMonth())
  const [entries,    setEntries]    = useState<TimesheetEntry[]>([])
  const [loading,    setLoading]    = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const load = useCallback(async (m: string) => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<TimesheetEntry[]>('/timesheet', { params: { month: m } })
      setEntries(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка загрузки')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load(month) }, [month, load])

  const handleGenerate = async () => {
    if (!confirm(`Сформировать табель за ${month}? Существующие записи будут обновлены.`)) return
    setGenerating(true); setError(null)
    try {
      await api.post('/timesheet/generate', { month })
      await load(month)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка генерации')
    } finally { setGenerating(false) }
  }

  // Build grid: employees × days
  const daysInMonth = getDaysInMonth(parseISO(`${month}-01`))
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Gather unique employees
  const employeeMap = new Map<string, { id: string; full_name: string; position: string }>()
  for (const e of entries) {
    if (e.employees && !employeeMap.has(e.employee_id)) {
      employeeMap.set(e.employee_id, e.employees)
    }
  }
  const employees = Array.from(employeeMap.values())

  // Build lookup: employee_id → day → entry
  const lookup: Record<string, Record<number, TimesheetEntry>> = {}
  for (const e of entries) {
    const day = new Date(e.date).getDate()
    if (!lookup[e.employee_id]) lookup[e.employee_id] = {}
    lookup[e.employee_id][day] = e
  }

  const monthLabel = format(parseISO(`${month}-01`), 'LLLL yyyy', { locale: ru })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <CalendarCheck size={20} strokeWidth={1.75} color="var(--accent)" />
            <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Табель</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Учёт рабочего времени сотрудников</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{
              height: 36, padding: '0 10px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text)', fontSize: 13, cursor: 'pointer',
            }}
          />
          <button
            onClick={() => void handleGenerate()}
            disabled={generating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
              background: 'var(--accent)', border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 13, fontWeight: 500, cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} strokeWidth={2} style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }} />
            {generating ? 'Формирование...' : 'Сформировать табель'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 13 }}>Загрузка...</div>
      ) : employees.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
        }}>
          <CalendarCheck size={40} strokeWidth={1} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Данных за {monthLabel} нет
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Нажмите «Сформировать табель» чтобы создать записи из графика
          </div>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 13, marginBottom: 13, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_BG[k], border: `1px solid ${STATUS_COLOR[k]}44`, display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 2 }}>
                    Сотрудник
                  </th>
                  {days.map(d => (
                    <th key={d} style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500, minWidth: 32, borderBottom: '1px solid var(--border)' }}>
                      {d}
                    </th>
                  ))}
                  <th style={{ padding: '10px 10px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    Итого ч.
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const empEntries = lookup[emp.id] ?? {}
                  const totalHours = Object.values(empEntries).reduce((s, e) => s + (e.hours ?? 0), 0)
                  return (
                    <tr key={emp.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{
                        padding: '8px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)',
                        position: 'sticky', left: 0, background: idx % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-card)',
                        zIndex: 1,
                      }}>
                        <div style={{ fontWeight: 500, color: 'var(--text)' }}>{emp.full_name}</div>
                        {emp.position && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.position}</div>}
                      </td>
                      {days.map(d => {
                        const entry = empEntries[d]
                        const st = entry?.status ?? 'pending'
                        return (
                          <td key={d} style={{ padding: '4px 3px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                            <div
                              title={STATUS_LABEL[st]}
                              style={{
                                width: 26, height: 26, borderRadius: 6, margin: '0 auto',
                                background: STATUS_BG[st],
                                border: `1px solid ${STATUS_COLOR[st]}44`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, color: STATUS_COLOR[st], fontWeight: 600,
                              }}
                            >
                              {entry ? st.charAt(0).toUpperCase() : ''}
                            </div>
                          </td>
                        )
                      })}
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {totalHours > 0 ? totalHours.toFixed(1) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
            П — присутствовал · О — отсутствовал · З — опоздал · Н — неполный день
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
