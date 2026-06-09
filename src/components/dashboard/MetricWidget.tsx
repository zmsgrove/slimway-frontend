import React, { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { Widget } from './Widget'
import { Skeleton } from '@/components/ui/skeleton'

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function formatNumber(v: number): string {
  if (v >= 1_000_000) return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
  if (v >= 10_000)    return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 0 }).format(v)
  return new Intl.NumberFormat('ru-RU').format(v)
}

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0 && current === 0) return null
  const delta = prev === 0 ? (current > 0 ? 100 : 0) : ((current - prev) / prev * 100)
  const abs = Math.abs(delta).toFixed(1)

  const color = delta > 0 ? 'var(--color-success)' : delta < 0 ? 'var(--color-danger)' : 'var(--text-muted)'
  const bg    = delta > 0 ? 'var(--color-success-muted)' : delta < 0 ? 'var(--color-danger-muted)' : 'color-mix(in srgb, var(--border) 60%, transparent)'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
      background: bg, color,
    }}>
      {delta > 0 ? <TrendingUp size={9} /> : delta < 0 ? <TrendingDown size={9} /> : <Minus size={9} />}
      {delta > 0 ? '+' : delta < 0 ? '-' : ''}{abs}%
    </span>
  )
}

function MiniSparkline({ data, color = 'var(--accent)' }: { data: number[]; color?: string }) {
  const chartData = data.map((v, i) => ({ v, i }))
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Line
          type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          dot={false} isAnimationActive={!prefersReducedMotion} animationDuration={300}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface MetricWidgetProps {
  id: string
  title: string
  icon: React.ReactNode
  value: number
  prevValue?: number
  sparkline?: number[]
  sparklineColor?: string
  valueColor?: string
  suffix?: string
  format?: (v: number) => string
  editMode?: boolean
  onRemove?: (id: string) => void
  loading?: boolean
}

export function MetricWidget({
  id, title, icon, value, prevValue, sparkline, sparklineColor,
  valueColor, suffix, format = formatNumber, editMode, onRemove, loading,
}: MetricWidgetProps) {
  const displayValue = useMemo(() => format(value) + (suffix ? ` ${suffix}` : ''), [value, format, suffix])

  return (
    <Widget id={id} title={title} icon={icon} editMode={editMode} onRemove={onRemove} loading={loading}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%' }}>
        {loading ? (
          <>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-14" />
          </>
        ) : (
          <>
            <div className="tabular" style={{
              fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
              color: valueColor ?? 'var(--text)',
            }}>
              {displayValue}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 16 }}>
              {prevValue !== undefined && (
                <DeltaBadge current={value} prev={prevValue} />
              )}
              {prevValue !== undefined && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>vs прошлый мес.</span>
              )}
            </div>
            {sparkline && sparkline.length > 0 && (
              <div style={{ flex: 1, minHeight: 32 }}>
                <MiniSparkline data={sparkline} color={sparklineColor ?? valueColor ?? 'var(--accent)'} />
              </div>
            )}
          </>
        )}
      </div>
    </Widget>
  )
}
