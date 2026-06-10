import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactGridLayout, { WidthProvider } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Settings, Check, X as XIcon, Plus, Cake } from 'lucide-react'
import { analyticsApi } from '../../api/analytics.api'
import { badgesApi } from '../../api/badges.api'
import { clientsApi } from '../../api/clients.api'
import { useAuth } from '../../hooks/useAuth'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import { useDashboardLayout } from '../../hooks/useDashboardLayout'
import { usePermissions } from '../../hooks/usePermissions'
import { BranchSelector } from '../../components/ui/BranchSelector'
import { PeriodFilter } from '../../components/ui/PeriodFilter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AnalyticsOverview, AnalyticsBranchRow, Badges, Client, DashboardLayoutItem } from '../../types'
import {
  WidgetClientsTotal, WidgetSubscriptionsActive, WidgetRevenueMonth, WidgetVisitsToday,
  WidgetLeadsNew, WidgetSubscriptionsExpiring, WidgetTasksOverdue, WidgetLowStock,
  WidgetLeadsConversion, WidgetEmployeesOnShift, WidgetScheduleOccupancy,
  WidgetChartClients, WidgetChartRevenue, WidgetChartVisits,
  WidgetLeadsFunnel, WidgetLeadsSources,
  WidgetBirthdays, WidgetMyTasks, WidgetRecentLeads, WidgetRecentClients, WidgetScheduleToday,
  WIDGET_META,
} from '../../components/dashboard/widgets'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RGL = WidthProvider(ReactGridLayout) as React.ComponentType<any>

// ─── Permission map ───────────────────────────────────────────────────────────

const WIDGET_PERMISSIONS: Record<string, [string, string]> = {
  clients_total:          ['clients',       'read'],
  subscriptions_active:   ['subscriptions', 'read'],
  revenue_month:          ['analytics',     'read'],
  visits_today:           ['schedule',      'read'],
  leads_new:              ['leads',         'read'],
  subscriptions_expiring: ['subscriptions', 'read'],
  tasks_overdue:          ['tasks',         'read'],
  low_stock:              ['warehouse',     'read'],
  leads_conversion:       ['leads',         'read'],
  employees_on_shift:     ['shifts',        'read'],
  schedule_occupancy:     ['schedule',      'read'],
  chart_clients:          ['clients',       'read'],
  chart_revenue:          ['analytics',     'read'],
  chart_visits:           ['schedule',      'read'],
  leads_funnel:           ['leads',         'read'],
  leads_sources:          ['leads',         'read'],
  birthdays:              ['clients',       'read'],
  schedule_today:         ['schedule',      'read'],
  my_tasks:               ['tasks',         'read'],
  recent_leads:           ['leads',         'read'],
  recent_clients:         ['clients',       'read'],
}

// ─── Widget renderer ──────────────────────────────────────────────────────────

interface WidgetProps {
  editMode: boolean
  onRemove: (id: string) => void
  badges?: Badges
  overview?: AnalyticsOverview | null
  loading: boolean
  birthdays?: Client[]
}

