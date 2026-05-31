import { useState, useEffect } from 'react'
import { DollarSign, CheckCircle, Clock, X, Check } from 'lucide-react'
import { employeesApi } from '../../api/employees.api'
import { usePermissions } from '../../hooks/usePermissions'
import type { Employee } from '../../types'

const PAYMENT_LABELS: Record<string, string> = {
  hourly:  'Почасовая',
  fixed:   'Оклад',
  percent: 'Процент',
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 13px',
  background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
  borderRadius: 8, color: 'var(--text-primary)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

interface SalaryEditModalProps {
  employee: Employee
  onSave: (emp: Employee) => void
  onClose: () => void
}

function SalaryEditModal({ employee, onSave, onClose }: SalaryEditModalProps) {
  const [salaryRate,   setSalaryRate]   = useState(String(employee.salary_rate ?? ''))
  const [paymentType,  setPaymentType]  = useState<'hourly' | 'fixed' | 'percent'>(employee.payment_type ?? 'fixed')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await employeesApi.update(employee.id, {
        salary_rate:  salaryRate ? parseFloat(salaryRate) : null,
        payment_type: paymentType as Employee['payment_type'],
      })
      onSave(updated)
    } catch { /* */ }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 380, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{employee.full_name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Тип оплаты</div>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={paymentType} onChange={e => setPaymentType(e.target.value as 'hourly' | 'fixed' | 'percent')}>
              <option value="fixed">Оклад</option>
              <option value="hourly">Почасовая</option>
              <option value="percent">Процент</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              {paymentType === 'hourly' ? 'Ставка в час (₸)' : paymentType === 'percent' ? 'Процент (%)' : 'Оклад (₸)'}
            </div>
            <input style={inputStyle} type="number" min="0" value={salaryRate} onChange={e => setSalaryRate(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 13, marginTop: 21 }}>
          <button onClick={() => void handleSave()} disabled={saving}
            style={{ flex: 1, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PayrollPage() {
  const { can } = usePermissions()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading]     = useState(true)
  const [editEmp, setEditEmp]     = useState<Employee | null>(null)

  const canEdit = can('employees', 'edit')

  useEffect(() => {
    employeesApi.getAll()
      .then(setEmployees)
      .catch(() => { /* */ })
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (updated: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e))
    setEditEmp(null)
  }

  const computeEstimatedPay = (emp: Employee): string => {
    if (!emp.salary_rate || !emp.payment_type) return '—'
    const completed = emp.kpi?.shifts_completed ?? 0
    const avgH      = emp.kpi?.avg_shift_hours  ?? 0
    if (emp.payment_type === 'fixed')   return `${emp.salary_rate.toLocaleString('ru-RU')} ₸`
    if (emp.payment_type === 'hourly')  return `${Math.round(emp.salary_rate * completed * avgH).toLocaleString('ru-RU')} ₸`
    if (emp.payment_type === 'percent') return `${emp.salary_rate}%`
    return '—'
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 21px' }}>Зарплата</h1>
        <div style={{ padding: 55, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Зарплата</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          {employees.length} сотрудников · Расчёт оплаты труда
        </p>
      </div>

      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)' }}>
              {['Сотрудник', 'Должность', 'Тип оплаты', 'Ставка', 'Смен завершено', 'Задач выполнено', 'К выплате', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--glass-border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '55px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Сотрудников нет</td>
              </tr>
            ) : employees.map((emp, i) => (
              <tr key={emp.id} style={{ borderBottom: i < employees.length - 1 ? '1px solid var(--glass-border)' : 'none', transition: 'background 0.1s' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{emp.full_name}</div>
                  {emp.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.phone}</div>}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{emp.position ?? '—'}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                    {emp.payment_type ? PAYMENT_LABELS[emp.payment_type] : 'Не задано'}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#02BDB6', fontWeight: 600 }}>
                  {emp.salary_rate ? `${emp.salary_rate.toLocaleString('ru-RU')} ${emp.payment_type === 'percent' ? '%' : '₸'}` : '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <Clock size={13} color="var(--text-muted)" />
                    {emp.kpi?.shifts_completed ?? '—'}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <CheckCircle size={13} color="var(--text-muted)" />
                    {emp.kpi?.tasks_done ?? '—'}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#10b981' }}>
                  {computeEstimatedPay(emp)}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {canEdit && (
                    <button onClick={() => setEditEmp(emp)}
                      style={{ height: 30, padding: '0 12px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <DollarSign size={12} />Ставка
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editEmp && (
        <SalaryEditModal employee={editEmp} onSave={handleSaved} onClose={() => setEditEmp(null)} />
      )}
    </div>
  )
}
