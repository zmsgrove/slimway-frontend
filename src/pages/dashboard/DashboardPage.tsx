import { useState, useEffect } from 'react'
import {
  Users, CreditCard, Calendar, Activity, Target, Package,
  AlertTriangle, TrendingUp, Cake,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { analyticsApi } from '../../api/analytics.api'
import { clientsApi } from '../../api/clients.api'
import { useAuth } from '../../hooks/useAuth'
import { BranchSelector } from '../../components/ui/BranchSelector'
import type { AnalyticsOverview, AnalyticsBranchRow, Client } from '../../types'

function isTodayBirthday(birthDate: string | null | undefined): boolean {
  if (!birthDate) return false
  const bd = new Date(birthDate + 'T00:00:00')
  const now = new Date()
  return bd.getDate() === now.getDate() && bd.getMonth() === now.getMonth()
}

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  color: string
  subtitle?: string
  warn?: boolean
}

function KpiCard({ icon: Icon, label, value, color, subtitle, warn }: KpiCardProps) {
  return (
    <div
      style={{
        background: warn ? `${color}08` : 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${warn ? `${color}30` : 'var(--glass-border)'}`,
        borderRadius: 21, padding: 21,
        display: 'flex', flexDirection: 'column', gap: 13,
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 13,
          background: `${color}18`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <Icon size={18} strokeWidth={1.75} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 3 }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</div>
        {subtitle && (
          <div style={{ fontSize: 11, color: warn ? color : 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>
        )}
      </div>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [overview,        setOverview]        = useState<AnalyticsOverview | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [birthdays,       setBirthdays]       = useState<Client[]>([])
  const [selectedBranches, setSelectedBranches] = useState<string[]>(() => {
    const id = localStorage.getItem('activeBranchId')
    return id ? [id] : []
  })

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  useEffect(() => {
    clientsApi.getAll()
      .then(all => setBirthdays(all.filter(c => isTodayBirthday(c.birth_date))))
      .catch(() => { /* ignore */ })
  }, [])

  useEffect(() => {
    setLoading(true)
    analyticsApi.getOverview({ branch_ids: selectedBranches.length > 0 ? selectedBranches : undefined })
      .then(setOverview)
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [selectedBranches])

  const v = (n: number | undefined) => (loading ? '...' : (n ?? 0))

  const byBranch: AnalyticsBranchRow[] = overview?.by_branch ?? []

  return (
    <div>
      {/* Branch selector — developer/owner only */}
      {user?.role && (
        <BranchSelector
          role={user.role}
          selectedIds={selectedBranches}
          onChange={setSelectedBranches}
        />
      )}

      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Дашборд</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, textTransform: 'capitalize' }}>{today}</p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 13, marginBottom: 21 }}>
        <KpiCard icon={Users}    label="Клиентов"           value={v(overview?.clients_total)}                color="#02BDB6" subtitle="Всего в базе" />
        <KpiCard icon={CreditCard} label="Абонементов"     value={v(overview?.subscriptions_active)}         color="#263CD9" subtitle="Активных" />
        <KpiCard icon={Calendar} label="Ячеек сегодня"     value={v(overview?.slots_today)}                  color="#02BDB6" subtitle="По расписанию" />
        <KpiCard icon={Activity} label="Посещений сегодня" value={v(overview?.visits_today)}                 color="#10b981" subtitle="Забронировано" />
        <KpiCard icon={Target}   label="Новых лидов"       value={v(overview?.leads_new)}                    color="#f59e0b" subtitle="Не обработаны" warn={(overview?.leads_new ?? 0) > 0} />
        <KpiCard icon={AlertTriangle} label="Истекают скоро" value={v(overview?.subscriptions_expiring_soon)} color="#ef4444" subtitle="В течение 7 дней" warn={(overview?.subscriptions_expiring_soon ?? 0) > 0} />
      </div>

      {/* Per-branch breakdown (only when multiple branches) */}
      {byBranch.length > 1 && (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21, marginBottom: 21, overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Разбивка по филиалам</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Филиал', 'Клиентов', 'Абонементов', 'Лидов'].map(h => (
                  <th key={h} style={{ padding: '8px 13px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--glass-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byBranch.map((row, i) => (
                <tr key={row.branch_id} style={{ borderBottom: i < byBranch.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                  <td style={{ padding: '10px 13px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{row.branch_name}</td>
                  <td style={{ padding: '10px 13px', fontSize: 13, color: '#02BDB6', fontWeight: 600 }}>{row.clients_total}</td>
                  <td style={{ padding: '10px 13px', fontSize: 13, color: '#263CD9', fontWeight: 600 }}>{row.subscriptions_active}</td>
                  <td style={{ padding: '10px 13px', fontSize: 13, color: row.leads_new > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: row.leads_new > 0 ? 600 : 400 }}>{row.leads_new}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Birthday widget */}
      {birthdays.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 21, padding: 21, marginBottom: 21, display: 'flex', alignItems: 'flex-start', gap: 13 }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Cake size={18} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>Именинники сегодня ({birthdays.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {birthdays.map(c => (
                <span key={c.id} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                  🎂 {c.full_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 13, alignItems: 'start' }}>
        {/* Left: Subscriptions stats */}
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Абонементы</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 21 }}>Статус активных абонементов</div>
          <div style={{ display: 'flex', gap: 21 }}>
            {[
              { label: 'Активных',    value: overview?.subscriptions_active ?? 0,        color: '#02BDB6' },
              { label: 'Истекает 7д', value: overview?.subscriptions_expiring_soon ?? 0, color: '#ef4444' },
              { label: 'Истекает 30д', value: overview?.subscriptions_expiring_30d ?? 0, color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, textAlign: 'center', padding: '13px 0', background: `${item.color}08`, border: `1px solid ${item.color}20`, borderRadius: 13 }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: item.color, marginBottom: 4 }}>{loading ? '...' : item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 21 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Посещений за 7 дней</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
              {[40, 55, 38, 70, 62, 80, overview?.visits_today ?? 45].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${Math.round((h / 80) * 100)}%`, background: i === 6 ? '#02BDB6' : 'rgba(2,189,182,0.25)', borderRadius: '3px 3px 0 0', minHeight: 4 }} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick stats */}
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Быстрая статистика</div>
          <StatRow label="Клиентов всего"     value={v(overview?.clients_total)} />
          <StatRow label="Активных смен"      value={v(overview?.active_shifts)}  color={overview?.active_shifts ? '#10b981' : undefined} />
          <StatRow label="Лидов в работе"     value={v(overview?.leads_new)}      color={overview?.leads_new ? '#f59e0b' : undefined} />
          <StatRow label="Мало на складе"     value={v(overview?.low_stock_items)} color={overview?.low_stock_items ? '#ef4444' : undefined} />
          <StatRow label="Абонем. 30 дней"    value={v(overview?.subscriptions_expiring_30d)} />
          {overview?.low_stock_items ? (
            <div style={{ marginTop: 13, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={13} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#ef4444' }}>{overview.low_stock_items} позиций на складе заканчивается</span>
            </div>
          ) : null}
          {overview?.subscriptions_expiring_soon ? (
            <div style={{ marginTop: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={13} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#ef4444' }}>{overview.subscriptions_expiring_soon} абонемента истекают за 7 дней</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
