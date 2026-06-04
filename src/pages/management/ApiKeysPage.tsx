import React, { useState, useEffect, useCallback } from 'react'
import { Key, Plus, Trash2, Copy, CheckCircle2, ExternalLink, AlertCircle, X, Clock, Eye, EyeOff } from 'lucide-react'
import { apiKeysApi, type ApiKey, type ApiKeyCreated } from '../../api/apiKeys.api'
import { usePermissions } from '../../hooks/usePermissions'

const SCOPES = [
  { value: 'clients:read',       label: 'Клиенты — чтение' },
  { value: 'clients:write',      label: 'Клиенты — запись' },
  { value: 'subscriptions:read', label: 'Абонементы — чтение' },
  { value: 'subscriptions:write',label: 'Абонементы — запись' },
  { value: 'bookings:read',      label: 'Бронирования — чтение' },
  { value: 'bookings:write',     label: 'Бронирования — запись' },
  { value: 'leads:read',         label: 'Лиды — чтение' },
  { value: 'leads:write',        label: 'Лиды — запись' },
  { value: 'analytics:read',     label: 'Аналитика — чтение' },
]

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 13px', background: 'var(--bg-card)',
  border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

// ─── RawKeyModal ──────────────────────────────────────────────────────────────

function RawKeyModal({ rawKey, onClose }: { rawKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 520, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={18} color="var(--accent)" />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>API-ключ создан</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: '#ef4444', lineHeight: 1.5 }}>
            Ключ показывается <strong>один раз</strong> и больше не будет доступен. Сохраните его сейчас.
          </div>
        </div>

        <div style={{ padding: '13px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, fontFamily: 'monospace', fontSize: 13, color: 'var(--text)', wordBreak: 'break-all', lineHeight: 1.6 }}>
          {rawKey}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCopy} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: copied ? 'rgba(16,185,129,0.12)' : 'var(--accent)', border: copied ? '1px solid rgba(16,185,129,0.3)' : 'none', borderRadius: 8, color: copied ? '#10b981' : 'var(--accent-fg)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {copied ? <><CheckCircle2 size={15} />Скопировано!</> : <><Copy size={15} />Скопировать ключ</>}
          </button>
          <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CreateKeyModal ───────────────────────────────────────────────────────────

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (raw: string) => void }) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleScope = (s: string) => {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Введите название ключа'); return }
    if (scopes.length === 0) { setError('Выберите хотя бы один скоуп'); return }
    setSaving(true); setError(null)
    try {
      const created: ApiKeyCreated = await apiKeysApi.create({
        name: name.trim(),
        scopes,
        expires_at: expiresAt || undefined,
      })
      onCreated(created.raw_key)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Ошибка при создании')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Новый API-ключ</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Название *</label>
            <input style={inputStyle} placeholder="Например: My Integration" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Права доступа (скоупы) *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SCOPES.map(s => (
                <label key={s.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 13px', background: scopes.includes(s.value) ? 'var(--accent-muted)' : 'var(--bg-surface)', border: `1px solid ${scopes.includes(s.value) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.12s' }}>
                  <input type="checkbox" checked={scopes.includes(s.value)} onChange={() => toggleScope(s.value)} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  <span style={{ fontSize: 12, color: scopes.includes(s.value) ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: scopes.includes(s.value) ? 500 : 400 }}>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Срок действия (опционально)</label>
            <input type="datetime-local" style={inputStyle} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Оставьте пустым для бессрочного ключа</div>
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
            <button onClick={() => void handleSubmit()} disabled={saving} style={{ flex: 1, height: 40, background: 'var(--accent)', border: 'none', borderRadius: 8, color: 'var(--accent-fg)', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Создание...' : 'Создать ключ'}
            </button>
            <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ApiKeysPage ──────────────────────────────────────────────────────────────

function RawKeyInline({ raw }: { raw: string }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <code style={{ flex: 1, fontSize: 11, color: 'var(--text)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
        {visible ? raw : raw.slice(0, 8) + '••••••••••••••••'}
      </code>
      <button onClick={() => setVisible(v => !v)} title={visible ? 'Скрыть' : 'Показать'} style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}>
        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <button onClick={handleCopy} title="Скопировать" style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : 'var(--text-muted)', padding: 2, flexShrink: 0 }}>
        {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
      </button>
    </div>
  )
}

export default function ApiKeysPage() {
  const perm = usePermissions()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [rawKey, setRawKey] = useState<string | null>(null)

  const canManage = perm.can('api_keys', 'manage')

  const SWAGGER_URL = `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? ''}/api/docs`

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      setKeys(await apiKeysApi.getAll())
    } catch {
      setError('Не удалось загрузить API-ключи')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleCreated = async (raw: string) => {
    setShowCreate(false)
    setRawKey(raw)
    await load()
  }

  const handleRevoke = async (key: ApiKey) => {
    if (!confirm(`Отозвать ключ «${key.name}»?\nОн перестанет работать немедленно.`)) return
    try {
      await apiKeysApi.delete(key.id)
      setKeys(prev => prev.map(k => k.id === key.id ? { ...k, is_active: false } : k))
    } catch {
      alert('Ошибка при отзыве ключа')
    }
  }

  if (!canManage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '55px 0', textAlign: 'center' }}>
        <Key size={32} strokeWidth={1.5} color="var(--text-muted)" />
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Нет доступа к API-ключам</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 4 }}>API-ключи</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Ключи для внешних интеграций через REST API</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <a
            href={SWAGGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none', cursor: 'pointer' }}
          >
            <ExternalLink size={14} />Swagger UI
          </a>
          {canManage && (
            <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: 'var(--accent-fg)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              <Plus size={15} strokeWidth={2} />Создать ключ
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
          <AlertCircle size={13} />{error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 55, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
      ) : keys.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 13 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-muted)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Key size={24} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>API-ключей нет</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.6 }}>
            Создайте API-ключ для подключения внешних систем к Slimway CRM.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {keys.map(key => {
            const isExpired = key.expires_at ? new Date(key.expires_at) < new Date() : false
            const statusColor = !key.is_active ? '#71717A' : isExpired ? '#f59e0b' : '#10b981'
            const statusLabel = !key.is_active ? 'Отозван' : isExpired ? 'Истёк' : 'Активен'

            return (
              <div key={key.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 13, padding: 21, opacity: key.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-muted)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Key size={16} color="var(--accent)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{key.name}</div>
                      <code style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '1px 6px', borderRadius: 4 }}>{key.key_prefix}••••••••</code>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}33` }}>
                      {statusLabel}
                    </span>
                    {canManage && key.is_active && (
                      <button onClick={() => void handleRevoke(key)} title="Отозвать ключ" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {key.scopes.map(s => (
                    <span key={s} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent)', opacity: 0.8 }}>
                      {s}
                    </span>
                  ))}
                </div>

                {key.raw_key && <RawKeyInline raw={key.raw_key} />}

                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap', marginTop: 8 }}>
                  <span>Создан: {new Date(key.created_at).toLocaleDateString('ru-RU')}</span>
                  {key.last_used_at && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} />Последнее использование: {new Date(key.last_used_at).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                  {key.expires_at && (
                    <span style={{ color: isExpired ? '#f59e0b' : 'var(--text-muted)' }}>
                      Истекает: {new Date(key.expires_at).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateKeyModal
          onClose={() => setShowCreate(false)}
          onCreated={(raw) => void handleCreated(raw)}
        />
      )}

      {rawKey && (
        <RawKeyModal rawKey={rawKey} onClose={() => setRawKey(null)} />
      )}
    </div>
  )
}
