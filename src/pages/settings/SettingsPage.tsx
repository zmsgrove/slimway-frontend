import React, { useState, useRef } from 'react'
import { User, Palette, Bell, Volume2, VolumeX, Play, Check } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'
import { THEMES, ACCENTS } from '../../lib/theme'
import type { ThemeId, AccentColor } from '../../lib/theme'
import { VERSION } from '../../version'

// ─── Shared components ────────────────────────────────────────────────────────

interface SectionProps { title: string; icon: React.ReactNode; children: React.ReactNode }
function Section({ title, icon, children }: SectionProps) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 21, overflow: 'hidden', marginBottom: 13 }}>
      <div style={{ padding: '13px 21px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
        {icon}{title}
      </div>
      <div style={{ padding: 21 }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div>{children}</div>
    </div>
  )
}

// ─── Constants ───────────────────────────────────────────────────────────────

const roleLabel: Record<string, string> = {
  developer: 'Разработчик', owner: 'Владелец', franchisee: 'Франчайзи',
  admin: 'Администратор', trainer: 'Тренер', staff: 'Менеджер', technical: 'Тех. персонал',
}

const SOUND_FILES = ['OK.mp3', '2toon.mp3', 'classic.mp3', 'crash.mp3', 'disck.mp3', 'error.mp3', 'hw.mp3', 'old.mp3', 'old2.mp3', 'rim.mp3', 'steam.mp3', 'toon.mp3']

const SOUND_EVENTS = [
  { key: 'new_lead',          label: 'Новый лид' },
  { key: 'new_task',          label: 'Новая задача' },
  { key: 'task_assigned',     label: 'Назначена задача' },
  { key: 'booking_created',   label: 'Бронь создана' },
  { key: 'subscription_sold', label: 'Абонемент продан' },
  { key: 'low_stock',         label: 'Низкий остаток' },
]

interface NotifSettings { muted: boolean; volume: number; events: Record<string, string> }

function loadNotif(): NotifSettings {
  try { return { muted: false, volume: 80, events: {}, ...JSON.parse(localStorage.getItem('notificationSettings') || '{}') } }
  catch { return { muted: false, volume: 80, events: {} } }
}

// ─── Notifications section ────────────────────────────────────────────────────

function NotificationsSection() {
  const [s, setS] = useState<NotifSettings>(loadNotif)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const save = (patch: Partial<NotifSettings>) => {
    const next = { ...s, ...patch }
    setS(next)
    localStorage.setItem('notificationSettings', JSON.stringify(next))
  }

  const preview = (file: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    const a = new Audio('/sound/' + file)
    a.volume = s.volume / 100
    a.play().catch(() => {})
    audioRef.current = a
  }

  const selectStyle: React.CSSProperties = {
    height: 32, padding: '0 8px', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer',
  }

  return (
    <Section title="Уведомления" icon={<Bell size={15} strokeWidth={1.75} color="var(--accent)" />}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', marginBottom: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {s.muted ? <VolumeX size={16} color="var(--text-muted)" /> : <Volume2 size={16} color="var(--accent)" />}
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.muted ? 'Без звука' : 'Звук включён'}</span>
        </div>
        <button onClick={() => save({ muted: !s.muted })} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', background: s.muted ? 'var(--border)' : 'var(--accent)', transition: 'background 0.2s' }}>
          <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: s.muted ? 2 : 22 }} />
        </button>
      </div>

      <div style={{ marginBottom: 21 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Громкость</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{s.volume}%</span>
        </div>
        <input type="range" min={0} max={100} value={s.volume} onChange={e => save({ volume: +e.target.value })} style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} disabled={s.muted} />
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Событие → Звук</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SOUND_EVENTS.map(ev => {
          const cur = s.events[ev.key] || 'OK.mp3'
          return (
            <div key={ev.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{ev.label}</span>
              <select value={cur} onChange={e => save({ events: { ...s.events, [ev.key]: e.target.value } })} style={selectStyle}>
                {SOUND_FILES.map(f => <option key={f} value={f}>{f.replace('.mp3', '')}</option>)}
              </select>
              <button onClick={() => preview(cur)} disabled={s.muted} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent)', cursor: s.muted ? 'not-allowed' : 'pointer', opacity: s.muted ? 0.4 : 1 }}>
                <Play size={12} />
              </button>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─── Theme card preview ────────────────────────────────────────────────────────

function ThemePreviewCard({
  id, label, bg, sidebar, isActive, accentColor, onClick,
}: {
  id: ThemeId; label: string; bg: string; sidebar: string
  isActive: boolean; accentColor: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        position: 'relative', padding: 0, border: 'none', cursor: 'pointer',
        borderRadius: 10,
        outline: isActive ? `2.5px solid ${accentColor}` : '2.5px solid transparent',
        outlineOffset: 2,
        transition: 'outline 0.15s, transform 0.1s',
        transform: isActive ? 'scale(1.03)' : 'scale(1)',
        background: 'transparent',
      }}
    >
      {/* Preview box */}
      <div style={{ width: '100%', height: 52, borderRadius: 8, overflow: 'hidden', display: 'flex', border: `1px solid ${isActive ? accentColor : 'rgba(128,128,128,0.2)'}` }}>
        {/* Sidebar strip */}
        <div style={{ width: 18, background: sidebar, flexShrink: 0 }} />
        {/* Main area */}
        <div style={{ flex: 1, background: bg, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />
        </div>
      </div>
      {/* Label */}
      <div style={{
        marginTop: 5, fontSize: 11, fontWeight: isActive ? 600 : 400,
        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
        textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </div>
      {/* Active checkmark */}
      {isActive && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: 16, height: 16, borderRadius: '50%',
          background: accentColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={9} strokeWidth={3} color="#fff" />
        </div>
      )}
    </button>
  )
}

// ─── Appearance section ───────────────────────────────────────────────────────

function AppearanceSection() {
  const { user } = useAuth()
  const { pref, setTheme, setAccent } = useTheme()

  const currentAccentColor = ACCENTS.find(a => a.id === pref.accent)?.color ?? '#0d9488'

  const handleTheme = (theme: ThemeId) => {
    if (!user) return
    void setTheme(theme, user.id)
  }

  const handleAccent = (accent: AccentColor) => {
    if (!user) return
    void setAccent(accent, user.id)
  }

  return (
    <Section title="Оформление" icon={<Palette size={15} strokeWidth={1.75} color="var(--accent)" />}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 21 }}>
        Тема и акцентный цвет применяются мгновенно и сохраняются в профиле.
      </div>

      {/* ── Theme grid ── */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Тема</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {THEMES.map(t => (
          <ThemePreviewCard
            key={t.id}
            id={t.id}
            label={t.label}
            bg={t.bg}
            sidebar={t.sidebar}
            isActive={pref.theme === t.id}
            accentColor={currentAccentColor}
            onClick={() => handleTheme(t.id)}
          />
        ))}
      </div>

      {/* ── Accent swatches ── */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Акцентный цвет</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 21 }}>
        {ACCENTS.map(a => {
          const isActive = pref.accent === a.id
          return (
            <button
              key={a.id}
              onClick={() => handleAccent(a.id as AccentColor)}
              title={a.label}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: a.color, cursor: 'pointer', position: 'relative',
                outline: isActive ? `3px solid ${a.color}` : '3px solid transparent',
                outlineOffset: 2,
                transition: 'outline 0.15s, transform 0.1s',
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isActive && <Check size={13} strokeWidth={2.5} color="#fff" />}
            </button>
          )
        })}
      </div>

      {/* ── Preview ── */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Превью</div>
      <div style={{ padding: 13, borderRadius: 13, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 13 }}>
        <button style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'default' }}>
          Кнопка
        </button>
        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, fontWeight: 600, background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
          Бейдж
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {THEMES.find(t => t.id === pref.theme)?.label} · {ACCENTS.find(a => a.id === pref.accent)?.label}
        </span>
      </div>
    </Section>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth()
  const { pref } = useTheme()

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Настройки</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Личные настройки</p>
      </div>

      <Section title="Профиль" icon={<User size={15} strokeWidth={1.75} color="var(--accent)" />}>
        <InfoRow label="Email">
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{user?.email ?? '—'}</span>
        </InfoRow>
        {user?.fullName && (
          <InfoRow label="Имя">
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{user.fullName}</span>
          </InfoRow>
        )}
        <InfoRow label="Роль">
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-muted)', border: '1px solid var(--accent)', padding: '2px 8px', borderRadius: 6 }}>
            {user?.role ? (roleLabel[user.role] ?? user.role) : '—'}
          </span>
        </InfoRow>
        <InfoRow label="Тема">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {THEMES.find(t => t.id === pref.theme)?.label ?? pref.theme} · {ACCENTS.find(a => a.id === pref.accent)?.label ?? pref.accent}
          </span>
        </InfoRow>
      </Section>

      <AppearanceSection />

      <NotificationsSection />

      <div style={{ padding: '13px 21px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 21, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Slimway CRM</span>
        <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-muted)', border: '1px solid var(--accent)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>v{VERSION}</span>
      </div>
    </div>
  )
}
