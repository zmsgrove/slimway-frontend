import { Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']

export default function SchedulePage() {
  const today = new Date()
  const monthLabel = today.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 21,
          gap: 13,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 21,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              marginBottom: 4,
            }}
          >
            Расписание
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, textTransform: 'capitalize' }}>
            {monthLabel}
          </p>
        </div>

        <button
          disabled
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            padding: '0 21px',
            background: '#02BDB6',
            border: 'none',
            borderRadius: 8,
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'not-allowed',
            opacity: 0.5,
            flexShrink: 0,
          }}
        >
          <Plus size={15} strokeWidth={2} />
          Добавить тренировку
        </button>
      </div>

      {/* Week navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 13,
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 13,
          padding: '8px 13px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            border: '1px solid var(--glass-border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          Текущая неделя
        </span>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            border: '1px solid var(--glass-border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Calendar grid placeholder */}
      <div
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 21,
          overflow: 'hidden',
        }}
      >
        {/* Day headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '50px repeat(7, 1fr)',
            borderBottom: '1px solid var(--glass-border)',
          }}
        >
          <div />
          {DAYS.map(d => (
            <div
              key={d}
              style={{
                padding: '13px 8px',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                borderLeft: '1px solid var(--glass-border)',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Hour rows */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {HOURS.map(hour => (
            <div
              key={hour}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px repeat(7, 1fr)',
                borderBottom: '1px solid var(--glass-border)',
              }}
            >
              <div
                style={{
                  padding: '8px 6px',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {hour}
              </div>
              {DAYS.map(d => (
                <div
                  key={d}
                  style={{
                    height: 48,
                    borderLeft: '1px solid var(--glass-border)',
                    cursor: 'default',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Empty state overlay */}
        <div
          style={{
            padding: 34,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            borderTop: '1px solid var(--glass-border)',
          }}
        >
          <Calendar
            size={24}
            strokeWidth={1.5}
            color="var(--text-muted)"
            style={{ marginBottom: 8 }}
          />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Тренировки появятся здесь после подключения расписания
          </div>
        </div>
      </div>
    </div>
  )
}
