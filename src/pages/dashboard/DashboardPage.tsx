import { Users, CreditCard, Calendar, Activity, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  color: string
  subtitle?: string
}

function KpiCard({ icon: Icon, label, value, color, subtitle }: KpiCardProps) {
  return (
    <div
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 21,
        padding: 21,
        display: 'flex',
        flexDirection: 'column',
        gap: 13,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} strokeWidth={1.75} color={color} />
      </div>
      <div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.2,
            marginBottom: 3,
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

function PlaceholderChart() {
  const bars = [40, 65, 50, 80, 70, 90, 75, 85, 60, 95, 70, 88, 55, 78]
  const max = Math.max(...bars)
  return (
    <div
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 21,
        padding: 21,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}
      >
        Посещаемость за 14 дней
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 21 }}>
        Данные будут доступны после подключения статистики
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          height: 80,
        }}
      >
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.round((h / max) * 100)}%`,
              background: i === bars.length - 1
                ? '#02BDB6'
                : 'rgba(2,189,182,0.25)',
              borderRadius: '3px 3px 0 0',
              minHeight: 4,
              transition: 'height 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function QuickStat({
  label,
  value,
  trend,
}: {
  label: string
  value: string
  trend?: 'up' | 'down'
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '13px 0',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {value}
        </span>
        {trend && (
          <TrendingUp
            size={12}
            strokeWidth={2}
            color={trend === 'up' ? '#10b981' : '#ef4444'}
            style={{
              transform: trend === 'down' ? 'scaleY(-1)' : undefined,
            }}
          />
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 21 }}>
        <h1
          style={{
            fontSize: 21,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            marginBottom: 4,
          }}
        >
          Дашборд
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            margin: 0,
            textTransform: 'capitalize',
          }}
        >
          {today}
        </p>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 13,
          marginBottom: 21,
        }}
      >
        <KpiCard
          icon={Users}
          label="Клиентов"
          value="—"
          color="#02BDB6"
          subtitle="Всего в базе"
        />
        <KpiCard
          icon={CreditCard}
          label="Абонементов"
          value="—"
          color="#263CD9"
          subtitle="Активных"
        />
        <KpiCard
          icon={Calendar}
          label="Тренировок"
          value="—"
          color="#02BDB6"
          subtitle="Сегодня по расписанию"
        />
        <KpiCard
          icon={Activity}
          label="Посещаемость"
          value="—%"
          color="#10b981"
          subtitle="За последние 7 дней"
        />
      </div>

      {/* Charts + Quick stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 13,
          alignItems: 'start',
        }}
      >
        <PlaceholderChart />

        {/* Quick stats panel */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 21,
            padding: 21,
            minWidth: 240,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}
          >
            Быстрая статистика
          </div>
          <QuickStat label="Новых клиентов сегодня" value="—" />
          <QuickStat label="Записей на сегодня"      value="—" />
          <QuickStat label="Истекает абонементов"    value="—" />
          <QuickStat label="Свободных мест сегодня"  value="—" />
          <div
            style={{
              paddingTop: 13,
              fontSize: 11,
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            Аналитика появится в v1.1
          </div>
        </div>
      </div>
    </div>
  )
}
