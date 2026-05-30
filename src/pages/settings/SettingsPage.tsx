import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Palette, Bell, Volume2, VolumeX, Play, Check, Shield, Copy, QrCode, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
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
      <div style={{ width: '100%', height: 52, borderRadius: 8, overflow: 'hidden', display: 'flex', border: `1px solid ${isActive ? accentColor : 'rgba(128,128,128,0.2)'}` }}>
        <div style={{ width: 18, background: sidebar, flexShrink: 0 }} />
        <div style={{ flex: 1, background: bg, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />
        </div>
      </div>
      <div style={{ marginTop: 5, fontSize: 11, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent)' : 'var(--text-secondary)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </div>
      {isActive && (
        <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  const handleTheme  = (theme: ThemeId)    => { if (user) void setTheme(theme, user.id) }
  const handleAccent = (accent: AccentColor) => { if (user) void setAccent(accent, user.id) }

  return (
    <Section title="Оформление" icon={<Palette size={15} strokeWidth={1.75} color="var(--accent)" />}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 21 }}>
        Тема и акцентный цвет применяются мгновенно и сохраняются в профиле.
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Тема</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {THEMES.map(t => (
          <ThemePreviewCard key={t.id} id={t.id} label={t.label} bg={t.bg} sidebar={t.sidebar} isActive={pref.theme === t.id} accentColor={currentAccentColor} onClick={() => handleTheme(t.id)} />
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Акцентный цвет</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 21 }}>
        {ACCENTS.map(a => {
          const isActive = pref.accent === a.id
          return (
            <button key={a.id} onClick={() => handleAccent(a.id as AccentColor)} title={a.label}
              style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: a.color, cursor: 'pointer', position: 'relative', outline: isActive ? `3px solid ${a.color}` : '3px solid transparent', outlineOffset: 2, transition: 'outline 0.15s, transform 0.1s', transform: isActive ? 'scale(1.15)' : 'scale(1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isActive && <Check size={13} strokeWidth={2.5} color="#fff" />}
            </button>
          )
        })}
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Превью</div>
      <div style={{ padding: 13, borderRadius: 13, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 13 }}>
        <button style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'default' }}>Кнопка</button>
        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, fontWeight: 600, background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>Бейдж</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {THEMES.find(t => t.id === pref.theme)?.label} · {ACCENTS.find(a => a.id === pref.accent)?.label}
        </span>
      </div>
    </Section>
  )
}

// ─── SecuritySection ──────────────────────────────────────────────────────────

interface MfaStatus { enabled: boolean; factor_id: string | null }
type EnrollData = { factor_id: string; qr_code: string | null; secret: string | null; uri: string | null }

function SecuritySection() {
  const [status,        setStatus]        = useState<MfaStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  // Enroll modal state
  const [showEnroll,  setShowEnroll]  = useState(false)
  const [enrollData,  setEnrollData]  = useState<EnrollData | null>(null)
  const [enrollStep,  setEnrollStep]  = useState<1 | 2>(1)
  const [verifyCode,  setVerifyCode]  = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [enrollError,   setEnrollError]   = useState('')
  const [copied,        setCopied]        = useState(false)
  const [enrollSuccess, setEnrollSuccess] = useState(false)

  // Unenroll confirm state
  const [showUnenroll, setShowUnenroll] = useState(false)
  const [unenrollLoading, setUnenrollLoading] = useState(false)
  const [unenrollError,   setUnenrollError]   = useState('')

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get<MfaStatus>('/auth/mfa/status')
      setStatus(data)
    } catch {
      setStatus({ enabled: false, factor_id: null })
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => { void loadStatus() }, [loadStatus])

  const handleStartEnroll = async () => {
    setEnrollLoading(true)
    setEnrollError('')
    try {
      const { data } = await api.post<EnrollData>('/auth/mfa/enroll')
      setEnrollData(data)
      setShowEnroll(true)
      setEnrollStep(1)
      setEnrollSuccess(false)
    } catch {
      setEnrollError('Не удалось начать настройку 2FA')
    } finally {
      setEnrollLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!verifyCode.trim() || !enrollData) return
    setVerifyLoading(true)
    setVerifyError('')
    try {
      // Use Supabase directly to ensure session is properly updated to aal2
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find(f => f.id === enrollData.factor_id)
        ?? factors?.totp?.[0]
      if (!totp) throw new Error('Factor not found')

      const { data: challenge, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
      if (chalErr || !challenge) throw chalErr ?? new Error('Challenge failed')

      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId:    totp.id,
        challengeId: challenge.id,
        code:        verifyCode.trim(),
      })
      if (verErr) throw verErr

      setEnrollSuccess(true)
      await loadStatus()
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message
      setVerifyError(msg?.includes('Invalid') ? 'Неверный код. Попробуйте ещё раз.' : 'Ошибка подтверждения кода.')
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleUnenroll = async () => {
    if (!status?.factor_id) return
    setUnenrollLoading(true)
    setUnenrollError('')
    try {
      await api.post('/auth/mfa/unenroll', { factor_id: status.factor_id })
      setShowUnenroll(false)
      await loadStatus()
    } catch {
      setUnenrollError('Не удалось отключить 2FA')
    } finally {
      setUnenrollLoading(false)
    }
  }

  const copySecret = () => {
    if (enrollData?.secret) {
      void navigator.clipboard.writeText(enrollData.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const closeEnroll = () => {
    setShowEnroll(false)
    setEnrollData(null)
    setEnrollStep(1)
    setVerifyCode('')
    setVerifyError('')
    setEnrollSuccess(false)
  }

  const qrValue = enrollData?.uri ?? ''

  return (
    <>
      <Section title="Безопасность" icon={<Shield size={15} strokeWidth={1.75} color="var(--accent)" />}>
        {statusLoading ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                  Двухфакторная аутентификация (2FA)
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Google Authenticator / любое TOTP-приложение
                </div>
              </div>
              {status?.enabled ? (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                  Активна ✅
                </span>
              ) : (
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  Не настроена
                </span>
              )}
            </div>

            {enrollError && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{enrollError}</div>
            )}

            {!status?.enabled ? (
              <button
                onClick={() => void handleStartEnroll()}
                disabled={enrollLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: enrollLoading ? 'not-allowed' : 'pointer', opacity: enrollLoading ? 0.6 : 1 }}
              >
                <QrCode size={15} />
                {enrollLoading ? 'Подготовка...' : 'Подключить Google Authenticator'}
              </button>
            ) : (
              <button
                onClick={() => setShowUnenroll(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
              >
                Отключить 2FA
              </button>
            )}
          </div>
        )}
      </Section>

      {/* ── Enroll modal ── */}
      {showEnroll && enrollData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
          <div onClick={closeEnroll} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
          <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Настройка 2FA</div>
              <button onClick={closeEnroll} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
            </div>

            {enrollSuccess ? (
              /* Success state */
              <div style={{ textAlign: 'center', padding: '13px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 13 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>2FA успешно подключена!</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 21 }}>
                  Теперь при входе потребуется код из Google Authenticator.
                </div>
                <button onClick={closeEnroll} style={{ height: 40, padding: '0 34px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Готово
                </button>
              </div>
            ) : enrollStep === 1 ? (
              /* Step 1: QR code */
              <>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 21, lineHeight: 1.6 }}>
                  Откройте <strong>Google Authenticator</strong> (или любое TOTP-приложение) и отсканируйте QR-код.
                </div>

                {/* QR code */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 21 }}>
                  {enrollData.qr_code ? (
                    <img src={enrollData.qr_code} alt="QR code" style={{ width: 180, height: 180, borderRadius: 13, border: '1px solid var(--border)', background: '#fff', padding: 8 }} />
                  ) : qrValue ? (
                    <div style={{ padding: 13, background: '#fff', borderRadius: 13, border: '1px solid var(--border)' }}>
                      <QRCodeSVG value={qrValue} size={156} />
                    </div>
                  ) : null}
                </div>

                {/* Secret key */}
                {enrollData.secret && (
                  <div style={{ marginBottom: 21 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Или введите ключ вручную</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <code style={{ flex: 1, fontSize: 12, color: 'var(--text)', letterSpacing: '0.1em', wordBreak: 'break-all' }}>
                        {enrollData.secret}
                      </code>
                      <button onClick={copySecret} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: copied ? 'rgba(16,185,129,0.1)' : 'transparent', border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`, borderRadius: 6, color: copied ? '#10b981' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
                        <Copy size={11} />{copied ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={() => setEnrollStep(2)} style={{ width: '100%', height: 40, background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Далее — ввести код подтверждения
                </button>
              </>
            ) : (
              /* Step 2: verify code */
              <>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 21, lineHeight: 1.6 }}>
                  Введите 6-значный код из Google Authenticator для подтверждения.
                </div>

                {verifyError && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 12, padding: '8px 13px', marginBottom: 13 }}>
                    {verifyError}
                  </div>
                )}

                <div style={{ marginBottom: 13 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter') void handleVerify() }}
                    placeholder="000000"
                    autoFocus
                    style={{
                      width: '100%', height: 48, padding: '0 13px',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 8, color: 'var(--text)', fontSize: 24,
                      fontWeight: 600, letterSpacing: '0.4em', textAlign: 'center',
                      outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => void handleVerify()} disabled={verifyLoading || verifyCode.length !== 6}
                    style={{ flex: 1, height: 40, background: (verifyLoading || verifyCode.length !== 6) ? 'rgba(2,189,182,0.4)' : 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: (verifyLoading || verifyCode.length !== 6) ? 'not-allowed' : 'pointer' }}>
                    {verifyLoading ? 'Проверка...' : 'Активировать'}
                  </button>
                  <button onClick={() => { setEnrollStep(1); setVerifyCode(''); setVerifyError('') }}
                    style={{ height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                    Назад
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Unenroll confirm modal ── */}
      {showUnenroll && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
          <div onClick={() => setShowUnenroll(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
          <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 380, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 13 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Отключить 2FA?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 21, lineHeight: 1.6 }}>
              Двухфакторная аутентификация будет отключена. Это снизит безопасность аккаунта.
            </div>
            {unenrollError && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{unenrollError}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => void handleUnenroll()} disabled={unenrollLoading}
                style={{ flex: 1, height: 40, background: '#ef4444', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: unenrollLoading ? 'not-allowed' : 'pointer', opacity: unenrollLoading ? 0.6 : 1 }}>
                {unenrollLoading ? 'Отключение...' : 'Отключить'}
              </button>
              <button onClick={() => setShowUnenroll(false)}
                style={{ flex: 1, height: 40, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type SettingsTab = 'profile' | 'security'

export default function SettingsPage() {
  const { user } = useAuth()
  const { pref } = useTheme()
  const navigate  = useNavigate()
  const [tab, setTab] = useState<SettingsTab>('profile')

  // Check if redirected for security setup
  useEffect(() => {
    if (window.location.hash === '#security') {
      setTab('security')
    }
  }, [navigate])

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: 'profile',  label: 'Профиль и интерфейс' },
    { id: 'security', label: 'Безопасность' },
  ]

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Настройки</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Личные настройки</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 21, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 13, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, background: tab === t.id ? 'var(--bg-elevated)' : 'transparent', color: tab === t.id ? 'var(--text)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <>
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
        </>
      )}

      {tab === 'security' && <SecuritySection />}

      <div style={{ padding: '13px 21px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 21, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Slimway CRM</span>
        <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-muted)', border: '1px solid var(--accent)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>v{VERSION}</span>
      </div>
    </div>
  )
}
