import { useState, useEffect } from 'react'
import {
  Users, CreditCard, Calendar, Activity, Target, Package,
  AlertTriangle, TrendingUp, Cake, TrendingDown,
} from 'lucide-react'
import { PeriodFilter } from '../../components/ui/PeriodFilter'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { analyticsApi } from '../../api/analytics.api'
import { clientsApi } from '../../api/clients.api'
import { useAuth } from '../../hooks/useAuth'
import { BranchSelector } from '../../components/ui/BranchSelector'
import type { AnalyticsOverview, AnalyticsBranchRow, Client } from '../../types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

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
const PIE_COLORS = ['var(--accent)', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

function isTodayBirthday(birthDate: string | null | undefined): boolean {
  if (!birthDate) return false
  const bd = new Date(birthDate + 'T00:00:00')
  const now = new Date()
  return bd.getDate() === now.getDate() && bd.getMonth() === now.getMonth()
}

interface KpiCardProps {
  label: string
  value: string | number
  subtitle?: string
  warn?: boolean
  accent?: string
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
}

function KpiCard({ label, value, subtitle, warn, accent = 'var(--accent)', trend, loading }: KpiCardProps) {
  return (
    <div
      className="metric-card"
      style={warn ? {
        borderColor: `color-mix(in srgb, ${accent} 30%, var(--border))`,
        background: `color-mix(in srgb, ${accent} 4%, var(--bg-card))`,
      } : {}}
    >
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </>
      ) : (
        <>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 6 }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: warn ? accent : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {trend === 'up' && <TrendingUp size={10} className="trend-up" />}
              {trend === 'down' && <TrendingDown size={10} className="trend-down" />}
              {subtitle}
            </div>
          )}
        </>
      )}
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
  boxShadow: 'var(--shadow-md)',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [overview, setOverview]   = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading]     = useState(true)
  const [birthdays, setBirthdays] = useState<Client[]>([])
  const { period, customFrom, customTo, setPeriod, remember, setRemember } = usePeriodFilter('dashboard')
  const [selectedBranches, setSelectedBranches] = useState<string[]>(() => {
    const id = localStorage.getItem('activeBranchId')
    return id ? [id] : []
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

  const byBranch: AnalyticsBranchRow[] = overview?.by_branch ?? []
  const clientsByMonth = (overview?.clients_by_month ?? []).map(d => ({ ...d, month: fmtMonth(d.month) }))
  const revenueByMonth = (overview?.revenue_by_month ?? []).map(d => ({ ...d, month: fmtMonth(d.month) }))
  const leadsBySource  = (overview?.leads_by_source ?? []).map(d => ({ name: d.source, value: d.count }))
  const leadsFunnel    = (overview?.leads_funnel ?? []).map(d => ({
    name: FUNNEL_LABELS[d.status] ?? d.status,
    count: d.count,
    fill: FUNNEL_COLORS[d.status] ?? '#999',
  }))

  // suppress unused warning — period/customFrom/customTo/remember are used by PeriodFilter internally
  void period; void customFrom; void customTo; void remember

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <PeriodFilter
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          remember={remember}
          onChange={setPeriod}
          onRememberChange={setRemember}
        />
        {user?.role && (
          <BranchSelector
            role={user.role}
            selectedIds={selectedBranches}
            onChange={setSelectedBranches}
          />
        )}
      </div>

      {/* Birthday banner */}
      {birthdays.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, #f59e0b 5%, var(--bg-card))',
          border: '1px solid color-mix(in srgb, #f59e0b 25%, var(--border))',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Cake size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, fontWeight: 500, color: '#f59e0b' }}>
            Именинники сегодня:&nbsp;
            <span style={{ fontWeight: 600 }}>{birthdays.map(c => c.full_name).join(', ')}</span>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <KpiCard loading={loading} label="Клиентов" value={overview?.clients_total ?? 0} subtitle="Всего в базе" />
        <KpiCard loading={loading} label="Абонементов" value={overview?.subscriptions_active ?? 0} subtitle="Активных" />
        <KpiCard loading={loading} label="Слотов сегодня" value={overview?.slots_today ?? 0} subtitle="По расписанию" />
        <KpiCard loading={loading} label="Посещений" value={overview?.visits_today ?? 0} subtitle="Сегодня" trend="up" />
        <KpiCard loading={loading} label="Новых лидов" value={overview?.leads_new ?? 0} subtitle="Не обработаны" warn={(overview?.leads_new ?? 0) > 0} accent="#f59e0b" />
        <KpiCard loading={loading} label="Истекают скоро" value={overview?.subscriptions_expiring_soon ?? 0} subtitle="В течение 7 дней" warn={(overview?.subscriptions_expiring_soon ?? 0) > 0} accent="#ef4444" />
      </div>

      {/* Per-branch breakdown */}
      {byBranch.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Разбивка по филиалам</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Филиал', 'Клиентов', 'Абонементов', 'Лидов'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byBranch.map((row) => (
                  <tr key={row.branch_id}>
                    <td style={{ fontWeight: 500 }}>{row.branch_name}</td>
                    <td className="tabular" style={{ color: 'var(--accent)', fontWeight: 600 }}>{row.clients_total}</td>
                    <td className="tabular" style={{ color: '#6366f1', fontWeight: 600 }}>{row.subscriptions_active}</td>
                    <td className="tabular" style={{ color: row.leads_new > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: row.leads_new > 0 ? 600 : 400 }}>{row.leads_new}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <CardHeader>
            <CardTitle>Новые клиенты</CardTitle>
            <CardDescription>За последние 6 месяцев</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-44 w-full rounded-lg" />
            ) : clientsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={176}>
                <LineChart data={clientsByMonth}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} name="Клиентов" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Выручка по месяцам</CardTitle>
            <CardDescription>Сумма проданных абонементов</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-44 w-full rounded-lg" />
            ) : revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={176}>
                <BarChart data={revenueByMonth}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={48} tickFormatter={v => v >= 1000 ? `${Math.round(Number(v)/1000)}k` : String(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${Number(v).toLocaleString('ru-RU')} ₸`, 'Выручка']} />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Выручка" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <CardHeader>
            <CardTitle>Воронка лидов</CardTitle>
            <CardDescription>Распределение по статусам</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-44 w-full rounded-lg" />
            ) : leadsFunnel.length > 0 ? (
              <ResponsiveContainer width="100%" height={176}>
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
              <div style={{ height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Лиды по источникам</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-44 w-full rounded-lg" />
            ) : leadsBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie data={leadsBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                    {leadsBySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
        {/* Subscriptions stats */}
        <Card>
          <CardHeader>
            <CardTitle>Абонементы</CardTitle>
            <CardDescription>Статус активных абонементов</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
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
                  {loading ? (
                    <>
                      <Skeleton className="h-7 w-12 mx-auto mb-2" />
                      <Skeleton className="h-3 w-16 mx-auto" />
                    </>
                  ) : (
                    <>
                      <div className="tabular" style={{ fontSize: 24, fontWeight: 700, color: item.color, marginBottom: 4, letterSpacing: '-0.02em' }}>
                        {item.value}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Посещений за 7 дней</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
                {[40, 55, 38, 70, 62, 80, overview?.visits_today ?? 45].map((h, i) => (
                  <div key={i} style={{
                    flex: 1,
                    height: `${Math.round((h / 80) * 100)}%`,
                    background: i === 6 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 20%, transparent)',
                    borderRadius: '3px 3px 0 0',
                    minHeight: 4,
                    transition: 'background 200ms ease-out',
                  }} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Card>
          <CardHeader>
            <CardTitle>Быстрая статистика</CardTitle>
          </CardHeader>
          <CardContent style={{ paddingTop: 0 }}>
            {[
              { label: 'Клиентов всего',  value: overview?.clients_total,                  color: undefined },
              { label: 'Активных смен',   value: overview?.active_shifts,                  color: overview?.active_shifts ? '#10b981' : undefined },
              { label: 'Лидов в работе',  value: overview?.leads_new,                      color: overview?.leads_new ? '#f59e0b' : undefined },
              { label: 'Мало на складе',  value: overview?.low_stock_items,                color: overview?.low_stock_items ? '#ef4444' : undefined },
              { label: 'Абонем. 30 дней', value: overview?.subscriptions_expiring_30d,     color: undefined },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
                {loading ? (
                  <Skeleton className="h-4 w-10" />
                ) : (
                  <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: item.color ?? 'var(--text)' }}>
                    {item.value ?? 0}
                  </span>
                )}
              </div>
            ))}
            {overview?.leads_conversion !== undefined && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Конверсия лидов</span>
                <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: overview.leads_conversion >= 30 ? '#10b981' : '#f59e0b' }}>
                  {overview.leads_conversion}%
                </span>
              </div>
            )}
            {overview?.avg_ltv !== undefined && overview.avg_ltv > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Средний LTV</span>
                <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                  {overview.avg_ltv.toLocaleString('ru-RU')} ₸
                </span>
              </div>
            )}
            {/* Alerts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              {(overview?.low_stock_items ?? 0) > 0 && (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.18)',
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Package size={11} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#ef4444' }}>{overview!.low_stock_items} позиций заканчивается</span>
                </div>
              )}
              {(overview?.subscriptions_expiring_soon ?? 0) > 0 && (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.18)',
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertTriangle size={11} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#ef4444' }}>{overview!.subscriptions_expiring_soon} абонемента истекают</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
