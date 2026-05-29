import React, { useState, useEffect, useRef } from 'react'
import { User, Palette, Sun, Moon, Bell, Volume2, VolumeX, Play, Check } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'
import type { ThemeMode, AccentColor } from '../../lib/theme'
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

interface AccentDef {
  value:      AccentColor
  label:      string
  darkColor:  string
  lightColor: string
}

const ACCENTS: AccentDef[] = [
  { value: 'teal',   label: 'Бирюзовый',  darkColor: '#2dd4bf', lightColor: '#0d9488' },
  { value: 'purple', label: 'Фиолетовый', darkColor: '#a78bfa', lightColor: '#7c3aed' },
  { value: 'blue',   label: 'Синий',      darkColor: '#60a5fa', lightColor: '#2563eb' },
  { value: 'green',  label: 'Зелёный',    darkColor: '#4ade80', lightColor: '#16a34a' },
  { value: 'orange', label: 'Оранжевый',  darkColor: '#fb923c', lightColor: '#ea580c' },
  { value: 'pink',   label: 'Розовый',    darkColor: '#f472b6', lightColor: '#db2777' },
  { value: 'gray',   label: 'Серый',      darkColor: '#94a3b8', lightColor: '#475569' },
]

const SOUND_FILES = ['OK.mp3', '2toon.mp3', 'classic.mp3', 'crash.mp3', 'disck.mp3', 'error.mp3', 'hw.mp3', 'old.mp3', 'old2.mp3', 'rim.mp3', 'steam.mp3', 'toon.mp3']

const SOUND_EVENTS: { key: string; label: string }[] = [
  { key: 'new_lead',          label: 'Новый лид' },
  { key: 'new_task',          label: 'Новая задача' },
  { key: 'task_assigned',     label: 'Назначена задача' },
  { key: 'booking_created',   label: 'Бронь создана' },
  { key: 'subscription_sold', label: 'Абонемент продан' },
  { key: 'low_stock',         label: 'Низкий остаток' },
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
    <Section title="Уведомления" icon={<Bell size={15} strokeWidth={1.75} color="var(--accent)" />}>
      {/* Mute toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)', marginBottom: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {settings.muted ? <VolumeX size={16} color="var(--text-muted)" /> : <Volume2 size={16} color="var(--accent)" />}
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{settings.muted ? 'Без звука' : 'Звук включён'}</span>
        </div>
        <button
          onClick={() => save({ muted: !settings.muted })}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
            background: settings.muted ? 'var(--glass-border)' : 'var(--accent)', transition: 'background 0.2s',
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
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{settings.volume}%</span>
        </div>
        <input
          type="range" min={0} max={100} value={settings.volume}
          onChange={e => save({ volume: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--accent)', cursor: settings.muted ? 'not-allowed' : 'pointer', opacity: settings.muted ? 0.4 : 1 }}
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

// ─── AppearanceSection ─────────────────────────────────────────────────────────

function AppearanceSection() {
  const { user } = useAuth()
  const { pref, setTheme, setAccent } = useTheme()

  const handleMode = (mode: ThemeMode) => {
    if (!user) return
    void setTheme(mode, user.id)
  }

  const handleAccent = (accent: AccentColor) => {
    if (!user) return
    void setAccent(accent, user.id)
  }

  const swatchColor = (a: AccentDef) =>
    pref.mode === 'light' ? a.lightColor : a.darkColor

  const modeBtn = (mode: ThemeMode, label: string, icon: React.ReactNode) => {
    const isActive = pref.mode === mode
    return (
      <button
        key={mode}
        onClick={() => handleMode(mode)}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: 13, borderRadius: 13,
          border: isActive ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
          background: isActive ? 'var(--accent-muted)' : 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
          fontSize: 13, fontWeight: isActive ? 600 : 400,
          cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
        }}
      >
        {icon}{label}
        {isActive && <span style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
      </button>
    )
  }

  return (
    <Section title="Оформление" icon={<Palette size={15} strokeWidth={1.75} color="var(--accent)" />}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 13 }}>
          Цветовая схема и акцентный цвет. Применяется мгновенно, сохраняется в профиле.
        </div>

        {/* Mode toggle */}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Тема</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 21 }}>
          {modeBtn('dark',  'Тёмная',  <Moon size={15} strokeWidth={1.75} />)}
          {modeBtn('light', 'Светлая', <Sun  size={15} strokeWidth={1.75} />)}
        </div>

        {/* Accent swatches */}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Акцентный цвет</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 21 }}>
          {ACCENTS.map(a => {
            const isActive = pref.accent === a.value
            const color    = swatchColor(a)
            return (
              <button
                key={a.value}
                onClick={() => handleAccent(a.value)}
                title={a.label}
                style={{
                  width: 34, height: 34, borderRadius: '50%', border: 'none',
                  background: color, cursor: 'pointer', position: 'relative',
                  outline: isActive ? `3px solid ${color}` : '3px solid transparent',
                  outlineOffset: 2,
                  transition: 'outline 0.15s, transform 0.1s',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {isActive && <Check size={14} strokeWidth={2.5} color="#fff" />}
              </button>
            )
          })}
        </div>

        {/* Preview */}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Превью</div>
        <div style={{
          padding: 13, borderRadius: 13, background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', gap: 13,
        }}>
          <button style={{
            padding: '6px 16px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'default',
          }}>
            Кнопка
          </button>
          <span style={{
            fontSize: 12, padding: '3px 10px', borderRadius: 6, fontWeight: 600,
            background: 'var(--accent-muted)', color: 'var(--accent)',
            border: '1px solid var(--accent)',
          }}>
            Бейдж
          </span>
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>
            {ACCENTS.find(a => a.value === pref.accent)?.label ?? 'Акцент'}
          </span>
        </div>
      </div>
    </Section>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth()
  const { pref } = useTheme()

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Настройки</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Личные настройки</p>
      </div>

      <Section title="Профиль" icon={<User size={15} strokeWidth={1.75} color="var(--accent)" />}>
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
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-muted)', border: '1px solid var(--accent)', padding: '2px 8px', borderRadius: 6 }}>
              {user?.role ? (roleLabel[user.role] ?? user.role) : '—'}
            </span>
          </InfoRow>
          <InfoRow label="Тема">
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {pref.mode === 'dark' ? 'Тёмная' : 'Светлая'} · {ACCENTS.find(a => a.value === pref.accent)?.label}
            </span>
          </InfoRow>
        </div>
      </Section>

      <AppearanceSection />

      <NotificationsSection />

      <div style={{ padding: '13px 21px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 21, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Slimway CRM</span>
        <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-muted)', border: '1px solid var(--accent)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>v{VERSION}</span>
      </div>
    </div>
  )
}