function renderWidget(id: string, props: WidgetProps): React.ReactNode {
  switch (id) {
    case 'clients_total':         return <WidgetClientsTotal         {...props} />
    case 'subscriptions_active':  return <WidgetSubscriptionsActive  {...props} />
    case 'revenue_month':         return <WidgetRevenueMonth         {...props} />
    case 'visits_today':          return <WidgetVisitsToday          {...props} />
    case 'leads_new':             return <WidgetLeadsNew             {...props} />
    case 'subscriptions_expiring':return <WidgetSubscriptionsExpiring{...props} />
    case 'tasks_overdue':         return <WidgetTasksOverdue         {...props} />
    case 'low_stock':             return <WidgetLowStock             {...props} />
    case 'leads_conversion':      return <WidgetLeadsConversion      {...props} />
    case 'employees_on_shift':    return <WidgetEmployeesOnShift     {...props} />
    case 'schedule_occupancy':    return <WidgetScheduleOccupancy    {...props} />
    case 'chart_clients':         return <WidgetChartClients         {...props} />
    case 'chart_revenue':         return <WidgetChartRevenue         {...props} />
    case 'chart_visits':          return <WidgetChartVisits          {...props} />
    case 'leads_funnel':          return <WidgetLeadsFunnel          {...props} />
    case 'leads_sources':         return <WidgetLeadsSources         {...props} />
    case 'birthdays':             return <WidgetBirthdays            {...props} />
    case 'my_tasks':              return <WidgetMyTasks              {...props} />
    case 'recent_leads':          return <WidgetRecentLeads          {...props} />
    case 'recent_clients':        return <WidgetRecentClients        {...props} />
    case 'schedule_today':        return <WidgetScheduleToday        {...props} />
    default:                      return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTodayBirthday(d: string | null | undefined): boolean {
  if (!d) return false
  const bd = new Date(d + 'T00:00:00')
  const now = new Date()
  return bd.getDate() === now.getDate() && bd.getMonth() === now.getMonth()
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const {
    layout, widgets, isLoading: layoutLoading, isSaving,
    updateLayout, addWidget, removeWidget, saveNow, resetAll,
  } = useDashboardLayout()

  const { period, customFrom, customTo, dateFromStr, dateToStr, setPeriod, remember, setRemember } = usePeriodFilter('dashboard')

  const [selectedBranches, setSelectedBranches] = useState<string[]>(() => {
    const id = localStorage.getItem('activeBranchId')
    return id ? [id] : []
  })

  const [overview, setOverview]   = useState<AnalyticsOverview | null>(null)
  const [badges,   setBadges]     = useState<Badges | null>(null)
  const [birthdays, setBirthdays] = useState<Client[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const [editMode,   setEditMode]   = useState(false)
  const [toast,      setToast]      = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapshot   = useRef<{ layout: DashboardLayoutItem[]; widgets: string[] } | null>(null)

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    badgesApi.get().then(setBadges).catch(() => {})
  }, [selectedBranches])

  useEffect(() => {
    if (can('clients', 'read')) {
      clientsApi.getAll()
        .then(all => setBirthdays(all.filter(c => isTodayBirthday(c.birth_date))))
        .catch(() => {})
    }
  }, [can])

  useEffect(() => {
    setDataLoading(true)
    analyticsApi.getOverview({
      branch_ids: selectedBranches.length > 0 ? selectedBranches : undefined,
      from: dateFromStr,
      to: dateToStr,
    })
      .then(setOverview)
      .catch(() => {})
      .finally(() => setDataLoading(false))
  }, [selectedBranches, dateFromStr, dateToStr])

  // ── Toast helper ────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Edit mode ───────────────────────────────────────────────────────────────

  const handleEnterEdit = useCallback(() => {
    snapshot.current = { layout: [...layout], widgets: [...widgets] }
    setEditMode(true)
  }, [layout, widgets])

  const handleSave = useCallback(async () => {
    await saveNow()
    snapshot.current = null
    setEditMode(false)
    showToast('Раскладка сохранена')
  }, [saveNow, showToast])

  const handleCancel = useCallback(() => {
    if (snapshot.current) {
      resetAll(snapshot.current)
      snapshot.current = null
    }
    setEditMode(false)
  }, [resetAll])

  const handleAddWidget = useCallback((id: string) => {
    const meta = WIDGET_META[id]
    if (!meta) return
    const maxY = layout.reduce((acc, l) => Math.max(acc, l.y + l.h), 0)
    addWidget(id, { x: 0, y: maxY, w: meta.defaultW, h: meta.defaultH, minW: meta.minW, minH: meta.minH })
  }, [layout, addWidget])

  // ── Derived data ────────────────────────────────────────────────────────────

  const visibleWidgets = widgets.filter(id => {
    const perm = WIDGET_PERMISSIONS[id]
    return !perm || can(perm[0], perm[1])
  })

  const renderableWidgets = visibleWidgets.filter(id => layout.some(l => l.i === id))

  const addableWidgets = Object.keys(WIDGET_META).filter(id => {
    if (widgets.includes(id)) return false
    const perm = WIDGET_PERMISSIONS[id]
    return !perm || can(perm[0], perm[1])
  })

  const byBranch: AnalyticsBranchRow[] = overview?.by_branch ?? []

  const widgetProps: WidgetProps = {
    editMode,
    onRemove: removeWidget,
    badges:   badges ?? undefined,
    overview,
    loading:  dataLoading || layoutLoading,
    birthdays,
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <PeriodFilter
            period={period} customFrom={customFrom} customTo={customTo} remember={remember}
            onChange={setPeriod} onRememberChange={setRemember}
          />
          {user?.role && (
            <BranchSelector role={user.role} selectedIds={selectedBranches} onChange={setSelectedBranches} />
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {editMode ? (
            <>
              <button
                onClick={handleCancel}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  transition: 'color 150ms ease-out, border-color 150ms ease-out',
                }}
              >
                <XIcon size={12} />
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                  fontSize: 12, fontWeight: 500, cursor: isSaving ? 'default' : 'pointer',
                  background: 'var(--accent)', border: '1px solid var(--accent)',
                  color: 'var(--accent-fg)',
                  transition: 'opacity 150ms ease-out',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                <Check size={12} />
                {isSaving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </>
          ) : (
            <button
              onClick={handleEnterEdit}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text)',
                transition: 'color 150ms ease-out, border-color 150ms ease-out',
              }}
            >
              <Settings size={12} />
              Настроить
            </button>
          )}
        </div>
      </div>

      {/* ── Birthday banner ── */}
      {birthdays.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--color-warning) 5%, var(--bg-card))',
          border: '1px solid color-mix(in srgb, var(--color-warning) 25%, var(--border))',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Cake size={15} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-warning)' }}>
            Именинники сегодня:&nbsp;
            <strong style={{ fontWeight: 600 }}>{birthdays.map(c => c.full_name).join(', ')}</strong>
          </span>
        </div>
      )}

      {/* ── Branch breakdown (multi-branch only) ── */}
      {byBranch.length > 1 && (
        <Card>
          <CardHeader style={{ paddingBottom: 8 }}>
            <CardTitle style={{ fontSize: 13 }}>Разбивка по филиалам</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Филиал', 'Клиентов', 'Абонементов', 'Новых клиентов'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {byBranch.map(row => (
                  <tr key={row.branch_id}>
                    <td style={{ fontWeight: 500 }}>{row.branch_name}</td>
                    <td className="tabular" style={{ color: 'var(--accent)', fontWeight: 600 }}>{row.clients_total}</td>
                    <td className="tabular" style={{ color: 'var(--color-info)', fontWeight: 600 }}>{row.subscriptions_active}</td>
                    <td className="tabular" style={{ color: row.leads_new > 0 ? 'var(--color-warning)' : 'var(--text-muted)', fontWeight: row.leads_new > 0 ? 600 : 400 }}>{row.leads_new}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Add widget panel ── */}
      {editMode && addableWidgets.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 12, padding: '12px 16px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Добавить виджет
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {addableWidgets.map(id => (
              <button
                key={id}
                onClick={() => handleAddWidget(id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  transition: 'color 150ms ease-out, border-color 150ms ease-out, background 150ms ease-out',
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.color = 'var(--accent)'
                  b.style.borderColor = 'var(--accent)'
                  b.style.background = 'var(--accent-muted)'
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.color = 'var(--text-muted)'
                  b.style.borderColor = 'var(--border)'
                  b.style.background = 'transparent'
                }}
              >
                <Plus size={10} />
                {WIDGET_META[id].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Widget grid ── */}
      {layoutLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} style={{ height: 160, borderRadius: 12 }} />
          ))}
        </div>
      ) : renderableWidgets.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          color: 'var(--text-muted)', fontSize: 14,
        }}>
          {editMode
            ? 'Добавьте виджеты через панель выше'
            : 'Нет виджетов. Нажмите «Настроить» для добавления.'}
        </div>
      ) : (
        <div className={editMode ? 'dashboard-edit-mode' : ''} style={{ margin: '0 -4px' }}>
          <RGL
            layout={renderableWidgets.map(id => layout.find(l => l.i === id)!)}
            cols={12}
            rowHeight={80}
            margin={[16, 16]}
            isDraggable={editMode}
            isResizable={editMode}
            resizeHandles={['se']}
            draggableHandle=".drag-handle"
            onLayoutChange={(newLayout: DashboardLayoutItem[]) => updateLayout(newLayout)}
            useCSSTransforms={true}
          >
            {renderableWidgets.map(id => (
              <div key={id} style={{ height: '100%' }}>
                {renderWidget(id, widgetProps)}
              </div>
            ))}
          </RGL>
        </div>
      )}

      {/* ── Save toast ── */}
      {toast && (
        <div
          className="toast-animate"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            fontSize: 13, fontWeight: 500, color: 'var(--text)',
          }}
        >
          <Check size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
          {toast}
        </div>
      )}

    </div>
  )
}
