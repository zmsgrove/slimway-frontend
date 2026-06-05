import { useState, useEffect } from 'react'
import { DollarSign, CheckCircle, Clock, X } from 'lucide-react'
import { PeriodFilter } from '../../components/ui/PeriodFilter'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import { employeesApi } from '../../api/employees.api'
import { usePermissions } from '../../hooks/usePermissions'
import type { Employee } from '../../types'
import { Skeleton } from '@/components/ui/skeleton'

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 13px',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, display: 'block',
}

// ─── SalaryEditModal ──────────────────────────────────────────────────────────

interface SalaryEditModalProps {
  employee: Employee
  onSave: (emp: Employee) => void
  onClose: () => void
}

function SalaryEditModal({ employee, onSave, onClose }: SalaryEditModalProps) {
  const [baseSalary,   setBaseSalary]   = useState(String(employee.base_salary   ?? ''))
  const [kpiAmount,    setKpiAmount]    = useState(String(employee.kpi_amount    ?? ''))
  const [salesPercent, setSalesPercent] = useState(String(employee.sales_percent ?? ''))
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await employeesApi.update(employee.id, {
        base_salary:   baseSalary   !== '' ? parseFloat(baseSalary)   : null,
        kpi_amount:    kpiAmount    !== '' ? parseFloat(kpiAmount)    : null,
        sales_percent: salesPercent !== '' ? parseFloat(salesPercent) : null,
      })
      onSave(updated)
    } catch {
      setError('Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  const totalFixed = (parseFloat(baseSalary || '0') || 0) + (parseFloat(kpiAmount || '0') || 0)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 400, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{employee.full_name}</div>
            {employee.position && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{employee.position}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={labelStyle}>Оклад (₸/мес)</label>
            <input style={inputStyle} type="number" min="0" step="1000"
              value={baseSalary} onChange={e => setBaseSalary(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={labelStyle}>KPI — фикс. бонус (₸/мес)</label>
            <input style={inputStyle} type="number" min="0" step="1000"
              value={kpiAmount} onChange={e => setKpiAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={labelStyle}>% от продаж</label>
            <input style={inputStyle} type="number" min="0" max="100" step="0.5"
              value={salesPercent} onChange={e => setSalesPercent(e.target.value)} placeholder="0" />
          </div>

          {totalFixed > 0 && (
            <div style={{ padding: '10px 13px', background: 'color-mix(in srgb, var(--accent) 8%, transparent)', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Расчётная зарплата (без % продаж)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{totalFixed.toLocaleString('ru-RU')} ₸</div>
            </div>
          )}

          {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', gap: 13, marginTop: 21 }}>
          <button onClick={() => void handleSave()} disabled={saving}
            style={{ flex: 1, height: 40, background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button onClick={onClose}
            style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  n != null && n > 0 ? n.toLocaleString('ru-RU') : '—'

export default function PayrollPage() {
  const { can } = usePermissions()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editEmp,   setEditEmp]   = useState<Employee | null>(null)

  const { period, customFrom, customTo, dateFromStr, dateToStr, setPeriod, remember, setRemember } = usePeriodFilter('payroll')

  const canEdit = can('employees', 'edit')

  useEffect(() => {
    setLoading(true)
    employeesApi.getAll({ from: dateFromStr, to: dateToStr })
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dateFromStr, dateToStr])

  const handleSaved = (updated: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e))
    setEditEmp(null)
  }

  const totalEstimated = (emp: Employee) => {
    const base  = emp.base_salary  ?? 0
    const kpi   = emp.kpi_amount   ?? 0
    return base + kpi
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: '0 0 21px' }}>Зарплата</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Зарплата</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {employees.length} сотрудников · Расчёт оплаты труда
          </p>
        </div>
        <PeriodFilter
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          remember={remember}
          onChange={setPeriod}
          onRememberChange={setRemember}
        />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)' }}>
              {['Сотрудник', 'Должность', 'Оклад', 'KPI бонус', '% продаж', 'Смен', 'Задач', 'Итого (фикс.)', ''].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '55px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Сотрудников нет</td>
              </tr>
            ) : employees.map((emp, i) => {
              const total = totalEstimated(emp)
              return (
                <tr key={emp.id} style={{ borderBottom: i < employees.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{emp.full_name}</div>
                    {emp.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.phone}</div>}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>{emp.position ?? '—'}</td>
                  <td style={{ padding: '13px 14px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                    {fmt(emp.base_salary)}{emp.base_salary ? ' ₸' : ''}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                    {fmt(emp.kpi_amount)}{emp.kpi_amount ? ' ₸' : ''}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {emp.sales_percent ? `${emp.sales_percent}%` : '—'}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <Clock size={12} color="var(--text-muted)" />
                      {emp.kpi?.shifts_completed ?? '—'}
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <CheckCircle size={12} color="var(--text-muted)" />
                      {emp.kpi?.tasks_done ?? '—'}
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13, fontWeight: 700, color: total > 0 ? '#10b981' : 'var(--text-muted)' }}>
                    {total > 0 ? `${total.toLocaleString('ru-RU')} ₸` : '—'}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    {canEdit && (
                      <button onClick={() => setEditEmp(emp)}
                        style={{ height: 30, padding: '0 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                        <DollarSign size={12} />Ставка
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editEmp && (
        <SalaryEditModal employee={editEmp} onSave={handleSaved} onClose={() => setEditEmp(null)} />
      )}
    </div>
  )
}
