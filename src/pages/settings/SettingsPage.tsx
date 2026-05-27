import React from 'react'
import { User, Palette, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'
import type { Theme } from '../../lib/theme'

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <div
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 21,
        overflow: 'hidden',
        marginBottom: 13,
      }}
    >
      <div
        style={{
          padding: '13px 21px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {icon}
        {title}
      </div>
      <div style={{ padding: '21px' }}>{children}</div>
    </div>
  )
}

interface InfoRowProps {
  label: string
  children: React.ReactNode
}

function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div>{children}</div>
    </div>
  )
}

const roleLabel: Record<string, string> = {
  owner:      'Владелец',
  franchisee: 'Франчайзи',
  admin:      'Администратор',
  trainer:    'Тренер',
}

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'dark',
    label: 'Тёмная',
    icon: <Moon size={15} strokeWidth={1.75} />,
  },
  {
    value: 'light',
    label: 'Светлая',
    icon: <Sun size={15} strokeWidth={1.75} />,
  },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const handleTheme = (t: Theme) => {
    if (!user) return
    void setTheme(t, user.id)
  }

  return (
    <div style={{ maxWidth: 600 }}>
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
          Настройки
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Персональные настройки интерфейса
        </p>
      </div>

      {/* Profile */}
      <Section
        title="Профиль"
        icon={<User size={15} strokeWidth={1.75} color="#02BDB6" />}
      >
        <div>
          <InfoRow label="Email">
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              {user?.email ?? '—'}
            </span>
          </InfoRow>

          {user?.fullName && (
            <InfoRow label="Имя">
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                {user.fullName}
              </span>
            </InfoRow>
          )}

          <InfoRow label="Роль">
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#02BDB6',
                background: 'rgba(2,189,182,0.10)',
                border: '1px solid rgba(2,189,182,0.20)',
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              {user?.role ? (roleLabel[user.role] ?? user.role) : '—'}
            </span>
          </InfoRow>
        </div>
      </Section>

      {/* Theme */}
      <Section
        title="Оформление"
        icon={<Palette size={15} strokeWidth={1.75} color="#02BDB6" />}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginBottom: 13,
            }}
          >
            Цветовая схема интерфейса. Сохраняется в профиле.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {themeOptions.map(opt => {
              const isActive = theme === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handleTheme(opt.value)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '13px',
                    borderRadius: 13,
                    border: isActive
                      ? '1px solid #02BDB6'
                      : '1px solid var(--glass-border)',
                    background: isActive
                      ? 'rgba(2,189,182,0.10)'
                      : 'transparent',
                    color: isActive ? '#02BDB6' : 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  {opt.icon}
                  {opt.label}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#02BDB6',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      {/* App info */}
      <div
        style={{
          padding: '13px 21px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 21,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Slimway CRM</span>
        <span
          style={{
            fontSize: 11,
            color: '#02BDB6',
            background: 'rgba(2,189,182,0.08)',
            border: '1px solid rgba(2,189,182,0.15)',
            padding: '2px 8px',
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          v1.0.0
        </span>
      </div>
    </div>
  )
}
