import React from 'react'
import {
  Users, CreditCard, DollarSign, Activity, TrendingUp,
  AlertTriangle, CheckSquare, Package, Target, UserCheck,
  Calendar, LineChart as LineChartIcon, BarChart2, AreaChart,
  Cake, ListTodo, UserPlus, Briefcase,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart as RAreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'
import { MetricWidget, formatNumber } from '../MetricWidget'
import { Widget } from '../Widget'
import { Skeleton } from '@/components/ui/skeleton'
import type { Badges, AnalyticsOverview, Client } from '../../../types'

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const tooltipStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text)',
}

interface WidgetBaseProps {
  editMode?: boolean
  onRemove?: (id: string) => void
  badges?: Badges
  overview?: AnalyticsOverview | null
  loading?: boolean
  birthdays?: Client[]
}

// ─── Metric widgets ──────────────────────────────────────────────────────────

export function WidgetClientsTotal({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  return (
    <MetricWidget id="clients_total" title="Клиентов всего" icon={<Users size={14} />}
      value={badges?.clients_total ?? 0} prevValue={badges?.clients_new_prev_month}
      sparkline={badges?.clients_by_day} editMode={editMode} onRemove={onRemove} loading={loading} />
  )
}

export function WidgetSubscriptionsActive({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  return (
    <MetricWidget id="subscriptions_active" title="Активных абонементов" icon={<CreditCard size={14} />}
      value={badges?.subscriptions_active ?? 0}
      prevValue={badges?.subscriptions_sold_prev_month}
      editMode={editMode} onRemove={onRemove} loading={loading} />
  )
}

export function WidgetRevenueMonth({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  return (
    <MetricWidget id="revenue_month" title="Выручка за месяц" icon={<DollarSign size={14} />}
      value={badges?.revenue_month ?? 0} prevValue={badges?.revenue_prev_month}
      sparkline={badges?.revenue_by_day}
      format={v => formatNumber(v)} suffix="₸"
      editMode={editMode} onRemove={onRemove} loading={loading} />
  )
}

export function WidgetVisitsToday({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  return (
    <MetricWidget id="visits_today" title="Посещений сегодня" icon={<Activity size={14} />}
      value={badges?.visits_today ?? 0} prevValue={badges?.visits_yesterday}
      sparkline={badges?.visits_by_day}
      editMode={editMode} onRemove={onRemove} loading={loading} />
  )
}

export function WidgetLeadsNew({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  const v = badges?.leads_new ?? 0
  return (
    <MetricWidget id="leads_new" title="Новых лидов" icon={<TrendingUp size={14} />}
      value={v} valueColor={v > 0 ? 'var(--color-warning)' : undefined}
      editMode={editMode} onRemove={onRemove} loading={loading} />
  )
}

export function WidgetSubscriptionsExpiring({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  const v = badges?.subscriptions_expiring_7d ?? 0
  return (
    <MetricWidget id="subscriptions_expiring" title="Истекают за 7 дней" icon={<AlertTriangle size={14} />}
      value={v} valueColor={v > 0 ? 'var(--color-danger)' : undefined}
      editMode={editMode} onRemove={onRemove} loading={loading} />
  )
}

export function WidgetTasksOverdue({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  const v = badges?.tasks_overdue ?? 0
  return (
    <MetricWidget id="tasks_overdue" title="Просроченных задач" icon={<CheckSquare size={14} />}
      value={v} valueColor={v > 0 ? 'var(--color-danger)' : undefined}
      editMode={editMode} onRemove={onRemove} loading={loading} />
  )
}

export function WidgetLowStock({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  const v = badges?.low_stock_items ?? 0
  return (
    <MetricWidget id="low_stock" title="Мало на складе" icon={<Package size={14} />}
      value={v} valueColor={v > 0 ? 'var(--color-danger)' : undefined}
      editMode={editMode} onRemove={onRemove} loading={loading} />
  )
}

export function WidgetLeadsConversion({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  const total     = badges?.leads_total_month ?? 0
  const converted = badges?.leads_converted_month ?? 0
  const pct       = total > 0 ? Math.round(converted / total * 100) : 0
  const color = pct >= 30 ? 'var(--color-success)' : pct >= 15 ? 'var(--color-warning)' : pct > 0 ? 'var(--color-danger)' : undefined
  return (
    <MetricWidget id="leads_conversion" title="Конверсия лидов" icon={<Target size={14} />}
      value={pct} suffix="%" valueColor={color} format={v => String(v)}
      editMode={editMode} onRemove={onRemove} loading={loading} />
  )
}

export function WidgetEmployeesOnShift({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  return (
    <MetricWidget id="employees_on_shift" title="Сотрудников на смене" icon={<UserCheck size={14} />}
      value={badges?.employees_on_shift ?? 0}
      editMode={editMode} onRemove={onRemove} loading={loading} />
  )
}

export function WidgetScheduleOccupancy({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  const total  = badges?.schedule_slots_today ?? 0
  const booked = badges?.schedule_slots_booked_today ?? 0
  const pct    = total > 0 ? Math.round(booked / total * 100) : 0

  return (
    <Widget id="schedule_occupancy" title="Загруженность сегодня" icon={<Calendar size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading}>
      {loading ? <Skeleton className="h-full w-full" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="tabular" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{booked}/{total}</span>
            <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--text-muted)' }}>{pct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--accent)', transition: 'width 300ms ease-out' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>слотов забронировано</span>
        </div>
      )}
    </Widget>
  )
}

// ─── Chart widgets ───────────────────────────────────────────────────────────

function fmtMonth(m: string) {
  const [y, mon] = m.split('-')
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
  return `${months[parseInt(mon)-1]} ${y.slice(2)}`
}

export function WidgetChartClients({ editMode, onRemove, overview, loading }: WidgetBaseProps) {
  const data = (overview?.clients_by_month ?? []).map(d => ({ ...d, month: fmtMonth(d.month) }))
  return (
    <Widget id="chart_clients" title="Новые клиенты" icon={<LineChartIcon size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading}>
      {loading ? <Skeleton className="h-full w-full rounded-lg" /> : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2}
              dot={{ fill: 'var(--accent)', r: 3 }} name="Клиентов"
              isAnimationActive={!prefersReducedMotion} animationDuration={300} />
          </LineChart>
        </ResponsiveContainer>
      ) : <EmptyChart />}
    </Widget>
  )
}

export function WidgetChartRevenue({ editMode, onRemove, overview, loading }: WidgetBaseProps) {
  const data = (overview?.revenue_by_month ?? []).map(d => ({ ...d, month: fmtMonth(d.month) }))
  const fmtY = (v: unknown) => {
    const n = Number(v)
    return n >= 1000 ? new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 0 }).format(n) : String(n)
  }
  return (
    <Widget id="chart_revenue" title="Выручка по месяцам" icon={<BarChart2 size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading}>
      {loading ? <Skeleton className="h-full w-full rounded-lg" /> : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={48} tickFormatter={fmtY} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${Number(v).toLocaleString('ru-RU')} ₸`, 'Выручка']} />
            <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Выручка"
              isAnimationActive={!prefersReducedMotion} animationDuration={300} />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyChart />}
    </Widget>
  )
}

export function WidgetChartVisits({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  const raw = badges?.visits_by_day ?? Array(7).fill(0)
  const today = new Date()
  const data = raw.map((v, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86400000)
    return { day: d.toLocaleDateString('ru-RU', { weekday: 'short' }), v }
  })
  return (
    <Widget id="chart_visits" title="Посещения (7 дней)" icon={<AreaChart size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading}>
      {loading ? <Skeleton className="h-full w-full rounded-lg" /> : (
        <ResponsiveContainer width="100%" height={300}>
          <RAreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={tooltipStyle} />
            <defs>
              <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="var(--accent)" fill="url(#visitsFill)" strokeWidth={2}
              name="Посещений" isAnimationActive={!prefersReducedMotion} animationDuration={300} />
          </RAreaChart>
        </ResponsiveContainer>
      )}
    </Widget>
  )
}

// ─── Analytics widgets ───────────────────────────────────────────────────────

const FUNNEL_LABELS: Record<string, string> = {
  new: 'Новый', in_work: 'В работе', waiting: 'Ждём', success: 'Успешно', fail: 'Отказ',
}
const FUNNEL_COLORS: Record<string, string> = {
  new: 'var(--color-info)', in_work: 'var(--color-warning)',
  waiting: 'color-mix(in srgb, var(--color-warning) 55%, var(--color-danger))',
  success: 'var(--color-success)', fail: 'var(--color-danger)',
}
const PIE_COLORS = ['var(--accent)', 'var(--color-info)', 'var(--color-warning)', 'var(--color-success)', 'var(--color-danger)', '#8b5cf6', '#ec4899']

export function WidgetLeadsFunnel({ editMode, onRemove, overview, loading }: WidgetBaseProps) {
  const data = (overview?.leads_funnel ?? []).map(d => ({
    name: FUNNEL_LABELS[d.status] ?? d.status, count: d.count,
    fill: FUNNEL_COLORS[d.status] ?? 'var(--text-muted)',
  }))
  return (
    <Widget id="leads_funnel" title="Воронка лидов" icon={<TrendingUp size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading}>
      {loading ? <Skeleton className="h-full w-full rounded-lg" /> : data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={62} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Лидов"
              isAnimationActive={!prefersReducedMotion} animationDuration={300}>
              {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyChart />}
    </Widget>
  )
}

export function WidgetLeadsSources({ editMode, onRemove, overview, loading }: WidgetBaseProps) {
  const data = (overview?.leads_by_source ?? []).map(d => ({ name: d.source, value: d.count }))
  return (
    <Widget id="leads_sources" title="Лиды по источникам" icon={<Briefcase size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading}>
      {loading ? <Skeleton className="h-full w-full rounded-lg" /> : data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="68%" paddingAngle={0}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
          </PieChart>
        </ResponsiveContainer>
      ) : <EmptyChart />}
    </Widget>
  )
}

// ─── List widgets ─────────────────────────────────────────────────────────────

export function WidgetBirthdays({ editMode, onRemove, birthdays, loading }: WidgetBaseProps) {
  return (
    <Widget id="birthdays" title="Именинники сегодня" icon={<Cake size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading} noPadding>
      {loading ? <div style={{ padding: '0 16px' }}><Skeleton className="h-full w-full" /></div> : (
        <div style={{ overflow: 'auto', height: '100%' }}>
          {!birthdays || birthdays.length === 0 ? (
            <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Именинников нет
            </div>
          ) : birthdays.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <div className="avatar-initials avatar-sm">{c.full_name.slice(0, 1)}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.full_name}</div>
                {c.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Widget>
  )
}

export function WidgetMyTasks({ editMode, onRemove, loading }: WidgetBaseProps) {
  return (
    <Widget id="my_tasks" title="Мои задачи на сегодня" icon={<ListTodo size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading}>
      {loading ? <Skeleton className="h-full w-full" /> : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 16 }}>
          Открыть раздел Задачи
        </div>
      )}
    </Widget>
  )
}

export function WidgetRecentLeads({ editMode, onRemove, loading }: WidgetBaseProps) {
  return (
    <Widget id="recent_leads" title="Последние лиды" icon={<TrendingUp size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading}>
      {loading ? <Skeleton className="h-full w-full" /> : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 16 }}>
          Открыть раздел Лиды
        </div>
      )}
    </Widget>
  )
}

export function WidgetRecentClients({ editMode, onRemove, loading }: WidgetBaseProps) {
  return (
    <Widget id="recent_clients" title="Новые клиенты" icon={<UserPlus size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading}>
      {loading ? <Skeleton className="h-full w-full" /> : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 16 }}>
          Открыть раздел Клиенты
        </div>
      )}
    </Widget>
  )
}

export function WidgetScheduleToday({ editMode, onRemove, badges, loading }: WidgetBaseProps) {
  return (
    <Widget id="schedule_today" title="Расписание сегодня" icon={<Calendar size={14} />}
      editMode={editMode} onRemove={onRemove} loading={loading}>
      {loading ? <Skeleton className="h-full w-full" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Всего слотов</span>
            <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{badges?.schedule_slots_today ?? 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Забронировано</span>
            <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)' }}>{badges?.schedule_slots_booked_today ?? 0}</span>
          </div>
        </div>
      )}
    </Widget>
  )
}

function EmptyChart() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных</span>
    </div>
  )
}

// ─── Widget registry ─────────────────────────────────────────────────────────

export const WIDGET_META: Record<string, { label: string; defaultW: number; defaultH: number; minW: number; minH: number }> = {
  clients_total:         { label: 'Клиентов всего',       defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  subscriptions_active:  { label: 'Активных абонементов', defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  revenue_month:         { label: 'Выручка за месяц',     defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  visits_today:          { label: 'Посещений сегодня',    defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  leads_new:             { label: 'Новых лидов',          defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  subscriptions_expiring:{ label: 'Истекают за 7 дней',  defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  tasks_overdue:         { label: 'Просроченных задач',   defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  low_stock:             { label: 'Мало на складе',       defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  leads_conversion:      { label: 'Конверсия лидов',      defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  employees_on_shift:    { label: 'Сотрудников на смене', defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  schedule_occupancy:    { label: 'Загруженность',        defaultW: 6, defaultH: 2, minW: 4, minH: 2 },
  chart_clients:         { label: 'График: клиенты',      defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  chart_revenue:         { label: 'График: выручка',      defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  chart_visits:          { label: 'График: посещения',    defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  leads_funnel:          { label: 'Воронка лидов',        defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  leads_sources:         { label: 'Лиды по источникам',   defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  birthdays:             { label: 'Именинники',           defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  schedule_today:        { label: 'Расписание сегодня',   defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  my_tasks:              { label: 'Мои задачи',           defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  recent_leads:          { label: 'Последние лиды',       defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  recent_clients:        { label: 'Новые клиенты',        defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
}
