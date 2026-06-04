import { MessageSquare, Users, Bell, Share2 } from 'lucide-react'

const features = [
  { icon: MessageSquare, text: 'Личные и групповые чаты между сотрудниками филиала' },
  { icon: Users,         text: 'Создание групп, добавление участников' },
  { icon: Bell,          text: 'Уведомления внутри CRM о новых сообщениях' },
  { icon: Share2,        text: 'Шер лида — ссылка на карточку клиента в чат' },
]

export default function ChatPage() {
  return (
    <div>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 4 }}>
          Чат
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Внутренний чат сотрудников
        </p>
      </div>

      <div
        style={{
          maxWidth: 520,
          background: 'var(--bg-card)',
         
         
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 28,
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
            borderRadius: 16,
            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MessageSquare size={28} strokeWidth={1.5} color="var(--accent)" />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Чат</span>
            <span
              style={{
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 20,
              }}
            >
              v1.6.0
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>
            Внутренний мессенджер CRM с личными и групповыми чатами, реакциями и уведомлениями.
          </p>
        </div>

        <div
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
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
                <Icon size={14} strokeWidth={1.75} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Выйдет в{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>v1.6.0</span>
        </div>
      </div>
    </div>
  )
}
