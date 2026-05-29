import React, { useState, useEffect, useRef } from 'react'
import { User, Palette, Sun, Moon, Bell, Volume2, VolumeX, Play } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'
import type { Theme } from '../../lib/theme'
import { VERSION } from '../../version'

// ─── shared ────────────────────────────────────────────────────────────────────

interface SectionProps { title: string; icon: React.ReactNode; children: React.ReactNode }
function Section({ title, icon, children }: SectionProps) {
  return (
    <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, overflow: 'hidden', marginBottom: 13 }}>
      <div style={{ padding: '13px 21px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
        {icon}{title}
      </div>
      <div style={{ padding: 21 }}>{children}</div>
    </div>
  )
}

interface InfoRowProps { label: string; children: React.ReactNode }
function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div>{children}</div>
    </div>
  )
}

// ─── constants ─────────────────────────────────────────────────────────────────

const roleLabel: Record<string, string> = {
  developer: 'Разработчик', owner: 'Владелец', franchisee: 'Франчайзи',
  admin: 'Администратор', trainer: 'Тренер', staff: 'Менеджер', technical: 'Тех. персонал',
}

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'dark',  label: 'Тёмная',  icon: <Moon size={15} strokeWidth={1.75} /> },
  { value: 'light', label: 'Светлая', icon: <Sun  size={15} strokeWidth={1.75} /> },
]

const SOUND_FILES = ['OK.mp3', '2toon.mp3', 'classic.mp3', 'crash.mp3', 'disck.mp3', 'error.mp3', 'hw.mp3', 'old.mp3', 'old2.mp3', 'rim.mp3', 'steam.mp3', 'toon.mp3']

const SOUND_EVENTS: { key: string; label: string }[] = [
  { key: 'new_lead',        label: 'Новый лид' },
  { key: 'new_task',        label: 'Новая задача' },
  { key: 'task_assigned',   label: 'Назначена задача' },
  { key: 'booking_created', label: 'Бронь создана' },
  { key: 'subscription_sold', label: 'Абонемент продан' },
  { key: 'low_stock',       label: 'Низкий остаток' },
]

interface NotificationSettings {
  muted: boolean
  volume: number
  events: Record<string, string>
}

function loadSettings(): NotificationSettings {
  try { return { muted: false, volume: 80, events: {}, ...JSON.parse(localStorage.getItem('notificationSettings') || '{}') } } catch { return { muted: false, volume: 80, events: {} } }
}

// ─── NotificationsSection ──────────────────────────────────────────────────────

function NotificationsSection() {
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const save = (patch: Partial<NotificationSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    localStorage.setItem('notificationSettings', JSON.stringify(next))
  }

  const previewSound = (file: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    const audio = new Audio('/sound/' + file)
    audio.volume = settings.volume / 100
    audio.play().catch(() => { /* ignore */ })
    audioRef.current = audio
  }

  const setEventSound = (key: string, file: string) => {
    save({ events: { ...settings.events, [key]: file } })
  }

  const selectStyle: React.CSSProperties = {
    height: 32, padding: '0 8px', background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)', borderRadius: 8,
    color: 'var(--text-primary)', fontSize: 12, outline: 'none', cursor: 'pointer',
  }

  return (
    <Section title="Уведомления" icon={<Bell size={15} strokeWidth={1.75} color="#02BDB6" />}>
      {/* Mute toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)', marginBottom: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {settings.muted ? <VolumeX size={16} color="var(--text-muted)" /> : <Volume2 size={16} color="#02BDB6" />}
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{settings.muted ? 'Без звука' : 'Звук включён'}</span>
        </div>
        <button
          onClick={() => save({ muted: !settings.muted })}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
            background: settings.muted ? 'var(--glass-border)' : '#02BDB6', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            left: settings.muted ? 2 : 22,
          }} />
        </button>
      </div>

      {/* Volume slider */}
      <div style={{ marginBottom: 21 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Громкость</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#02BDB6' }}>{settings.volume}%</span>
        </div>
        <input
          type="range" min={0} max={100} value={settings.volume}
          onChange={e => save({ volume: Number(e.target.value) })}
          style={{ width: '100%', accentColor: '#02BDB6', cursor: 'pointer' }}
          disabled={settings.muted}
        />
      </div>

      {/* Events table */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Событие → Звук
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SOUND_EVENTS.map(ev => {
          const current = settings.events[ev.key] || 'OK.mp3'
          return (
            <div key={ev.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{ev.label}</span>
              <select value={current} onChange={e => setEventSound(ev.key, e.target.value)} style={selectStyle}>
                {SOUND_FILES.map(f => <option key={f} value={f}>{f.replace('.mp3', '')}</option>)}
              </select>
              <button
                onClick={() => previewSound(current)}
                disabled={settings.muted}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: '#02BDB6', cursor: settings.muted ? 'not-allowed' : 'pointer', opacity: settings.muted ? 0.4 : 1 }}
              >
                <Play size={12} />
              </button>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const handleTheme = (t: Theme) => {
    if (!user) return
    void setTheme(t, user.id)
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Настройки</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Личные настройки</p>
      </div>

      <Section title="Профиль" icon={<User size={15} strokeWidth={1.75} color="#02BDB6" />}>
        <div>
          <InfoRow label="Email">
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.email ?? '—'}</span>
          </InfoRow>
          {user?.fullName && (
            <InfoRow label="Имя">
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{user.fullName}</span>
            </InfoRow>
          )}
          <InfoRow label="Роль">
            <span style={{ fontSize: 12, fontWeight: 600, color: '#02BDB6', background: 'rgba(2,189,182,0.10)', border: '1px solid rgba(2,189,182,0.20)', padding: '2px 8px', borderRadius: 6 }}>
              {user?.role ? (roleLabel[user.role] ?? user.role) : '—'}
            </span>
          </InfoRow>
        </div>
      </Section>

      <Section title="Оформление" icon={<Palette size={15} strokeWidth={1.75} color="#02BDB6" />}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 13 }}>
            Цветовая схема интерфейса. Сохраняется в профиле.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {themeOptions.map(opt => {
              const isActive = theme === opt.value
              return (
                <button key={opt.value} onClick={() => handleTheme(opt.value)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 13, border: isActive ? '1px solid #02BDB6' : '1px solid var(--glass-border)', background: isActive ? 'rgba(2,189,182,0.10)' : 'transparent', color: isActive ? '#02BDB6' : 'var(--text-secondary)', fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
                  {opt.icon}{opt.label}
                  {isActive && <span style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: '#02BDB6' }} />}
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      <NotificationsSection />

      <div style={{ padding: '13px 21px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 21, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Slimway CRM</span>
        <span style={{ fontSize: 11, color: '#02BDB6', background: 'rgba(2,189,182,0.08)', border: '1px solid rgba(2,189,182,0.15)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>v{VERSION}</span>
      </div>
    </div>
  )
}
