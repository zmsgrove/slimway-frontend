import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { VERSION } from '../../version'

const FEATURES = [
  {
    icon: '👥',
    title: 'Клиенты',
    desc: 'База клиентов, история посещений и управление абонементами',
  },
  {
    icon: '🎟️',
    title: 'Абонементы',
    desc: 'По занятиям, безлимитные и на период — гибкая настройка',
  },
  {
    icon: '📅',
    title: 'Расписание',
    desc: 'Тренировки, запись клиентов и отметка посещений',
  },
  {
    icon: '🏢',
    title: 'Мультифилиал',
    desc: 'Изолированные данные по каждому филиалу сети',
  },
]

const inputBase: React.CSSProperties = {
  height: 40,
  padding: '0 13px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#FFFFFF',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
  transition: 'border-color 0.18s',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }
    navigate('/dashboard')
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#02BDB6'
  }
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 25% 30%, rgba(2,189,182,0.07) 0%, #09090B 55%), radial-gradient(ellipse at 80% 75%, rgba(38,60,217,0.05) 0%, transparent 60%)',
        backgroundColor: '#09090B',
      }}
    >
      {/* Left — login form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 21,
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Brand */}
          <div style={{ marginBottom: 34 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: '#02BDB6',
                  letterSpacing: 0.5,
                }}
              >
                Slimway
              </span>
              <span
                style={{
                  background: 'rgba(2,189,182,0.15)',
                  color: '#02BDB6',
                  border: '1px solid rgba(2,189,182,0.3)',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 8,
                  letterSpacing: 1,
                }}
              >
                CRM
              </span>
            </div>
            <p style={{ color: '#71717A', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Управляйте фитнес-сетью эффективно
            </p>
          </div>

          {/* Form card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 21,
              padding: 34,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#FFFFFF',
                marginBottom: 21,
              }}
            >
              Войти в систему
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8,
                  color: '#ef4444',
                  fontSize: 13,
                  padding: '10px 13px',
                  marginBottom: 13,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    color: '#71717A',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase' as const,
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@slimway.ru"
                  style={inputBase}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    color: '#71717A',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase' as const,
                  }}
                >
                  Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void handleLogin()
                  }}
                  placeholder="••••••••"
                  style={inputBase}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>

            <button
              onClick={() => void handleLogin()}
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                height: 42,
                marginTop: 21,
                borderRadius: 8,
                border: 'none',
                background: loading ? 'rgba(2,189,182,0.5)' : '#02BDB6',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                transition: 'all 0.18s',
                letterSpacing: 0.3,
              }}
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </div>

          <div
            style={{
              textAlign: 'center',
              marginTop: 21,
              color: '#3F3F46',
              fontSize: 11,
            }}
          >
            Slimway CRM · <span style={{ color: '#02BDB6' }}>v{VERSION}</span> · 2026
          </div>
        </div>
      </div>

      {/* Right — features panel (hidden on small screens via CSS) */}
      <div
        className="login-panel-right"
        style={{
          width: 360,
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          padding: '55px 34px',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: 4,
          }}
        >
          Возможности системы
        </div>
        <div style={{ color: '#71717A', fontSize: 12, marginBottom: 34, lineHeight: 1.5 }}>
          Всё необходимое для управления фитнес-сетью
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 21 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 13 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  background: 'rgba(2,189,182,0.08)',
                  border: '1px solid rgba(2,189,182,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    marginBottom: 3,
                  }}
                >
                  {f.title}
                </div>
                <div style={{ fontSize: 12, color: '#71717A', lineHeight: 1.6 }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 34,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(2,189,182,0.08)',
              border: '1px solid rgba(2,189,182,0.15)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              color: '#02BDB6',
            }}
          >
            <span>●</span> Система работает
          </div>
        </div>
      </div>
    </div>
  )
}
