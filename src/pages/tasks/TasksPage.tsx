import { CheckSquare, Users, Clock, Flag, MessageSquare } from 'lucide-react'

const features = [
  { icon: CheckSquare,   text: 'Канбан доска: Новая → В работе → На проверке → Выполнена' },
  { icon: Users,         text: 'Постановщик и исполнитель — назначение задач сотрудникам' },
  { icon: Clock,         text: 'Дедлайны с напоминаниями и визуальным индикатором просрочки' },
  { icon: Flag,          text: 'Приоритеты: высокий, средний, низкий' },
  { icon: MessageSquare, text: 'Чек-листы и комментарии внутри задачи' },
]

export default function TasksPage() {
  return (
    <div>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
          Задачи
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Канбан доска для командной работы
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
          <CheckSquare size={28} strokeWidth={1.5} color="#02BDB6" />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Задачи</span>
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
              v1.5.0
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>
            Канбан доска между сотрудниками филиала с приоритетами, дедлайнами и комментариями.
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
          <span style={{ color: '#02BDB6', fontWeight: 600 }}>v1.5.0</span>
        </div>
      </div>
    </div>
  )
}
