import { Users, Search, Plus } from 'lucide-react'

export default function ClientsPage() {
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
            Клиенты
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Управление базой клиентов
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
          Добавить клиента
        </button>
      </div>

      {/* Search bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 40,
          padding: '0 13px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 8,
          marginBottom: 13,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <Search size={15} strokeWidth={1.75} color="var(--text-muted)" />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Поиск по имени, телефону или email...
        </span>
      </div>

      {/* Empty state */}
      <div
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 21,
          padding: 55,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 300,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 21,
            background: 'rgba(2,189,182,0.08)',
            border: '1px solid rgba(2,189,182,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 13,
          }}
        >
          <Users size={24} strokeWidth={1.5} color="#02BDB6" />
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}
        >
          В разработке
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            maxWidth: 340,
            lineHeight: 1.6,
          }}
        >
          Список клиентов с поиском, фильтрами и управлением абонементами
          появится в следующем обновлении
        </div>
      </div>
    </div>
  )
}
