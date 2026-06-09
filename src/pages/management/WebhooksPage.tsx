import React, { useState, useEffect, useCallback } from 'react'
import { Webhook, Plus, Trash2, Copy, CheckCircle2, AlertCircle, X, Activity, Send, Power, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { webhooksApi, type WebhookEndpoint, type WebhookLog } from '../../api/webhooks.api'
import { usePermissions } from '../../hooks/usePermissions'

const WEBHOOK_EVENTS = [
  { value: 'lead.created',            label: 'Лид — создан' },
  { value: 'lead.updated',            label: 'Лид — обновлён' },
  { value: 'lead.deleted',            label: 'Лид — удалён' },
  { value: 'client.created',          label: 'Клиент — создан' },
  { value: 'client.updated',          label: 'Клиент — обновлён' },
  { value: 'subscription.created',    label: 'Абонемент — продан' },
  { value: 'subscription.updated',    label: 'Абонемент — обновлён' },
  { value: 'booking.created',         label: 'Запись — создана' },
  { value: 'booking.cancelled',       label: 'Запись — отменена' },
  { value: 'booking.confirmed',       label: 'Запись — подтверждена' },
  { value: 'task.created',            label: 'Задача — создана' },
  { value: 'task.updated',            label: 'Задача — обновлена' },
  { value: 'payment.completed',       label: 'Оплата — завершена' },
]

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 13px', background: 'var(--bg-card)',
  border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

// ─── WebhookFormModal ─────────────────────────────────────────────────────────

function WebhookFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: WebhookEndpoint
  onClose: () => void
  onSaved: (w: WebhookEndpoint) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [secret, setSecret] = useState('')
  const [events, setEvents] = useState<string[]>(initial?.events ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (v: string) =>
    setEvents(prev => prev.includes(v) ? prev.filter(e => e !== v) : [...prev, v])

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Введите название'); return }
    if (!url.trim()) { setError('Введите URL'); return }
    try { new URL(url.trim()) } catch { setError('Введите корректный URL'); return }
    if (events.length === 0) { setError('Выберите хотя бы одно событие'); return }
    setSaving(true); setError(null)
    try {
      let result: WebhookEndpoint
      if (initial) {
        result = await webhooksApi.update(initial.id, {
          name: name.trim(), url: url.trim(), events,
          ...(secret.trim() ? { secret: secret.trim() } : {}),
        })
      } else {
        result = await webhooksApi.create({
          name: name.trim(), url: url.trim(), events,
          ...(secret.trim() ? { secret: secret.trim() } : {}),
        })
      }
      onSaved(result)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 520, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{initial ? 'Редактировать webhook' : 'Новый webhook'}</div>
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
            <input style={inputStyle} placeholder="Например: My CRM Integration" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>URL endpoint *</label>
            <input style={inputStyle} placeholder="https://example.com/webhook" value={url} onChange={e => setUrl(e.target.value)} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>POST-запрос с подписью X-Slimway-Signature</div>
          </div>

          <div>
            <label style={labelStyle}>Секрет (опционально)</label>
            <input style={inputStyle} type="password" placeholder={initial ? '••••••••' : 'Для HMAC-подписи'} value={secret} onChange={e => setSecret(e.target.value)} />
            {initial && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Оставьте пустым, чтобы не менять</div>}
          </div>

          <div>
            <label style={labelStyle}>События *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {WEBHOOK_EVENTS.map(ev => (
                <label key={ev.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 13px', background: events.includes(ev.value) ? 'var(--accent-muted)' : 'var(--bg)', border: `1px solid ${events.includes(ev.value) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.12s' }}>
                  <input type="checkbox" checked={events.includes(ev.value)} onChange={() => toggle(ev.value)} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  <span style={{ fontSize: 12, color: events.includes(ev.value) ? 'var(--accent)' : 'var(--text-secondary)' }}>{ev.label}</span>
                  <code style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4 }}>{ev.value}</code>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
            <button onClick={() => void handleSubmit()} disabled={saving} style={{ flex: 1, height: 40, background: 'var(--accent)', border: 'none', borderRadius: 8, color: 'var(--accent-fg)', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Создать webhook'}
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

// ─── LogsModal ────────────────────────────────────────────────────────────────

function LogsModal({ endpoint, onClose }: { endpoint: WebhookEndpoint; onClose: () => void }) {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void webhooksApi.getLogs(endpoint.id).then(data => { setLogs(data); setLoading(false) })
  }, [endpoint.id])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 600, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Логи webhook</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{endpoint.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 34, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 34, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Логов нет</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {logs.map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 13px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: log.delivered ? '#10b981' : '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{log.event_type}</span>
                  <span style={{ fontSize: 11, color: log.response_status && log.response_status < 300 ? '#10b981' : '#ef4444' }}>
                    {log.response_status ?? '—'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>попытка {log.attempt}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString('ru-RU')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── WebhookCard ──────────────────────────────────────────────────────────────

function WebhookCard({
  webhook,
  canManage,
  onEdit,
  onDelete,
  onTest,
  onLogs,
  onToggle,
}: {
  webhook: WebhookEndpoint
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
  onTest: () => void
  onLogs: () => void
  onToggle: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [testing, setTesting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhook.url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleTest = async () => {
    setTesting(true)
    await onTest()
    setTesting(false)
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 13, padding: 21, opacity: webhook.is_active ? 1 : 0.65 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 13 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, flex: 1, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-muted)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Webhook size={16} color="var(--accent)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{webhook.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{webhook.url}</code>
              <button onClick={handleCopyUrl} title="Скопировать URL" style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : 'var(--text-muted)', padding: 2, flexShrink: 0 }}>
                {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: webhook.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(113,113,122,0.12)', color: webhook.is_active ? '#10b981' : '#71717a', border: `1px solid ${webhook.is_active ? 'rgba(16,185,129,0.25)' : 'rgba(113,113,122,0.25)'}` }}>
            {webhook.is_active ? 'Активен' : 'Отключён'}
          </span>
          {canManage && (
            <>
              <button onClick={handleTest} disabled={testing} title="Тестовый ping" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.5 : 1 }}>
                <Send size={12} />
              </button>
              <button onClick={onLogs} title="Логи" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Activity size={12} />
              </button>
              <button onClick={onEdit} title="Редактировать" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Edit2 size={12} />
              </button>
              <button onClick={onToggle} title={webhook.is_active ? 'Отключить' : 'Включить'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: `1px solid ${webhook.is_active ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, background: webhook.is_active ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', color: webhook.is_active ? '#f59e0b' : '#10b981', cursor: 'pointer' }}>
                <Power size={12} />
              </button>
              <button onClick={onDelete} title="Удалить" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={12} />
              </button>
            </>
          )}
          <button onClick={() => setExpanded(v => !v)} style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 13, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>ПОДПИСАННЫЕ СОБЫТИЯ</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {webhook.events.map(ev => (
              <span key={ev} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent)', opacity: 0.85 }}>
                {ev}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
            Создан: {new Date(webhook.created_at).toLocaleDateString('ru-RU')}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── WebhooksPage ─────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const perm = usePermissions()
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<WebhookEndpoint | null>(null)
  const [logsItem, setLogsItem] = useState<WebhookEndpoint | null>(null)

  const canManage = perm.can('webhooks', 'manage')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setWebhooks(await webhooksApi.getAll()) }
    catch { setError('Не удалось загрузить webhooks') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleSaved = async (w: WebhookEndpoint) => {
    setShowCreate(false); setEditItem(null)
    setWebhooks(prev => {
      const idx = prev.findIndex(x => x.id === w.id)
      if (idx >= 0) { const arr = [...prev]; arr[idx] = w; return arr }
      return [w, ...prev]
    })
  }

  const handleDelete = async (w: WebhookEndpoint) => {
    if (!confirm(`Удалить webhook «${w.name}»?`)) return
    try {
      await webhooksApi.delete(w.id)
      setWebhooks(prev => prev.filter(x => x.id !== w.id))
    } catch { alert('Ошибка при удалении') }
  }

  const handleTest = async (w: WebhookEndpoint) => {
    try { await webhooksApi.test(w.id) }
    catch { alert('Ошибка при отправке теста') }
  }

  const handleToggle = async (w: WebhookEndpoint) => {
    try {
      const updated = await webhooksApi.update(w.id, { is_active: !w.is_active })
      setWebhooks(prev => prev.map(x => x.id === w.id ? updated : x))
    } catch { alert('Ошибка при обновлении') }
  }

  if (!canManage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '55px 0', textAlign: 'center' }}>
        <Webhook size={32} strokeWidth={1.5} color="var(--text-muted)" />
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Нет доступа к Webhooks</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Webhooks</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Получайте уведомления о событиях в реальном времени</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: 'var(--accent-fg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={15} strokeWidth={2} />Добавить webhook
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
          <AlertCircle size={13} />{error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 55, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
      ) : webhooks.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 13 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-muted)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Webhook size={24} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Webhooks не настроены</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 340, lineHeight: 1.6 }}>
            Добавьте webhook для получения уведомлений о событиях CRM в вашу систему.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {webhooks.map(w => (
            <WebhookCard
              key={w.id}
              webhook={w}
              canManage={canManage}
              onEdit={() => setEditItem(w)}
              onDelete={() => void handleDelete(w)}
              onTest={() => handleTest(w)}
              onLogs={() => setLogsItem(w)}
              onToggle={() => void handleToggle(w)}
            />
          ))}
        </div>
      )}

      {(showCreate || editItem) && (
        <WebhookFormModal
          initial={editItem ?? undefined}
          onClose={() => { setShowCreate(false); setEditItem(null) }}
          onSaved={w => void handleSaved(w)}
        />
      )}

      {logsItem && <LogsModal endpoint={logsItem} onClose={() => setLogsItem(null)} />}
    </div>
  )
}
