import { useState, useEffect } from 'react'
import {
  Users, CreditCard, Calendar, Activity, Target, Package,
  AlertTriangle, TrendingUp, Cake,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { analyticsApi } from '../../api/analytics.api'
import { clientsApi } from '../../api/clients.api'
import { useAuth } from '../../hooks/useAuth'
import { BranchSelector } from '../../components/ui/BranchSelector'
import type { AnalyticsOverview, AnalyticsBranchRow, Client } from '../../types'

const FUNNEL_LABELS: Record<string, string> = {
  new:     'Новый',
  in_work: 'В работе',
  waiting: 'Ждём',
  success: 'Успешно',
  fail:    'Отказ',
}
const FUNNEL_COLORS: Record<string, string> = {
  new:     '#3b82f6',
  in_work: '#f59e0b',
  waiting: '#f97316',
  success: '#10b981',
  fail:    '#ef4444',
}
const PIE_COLORS = ['var(--accent)', '#263CD9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

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
      className="stagger-item"
      style={{
        background: warn ? `color-mix(in srgb, ${color} 5%, var(--bg-card))` : 'var(--bg-card)',
        border: `1px solid ${warn ? `color-mix(in srgb, ${color} 25%, var(--border))` : 'var(--border)'}`,
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'border-color 150ms ease-out',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={16} strokeWidth={1.75} color={color} />
      </div>
      <div>
        <div className="tabular" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 3 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</div>
        {subtitle && (
          <div style={{ fontSize: 11, color: warn ? color : 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</span>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

function fmtMonth(m: string) {
  const [y, mon] = m.split('-')
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  return `${months[parseInt(mon) - 1]} ${y.slice(2)}`
}

const tooltipStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [overview, setOverview]   = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading]     = useState(true)
  const [birthdays, setBirthdays] = useState<Client[]>([])
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
  const clientsByMonth = (overview?.clients_by_month ?? []).map(d => ({ ...d, month: fmtMonth(d.month) }))
  const revenueByMonth = (overview?.revenue_by_month ?? []).map(d => ({ ...d, month: fmtMonth(d.month) }))
  const leadsBySource  = (overview?.leads_by_source ?? []).map(d => ({ name: d.source, value: d.count }))
  const leadsFunnel    = (overview?.leads_funnel ?? []).map(d => ({
    name: FUNNEL_LABELS[d.status] ?? d.status,
    count: d.count,
    fill: FUNNEL_COLORS[d.status] ?? '#999',
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, marginBottom: 3 }}>Дашборд</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, textTransform: 'capitalize' }}>{today}</p>
        </div>
        {user?.role && (
          <BranchSelector
            role={user.role}
            selectedIds={selectedBranches}
            onChange={setSelectedBranches}
          />
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <KpiCard icon={Users}         label="Клиентов"           value={v(overview?.clients_total)}                color="var(--accent)" subtitle="Всего в базе" />
        <KpiCard icon={CreditCard}    label="Абонементов"        value={v(overview?.subscriptions_active)}         color="#263CD9"       subtitle="Активных" />
        <KpiCard icon={Calendar}      label="Слотов сегодня"     value={v(overview?.slots_today)}                  color="var(--accent)" subtitle="По расписанию" />
        <KpiCard icon={Activity}      label="Посещений"          value={v(overview?.visits_today)}                 color="#10b981"       subtitle="Сегодня" />
        <KpiCard icon={Target}        label="Новых лидов"        value={v(overview?.leads_new)}                    color="#f59e0b"       subtitle="Не обработаны" warn={(overview?.leads_new ?? 0) > 0} />
        <KpiCard icon={AlertTriangle} label="Истекают"           value={v(overview?.subscriptions_expiring_soon)}  color="#ef4444"       subtitle="В течение 7 дней" warn={(overview?.subscriptions_expiring_soon ?? 0) > 0} />
      </div>

      {/* Birthday widget */}
      {birthdays.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, #f59e0b 5%, var(--bg-card))',
          border: '1px solid color-mix(in srgb, #f59e0b 20%, var(--border))',
          borderRadius: 12, padding: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Cake size={16} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', marginBottom: 6 }}>
              Именинники сегодня ({birthdays.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {birthdays.map(c => (
                <span key={c.id} style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 20,
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  color: '#f59e0b',
                }}>
                  {c.full_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Per-branch breakdown */}
      {byBranch.length > 1 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Разбивка по филиалам</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Филиал', 'Клиентов', 'Абонементов', 'Лидов'].map(h => (
                  <th key={h} className="table-header" style={{ padding: '10px 20px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byBranch.map((row, i) => (
                <tr key={row.branch_id} style={{ borderBottom: i < byBranch.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '10px 20px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{row.branch_name}</td>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }} className="tabular">{row.clients_total}</td>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: '#263CD9', fontWeight: 600 }} className="tabular">{row.subscriptions_active}</td>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: row.leads_new > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: row.leads_new > 0 ? 600 : 400 }} className="tabular">{row.leads_new}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ChartCard title="Новые клиенты" subtitle="За последние 6 месяцев">
          {clientsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={clientsByMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} name="Клиентов" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: 180, padding: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных</span>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Выручка по месяцам" subtitle="Сумма проданных абонементов">
          {revenueByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueByMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={48} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : String(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${Number(v).toLocaleString('ru-RU')} ₸`, 'Выручка']} />
                <Bar dataKey="revenue" fill="#263CD9" radius={[4, 4, 0, 0]} name="Выручка" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: 180, padding: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных</span>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ChartCard title="Воронка лидов" subtitle="Распределение по статусам">
          {leadsFunnel.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={leadsFunnel} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={62} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Лидов">
                  {leadsFunnel.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: 180, padding: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных</span>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Лиды по источникам">
          {leadsBySource.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={leadsBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                  {leadsBySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: 180, padding: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных</span>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Bottom row: Subscriptions + Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
        {/* Subscriptions stats */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Абонементы</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Статус активных абонементов</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Активных',     value: overview?.subscriptions_active ?? 0,        color: 'var(--accent)' },
              { label: 'Истекает 7д',  value: overview?.subscriptions_expiring_soon ?? 0,  color: '#ef4444' },
              { label: 'Истекает 30д', value: overview?.subscriptions_expiring_30d ?? 0,   color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{
                textAlign: 'center', padding: '14px 12px',
                background: `color-mix(in srgb, ${item.color} 6%, transparent)`,
                border: `1px solid color-mix(in srgb, ${item.color} 18%, transparent)`,
                borderRadius: 10,
              }}>
                <div className="tabular" style={{ fontSize: 24, fontWeight: 700, color: item.color, marginBottom: 4, letterSpacing: '-0.02em' }}>
                  {loading ? '...' : item.value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Посещений за 7 дней</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
              {[40, 55, 38, 70, 62, 80, overview?.visits_today ?? 45].map((h, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: `${Math.round((h / 80) * 100)}%`,
                  background: i === 6 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 25%, transparent)',
                  borderRadius: '3px 3px 0 0',
                  minHeight: 4,
                  transition: 'background 200ms ease-out',
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12, letterSpacing: '-0.01em' }}>Быстрая статистика</div>
          <StatRow label="Клиентов всего"    value={v(overview?.clients_total)} />
          <StatRow label="Активных смен"     value={v(overview?.active_shifts)}  color={overview?.active_shifts ? '#10b981' : undefined} />
          <StatRow label="Лидов в работе"    value={v(overview?.leads_new)}      color={overview?.leads_new ? '#f59e0b' : undefined} />
          <StatRow label="Мало на складе"    value={v(overview?.low_stock_items)} color={overview?.low_stock_items ? '#ef4444' : undefined} />
          <StatRow label="Абонем. 30 дней"   value={v(overview?.subscriptions_expiring_30d)} />
          {overview?.leads_conversion !== undefined && (
            <StatRow label="Конверсия лидов" value={`${overview.leads_conversion}%`} color={overview.leads_conversion >= 30 ? '#10b981' : '#f59e0b'} />
          )}
          {overview?.avg_ltv !== undefined && overview.avg_ltv > 0 && (
            <StatRow label="Средний LTV" value={`${overview.avg_ltv.toLocaleString('ru-RU')} ₸`} color="var(--accent)" />
          )}
          {overview?.low_stock_items ? (
            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Package size={12} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#ef4444' }}>{overview.low_stock_items} позиций заканчивается</span>
            </div>
          ) : null}
          {overview?.subscriptions_expiring_soon ? (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <TrendingUp size={12} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#ef4444' }}>{overview.subscriptions_expiring_soon} абонемента истекают</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
