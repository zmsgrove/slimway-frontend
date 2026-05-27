import { CreditCard, Clock, Calendar, Layers } from 'lucide-react'

const features = [
  { icon: Layers,     text: 'До 2 слотов в абонементе — тип тренажёра, время, количество сеансов' },
  { icon: Clock,      text: 'Гибкий срок действия: неделя, месяц или произвольный период' },
  { icon: CreditCard, text: 'Привязка к клиенту и филиалу, история покупок' },
  { icon: Calendar,   text: 'Автоматическое списание сеансов при бронировании' },
]

export default function SubscriptionsPage() {
  return (
    <div>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
          Абонементы
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Управление абонементами клиентов
        </p>
      </div>

      <div
        style={{
          maxWidth: 520,
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 21,
          padding: 34,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 21,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 21,
            background: 'rgba(2,189,182,0.12)',
            border: '1px solid rgba(2,189,182,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CreditCard size={28} strokeWidth={1.5} color="#02BDB6" />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Абонементы</span>
            <span
              style={{
                background: 'rgba(2,189,182,0.12)',
                color: '#02BDB6',
                border: '1px solid rgba(2,189,182,0.25)',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 20,
              }}
            >
              v1.2.0
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>
            Система абонементов с гибкими слотами под типы тренажёров. Без абонемента — нет занятий.
          </p>
        </div>

        <div
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--glass-border)',
            borderRadius: 13,
            padding: '21px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 13,
            }}
          >
            Что будет доступно
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {features.map(({ icon: Icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Icon size={14} strokeWidth={1.75} color="#02BDB6" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Выйдет в{' '}
          <span style={{ color: '#02BDB6', fontWeight: 600 }}>v1.2.0</span>
        </div>
      </div>
    </div>
  )
}
