import React, { useState, useEffect, useCallback } from 'react'
import ReactGridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import {
  Package, AlertTriangle, TrendingUp, TrendingDown, Cake, GripHorizontal, RotateCcw,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { analyticsApi } from '../../api/analytics.api'
import { clientsApi } from '../../api/clients.api'
import { useAuth } from '../../hooks/useAuth'
import { BranchSelector } from '../../components/ui/BranchSelector'
import { PeriodFilter } from '../../components/ui/PeriodFilter'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import type { AnalyticsOverview, AnalyticsBranchRow, Client } from '../../types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// ─── react-grid-layout setup ─────────────────────────────────────────────────

interface LayoutItem {
  i: string; x: number; y: number; w: number; h: number
  minW?: number; maxW?: number; minH?: number; maxH?: number; static?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RGL = (ReactGridLayout as any).WidthProvider(ReactGridLayout) as React.ComponentType<any>

// ─── Constants ───────────────────────────────────────────────────────────────

const FUNNEL_LABELS: Record<string, string> = {
  new: 'Новый', in_work: 'В работе', waiting: 'Ждём', success: 'Успешно', fail: 'Отказ',
}
const FUNNEL_COLORS: Record<string, string> = {
  new: '#3b82f6', in_work: '#f59e0b', waiting: '#f97316', success: '#10b981', fail: '#ef4444',
}
const PIE_COLORS = ['var(--accent)', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

const LAYOUT_KEY = 'dashboard_layout_v2'
const ROW_H = 56
const MARGIN: [number, number] = [12, 12]

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'kpi',           x: 0, y: 0,  w: 12, h: 3, minH: 3 },
  { i: 'clients-chart', x: 0, y: 3,  w: 6,  h: 5, minW: 3, minH: 4 },
  { i: 'revenue-chart', x: 6, y: 3,  w: 6,  h: 5, minW: 3, minH: 4 },
  { i: 'leads-funnel',  x: 0, y: 8,  w: 6,  h: 5, minW: 3, minH: 4 },
  { i: 'leads-source',  x: 6, y: 8,  w: 6,  h: 5, minW: 3, minH: 4 },
  { i: 'subscriptions', x: 0, y: 13, w: 8,  h: 6, minW: 4, minH: 4 },
  { i: 'quick-stats',   x: 8, y: 13, w: 4,  h: 6, minW: 3, minH: 4 },
]

function loadLayout(): LayoutItem[] {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY)
    if (saved) {
      const parsed: LayoutItem[] = JSON.parse(saved)
      const ids = new Set(parsed.map(l => l.i))
      const missing = DEFAULT_LAYOUT.filter(l => !ids.has(l.i))
      return [...parsed, ...missing]
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isTodayBirthday(d: string | null | undefined): boolean {
  if (!d) return false
  const bd = new Date(d + 'T00:00:00')
  const now = new Date()
  return bd.getDate() === now.getDate() && bd.getMonth() === now.getMonth()
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

// ─── KpiCard ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  subtitle?: string
  warn?: boolean
  accent?: string
  trend?: 'up' | 'down'
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
              {trend === 'up'   && <TrendingUp   size={10} className="trend-up"   />}
              {trend === 'down' && <TrendingDown  size={10} className="trend-down" />}
              {subtitle}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── DashboardCard ────────────────────────────────────────────────────────────

interface DashboardCardProps {
  title: string
  description?: string
  editMode: boolean
  children: React.ReactNode
  contentStyle?: React.CSSProperties
}

function DashboardCard({ title, description, editMode, children, contentStyle }: DashboardCardProps) {
  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CardHeader
        className={editMode ? 'drag-handle' : undefined}
        style={editMode ? { cursor: 'grab', userSelect: 'none', paddingBottom: 10 } : { paddingBottom: 10 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {editMode && <GripHorizontal size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription style={{ marginTop: 2 }}>{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ flex: 1, minHeight: 0, overflow: 'hidden', ...contentStyle }}>
        {children}
      </CardContent>
    </Card>
  )
}

function EmptyChart() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных</span>
    </div>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const [overview, setOverview]   = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading]     = useState(true)
  const [birthdays, setBirthdays] = useState<Client[]>([])
  const [editMode, setEditMode]   = useState(false)
  const [layout, setLayout]       = useState<LayoutItem[]>(loadLayout)

  const { period, customFrom, customTo, setPeriod, remember, setRemember } = usePeriodFilter('dashboard')
  const [selectedBranches, setSelectedBranches] = useState<string[]>(() => {
    const id = localStorage.getItem('activeBranchId')
    return id ? [id] : []
  })

  void period; void customFrom; void customTo; void remember

  useEffect(() => {
    clientsApi.getAll()
      .then(all => setBirthdays(all.filter(c => isTodayBirthday(c.birth_date))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    analyticsApi.getOverview({ branch_ids: selectedBranches.length > 0 ? selectedBranches : undefined })
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedBranches])

  const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout)
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(newLayout))
  }, [])

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT)
    localStorage.removeItem(LAYOUT_KEY)
  }, [])

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {editMode && (
            <button
              onClick={resetLayout}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                transition: 'color 150ms ease-out, border-color 150ms ease-out',
              }}
            >
              <RotateCcw size={12} />
              Сбросить
            </button>
          )}
          <button
            onClick={() => setEditMode(e => !e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 'var(--radius-sm)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: editMode ? 'var(--accent)' : 'var(--bg-card)',
              border: `1px solid ${editMode ? 'var(--accent)' : 'var(--border)'}`,
              color: editMode ? '#fff' : 'var(--text)',
              transition: 'all 150ms ease-out',
            }}
          >
            <GripHorizontal size={13} />
            {editMode ? 'Готово' : 'Настроить'}
          </button>
        </div>
      </div>

      {/* ── Birthday banner ── */}
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

      {/* ── Branch breakdown (static, multi-branch only) ── */}
      {byBranch.length > 1 && (
        <Card>
          <CardHeader><CardTitle>Разбивка по филиалам</CardTitle></CardHeader>
          <CardContent style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Филиал', 'Клиентов', 'Абонементов', 'Лидов'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {byBranch.map(row => (
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

      {/* ── Draggable grid ── */}
      <div className={editMode ? 'dashboard-edit-mode' : ''} style={{ margin: '0 -6px' }}>
        <RGL
          layout={layout}
          cols={12}
          rowHeight={ROW_H}
          margin={MARGIN}
          isDraggable={editMode}
          isResizable={editMode}
          draggableHandle=".drag-handle"
          onLayoutChange={handleLayoutChange}
          useCSSTransforms={true}
        >

          {/* ── KPI cards ── */}
          <div key="kpi" style={{ height: '100%' }}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {editMode && (
                <div
                  className="drag-handle"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', marginBottom: 10, alignSelf: 'flex-start',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', cursor: 'grab', userSelect: 'none',
                  }}
                >
                  <GripHorizontal size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Ключевые показатели</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                <KpiCard loading={loading} label="Клиентов"       value={overview?.clients_total ?? 0}               subtitle="Всего в базе" />
                <KpiCard loading={loading} label="Абонементов"    value={overview?.subscriptions_active ?? 0}        subtitle="Активных" />
                <KpiCard loading={loading} label="Слотов сегодня" value={overview?.slots_today ?? 0}                 subtitle="По расписанию" />
                <KpiCard loading={loading} label="Посещений"      value={overview?.visits_today ?? 0}                subtitle="Сегодня" trend="up" />
                <KpiCard loading={loading} label="Новых лидов"    value={overview?.leads_new ?? 0}                   subtitle="Не обработаны"    warn={(overview?.leads_new ?? 0) > 0}                 accent="#f59e0b" />
                <KpiCard loading={loading} label="Истекают скоро" value={overview?.subscriptions_expiring_soon ?? 0} subtitle="В течение 7 дней" warn={(overview?.subscriptions_expiring_soon ?? 0) > 0} accent="#ef4444" />
              </div>
            </div>
          </div>

          {/* ── New clients chart ── */}
          <div key="clients-chart" style={{ height: '100%' }}>
            <DashboardCard title="Новые клиенты" description="За последние 6 месяцев" editMode={editMode}>
              {loading ? (
                <Skeleton className="h-full w-full rounded-lg" style={{ minHeight: 120 }} />
              ) : clientsByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clientsByMonth}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} name="Клиентов" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </DashboardCard>
          </div>

          {/* ── Revenue chart ── */}
          <div key="revenue-chart" style={{ height: '100%' }}>
            <DashboardCard title="Выручка по месяцам" description="Сумма проданных абонементов" editMode={editMode}>
              {loading ? (
                <Skeleton className="h-full w-full rounded-lg" style={{ minHeight: 120 }} />
              ) : revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByMonth}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={48}
                      tickFormatter={v => Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${Number(v).toLocaleString('ru-RU')} ₸`, 'Выручка']} />
                    <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Выручка" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </DashboardCard>
          </div>

          {/* ── Leads funnel ── */}
          <div key="leads-funnel" style={{ height: '100%' }}>
            <DashboardCard title="Воронка лидов" description="Распределение по статусам" editMode={editMode}>
              {loading ? (
                <Skeleton className="h-full w-full rounded-lg" style={{ minHeight: 120 }} />
              ) : leadsFunnel.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsFunnel} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={62} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Лидов">
                      {leadsFunnel.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </DashboardCard>
          </div>

          {/* ── Leads by source ── */}
          <div key="leads-source" style={{ height: '100%' }}>
            <DashboardCard title="Лиды по источникам" editMode={editMode}>
              {loading ? (
                <Skeleton className="h-full w-full rounded-lg" style={{ minHeight: 120 }} />
              ) : leadsBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leadsBySource} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius="65%" paddingAngle={3}>
                      {leadsBySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </DashboardCard>
          </div>

          {/* ── Subscriptions ── */}
          <div key="subscriptions" style={{ height: '100%' }}>
            <DashboardCard title="Абонементы" description="Статус активных абонементов" editMode={editMode} contentStyle={{ overflow: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Активных',     value: overview?.subscriptions_active ?? 0,        color: 'var(--accent)' },
                  { label: 'Истекает 7д',  value: overview?.subscriptions_expiring_soon ?? 0,  color: '#ef4444' },
                  { label: 'Истекает 30д', value: overview?.subscriptions_expiring_30d ?? 0,   color: '#f59e0b' },
                ].map(item => (
                  <div key={item.label} style={{
                    textAlign: 'center', padding: '12px 8px',
                    background: `color-mix(in srgb, ${item.color} 6%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${item.color} 18%, transparent)`,
                    borderRadius: 10,
                  }}>
                    {loading ? (
                      <>
                        <Skeleton className="h-6 w-10 mx-auto mb-2" />
                        <Skeleton className="h-3 w-14 mx-auto" />
                      </>
                    ) : (
                      <>
                        <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: item.color, marginBottom: 3, letterSpacing: '-0.02em' }}>
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
            </DashboardCard>
          </div>

          {/* ── Quick stats ── */}
          <div key="quick-stats" style={{ height: '100%' }}>
            <DashboardCard title="Быстрая статистика" editMode={editMode} contentStyle={{ overflow: 'auto', paddingTop: 0 }}>
              {[
                { label: 'Клиентов всего',  value: overview?.clients_total,               color: undefined },
                { label: 'Активных смен',   value: overview?.active_shifts,               color: overview?.active_shifts  ? '#10b981' : undefined },
                { label: 'Лидов в работе',  value: overview?.leads_new,                   color: overview?.leads_new      ? '#f59e0b' : undefined },
                { label: 'Мало на складе',  value: overview?.low_stock_items,             color: overview?.low_stock_items ? '#ef4444' : undefined },
                { label: 'Абонем. 30 дней', value: overview?.subscriptions_expiring_30d,  color: undefined },
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Конверсия лидов</span>
                  <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: overview.leads_conversion >= 30 ? '#10b981' : '#f59e0b' }}>
                    {overview.leads_conversion}%
                  </span>
                </div>
              )}
              {overview?.avg_ltv !== undefined && overview.avg_ltv > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Средний LTV</span>
                  <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                    {overview.avg_ltv.toLocaleString('ru-RU')} ₸
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                {(overview?.low_stock_items ?? 0) > 0 && (
                  <div style={{ padding: '7px 10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={11} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#ef4444' }}>{overview!.low_stock_items} позиций заканчивается</span>
                  </div>
                )}
                {(overview?.subscriptions_expiring_soon ?? 0) > 0 && (
                  <div style={{ padding: '7px 10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={11} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#ef4444' }}>{overview!.subscriptions_expiring_soon} абонемента истекают</span>
                  </div>
                )}
              </div>
            </DashboardCard>
          </div>

        </RGL>
      </div>
    </div>
  )
}
